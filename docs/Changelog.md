# Changelog

## v1.4.0 (Show QR Payment Modal, Copy VPA, Download QR & SEO Engine)

### Added & Enhanced

- **Show QR Code Payment Modal**:
  - Replaced legacy browser-dependent UPI deep links (`openUpiApp` / `window.location.href`) with a responsive, in-app **Show QR Payment Modal**.
  - Generated high-resolution, crisp QR codes (`width: 600px`, `errorCorrectionLevel: "M"`) dynamically via `qrcode` package, encoding standard `upi://pay?pa=...&pn=...&am=...&cu=INR&tn=SplitMate Settlement` URIs.
  - Sized QR code container responsively across 320px ultra-mobile, tablet (240px), and desktop (280px) breakpoints with zero layout shifts or horizontal scroll.
  - Implemented **Copy UPI ID** button using Clipboard API with graceful fallback and `UPI ID copied` toast notifications.
  - Implemented **Download QR** button generating scannable PNG images with white padding background and sanitized filenames (`splitmate-payment-{receiver}-{amount}.png`).
- **Comprehensive SEO & Lighthouse Optimizations**:
  - Added Open Graph (`og:*`), Twitter Cards (`twitter:*`), canonical link, and JSON-LD `SoftwareApplication` / `WebApplication` schema markup in `BaseLayout.astro`.
  - Created `robots.txt` and `sitemap.xml` in `public/`.
  - Added Google Fonts `display=swap` optimization and touch-target padding across all interactive landing page buttons.

## v1.3.0 (Multi-Payer & Contributor Strike-Through Fix)

### Fixed

- **Multi-Payer Contributor Strike-Through Bug**:
  - Identified root cause where expense participant rendering evaluated only `p.user_id === exp.paid_by`, assuming a single primary payer and ignoring participants who had settled/contributed towards paying their share of the expense.
  - Enhanced backend `getGroupData` (`backend/src/services/group.ts`) to compute `contributors` array per expense and `is_paid` / `settled` flags per participant based on chronological settlement debt remaining.
  - Updated frontend `renderExpenses` (`frontend/src/pages/groups/[id].astro`) to check `p.is_paid || exp.contributors?.includes(p.user_id) || p.user_id === exp.paid_by`.
  - Every participant who has contributed or settled their share now displays with strike-through styling (`line-through opacity-75 decoration-2`), working across light and dark themes.

### Added & Enhanced

- **Contributor Detection Test Suite**:
  - Added `backend/src/__tests__/contributors.test.ts` verifying single-payer, multi-contributor, and fully-settled expense states. Total backend tests passing: 35.

## v1.2.0 (Equal Split Precision Fix, Grouped Suggested Payments & Payer Strike-Through)

### Fixed

- **Equal Split Calculation & Remainder Distribution**:
  - Identified root cause in naive floating point division which led to share rounding errors (e.g. ₹9.50 instead of ₹10.00 or loss of ₹0.01 on odd splits).
  - Implemented exact integer-paise remainder distribution in `calculateEqualShares` (`backend/src/utils/split.ts`).
  - Total expense amount in paise is divided into `baseSharePaise` with `remainderPaise` distributed 1-paise at a time across participants. Total of participant shares ALWAYS equals total expense amount down to the exact paise.
  - Preserved Custom Split implementation untouched.

### Added & Enhanced

- **Group Suggested Payments by Counterparty User**:
  - Re-structured Suggested Payments UI on group page to group pending debt obligations by counterparty user (`Akash Singh`, `Aanid A Daz`, etc.).
  - Line items display individual expense titles, dates, and amounts while headers display total accumulated counterparty debt.
  - Quick action buttons support paying total counterparty debt or settling individual expense line items.
  - Interactive filters (**All**, **You Owe**, **Owed to You**) continue functioning seamlessly.
  - Responsive design for mobile and desktop viewports.
- **Payer Strike-Through Visual Formatting**:
  - Expense cards on Expenses tab now format the payer (`exp.paid_by`) with visual strike-through styling (`~~reck98 ₹10~~`).
  - Non-payers display with standard styling (`Akash ₹10`).
  - Fully compatible with Equal, Custom, Percentage, and Shares split types.
