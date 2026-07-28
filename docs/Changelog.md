# Changelog

## v0.9.0

### Added

- **User-Scoped Suggested Payments Filtering**:
  - Filtered suggested payment cards so each authenticated user ONLY sees settlements in which they are involved as either debtor ("You should pay X") or creditor ("X should pay you").
  - Updated both backend service (`getGroupData()`) and frontend rendering logic (`renderSettlements()`) for strict user-scoped privacy.
- **Editable Display Name**:
  - Added display name editing to the profile page with server-side Zod validation, whitespace trimming, database persistence, and instant UI state updates via Nano Stores (`setUser()`).
  - Preserved custom display names on subsequent Firebase Authentication sign-ins.
- **GitHub Repository Button**:
  - Added an "Open Source" GitHub button beside the theme toggle in the navigation header with Lucide GitHub icon, scale transition animations, and responsive layout scaling.
- **Global Glassmorphic Footer**:
  - Added a clean, minimal footer (`Made with ❤️ by reck98`) anchored across all pages matching the application's glassmorphism design system.

## v0.8.0

### Added

- **Manual / Cash Settlement Options**:
  - Direct **"Settle Cash"** button on every suggested debt card in group details.
  - **"Record Settlement"** header button and glassmorphic Modal dialog to record custom or partial manual settlements between any group members (selecting Payer, Receiver, and Amount).
  - **Automatic Cash Fallback**: If a receiver has no UPI ID configured, clicking "Pay via UPI" gracefully offers to record the payment as a manual cash settlement.
- **Client-Side Stale-While-Revalidate (SWR) Caching**:
  - `localStorage`-backed cache helpers in `stores/groups.ts` (`loadGroupsCache`, `saveGroupsCache`, `loadGroupDetailCache`, `saveGroupDetailCache`).
  - Dashboard (`dashboard.astro`) and Group detail pages (`[id].astro`) now render **instantly (<10ms)** from local cache on mount, revalidating fresh data seamlessly in the background.
- **Backend DB Query Parallelization**:
  - Refactored `getGroupData()` in `backend/src/services/group.ts` to execute independent Turso DB queries in parallel via `Promise.all()`, reducing DB roundtrips from 5 sequential waits to 2 parallel stages.

### Fixed

- **Auth Redirect Loop on Landing Page (`index.astro`)**: Calling `auth.signOut()` when `api.auth.me()` fails clears stale Firebase sessions and shows an error toast instead of triggering an infinite browser reload loop (`/` -> `/`).
- **Uninitialized Payer Display on Add/Edit Expense**: Added `authInit` check and `$user` store population on page load in `add-expense.astro` and `edit-expense/[expenseId].astro`, resolving the issue where Payer Name stayed on "Loading..." and avatar on "?".
- **SSR Router Warning**: Removed invalid `export const getStaticPaths` from server-rendered dynamic route `frontend/src/pages/groups/[id].astro`.
- **Custom Split Strategy Detection**: Fixed `isCustom` detection logic in `edit-expense/[expenseId].astro` to evaluate `expense.split_type === "custom"` directly.

### Added

- **Persistent Firebase Auth sessions**: Explicit `setPersistence(auth, browserLocalPersistence)` ensures auth state survives browser restarts via IndexedDB.
- **`authInit` Promise**: A shared Promise that resolves when Firebase Auth has determined the initial auth state. All protected pages now `await authInit` before rendering, eliminating flash of login page for authenticated users.
- **Login page redirect**: `index.astro` now checks for an existing Firebase session on load. If the user is already authenticated, they are redirected to `/dashboard` (or `/complete-profile`) without seeing the sign-in button.
- **Loading splash on auth-protected pages**: `index.astro`, `complete-profile.astro` show a centered spinner while Firebase initializes. No "flash of login page" for returning users.
- **SSE + state cleanup on logout**: `profile.astro` now calls `disconnectGroupSSE()` and `clearAuth()` before signing out, preventing stale connections and store state.

### Changed

- **`onIdTokenChanged` replaces `onAuthStateChanged` for token caching**: The ID token cache is now updated on token refresh (which Firebase performs automatically every ~1 hour). Previously, `onAuthStateChanged` only fired on sign in/out, so the cached token would go stale after 1 hour, causing 401 responses and forcing users to re-authenticate.
- **`getFirebaseToken()` simplified**: Removed the complex `tokenPromise` fallback with duplicate `onAuthStateChanged` subscription. Now waits for `authInit` if no cached token is available, then calls `getIdToken(false)` once — no forced refresh.
- **Auth guard on all protected pages**: `dashboard.astro`, `complete-profile.astro`, `profile.astro`, and `groups/[id].astro` now await `authInit` before proceeding. If no Firebase user exists, they immediately redirect to `/`.

