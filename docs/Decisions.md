# Engineering Decision Records

## D-018: User-Scoped Suggested Payments Visibility & Editable Display Name Architecture

**Date:** 2026-07-26
**Status:** Accepted

**Context:**

1. **Suggested Payments Privacy**:
   - Previously, the group details page displayed settlement suggestions for every member in the group. If User A owed User B ₹200 and User C owed User D ₹150, all group members saw all payment suggestions.
   - Requirement: Each authenticated user should ONLY see payment suggestions that directly involve themselves.
2. **Display Name Editing**:
   - Users could only edit their UPI ID on the profile page, while display name was fixed from initial sign-in.
   - Requirement: Allow users to change their display name with whitespace trimming, Zod validation, DB persistence, immediate UI state updates, and preservation across Google Firebase Auth sign-ins.

**Decision:**

1. **User-Scoped Debt Filtering**:
   - Keep global balance calculation (`getBalances()`) complete across all group members to ensure mathematical debt simplification correctness.
   - Filter `simplified_debts` in `getGroupData()` and `renderSettlements()` using `d.from.user_id === currentUserId || d.to.user_id === currentUserId`.
   - Update labels to "You should pay X" / "X should pay you".
2. **Editable Display Name Architecture**:
   - Update `updateProfileSchema` in `backend/src/routes/auth.ts` to validate optional `name` and `upi_id`.
   - In `PATCH /api/me`, update `users` table with trimmed `name` and/or `upi_id`.
   - In `POST /auth/firebase`, preserve existing custom `name` in DB (`existing.name || decoded.name`) so Firebase token sync does not overwrite custom display names on subsequent logins.
   - In `profile.astro`, create an "Edit Profile" section and update `$user` store on save for instant UI reactivity.

---

## D-017: Manual Settlements & Stale-While-Revalidate (SWR) Performance Architecture

**Date:** 2026-07-26
**Status:** Accepted

**Context:**

1. **Manual / Cash Settlements**:
   - SplitMate previously relied primarily on UPI deep-linking for settlements. If a user settled a balance offline (cash, bank transfer, Paytm), or if the receiver had no UPI ID set, users were blocked from marking debts as settled up.
2. **Page Loading Latency**:
   - Opening `/dashboard` or `/groups/[id]` always showed skeleton loaders while waiting for network requests to complete over Render free tier and Turso DB HTTP roundtrips.

**Decision:**

1. **Manual Settlements UI**: Add inline **"Settle Cash"** buttons on suggested debt items, an automatic **Cash Fallback Prompt** when "Pay via UPI" fails due to missing UPI ID, and a **"Record Settlement"** header button with a glassmorphic Modal dialog to enter custom settlement details (Payer, Receiver, Amount).
2. **Stale-While-Revalidate (SWR) Caching**: Store dashboard groups and group detail data in `localStorage` (`loadGroupDetailCache`, `saveGroupDetailCache`, `loadGroupsCache`, `saveGroupsCache`). On mount, render cached data **instantly (<10ms)**, while revalidating fresh data in the background.
3. **Backend Parallelization**: Execute independent Turso DB queries in `getGroupData()` in parallel via `Promise.all()`, reducing DB network roundtrips from 5 sequential waits to 2 parallel stages.

---

## D-016: Persistent Firebase Authentication Sessions

**Date:** 2026-07-26
**Status:** Accepted

**Context:**
Users were being asked to log in repeatedly — on browser refresh, browser restart, and especially after using the app for more than an hour. The underlying causes were:

1. The ID token cache used `onAuthStateChanged`, which does NOT fire when Firebase auto-refreshes tokens (~hourly). After 1 hour, `cachedToken` held an expired token, every API call returned 401, and pages redirected to login.
2. Firebase persistence was not explicitly configured, relying on the default (`browserLocalPersistence`). While the default should persist, some browser environments (iOS Safari, private mode) have inconsistent IndexedDB behavior.
3. The login page (`/`) did not check for an existing Firebase session — already-authenticated users saw the sign-in button and had to click it again.
4. Protected pages had inconsistent auth guards — some redirected to login on API error, others showed a retry button. None waited for Firebase Auth initialization before rendering.
5. Logout only called `auth.signOut()` without cleaning up SSE connections or Nanostores, potentially leaving stale state.

**Decision:**
Restructure Firebase Auth initialization to use `onIdTokenChanged` (fires on token refresh) instead of `onAuthStateChanged` for the token cache, explicitly set `browserLocalPersistence`, add a shared `authInit` Promise for coordinated auth-aware page loading, and add proper auth guards to all pages.