- **Expanded Quality & Performance Test Suite**:
  - Added unit test suites for equal split remainder distribution (`split.test.ts`), counterparty grouping (`grouping.test.ts`), full lifecycle integration (`integration.test.ts`), and 100-member / 1,000+ expense performance benchmarks (`performance.test.ts`). Total unit/integration tests passing: 32.
  - Added new architecture documentation: `docs/SettlementEngine.md`, `docs/ExpenseRendering.md`, `docs/Testing.md`.

## v1.1.0 (Raw Expense Obligations & Suggested Payment Filters)

### Removed & Replaced

- **Disabled Debt Simplification Algorithm**:
  - Removed graph reduction, net-balance optimization, and third-party debt rerouting algorithms from `backend/src/services/settlement.ts`.
  - SplitMate now preserves exact per-expense debtor-creditor obligations without merging across expenses or transferring debt to unrelated members.

### Added & Enhanced

- **Database Table for Expense Obligations**:
  - Added `expense_settlements` table (`id`, `expense_id`, `group_id`, `payer_id`, `debtor_id`, `amount`, `settled_amount`, `is_settled`, `created_at`) to track individual obligation records per participant per expense.
  - Added `expense_id` foreign key reference to `settlements` table for targeted single-obligation settlement tracking.
  - Applied database migration `0003_lucky_marvel_apes.sql`.
- **Suggested Payments UI Filters**:
  - Added interactive segmented pill filters (**All**, **You Owe**, **Owed to You**) with count badges under Suggested Payments in group details view.
  - Designed for mobile and desktop screens with custom empty states per filter ("You don't owe anyone!", "No payments owed to you!").
- **Targeted Obligations API**:
  - Updated API to return raw `obligations` array containing `expenseId`, `expenseTitle`, `payerId`, `payerName`, `debtorId`, `debtorName`, `amount`, `createdAt`.
  - Updated `POST /groups/:id/settlements` to accept optional `expense_id` and validate settlement amounts against target obligation debt.

## v1.0.0 (Production Release & Application Stabilization)

### Fixed & Stabilized

- **Add Expense & Group Details Infinite Loading Resolution**:
  - Replaced native `DOMContentLoaded` event listeners across all Astro page module scripts with `onDOMReady()` utility, ensuring page initialization executes immediately when DOM is interactive/complete.
  - Hardened debt simplification algorithm (`simplifyDebts`) with upfront net-balance rounding and guaranteed pointer advancement to prevent infinite loops and 500 timeouts.
  - Cleaned `groupId` parameter extraction (`split("/groups/")[1]?.split("/")[0]?.split("?")[0]?.split("#")[0]`) to strip trailing slashes, query strings, and hash parameters.

- **Database Migrations & Auto-Application**:
  - Generated and applied Drizzle migration `0002_fat_obadiah_stane.sql` adding missing `split_type` column (`DEFAULT 'equal' NOT NULL`) to `expenses` table.
  - Added programmatic auto-migrations via `drizzle-orm/libsql/migrator` in `backend/src/index.ts`, automatically applying pending migrations to production Turso database on server boot.
  - Created performance indexes across all foreign keys (`group_id`, `user_id`, `paid_by`, `payer_id`, `receiver_id`).

- **Database Transactions & Error Resilience**:
  - Wrapped all multi-table write operations (creating groups, deleting groups, creating/editing/deleting expenses) in `db.transaction(async (tx) => ...)` to prevent partial state mutations.
  - Enhanced Express `errorHandler` to return detailed error messages in JSON responses when unexpected 500 errors occur, preventing silent failures.

- **Security & XSS Prevention**:
  - Applied `escapeHtml()` sanitization across all Astro pages rendering dynamic user strings (user names, group titles, expense descriptions).
  - Enhanced Firebase ID token auto-refresh with forced token renewal on 401 response retry.

### Added

- **HTTP Request Logger (Morgan)**:
  - Integrated `morgan("dev")` logging middleware in `backend/src/app.ts` to log method, URL, status code, and response time for every incoming API request.
- **Comprehensive Test Suite**:
  - Added unit test suite in `backend/src/__tests__/expenses.test.ts` for equal and custom expense split calculations and validation.

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
