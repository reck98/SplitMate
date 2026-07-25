# Changelog

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
