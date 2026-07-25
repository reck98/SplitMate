# Agent Memory

This file serves as persistent memory for AI agents working on this project.

## Project Identity

- **Name:** SplitMate
- **Description:** Lightweight expense-sharing app for Indian users
- **Tech Stack:** Astro + TypeScript + Tailwind + Nano Stores (frontend), Express + TypeScript + Drizzle ORM (backend), Turso (database)
- **Auth:** Google OAuth with JWT in httpOnly cookies
- **Deploy:** Vercel (frontend), Railway (backend), Turso (database)

## Before Starting Any Task

1. Read this file (AgentMemory.md)
2. Read README.md
3. Read docs/PRD.md
4. Read docs/Architecture.md
5. Read docs/Development.md
6. Read docs/Decisions.md
7. Read docs/API.md
8. Read docs/Database.md

## Key Design Decisions

- **Polling over WebSockets** (D-001): Simpler deployment, stateless backend
- **No stored balances** (D-002): Always computed, prevents sync bugs
- **JWT in httpOnly cookie** (D-003): More secure than localStorage
- **Greedy debt simplification** (D-004): O(n log n), near-minimal transactions
- **Adaptive polling** (D-005): 1s active / 5s idle
- **Monorepo** (D-006): Single repo with frontend/ and backend/

## Code Conventions

- Strong typing everywhere — no `any`
- Files under 500 lines, target <300
- Controllers are thin — business logic in services
- All API responses follow `{ success, data }` or `{ success, error }` format
- All IDs are UUIDs
- Timestamps are ISO 8601 strings
- Boolean in SQLite stored as integer (0/1)

## Database Rules

- Never store derived balances — compute on every request
- Never duplicate data
- Always use migrations — never manual schema changes

## Running the Project

```bash
# Install all dependencies
cd backend && npm install
cd frontend && npm install

# Run both services
npm run dev

# Run individually
npm run dev:backend
npm run dev:frontend

# Database
npm run db:generate
npm run db:migrate
```

## Environment Variables

See `.env.example` for all required variables.

## Build

```bash
npm run build
```

## Current State

See docs/Development.md for current milestone and progress.

## Session Log

### 2024-07-25 — Migration from Google OAuth to Firebase Authentication

**Completed:** Replaced Google OAuth (google-auth-library + GSI client) with Firebase Authentication (firebase-admin + firebase SDK).

**Files changed:**
- Backend: `schema.ts`, `config.ts`, `middleware/auth.ts`, `routes/auth.ts`, `types/index.ts`, `app.ts`, `package.json`, `.env.example` — deleted `jwt.ts`
- Frontend: `lib/api.ts`, `lib/firebase.ts` (new), `pages/index.astro`, `pages/profile.astro`, `stores/auth.ts`, `env.d.ts`, `package.json`, `.env.example` (new)
- Tests: `upi.test.ts` (updated for no pn parameter)
- Docs: All 9 files updated

**Key changes:**
- `google_id` → `firebase_uid` column in database
- Auth method changed from httpOnly cookie to `Authorization: Bearer` header
- `POST /auth/google` → `POST /auth/firebase` (reads token from Authorization header, upserts user)
- Frontend uses `signInWithPopup()` + `getIdToken()` from Firebase Auth SDK
- Removed `google-auth-library`, `jsonwebtoken`, `cookie-parser` dependencies
- Added `firebase-admin`, `firebase` dependencies
- UPI link generation no longer includes `pn` (payee name) parameter

**Removed files:**
- `backend/src/utils/jwt.ts`

**New files:**
- `backend/src/utils/firebase.ts` — Firebase Admin initialization
- `frontend/src/lib/firebase.ts` — Firebase client initialization + helpers

### 2024-07-25 — Initial Scaffolding and Full Feature Implementation

**Completed:** Full project scaffold including backend (Express + TypeScript + Drizzle + Turso) and frontend (Astro + TypeScript + Tailwind + Nano Stores). All PRD features implemented across all 6 phases.

**Files created:**
- Root: `package.json`, `.gitignore`, `.env.example`, `README.md`
- Docs: `PRD.md`, `Architecture.md`, `API.md`, `Database.md`, `Development.md`, `AgentMemory.md`, `Decisions.md`, `Changelog.md`
- Backend: 17 files across `src/routes/`, `src/middleware/`, `src/db/`, `src/services/`, `src/utils/`, `src/types/`
- Frontend: 15 files across `src/pages/`, `src/layouts/`, `src/stores/`, `src/lib/`, `src/styles/`
- Tests: 3 test files with 18 total tests

**Key design decisions:**
- Extracted `simplifyDebts` into its own file (`settlement.ts`) to keep pure functions testable without database dependencies
- Used `inArray` from Drizzle for all SQL IN clauses instead of raw string interpolation (security)
- Greedy debt simplification with >0.01 threshold to avoid tiny floating-point debts

**Things future agents should know:**
- `simplifyDebts` is in `backend/src/services/settlement.ts` (not balance.ts)
- The balance calculation service (`balance.ts`) depends on the database — tests for pure logic are in settlement.ts
- Google Sign-In requires setting up credentials in Google Cloud Console and adding the authorized JavaScript origins and redirect URIs
- Frontend uses Vercel serverless adapter — `getStaticPaths` warning on dynamic pages is expected
- All IDs are UUIDs generated server-side
- Backend runs on port 3000, frontend on port 4321

## Future Agents Should Know

- The PRD is the source of truth — never deviate from it without updating it
- Documentation must stay synchronized with implementation
- After completing any task, update AgentMemory.md, Development.md, and Changelog.md
- Track all engineering decisions in Decisions.md
- The balance calculation service is the most critical business logic — test thoroughly
- The debt simplification algorithm is in `backend/src/services/settlement.ts`
- UPI deep link generation is in `backend/src/services/upi.ts`
- Invite code generation is in `backend/src/utils/invite.ts`
- JWT handling is in `backend/src/utils/jwt.ts`
- All tests are in `backend/src/__tests__/` — run with `npm test` from backend directory