### Fixed

- **Stale token cache after 1 hour**: The root cause of "asks me to log in repeatedly" — `onAuthStateChanged` doesn't fire on token refresh. `onIdTokenChanged` does, so `cachedToken` stays current.
- **Login page showing sign-in button to already-authenticated users**: `index.astro` now redirects automatically.
- **Logout not cleaning up SSE connections**: `profile.astro` now disconnects SSE before signing out.

## v0.7.1

### Fixed

- **Theme flash on page navigation**: Eliminated the brief dark-to-light flicker when navigating between pages. A blocking inline script in `<head>` now reads the persisted theme preference from `localStorage` (or falls back to `prefers-color-scheme`) and sets `data-theme` on `<html>` before the browser paints — zero flash, zero delay.

### Changed

- **Theme initialization architecture**: Previously, `BaseLayout.astro` hardcoded `data-theme="dark"` at SSR time, and a deferred module script in `ThemeToggle.astro` corrected the theme after DOMContentLoaded — causing a visible flash. Now a ~300 byte blocking inline script runs synchronously during HTML parsing, before any CSS is applied or any pixels are painted.
- **`ThemeToggle.astro`**: Changed from Astro-processed module script to `is:inline` for synchronous execution. Script no longer re-initializes the theme (handled by the blocking script) — only syncs the sun/moon icon and attaches the click handler.
- **`theme-color` meta tag**: Replaced the dual-tag approach with media queries (one per OS color scheme) with a single dynamic meta tag updated by the blocking script. Ensures the browser chrome (status bar, PWA title bar) matches the selected theme from the first paint.

### Removed

- **Hardcoded `data-theme="dark"`**: Removed from `<html>` in `BaseLayout.astro`. The correct theme is now determined at runtime by the blocking script.
- **Redundant theme initialization**: Removed `localStorage.getItem()`, `window.matchMedia()`, and `setTheme(initial)` calls from `ThemeToggle.astro` — all handled once by the blocking script.

## v0.7.0

### Added

- **Server-Sent Events (SSE)**: Real-time group updates via `GET /api/groups/:id/sse`. Backend broadcasts full group state to all connected members immediately after mutations — no more polling.
- **SSE event bus** (`backend/src/services/sse.ts`): In-memory pub/sub managing per-group connections with automatic cleanup.
- **Shared data service** (`backend/src/services/group.ts`): Extracted `getGroupData()` used by both REST endpoints and SSE broadcasts, ensuring consistent data formatting.
- **SSE client** (`frontend/src/lib/sse.ts`): Reusable EventSource wrapper with automatic reconnection, Firebase token refresh on reconnect, and callback-based update handling.
- **Refresh-on-focus**: Group page re-fetches data when tab becomes visible or network reconnects, ensuring consistency after long idle periods.

### Removed

- **All polling mechanisms**: The adaptive polling strategy (3s active / 15s idle backoff) is completely removed. No more `pollGroup()`, `pollTimer`, hash-based change detection, or interval management.
- **Polling store** (`frontend/src/stores/polling.ts`): Entire file deleted — no longer needed.
- **`[PERF]` console.log logging**: Removed temporary performance logging from `requireAuth` middleware and dashboard route.

### Changed

- **Group detail page** (`[id].astro`): Now connects to SSE on load, disconnects on unload. In-page mutations (delete expense, settle) no longer trigger manual re-fetches — SSE handles all updates.
- **Group REST endpoint** (`GET /api/groups/:id`): Now delegates to the shared `getGroupData()` service instead of inline query logic.
- **All mutation handlers**: After successful mutations (create/update/delete expense, create settlement, join/leave group, delete group), the backend broadcasts the full updated group state to all SSE subscribers.
- **SSE authentication**: Uses Firebase ID token passed as query parameter (`?token=`) since EventSource does not support custom headers.

### Performance

