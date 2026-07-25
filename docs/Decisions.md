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
