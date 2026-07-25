# Engineering Decision Records

## D-001: Polling over WebSockets

**Date:** 2024-07-25
**Status:** Accepted

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
**Status:** Accepted

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