- **Idle API requests**: ~240-1200/hour → **0** (zero idle requests)
- **Update latency**: Up to 3000ms → ~100ms (network round trip)
- **Backend work during idle**: Full group query every 3-15s → **zero** (connection alive only)
- **Thundering herd**: Eliminated — one DB query per mutation, broadcast to N subscribers
- **Network traffic (idle/hour)**: ~2-10MB → ~1KB (keepalive pings)

## v0.6.0

### Added

- **Dedicated `/api/dashboard` endpoint**: Single API call returns user profile + groups with member counts in one response, replacing two separate requests (`/me` + `/groups`). Eliminates one Firebase token verification and one network round trip.
- **Database indexes**: New migration `0001_add_performance_indexes` adds 8 indexes on frequently queried foreign key columns (`group_members.user_id`, `group_members.group_id`, `expenses.group_id`, `expenses.paid_by`, `expense_participants.expense_id`, `settlements.group_id`, `settlements.payer_id`, `settlements.receiver_id`).
- **Frontend Firebase token cache**: Module-scoped token caching eliminates repeated `onAuthStateChanged` observer subscriptions on every API request.
- **Temporary `[PERF]` logging**: Backend `requireAuth` middleware now logs Firebase verification time, DB lookup time, and total middleware duration.

### Changed

- **Dashboard loading**: Now uses single `api.dashboard.get()` call instead of `Promise.all([api.auth.me(), api.groups.list()])`, reducing API requests from 2 → 1.
- **N+1 query fixed**: `GET /api/groups` now uses a correlated subquery for member counts instead of N individual `COUNT(*)` queries.
- **API client** (`api.ts`): Added `api.dashboard.get()` method.
- **Dashboard page** (`dashboard.astro`): Updated to consume new `/api/dashboard` endpoint.
- **Migration 0001**: 8 new database indexes for performance.

### Performance

- **API requests on dashboard load**: 2 → 1
- **Firebase `verifyIdToken` calls**: 2 → 1
- **DB queries for groups list**: N+1 → 1
- **Projected dashboard load time**: ~2500-5000ms → ~600-1500ms

## v0.5.0

### Changed

- **Expense creation**: "Paid By" dropdown removed from the Add Expense form; replaced with a read-only display showing the authenticated user's name and avatar
- **Expense editing**: "Paid By" dropdown removed from the Edit Expense form; replaced with a read-only display showing the original payer
- **Payer is now always the authenticated user** — the backend derives `paid_by` from `req.user.id` and ignores any client-supplied value
- **Expense payer is immutable**: editing an expense no longer allows changing who paid
- **API**: `paid_by` field removed from both `POST /groups/:id/expenses` and `PATCH /expenses/:id` request bodies
- **API client** (`api.ts`): `paid_by` removed from `expenses.create()` and `expenses.update()` type signatures

### Security

- Backend no longer accepts `paid_by` from the client — prevents payer spoofing and accidental misassignment

### Removed

- `paid_by` field from Zod validation schemas on both create and update expense endpoints
- "Paid By" select dropdown HTML and population logic from add-expense and edit-expense pages

## v0.4.0

### Added

- Progressive Web App (PWA) support via `@vite-pwa/astro`
- Web App Manifest with standalone display, portrait orientation, finance/productivity categories
- Service Worker (Workbox `generateSW`) with auto-update registration
- Production-ready caching strategy: precache static assets only, NetworkOnly for API requests
- Install prompt component: polished glassmorphism banner, captures `beforeinstallprompt`, persists dismissal
- Offline fallback page (`/offline`) with SplitMate branding and Retry button
- PWA icons: 192×192, 512×512, maskable variants (×2), Apple Touch Icon (180×180) — emerald gradient
- Icon generation script (`scripts/generate-pwa-icons.mjs`) using Sharp
- Dynamic `theme-color` meta tag updates on theme toggle

### Changed

- **astro.config.mjs**: Added `@vite-pwa/astro` integration with full PWA configuration
- **BaseLayout**: Added `apple-touch-icon` link, `apple-mobile-web-app-title` meta tag, InstallPrompt component
- **ThemeToggle**: Now updates `theme-color` meta tag content when toggling dark/light mode
- **package.json**: Added `@vite-pwa/astro` dependency

### Security

- API responses are never cached by the service worker (NetworkOnly strategy)
- No sensitive financial data is stored in any cache

### Technical

- Service worker only active in production builds (`npm run build && npm run preview`)
- All PWA assets (manifest, SW registration, icons) are auto-injected during build

## v0.3.0

