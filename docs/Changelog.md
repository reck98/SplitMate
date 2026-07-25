# Changelog

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