**Alternatives Considered:**

- **Manual token refresh with `getIdToken(true)`**: Force-refresh the token on every API call. Rejected because it wastes bandwidth and Firebase quota, and contradicts Firebase's recommended pattern of relying on automatic token refresh.
- **Backend-only session with cookies**: Use Firebase Admin to create a session cookie on login, verify it on every request. Rejected because it adds server-side state and the Firebase client SDK already handles persistence.
- **Service worker auth proxy**: Have the service worker intercept requests and refresh tokens. Rejected because it adds unnecessary complexity when `onIdTokenChanged` solves the problem directly.

**Reasoning:**

- `onIdTokenChanged` is the correct Firebase API for keeping a token cache current — it fires on initial load, sign in/out, AND automatic token refresh. `onAuthStateChanged` only covers sign in/out.
- A shared `authInit` Promise provides a single coordination point: every page can `await authInit` to know whether the user is authenticated before rendering, eliminating race conditions between Firebase initialization and page logic.
- Explicit `setPersistence(auth, browserLocalPersistence)` documents the intent and ensures consistency across browser environments.
- The loading splash pattern (shown while `authInit` is pending, hidden once auth state is known) provides a clean user experience: no flash of login page, no flash of protected content.

**Changes:**

- `frontend/src/lib/firebase.ts`: Added `setPersistence()`, replaced `onAuthStateChanged` with `onIdTokenChanged` for token cache, added `authInit` Promise, simplified `getFirebaseToken()`.
- `frontend/src/pages/index.astro`: Added loading splash + `await authInit` check → redirect if authenticated.
- `frontend/src/pages/dashboard.astro`: Added `await authInit` guard before loading data.
- `frontend/src/pages/complete-profile.astro`: Added loading splash + `await authInit` guard.
- `frontend/src/pages/profile.astro`: Added `await authInit` guard + `disconnectGroupSSE()` and `clearAuth()` on logout.
- `frontend/src/pages/groups/[id].astro`: Added `await authInit` guard.

**Benefits:**

- **Session persists across browser restarts** — Firebase Auth with `browserLocalPersistence` stores session in IndexedDB
- **No re-login after 1 hour** — `onIdTokenChanged` keeps the token cache current through automatic refreshes
- **Login page redirects authenticated users** — no extra click needed
- **Consistent auth guard on all protected pages** — redirect before rendering protected content
- **Clean logout** — SSE disconnected, stores cleared, Firebase sign out

**Trade-offs:**

- `authInit` adds a brief loading splash (~10-50ms for IndexedDB read) on every page load, even for authenticated users. This is imperceptible and preferable to flashing wrong content.
- `onIdTokenChanged` fires more often than `onAuthStateChanged` (on every token refresh), but the callback is lightweight (one `getIdToken()` call and a variable assignment).

---

## D-015: Pre-Paint Theme Initialization via Blocking Inline Script

**Date:** 2026-07-26
**Status:** Accepted

**Context:**
The application had a persistent theme-flash issue: when navigating between pages with Light Mode enabled, the page would briefly render in Dark Mode before switching to Light. The root cause was that the SSR template hardcoded `data-theme="dark"` on `<html>`, and the theme initialization ran in a deferred Astro-processed module script that executed after `DOMContentLoaded`. This meant the browser painted the dark theme first, then the script corrected it — causing a visible flash on every navigation.

**Decision:**
Replace the deferred theme initialization with a blocking inline script in `<head>` that reads `localStorage` (or falls back to `prefers-color-scheme`) and sets `data-theme` before the browser paints. The script must:

1. Be placed in `<head>` before any CSS or external resources
2. Be `is:inline` (blocking, synchronous) — no bundling, no deferring
3. Handle `localStorage` unavailability gracefully (try-catch)
4. Also update the `theme-color` meta tag for browser chrome consistency

**Alternatives Considered:**

- **Server-side cookie read:** Set a cookie with the theme preference and read it at SSR time to set `data-theme` on the server. Rejected because it adds complexity, requires a cookie on every request, and doesn't handle first-visit system preference without JS.
- **CSS-only `prefers-color-scheme`:** Use only the CSS media query without any JS. Rejected because it doesn't persist user choice — switching themes manually would reset on navigation.
- **Theme in URL/query param:** Read theme from URL at SSR time. Rejected because persistence requires session management and manual toggle would need URL updates.