### Added

- Complete design system with CSS custom properties architecture
- Dark/Light theme support via `data-theme` attribute with system preference detection and localStorage persistence
- Theme toggle component with sun/moon icons
- Glassmorphism design language: backdrop blur, semi-transparent surfaces, soft borders
- Reusable Astro components: GlassCard, GlassButton, GlassInput, GlassBadge, GlassAvatar, Skeleton, EmptyState, GlassModal, Toast, ThemeToggle
- Toast notification system replacing `alert()` calls
- Skeleton loading states on dashboard and profile pages
- Staggered list animations with CSS `@keyframes`
- Reduced-motion media query support
- `astro-icon` integration with Lucide icon set
- Inter font integration via Google Fonts
- Viewport-fit cover and safe-area support
- Apple mobile web app meta tags
- `max-w-2xl` layout for better desktop spacing

### Changed

- **BaseLayout**: Now includes navigation bar with SplitMate branding, profile link, and theme toggle
- **Global CSS**: Now imports design tokens and animation system; base styles use CSS custom properties
- **Tailwind config**: Primary palette changed from blue to emerald/green; added Inter font family
- **Landing page (index.astro)**: Glass card container, gradient text logo, toast notifications
- **Dashboard**: Skeleton loading cards, staggered group list animations, glass cards, improved error state
- **Group detail ([id].astro)**: Glass tab bar, animated expense/settlement/member lists with stagger, improved empty states, toast notifications, glass cards
- **Profile page**: Glass card sections, avatar ring, staggered animations
- **Complete-profile**: Glass card layout, improved form styling
- **Create/Join group**: Glass form containers, toast notifications
- **Add/Edit expense**: Glass form layout, toast notifications
- **404 page**: Gradient 404 text, glass card
- **Favicon**: Updated from blue to emerald accent color
- **Polling store**: Default interval changed from 5000ms to 10000ms

### Fixed

- TypeScript errors across all pages (e.target casting, unused variable warnings)
- GlassButton dynamic tag rendering using conditional `<a>`/`<button>` instead of Fragment
- Unused import warnings cleaned up

### Removed

- Old `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-ghost`, `.card` utility classes (replaced by design system)
- Blue primary color palette (replaced with Emerald/Green)

## v0.2.0

### Changed

- Migrated auth from Google OAuth to Firebase Authentication
- Renamed `google_id` to `firebase_uid` in users table
- Auth mechanism: httpOnly cookie → `Authorization: Bearer` header
- `POST /auth/google` replaced with `POST /auth/firebase`
- UPI deep links no longer include payee name (`pn`) parameter

### Removed

- `backend/src/utils/jwt.ts` — no longer needed
- `google-auth-library`, `jsonwebtoken`, `cookie-parser` dependencies
- `PUBLIC_GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` env vars

### Added

- `backend/src/utils/firebase.ts` — Firebase Admin initialization
- `frontend/src/lib/firebase.ts` — Firebase client SDK setup
- `firebase-admin`, `firebase` dependencies
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` backend env vars
- `PUBLIC_FIREBASE_API_KEY`, `PUBLIC_FIREBASE_AUTH_DOMAIN`, `PUBLIC_FIREBASE_PROJECT_ID`, `PUBLIC_FIREBASE_APP_ID` frontend env vars

### Fixed

- UPI link generation no longer includes payee name (`pn` parameter)
- Profile page now displays user avatar from Google or DiceBear fallback instead of hardcoded initial letter
- Group member list now displays user avatars instead of hardcoded initial letters
- Settlement suggestions now show personalized debt direction per user ("You owe X" vs "X owes you") and only show the Pay button to the debtor

## v0.1.0 (Initial Scaffolding)

### Added

- Project root structure and monorepo configuration
- Backend scaffold: Express + TypeScript + Drizzle ORM + Turso schema
- Frontend scaffold: Astro + TypeScript + Tailwind CSS + Nano Stores
- Complete documentation suite (PRD, Architecture, API, Database, Development, AgentMemory, Decisions, Changelog)
- Database schema for users, groups, group_members, expenses, expense_participants, settlements
- Core middleware: error handling, authentication, validation
- Route structure for all API endpoints
- Base layout and page structure for frontend
- Nano Stores for auth, groups, polling state management
- UPI deep link generation service
- Balance calculation and debt simplification service
- Invite code generation utility
- JWT utility with cookie-based authentication
