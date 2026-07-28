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
│       ├── components/       # Reusable design system components (Astro)
│       ├── stores/           # Nano Stores
│       ├── lib/              # API client, helpers
│       └── styles/           # Global CSS, design tokens, animations
├── docs/                     # Project documentation
└── scripts/                  # Utility scripts
```

---

## Design System Architecture

The design system is built with CSS custom properties and Astro components:

```
src/
├── styles/
│   ├── design-tokens.css     # CSS custom properties for theme (colors, spacing, shadows, blur)
│   ├── animations.css        # Keyframe animations (fade, slide, scale, shimmer, stagger)
│   └── global.css            # Imports design tokens + animations, Tailwind base/components/utilities
├── components/
│   ├── GlassCard.astro       # Glassmorphism card container
│   ├── GlassButton.astro     # Button with primary/secondary/ghost/danger variants
│   ├── GlassInput.astro      # Form input with label, hint, error states
│   ├── GlassBadge.astro      # Badge/tag with variant colors
│   ├── GlassAvatar.astro     # Avatar with image or initial-based fallback
│   ├── GlassModal.astro      # Modal dialog with backdrop blur
│   ├── Skeleton.astro        # Loading skeleton with shimmer animation
│   ├── EmptyState.astro      # Empty state with icon, title, description, action slot
│   ├── ThemeToggle.astro     # Dark/light mode toggle with sun/moon icons
│   └── Toast.astro           # Toast notification container + showToast() API
```

### Theme System

- CSS custom properties on `:root` (light) and `[data-theme="dark"]`
- System preference detected via `prefers-color-scheme` media query
- User preference persisted in `localStorage` under key `splitmate-theme`
- Theme toggle script sets `data-theme` attribute on `<html>`
- Smooth transition on `background` and `color` properties (200ms)

### Animation System

- CSS keyframes for: `fadeIn`, `fadeInUp`, `fadeInDown`, `fadeInScale`, `slideInRight`, `scaleIn`, `shimmer`, `spin`, `pulse`, `toastIn`, `toastOut`
- Utility classes: `.animate-fade-in`, `.animate-fade-in-up`, `.stagger`, `.animate-shimmer`
- Staggered lists via `:nth-child(n)` with incremental `animation-delay`
- All animations respect `prefers-reduced-motion` (durations set to 0.01ms)

---

## Request Lifecycle

1. Browser makes API request to backend
2. Request passes through middleware stack: error handler → auth → validation
3. Route handler calls service layer
4. Service layer queries database via Drizzle ORM
5. Response flows back through middleware
6. Browser receives JSON response
7. Nano Store updates → reactive DOM updates

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

## Real-Time Updates via Server-Sent Events (SSE)

- Frontend establishes a single persistent SSE connection to `GET /api/groups/:id/sse` when viewing a group
- Connection is authenticated via Firebase ID token passed as a query parameter (`?token=`)
- Backend broadcasts full group state to all connected members immediately after any mutation (expense created/updated/deleted, settlement recorded, member joined/left)
- Each broadcast targets only members of the affected group — no global broadcast
- Keepalive pings every 30s prevent proxy timeouts
- On tab visibility change or network reconnect, the frontend performs a one-time full data refresh for consistency
- The SSE client auto-reconnects with a fresh Firebase token on connection loss
- No periodic polling — zero API requests during idle viewing

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
- **Inter Font**: Google Fonts for typography
- **Lucide Icons**: via `astro-icon` integration
- **UPI Deep Links**: `upi://pay` URI scheme to launch native UPI apps
- **@vite-pwa/astro**: PWA integration — web app manifest, service worker via Workbox, install prompt handling

---

## Important Architectural Decisions

- Server-Sent Events for real-time updates — immediate push without polling overhead
- No stored balances — computed on every request to prevent sync bugs
- Firebase ID Tokens via Authorization header — verified by Firebase Admin SDK, auto-refresh via Firebase client SDK
- Greedy debt simplification — O(n log n), near-minimal transactions
- In-memory SSE event bus — lightweight, no external dependency
- CSS custom properties design system — no component framework needed for theming
- Toast notifications over alert() — non-blocking, styled, accessible
- Progressive Web App support — installable, offline fallback, auto-updating service worker