**Reasoning:**

- A blocking inline script is the only way to guarantee the correct theme is applied before the first paint — no async/defer/module strategy can provide this guarantee.
- The script is ~300 bytes gzipped — negligible performance cost for zero visual flash.
- `localStorage` is available synchronously during initial HTML parsing — no async needed.
- `window.matchMedia` for `prefers-color-scheme` is also synchronous and available immediately.
- Placing the script before CSS `<link>` tags means the theme attribute is set before any styles are applied, preventing even a single frame of incorrect theming.

**Benefits:**

- **Zero theme flash** — every navigation, including hard reloads, PWA launches, and deep links
- **No delay** — the script runs synchronously during HTML parsing, adding ~0.3ms of blocking time
- **Persistence preserved** — `localStorage` continues to store user preference
- **System mode preserved** — falls back to `prefers-color-scheme` when no stored preference exists
- **Simpler frontend code** — `ThemeToggle.astro` no longer needs to re-initialize the theme
- **Browser chrome consistency** — `theme-color` meta tag is updated before the first paint

**Trade-offs:**

- The script is inline HTML and cannot be cached separately (but it's only ~300 bytes)
- Changing the theme persistence key requires updating both the blocking script and the toggle handler
- The theme-color in the static PWA manifest (`astro.config.mjs`) remains hardcoded to dark — the manifest is served once at install time and cannot be dynamically customized per-user without a server-side manifest endpoint. The `theme-color` meta tag takes over at runtime.

**Verification:**

- Light Mode: page loads with light background, no flash
- Dark Mode: page loads with dark background, no flash
- System Mode: follows OS preference on first visit
- Hard reload: theme is correct from the first frame
- Client-side navigation: no flash between pages
- PWA launch: splash screen may mismatch (manifest is static), but app loads with correct theme immediately
- Mobile Chrome/Safari: status bar color matches theme from initial render

---

## D-014: Replace Polling with Server-Sent Events

**Date:** 2026-07-26
**Status:** Accepted

**Context:**
The application used adaptive HTTP polling (3s active, 15s idle) on the group detail page to reflect data changes. This meant constant API requests even when no data changed, wasting bandwidth and backend resources. Polling also introduced up to 3 seconds of delay before updates appeared. The dashboard page had no real-time updates at all. As the app approached production, a more efficient real-time strategy was needed.

**Decision:**
Remove all polling mechanisms and replace them with Server-Sent Events (SSE). The backend maintains an in-memory event bus that broadcasts full group state to all connected members immediately after any mutation.

**Alternatives Considered:**

- **Adaptive polling (current):** Simple stateless approach but wasteful during idle periods, introduces latency, and doesn't scale well.
- **WebSockets (Socket.IO):** Full-duplex communication, widely supported, but adds complexity to deployment (sticky sessions), requires a library dependency, and is overkill for a mostly-read application.
- **WebSockets (native `ws`):** Lower overhead than Socket.IO but still requires sticky sessions or a shared pub/sub for multi-instance deployment.
- **Long polling:** No persistent connection but still creates constant HTTP request churn.

**Reasoning:**

- SSE is simpler than WebSockets for unidirectional server-to-client updates — exactly what SplitMate needs
- SSE uses standard HTTP — no sticky sessions, no extra library, works with existing Express deployment on Render
- EventSource API is built into all modern browsers — no polyfill needed
- In-memory event bus is sufficient for a single-instance deployment; can be swapped for Redis pub/sub if horizontal scaling is needed later
- SSE connections are lightweight — a single TCP connection per logged-in user with no data transferred during idle periods
- Broadcast after mutation means work is done once (one DB query) and pushed to N clients — no thundering herd

**Benefits:**

- **Zero idle API requests:** No polling requests during inactive viewing — saves ~240-1200 requests/hour per user
- **Immediate updates:** Data propagates in ~100ms instead of up to 3s with polling
- **Reduced backend load:** No repeated group data queries when data hasn't changed
- **No thundering herd:** On data change, the mutation handler queries the DB once and broadcasts to all subscribers
- **Simpler frontend code:** No adaptive interval logic, no hash-based change detection, no polling timer management
- **Automatic reconnection:** EventSource reconnects on network drop; our module also refreshes the Firebase token on reconnect
- **Refresh-on-focus:** Page re-fetches data when the browser tab regains visibility, ensuring consistency after sleeping tabs

**Trade-offs:**

- **Persistent connections:** Each logged-in user viewing a group maintains an open TCP connection. For the current scale (<1000 concurrent users), this is negligible on Render.
- **In-memory state:** SSE connections are stored in a module-level Map. A server restart drops all connections (reconnect handles this transparently).
- **No cross-instance broadcast:** If multiple backend instances are deployed, SSE events only reach clients connected to the same instance. Mitigation: use Redis pub/sub in the future.
- **Auth via query parameter:** EventSource doesn't support custom headers, so the Firebase token is passed as a `?token=` query param. Logged in server logs briefly (URL params are sometimes logged by proxies).

**Future Considerations:**

- If horizontal scaling is needed, replace the in-memory `Map` with Redis pub/sub using the same API surface
- If dashboard real-time updates become desirable, create `GET /api/me/events` following the same pattern
- If the app outgrows SSE, the event bus abstraction makes it easy to swap to WebSockets without changing mutation handlers

---

## D-001: Polling over WebSockets

**Date:** 2024-07-25
**Status:** Superseded by D-014

**Context:**
The PRD specifies near real-time updates for group data. WebSockets were considered but polling was chosen.

**Decision:**
Use HTTP polling with adaptive intervals (1s active, 5s idle) instead of WebSockets.

**Alternatives Considered:**

- WebSockets: Full-duplex communication, lower latency, but adds complexity to deployment (sticky sessions on Railway, connection management) and backend statefulness.

**Reasoning:**

- Stateless backend is simpler to deploy and scale
- No connection management overhead
- Sufficient for V1 requirements (<1s update interval)
- Easy to migrate to WebSockets later if needed
- Adaptive polling reduces load during idle periods

**Consequences:**

- Slightly higher bandwidth usage than WebSockets
- Up to 1s delay on updates (acceptable per PRD)
- Simple to implement and maintain

**Future Considerations:**

- If group sizes grow beyond 100 or real-time collaboration becomes critical, migrate to WebSockets with a library like `socket.io`

---

## D-002: No Stored Balances

**Date:** 2024-07-25
**Status:** Accepted

**Context:**
Many expense-sharing apps store computed balances. This leads to synchronization bugs when expenses are edited or deleted.

**Decision:**
Balances are NEVER stored. They are computed dynamically on every request.

**Alternatives Considered:**

- Cached balances with invalidation on expense changes
- Materialized views

**Reasoning:**

- Eliminates synchronization bugs entirely
- SQLite queries on typical group sizes (<100 members, <1000 expenses) complete under 100ms
- Simpler code — no cache invalidation logic
- Trivially correct — no stale data possible

**Consequences:**

- Slightly higher CPU usage on each group fetch
- Database queries must be optimized (indexes, minimal JOINs)
- Guaranteed consistency at all times

**Future Considerations:**

- If group sizes grow significantly, consider adding a balance cache with event-based invalidation

---

## D-003: JWT in httpOnly Cookie

**Date:** 2024-07-25
**Status:** Accepted

**Context:**
JWT tokens need to be stored client-side. Options: localStorage, sessionStorage, or httpOnly cookies.

**Decision:**
Store JWT in an httpOnly, SameSite=Strict cookie set by the backend.

**Alternatives Considered:**

- localStorage + Authorization header: Vulnerable to XSS attacks
- sessionStorage: Lost on tab close, still XSS-vulnerable

**Reasoning:**

- httpOnly cookies cannot be accessed by JavaScript, eliminating XSS token theft
- SameSite=Strict prevents CSRF attacks
- Backend controls cookie lifetime and secure flags
- Simpler frontend code — no manual token management

**Consequences:**

- Requires cookie-parser middleware on backend
- Frontend cannot read token expiry — must rely on API responses
- Works naturally with Astro's server-side rendering
- CSRF protection is built-in with SameSite=Strict

**Future Considerations:**

- If a mobile app is built, switch to token-based auth with refresh tokens

---

## D-004: Greedy Debt Simplification

**Date:** 2024-07-25
**Status:** Accepted

**Context:**
After calculating net balances, the app needs to suggest the minimum number of settlement transactions.

**Decision:**
Use a greedy algorithm: sort creditors descending, debtors descending, match largest creditor with largest debtor iteratively.

**Alternatives Considered:**

- Flow-based min-max algorithm: Guarantees absolute minimum transactions but O(n³) complexity
- Linear programming: Overkill for typical group sizes

**Reasoning:**

- O(n log n) — fast even for 100 members
- Produces near-minimal transactions (typically achieves the theoretical minimum)
- Simple to implement and verify correctness
- Easy to test

**Consequences:**

- May not always produce the absolute minimum number of transactions in pathological cases
- For typical friend group expenses, output is indistinguishable from optimal
- Code is simple and maintainable

**Future Considerations:**

- If users report excessive transaction counts, implement a more sophisticated algorithm

---

## D-005: Adaptive Polling

**Date:** 2024-07-25
**Status:** Superseded by D-014

**Context:**
PRD specifies 1000ms polling. Continuous polling at 1s is wasteful when data isn't changing.

**Decision:**
Implement adaptive polling: 1s interval while active, back off to 5s after 3 unchanged polls, reset to 1s on user action.

**Alternatives Considered:**

- Fixed 1s polling: Simple but wasteful
- WebSockets: Too complex for V1
- Server-Sent Events: Better than polling but requires persistent connections

**Reasoning:**

- Reduces server load during idle periods by 80%
- Maintains responsiveness during active use
- Simple to implement (hash comparison of response data)
- No backend changes required — purely frontend logic

**Consequences:**

- Slightly more complex frontend polling logic
- Users may see up to 5s delay when looking at a group without making changes
- Resets instantly when they take any action

**Future Considerations:**

- Track as technical debt for potential WebSocket migration

---

## D-006: Monorepo Structure

**Date:** 2024-07-25
**Status:** Accepted

**Context:**
The project has frontend (Astro) and backend (Express) components that must be developed and deployed together.

**Decision:**
Use a monorepo with frontend/ and backend/ directories at the root.

**Alternatives Considered:**

- Separate repositories: More isolation but harder to coordinate changes
- npm workspaces / turborepo: Too much tooling overhead for two-package project

**Reasoning:**

- Single repository simplifies development workflow
- Shared configuration and documentation
- Easy to run both services with a single command
- Frontend and backend versions stay in sync
- No complex monorepo tooling required

**Consequences:**

- Both apps share the same CI/CD pipeline
- Root scripts coordinate both packages
- Each package independently deployable (Vercel + Railway)

---

## D-007: Extracting Pure Functions for Testability

**Date:** 2024-07-25
**Status:** Accepted

**Context:**
The `simplifyDebts` function was originally in `balance.ts` alongside `getBalances`, which depends on the database client. Tests importing `simplifyDebts` caused import of the Turso client, which failed due to missing environment variables.

**Decision:**
Extract `simplifyDebts` into its own file `services/settlement.ts`.

**Alternatives Considered:**

- Mocking the database client in tests: More complex setup
- Setting environment variables for tests: Fragile, pollutes test environment

**Reasoning:**

- Pure functions should be in separate files for testability
- `simplifyDebts` has no database dependency — it's a pure algorithmic transformation
- Separation of concerns: settlement logic vs balance calculation
- Importing only `settlement.ts` in tests avoids triggering the database client initialization

**Consequences:**

- Cleaner imports in test files
- `balance.ts` remains database-dependent, `settlement.ts` remains pure
- Slightly more files, but better separation of concerns

**Future Considerations:**

- Any new pure business logic should be extracted into its own file
- Integration tests for `getBalances` would need a test database or mocked client

---

## D-008: Replace Google OAuth with Firebase Authentication

**Date:** 2024-07-25
**Status:** Accepted

**Context:**
The original authentication system used Google OAuth (google-auth-library) on the backend with httpOnly JWT cookies. The frontend used Google's GSI client library. This required managing custom JWT tokens, cookie serialization, and OAuth secret management.

**Decision:**
Replace Google OAuth with Firebase Authentication (Google Provider).

**Alternatives Considered:**

- Auth0: More feature-rich but adds another third-party dependency
- Custom OAuth + JWT: Current implementation, requires more maintenance
- Clerk: Newer service, less established

**Reasoning:**

- Firebase handles token lifecycle, refresh, and expiry automatically
- Firebase Admin SDK provides simple token verification
- Removes need for custom JWT signing/verification
- Eliminates cookie management (switch to Authorization header)
- Better SDK support across platforms
- Widely adopted, well-documented

**Consequences:**

- Frontend: Added `firebase` SDK (~152KB client bundle)
- Backend: Added `firebase-admin`, removed `google-auth-library`, `jsonwebtoken`, `cookie-parser`
- Auth flow: httpOnly cookie → `Authorization: Bearer` header
- Database: `google_id` column renamed to `firebase_uid`
- Environment variables: Removed `GOOGLE_CLIENT_ID/SECRET`, added Firebase Admin config and Firebase frontend config
- No API changes to non-auth endpoints (middleware transparently handles token verification)

**Future Considerations:**

- If bundle size becomes a concern, consider lazy-loading Firebase auth
- Firebase token auto-refresh is handled by the client SDK — no backend changes needed
- Can add more Firebase auth providers (Apple, Phone) without schema changes

---

## D-009: CSS Custom Properties Design System over Component Framework

**Date:** 2025-07-25
**Status:** Accepted

**Context:**
The frontend needed a complete visual redesign (glassmorphism, dark/light mode, animations) while preserving the existing Astro + vanilla JS architecture. Adding React/Framer Motion was considered for animations and interactive components.

**Decision:**
Build the design system using CSS custom properties for theming and Astro components for presentation. Use CSS animations instead of Framer Motion. Use `astro-icon` for Lucide icons.

**Alternatives Considered:**

- React + Framer Motion + Lucide React: Would require converting all pages to React islands, adding significant bundle size (~40KB React + ~30KB Framer Motion) and architectural complexity
- Tailwind-only approach: More limited theming capabilities, no dark mode support without extensive class overrides
- Web Component-based design system: Better encapsulation but adds complexity for SSR

**Reasoning:**

- CSS custom properties provide runtime theme switching without any JavaScript
- Astro components are zero-runtime (HTML only) — no JS overhead for presentational UI
- CSS animations cover all required interaction patterns (fade, slide, scale, stagger) without additional dependencies
- `astro-icon` provides tree-shaken SVG icons with zero runtime cost
- The existing vanilla JS architecture is preserved — no framework migration needed
- Dark mode respects `prefers-color-scheme` and persists to localStorage with ~20 lines of JavaScript
- Better performance: no React tree reconciliation, no animation library overhead

**Consequences:**

- Design tokens are centralized in CSS files, not in JavaScript
- All UI components are Astro `.astro` files (HTML templates with scoped styles)
- Animations are limited to CSS transitions and keyframes (no spring physics, no gesture-driven animations)
- Icon usage requires `astro-icon` integration (not raw SVG or icon font)
- Theme toggle requires a small inline script (no React component)

**Future Considerations:**

- If complex animations become necessary (drag-to-settle, gesture-based interactions), consider adding Framer Motion as a targeted React island
- If the app grows significantly, a migration to a full SPA framework (SolidJS/Svelte) could be considered — the design tokens in CSS would be reusable
- The design system can be extracted to an npm package for reuse

---

## D-010: Toast Notification System Over Alert()

**Date:** 2025-07-25
**Status:** Accepted

**Context:**
The app used `alert()` for all user-facing error messages and confirmations. This provided a poor UX — blocking, unstyled, and inconsistent.

**Decision:**
Replace `alert()` with a DOM-based toast notification system accessible via `(window as any).showToast()`.

**Alternatives Considered:**

- React-based toast: Overkill for a vanilla JS app, adds React dependency
- Custom element: Better encapsulation but more complex to implement

**Reasoning:**

- DOM-based toasts work with the existing vanilla JS architecture
- Same API surface as `alert()` but non-blocking and styled consistently with the design system
- No additional dependencies
- Supports success/error/info variants with color-coded borders
- Auto-dismiss with fade-out animation
- Accessible via `aria-live` region

**Consequences:**

- `alert()` calls replaced with `showToast()` in all page scripts
- Toast container rendered in BaseLayout (always available)
- Timing and animation are CSS-controlled
- Limited to text-only notifications (no action buttons or rich content)

**Future Considerations:**

- Could be extended to support action buttons (undo, retry) for optimistic UI patterns
- Could be migrated to a Web Component for better encapsulation

---

## D-011: Introduce Progressive Web App (PWA) Support

**Date:** 2026-07-25
**Status:** Accepted

**Context:**
The application needed to feel like a native mobile app while still running as a web application. Users should be able to install SplitMate on their home screen, launch it in standalone mode, and receive automatic updates without visiting the website.

**Decision:**
Integrate `@vite-pwa/astro` to add full PWA support: Web App Manifest, Service Worker with Workbox, install prompt, offline fallback, and Apple/Android platform meta tags.

**Alternatives Considered:**

- **Workbox directly:** More manual configuration but same underlying library. `@vite-pwa/astro` provides zero-config integration with Astro's build pipeline.
- **Service Worker via custom script:** Writing and maintaining a custom SW adds significant complexity for caching, updating, and scope management.
- **No PWA:** Users would need to bookmark the site — no installability, no offline fallback, no native-app feel.

**Reasoning:**

- `@vite-pwa/astro` provides seamless integration with Astro's build process (injects manifest, generates SW, handles registration)
- Workbox generates a production-ready SW with minimal configuration
- Auto-update strategy ensures users always get the latest frontend bundle
- NetworkOnly for API requests guarantees data freshness and prevents stale cached data
- The offline fallback page provides a friendly experience without complex offline data sync
- Maskable icons provide proper adaptive icon support on Android
- Apple meta tags ensure proper standalone behavior on iOS

**Consequences:**

- Added `@vite-pwa/astro` dependency (~264 packages, all transitive from Workbox)
- Frontend now requires a production build + preview to test SW behavior
- Users who install the app will see the offline page when disconnected (friendly, not broken)
- All API responses always come from network — no risk of stale financial data
- Install prompt is user-friendly and dismissible

**Future Considerations:**

- If offline expense creation becomes a requirement, switch from `autoUpdate` to `prompt` registration type and implement IndexedDB-based sync queues
- If Firebase SDK bundle size becomes a concern, lazy-load auth on the landing page
- Consider adding `pwa-assets-generator` to automate icon generation from a single source image

---

## D-012: Authenticated User Is Always the Expense Payer

**Date:** 2026-07-25
**Status:** Accepted

**Context:**
The expense creation form previously included a "Paid By" dropdown allowing users to select any group member as the payer. This added complexity to the UI, required an extra API field, and made it possible for users to accidentally (or intentionally) create expenses on behalf of others. The edit expense form also allowed changing the payer, which could lead to confusion about who actually paid.

**Decision:**
The payer for every expense is always the authenticated user. The "Paid By" dropdown is removed from both the create and edit expense forms. The backend derives the payer from `req.user.id` and rejects any client-supplied `paid_by` field.

**Alternatives Considered:**

- **Keep Paid By selector:** Adds UI complexity and enables payer spoofing (even if accidental). Requires additional validation on the backend.
- **Allow changing payer on edit:** Could lead to disputes — if expense creator A changes the payer to B, B might disagree they paid.
- **Per-group permission model:** Overly complex for a simple expense-sharing app.

**Reasoning:**

- Simplifies the UI: one fewer field, fewer decisions for the user
- Prevents payer spoofing: the backend is the single source of truth
- Eliminates an entire category of validation (checking that the selected payer is a group member)
- Reduces the API surface: `paid_by` is no longer part of the request contract
- Improves data integrity: expense ownership (creator) and payer are now logically aligned
- The edit page no longer needs to handle payer changes, which avoids the complexity of recalculating balances based on who paid

**Benefits:**

- Removed `paid_by` from the API request body for both create and update
- Simplified frontend form (removed a select dropdown, replaced it with a read-only display)
- Strengthened security (backend ignores client-supplied payer ID)
- Reduced validation surface (removed payer membership check from create expense validation)
- Clearer UX: users see "Your account" under their name in the read-only payer field

**Trade-offs:**

- Users cannot record expenses paid by someone else. If a group member pays cash for dinner, the payer must create the expense from their own device
- This requires all group members to have the app installed and be logged in to record expenses they paid
- For group scenarios where one person always pays (e.g., a designated treasurer), this adds friction

**Future Considerations:**

- If group-level payer delegation becomes a requirement, implement a "pay on behalf of" feature with explicit consent (e.g., the payer receives a notification and must approve)
- The current decision makes sense for V1 — the vast majority of expense-sharing apps follow this pattern

---

## D-013: Dedicated Dashboard Endpoint Over Multiple Independent Requests

**Date:** 2026-07-25
**Status:** Accepted

**Context:**
After login, the dashboard page made two parallel API requests (`GET /api/me` and `GET /api/groups`) to render the user's profile and group list. Each request independently went through the `requireAuth` middleware, which calls Firebase's `verifyIdToken` — a network-based JWT verification step that adds 200-600ms per call. This meant the dashboard paid the Firebase verification cost twice before any data could be displayed. Additionally, the groups endpoint suffered from an N+1 query pattern where each group's member count was fetched via a separate `COUNT(*)` query.

Profiling revealed:

- Two `verifyIdToken` calls: 400-1200ms combined
- N+1 count queries: 20-50ms per group × N groups
- Two HTTP round trips: 100-300ms combined network latency
- No database indexes on queried foreign key columns (full table scans on remote Turso)

**Decision:**
Create a dedicated `GET /api/dashboard` endpoint that returns `{ user, groups[] }` in a single response. The groups include `member_count` via a correlated subquery, eliminating the N+1 pattern.

**Alternatives Considered:**

- **Keep two requests + optimize independently:** Fix N+1 and add indexes but keep 2 requests. Would still pay double Firebase verification cost.
- **Client-side caching of /me response:** Would need to cache auth state across pages, adding complexity.
- **Skip Firebase verification on one endpoint:** Security risk — every request must be authenticated independently.

**Reasoning:**

- Single endpoint means a single `verifyIdToken` call — cuts Firebase auth overhead in half
- Eliminates an entire HTTP round trip — reduces network latency
- Correlated subquery for `member_count` runs in constant time per row (O(n) instead of O(n²) for N+1)
- Adding 8 database indexes makes all FK lookups index scans instead of full table scans
- Frontend Firebase token caching further reduces per-request overhead
- Combined optimizations projected to reduce dashboard load from 2500-5000ms to 600-1500ms

**Consequences:**

- New backend endpoint `/api/dashboard` to maintain
- Frontend no longer uses `api.auth.me()` or `api.groups.list()` directly on dashboard
- `GET /api/me` and `GET /api/groups` remain available for other pages
- 8-index migration to apply before performance benefit is realized
- Temporary `[PERF]` logging in `requireAuth` for verifying improvements

**Remaining Bottlenecks:**

- Firebase `verifyIdToken` is still the single largest contributor (~200-600ms) — this is unavoidable with Firebase Auth
- First dashboard load after cold start may still be slower due to Firebase Auth SDK initialization and IndexedDB restoration
- Turso (remote SQLite) has inherent network latency per query — local development is faster than production

**Future Considerations:**

- If Firebase token verification becomes a bottleneck for other pages, consider a lightweight server-side token cache
- For the group detail page (`GET /api/groups/:id`), similar N+1 and query optimization opportunities exist in the balance calculation and data serialization logic
- If cold starts remain an issue, evaluate Turso's "point-in-time recovery" vs "hot" database tier

---

## D-011: Programmatic Migrations, Safe DOM Readiness, and Production Error Handling

**Date:** 2026-07-28
**Status:** Accepted

**Context:**
Production deployments encountered issues where:

1. `DOMContentLoaded` listeners in Astro script modules failed to fire when DOM parsing finished before script execution.
2. Production database missing `split_type` column caused runtime SQLite errors.
3. Unhandled server exceptions returned generic 500 masks hiding root causes.
4. Floating-point cent rounding in debt simplification caused rare infinite loops in `simplifyDebts`.

**Decision:**

- Standardize client script execution on `onDOMReady(fn)` which evaluates `document.readyState !== "loading"`.
- Implement programmatic auto-migrations in `backend/src/index.ts` using `drizzle-orm/libsql/migrator`.
- Add `morgan("dev")` middleware to log all incoming HTTP requests.
- Include `err.message` in internal 500 error response JSON payloads.
- Wrap all multi-table mutations in `db.transaction(...)`.

**Reasoning:**

- Eliminates race conditions in Astro ES module execution.
- Guarantees database schema is always in sync with Drizzle ORM on server startup.
- Enables rapid root-cause diagnosis via transparent logs and request metrics.

---

## D-012: Preserving Raw Expense Obligations & Disabling Debt Simplification

**Date:** 2026-07-28  
**Status:** Accepted

**Context:**
The previous implementation applied greedy graph optimization (`simplifyDebts`) to minimize group cash flow transactions. However, this behavior rerouted debts through intermediate members and merged debts across multiple unrelated expenses. Users reported that this obscured who owed whom for specific expenses (e.g. Dinner vs Cab vs Snacks).

**Decision:**
1. Disable debt simplification graph reduction across SplitMate.
2. Calculate and preserve individual raw obligations directly from every expense.
3. Introduce an `expense_settlements` table in the database to store individual obligation records per participant per expense.
4. Add an `expense_id` field to the `settlements` table to track settlements against specific obligations.
5. Provide segmented filter tabs (**All**, **You Owe**, **Owed to You**) with count badges in the Suggested Payments UI for enhanced mobile and laptop UX.

**Reasoning:**
- Ensures complete transparency: users see exactly which expense generated a debt and to whom.
- Prevents unintended debt transfers between unrelated group members.
- Settling a payment marks only that specific obligation as settled without altering unrelated debts.
