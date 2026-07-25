# Architecture

## High-Level Architecture

SplitMate follows a monolithic backend serving a static frontend.

```
┌─────────────┐     ┌──────────────┐     ┌───────────┐
│   Browser   │────▶│   Astro App  │────▶│  Express  │
│  (Mobile)   │◀────│  (Vercel)    │◀────│  (Railway)│
└─────────────┘     └──────────────┘     └─────┬─────┘
                                               │
                                        ┌──────▼──────┐
                                        │    Turso    │
                                        │   (SQLite)  │
                                        └─────────────┘
```

- **Astro** serves the frontend. API requests are made from the browser directly to the Express backend.
- **Express** handles all API logic, authentication, balance calculation, and data access.
- **Turso** is the SQLite-compatible edge database.

---

## Folder Structure

```
SplitMate/
├── backend/
│   └── src/
│       ├── index.ts          # Entry point
│       ├── app.ts            # Express app setup
│       ├── routes/           # Route handlers (thin controllers)
│       ├── middleware/       # Auth, validation, error handling
│       ├── db/               # Drizzle schema + client
│       ├── services/         # Business logic
│       ├── utils/            # Shared utilities
│       └── types/            # Shared TypeScript types
├── frontend/
│   └── src/
│       ├── layouts/          # Astro layouts
│       ├── pages/            # Astro pages
│       ├── components/       # Reusable UI components
│       ├── stores/           # Nano Stores
│       ├── lib/              # API client, helpers
│       └── styles/           # Global CSS
├── docs/                     # Project documentation
└── scripts/                  # Utility scripts
```

---

## Request Lifecycle

1. Browser makes API request to backend
2. Request passes through middleware stack: error handler → auth → validation
3. Route handler calls service layer
4. Service layer queries database via Drizzle ORM
5. Response flows back through middleware
6. Browser receives JSON response
7. Nano Store updates → reactive UI re-render

---

## Authentication Flow

1. User clicks "Sign in with Google" on landing page
2. Frontend calls `signInWithPopup()` via Firebase Auth SDK
3. Firebase returns authenticated user
4. Frontend gets Firebase ID token via `getIdToken()`
5. Frontend sends `POST /api/auth/firebase` with `Authorization: Bearer <token>`
6. Backend verifies token with Firebase Admin SDK
7. Backend upserts user (creates if new, updates name/avatar if changed)
8. Backend returns user profile
9. If `is_profile_complete` is false, redirect to /complete-profile
10. User enters UPI ID → `PATCH /me` → dashboard

---

## Group Flow

1. User creates group → `POST /groups` → backend generates invite code
2. User shares invite code/link with friends
3. Friends join via `POST /groups/join` with code
4. Owner can delete group → `DELETE /groups/:id` (cascade removes everything)
5. Members can leave → `POST /groups/:id/leave` (only if balance is ₹0)

---

## Expense Flow

1. Member creates expense → `POST /groups/:id/expenses`
2. Backend validates all participants are members, splits sum to amount
3. Expense + participants stored in database
4. On next group fetch, balances are recalculated dynamically

---

## Settlement Flow

1. Frontend displays simplified debts (computed by backend)
2. User clicks "Pay via UPI" → frontend opens `upi://pay` deep link
3. User pays manually in their UPI app
4. User returns to SplitMate, clicks "Mark as Settled"
5. `POST /groups/:id/settlements` records the settlement
6. Balances recalculate on next poll

---

## Balance Calculation Strategy

Balances are NEVER stored. They are computed on every group fetch.

Algorithm:
1. For each member, calculate total amount they paid across all expenses
2. For each member, calculate total share they owe across all expense participations
3. For each member, calculate total received via settlements (as receiver)
4. For each member, calculate total paid via settlements (as payer)
5. Net = paid - share + received - paid_out

---

## Polling Strategy

- Frontend polls `GET /groups/:id` every 1s while group detail page is active
- If 3 consecutive polls return identical data (hash comparison), back off to 5s
- On any user action (add expense, settle), reset to 1s immediately
- Polling stops when user navigates away from group detail
- Adaptive polling reduces server load during idle periods

---

## Database Relationships

```
users ──< group_members >── groups
users ──< expenses (paid_by)
users ──< expense_participants
users ──< settlements (payer)
users ──< settlements (receiver)
groups ──< expenses
groups ──< settlements
expenses ──< expense_participants
```

---

## External Integrations

- **Firebase Authentication**: Google Sign-In via Firebase Auth SDK (frontend) verified by Firebase Admin SDK (backend)
- **DiceBear**: Avatar generation fallback
- **UPI Deep Links**: `upi://pay` URI scheme to launch native UPI apps

---

## Important Architectural Decisions

- No WebSockets — polling is simpler, stateless, and sufficient for V1
- No stored balances — computed on every request to prevent sync bugs
- Firebase ID Tokens via Authorization header — verified by Firebase Admin SDK, auto-refresh via Firebase client SDK
- Greedy debt simplification — O(n log n), near-minimal transactions
- Adaptive polling — reduces server load while maintaining responsiveness
