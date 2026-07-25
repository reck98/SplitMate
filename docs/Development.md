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
- [x] Phase 5: Server-Sent Events — real-time updates via SSE, in-memory event bus, auto-reconnect with token refresh
- [x] Phase 6: Security — Zod validation, rate limiting, parameterized queries, consistent error format
- [x] Tests for critical business logic (18 tests across 3 test files)

### Known Bugs
- None

### Technical Debt
- Firebase SDK adds ~152KB to client bundle (31KB gzipped)
- `getStaticPaths` warning on dynamic group page (expected for SSR with Astro)
- Frontend stores are defined but not yet deeply integrated with all page scripts
- `getFirebaseToken()` in `firebase.ts` still has a fallback observer path for first-time calls — consider fully removing after verifying cached path works in all browsers
- SSE connections are stored in-memory (module-level Map) — will not survive server restart. The auto-reconnect mechanism handles this transparently.

### Future Improvements
- Replace in-memory SSE event bus with Redis pub/sub for horizontal scaling
- Add SSE endpoint for dashboard (`GET /api/me/events`) to provide real-time group list updates
- Add caching for balance calculation on large groups
- Add integration tests with test database
- Add CI/CD pipeline configuration
- Service worker scope: currently set to root (`/`) — verify sub-path deployment behavior
- Consider server-side caching for the `/api/dashboard` endpoint (e.g., 30s TTL with invalidation on group/expense changes)

### Performance Notes
- Dashboard load uses a single `/api/dashboard` endpoint instead of two separate API calls, halving Firebase token verification overhead
- N+1 query pattern in `GET /api/groups` was eliminated by using a correlated subquery for member counts
- 8 database indexes added via migration `0001_add_performance_indexes` to accelerate foreign key lookups
- Frontend `getFirebaseToken()` caches tokens at module scope to avoid re-subscribing to `onAuthStateChanged` on every request
- Real-time updates use SSE instead of polling: zero idle API requests, immediate push on data changes
- SSE broadcasts full group state after mutations — one DB query per mutation serves all connected clients
- Refresh-on-focus strategy handles consistency without periodic polling

### PWA Development

The service worker is only active in production builds. To test PWA features:

```bash
# Build and preview
npm run build && npm run preview
```

The service worker will register on first visit and precache all static assets. The install prompt appears after the SW is activated and the manifest is parsed by the browser.

#### Generating Icons

```bash
node scripts/generate-pwa-icons.mjs
```

Regenerates all PWA icons in `public/` from the SVG template. Run this if the logo design changes.
