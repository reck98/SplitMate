# Changelog

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
