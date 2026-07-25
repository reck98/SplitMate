# Development

## Current Milestone: v1.0.0 — All Features Complete

### Completed
- [x] Project root structure and monorepo configuration
- [x] Documentation suite (PRD, Architecture, API, Database, Development, AgentMemory, Decisions, Changelog)
- [x] Backend scaffold: Express + TypeScript + Drizzle ORM
- [x] Frontend scaffold: Astro + TypeScript + Tailwind CSS + Nano Stores
- [x] Database schema (users, groups, group_members, expenses, expense_participants, settlements)
- [x] Core middleware (error handling, auth, validation)
- [x] Route structure + all API endpoints
- [x] Services (balance calculation, settlement simplification, UPI links, invite codes)
- [x] Utility modules (JWT, config, invite code generation)
- [x] Nano Stores (auth, groups, polling)
- [x] All UI pages (Landing, Login, Complete Profile, Dashboard, Create Group, Join Group, Group Details, Add Expense, Edit Expense, Profile, 404)
- [x] Phase 1: Authentication — Firebase Authentication (Google Provider), Firebase Admin SDK verification, user profile management
- [x] Phase 2: Groups — CRUD, join/leave, invite codes, member management
- [x] Phase 3: Expenses — CRUD with equal/custom splits, participant validation
- [x] Phase 4: Balance calculation — dynamic computation, greedy debt simplification, UPI deep links, settlement recording
- [x] Phase 5: Adaptive polling — 1s active / 5s idle, hash-based change detection
- [x] Phase 6: Security — Zod validation, rate limiting, parameterized queries, consistent error format
- [x] Tests for critical business logic (18 tests across 3 test files)

### Known Bugs
- None

### Technical Debt
- Firebase SDK adds ~152KB to client bundle (31KB gzipped)
- `getStaticPaths` warning on dynamic group page (expected for SSR with Astro)
- Frontend stores are defined but not yet deeply integrated with all page scripts

### Future Improvements
- Migrate to WebSockets when real-time collaboration is needed
- Add caching for balance calculation on large groups
- Add integration tests with test database
- Add CI/CD pipeline configuration