---

## Progressive Web App (PWA) Architecture

SplitMate is configured as a fully installable Progressive Web App:

```
┌─────────────────────────────────────┐
│         Browser / Standalone        │
├─────────────────────────────────────┤
│    Service Worker (Workbox)         │
│  ┌───────────────────────────────┐  │
│  │  Precache: CSS, JS, Fonts,   │  │
│  │  Images, Icons                │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │  NetworkOnly: API requests    │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │  NavigateFallback: /offline   │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Service Worker Strategy

- **Strategy:** `generateSW` (via `@vite-pwa/astro`)
- **Registration:** Auto-update (`registerType: 'autoUpdate'`)
- **Precache:** CSS, JavaScript, web fonts, SVG icons, PNG icons — all versioned static assets
- **API:** NetworkOnly — never cache any backend response
- **Navigation:** NetworkFirst with offline fallback to `/offline`

### Caching Rules

| Asset Type         | Strategy         | Purpose                                   |
| ------------------ | ---------------- | ----------------------------------------- |
| CSS, JS            | Precache         | Always available, versioned by build hash |
| Fonts (woff/woff2) | Precache         | Inter font files                          |
| Images, Icons      | Precache         | Logo, PWA icons, favicon                  |
| API (`/api/*`)     | NetworkOnly      | Never cached, always fresh data           |
| Navigation (HTML)  | NavigateFallback | Offline page when no network              |

### Offline Experience

- A dedicated `/offline` page is prerendered and served when the device is offline
- The page features SplitMate branding and a "Retry" button
- No attempt is made to cache or sync expense/group data offline

### Install Experience

- **Browser Prompt:** The `beforeinstallprompt` event is captured and displayed as a polished glassmorphism install banner at the bottom of the screen
- **Smart Display:** The banner auto-hides if the app is already installed (standalone mode)
- **Dismiss Tracking:** "Not now" dismissal is persisted to `localStorage` (key: `splitmate-install-dismissed`)
- **Post-Install:** The `appinstalled` event clears the dismiss flag

### Icons

| File                       | Size    | Purpose                          |
| -------------------------- | ------- | -------------------------------- |
| `pwa-192x192.png`          | 192×192 | Standard manifest icon           |
| `pwa-512x512.png`          | 512×512 | Large manifest icon              |
| `pwa-192x192-maskable.png` | 192×192 | Adaptive maskable icon (Android) |
| `pwa-512x512-maskable.png` | 512×512 | Adaptive maskable icon (Android) |
| `apple-touch-icon.png`     | 180×180 | Apple Touch Icon (iPhone/iPad)   |
| `favicon.svg`              | 24×24   | Browser favicon                  |

All icons use an emerald gradient background (`#10b981` → `#059669`) with a white clock symbol.

### Apple Support

- `apple-mobile-web-app-capable`: Enables standalone launch on iOS
- `apple-mobile-web-app-status-bar-style`: Default styling
- `apple-mobile-web-app-title`: SplitMate
- `apple-touch-icon`: 180x180 PNG

### Theme Color

- `theme-color` meta tag is dynamically updated via JavaScript when the user toggles dark/light mode
- Manifest `theme_color` is set to `#09090b` (dark) as the default installed-PWA appearance

### Platform Support

| Platform         | Install | Standalone | Icons             |
| ---------------- | ------- | ---------- | ----------------- |
| Android Chrome   | ✓       | ✓          | Adaptive maskable |
| Samsung Internet | ✓       | ✓          | Standard          |
| Microsoft Edge   | ✓       | ✓          | Standard          |
| iPhone Safari    | ✓       | ✓          | Apple Touch Icon  |
| iPad Safari      | ✓       | ✓          | Apple Touch Icon  |
