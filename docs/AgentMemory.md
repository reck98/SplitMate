# Agent Memory

This file serves as persistent memory for AI agents working on this project.

## Project Identity

- **Name:** SplitMate
- **Description:** Lightweight expense-sharing app for Indian users
- **Tech Stack:** Astro + TypeScript + Tailwind + Nano Stores + astro-icon (frontend), Express + TypeScript + Drizzle ORM (backend), Turso (database)
- **Auth:** Firebase Authentication (Google Sign-In) via Authorization header
- **Design System:** CSS custom properties + Astro components (glassmorphism, dark/light mode)
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

## PWA Support

SplitMate is a Progressive Web App using `@vite-pwa/astro`.

- **Service Worker:** Workbox `generateSW`, auto-update strategy
- **Precache:** CSS, JS, fonts, images, icons (static assets only)
- **API:** NetworkOnly — never cached
- **Offline Fallback:** Prerendered `/offline` page with branding and retry button
- **Install Prompt:** Glassmorphism banner captured from `beforeinstallprompt` event; dismissible, hidden when already installed
- **Icons:** 192×192, 512×512, maskable variants, and Apple Touch Icon (180×180) — all emerald gradient
- **Manifest:** `display: standalone`, `orientation: portrait-primary`, categories: finance, productivity
- **Theme Color:** Dynamically updated via JS when toggling dark/light mode; manifest uses dark theme color

### Testing PWA

```bash
# Build and preview (SW only active in production)
cd frontend && npm run build && npm run preview
```

### Generating Icons

```bash
node scripts/generate-pwa-icons.mjs
```

## Key Design Decisions

- **SSE over Polling** (D-007 / D-013): Real-time updates via Server-Sent Events with automatic fallback
- **No stored balances** (D-002): Always computed dynamically, prevents sync bugs
- **Firebase Authentication** (D-008 / D-016): Google provider auth with persistent IndexedDB sessions
- **Preserved Raw Expense Obligations** (D-012): Disabled greedy debt simplification in favor of exact per-expense obligations and interactive Suggested Payment filters ("All", "You Owe", "Owed to You").
- **Monorepo** (D-006): Single repo with frontend/ and backend/
- **CSS Custom Properties Design System** (D-009): Theme and components via CSS, no React/Framer Motion
- **PWA Support** (D-011): Installable app with service worker, offline fallback, auto-updates via `@vite-pwa/astro`
- **SWR Client Caching & DB Parallelization** (D-017): Instant <10ms local storage cache rendering + parallelized Turso DB queries
- **Manual / Cash Settlements** (D-017): Direct inline cash settlements, fallback for missing UPI IDs, and Record Settlement modal

## Code Conventions

- Strong typing everywhere — no `any`
- Files under 500 lines, target <300
- Controllers are thin — business logic in services
- All API responses follow `{ success, data }` or `{ success, error }` format
- All IDs are UUIDs
- Timestamps are ISO 8601 strings
- Boolean in SQLite stored as integer (0/1)
- Design system uses CSS custom properties on `:root` and `[data-theme="dark"]`
- Components are Astro `.astro` files (not React/Vue/Svelte)
- Icons use `astro-icon` with `@iconify-json/lucide` collection
- Animations use CSS keyframes (not JavaScript animation libraries)

## Design System Components

Located in `frontend/src/components/`:

| Component         | Purpose                                                           |
| ----------------- | ----------------------------------------------------------------- |
| GlassCard.astro   | Glassmorphism card container (supports hover)                     |
| GlassButton.astro | Button (primary/secondary/ghost/danger, sm/md/lg, link or button) |
| GlassInput.astro  | Form input with label, hint, error state                          |
| GlassBadge.astro  | Badge/tag (default/success/warning/danger/info)                   |
| GlassAvatar.astro | Avatar with image or initial fallback                             |
| GlassModal.astro  | Modal dialog with backdrop blur                                   |
| Skeleton.astro    | Loading skeleton with shimmer animation                           |
| EmptyState.astro  | Empty state with icon and action slot                             |
| ThemeToggle.astro | Dark/light mode toggle                                            |
| Toast.astro       | Toast notification container                                      |

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

## Session Log

### 2025-07-25 — Frontend Design System Overhaul

**Completed:** Complete frontend redesign with glassmorphism design system, dark/light mode, animations, toast notifications, and skeleton loading.

**Key changes:**

- Created CSS design tokens system (`design-tokens.css`) with 40+ CSS custom properties for colors, spacing, shadows, blur, typography, and transitions
- Created animation system (`animations.css`) with 11 keyframe animations and utility classes
- Built 10 reusable Astro components (GlassCard, GlassButton, GlassInput, GlassBadge, GlassAvatar, Skeleton, EmptyState, GlassModal, ThemeToggle, Toast)
- Implemented dark/light theme with `data-theme` attribute, system preference detection, and localStorage persistence
- Integrated `astro-icon` with Lucide icon set
- Replaced all `alert()` calls with toast notification system
- Added skeleton loading states to dashboard and profile pages
- Added staggered list animations to dashboard, group detail
- Updated all 10 pages with new design system
- Changed primary palette from blue (`#2563eb`) to emerald (`#10b981`)
- Added Inter font family via Google Fonts
- Added `max-w-2xl` layout (from `max-w-lg`) for better desktop spacing
- Added viewport-fit cover and safe-area support
- Added apple-mobile-web-app meta tags
- Updated favicon to emerald accent color
- Updated Tailwind config with emerald primary palette

**Files created:**

- `frontend/src/styles/design-tokens.css` — Design system CSS custom properties
- `frontend/src/styles/animations.css` — Animation keyframes and utility classes
- `frontend/src/components/GlassCard.astro`
- `frontend/src/components/GlassButton.astro`
- `frontend/src/components/GlassInput.astro`
- `frontend/src/components/GlassBadge.astro`
- `frontend/src/components/GlassAvatar.astro`
- `frontend/src/components/Skeleton.astro`
- `frontend/src/components/EmptyState.astro`
- `frontend/src/components/GlassModal.astro`
- `frontend/src/components/ThemeToggle.astro`
- `frontend/src/components/Toast.astro`

**Files modified:**

- `frontend/package.json` — added `astro-icon`, `@iconify-json/lucide`
- `frontend/astro.config.mjs` — added `astro-icon` integration
- `frontend/tailwind.config.js` — emerald primary palette, Inter font
- `frontend/src/styles/global.css` — imports design tokens + animations, glass utility classes
- `frontend/src/layouts/BaseLayout.astro` — navigation bar, theme support, toast container
- `frontend/public/favicon.svg` — emerald accent color
- All 10 page `.astro` files — refactored with design system

**Docs updated:**

- `docs/Architecture.md` — design system architecture section
- `docs/AgentMemory.md` — full update with component table
- `docs/Decisions.md` — added D-009 (CSS Design System) and D-010 (Toast over alert)
- `docs/Changelog.md` — v0.3.0 with all changes

**Build verification:** ✅ Build passes (hybrid SSR), all pages compile

### 2026-07-25 — Progressive Web App (PWA) Implementation

**Completed:** Full PWA transformation — installable, auto-updating, offline fallback with glassmorphism design.

**Key changes:**

- Integrated `@vite-pwa/astro` with Workbox `generateSW` strategy
- Configured manifest: standalone display, portrait orientation, finance/productivity categories
- Generated 5 PWA icons (192, 512, maskable ×2, apple-touch-icon) via Sharp with emerald gradient
- Created `/offline` prere rendered page with branding and retry button
- Created InstallPrompt component: captures `beforeinstallprompt`, shows glassmorphism banner, persists dismissal
- Updated BaseLayout: apple-touch-icon link, apple-mobile-web-app-title, PWA meta tags
- Updated ThemeToggle: dynamically updates `theme-color` meta tag on mode switch
- Caching strategy: precache static assets only, NetworkOnly for API, NavigateFallback for offline

**Files created:**

- `frontend/scripts/generate-pwa-icons.mjs` — Icon generation script (Sharp)
- `frontend/src/pages/offline.astro` — Offline fallback page
- `frontend/src/components/InstallPrompt.astro` — Install banner component
- `frontend/public/pwa-192x192.png` — Standard manifest icon
- `frontend/public/pwa-512x512.png` — Large manifest icon
- `frontend/public/pwa-192x192-maskable.png` — Android maskable icon
- `frontend/public/pwa-512x512-maskable.png` — Android maskable icon
- `frontend/public/apple-touch-icon.png` — Apple Touch Icon

**Files modified:**

- `frontend/astro.config.mjs` — Added PWA integration with manifest, workbox, caching rules
- `frontend/src/layouts/BaseLayout.astro` — Added apple-touch-icon, apple-mobile-web-app-title, InstallPrompt
- `frontend/src/components/ThemeToggle.astro` — Syncs theme-color meta tag with theme changes
- `frontend/package.json` — Added `@vite-pwa/astro` dependency

**Docs updated:**

- `docs/Architecture.md` — Added PWA architecture section with caching rules table and platform support
- `docs/Development.md` — Added PWA development and icon generation notes
- `docs/Decisions.md` — Added D-011 (PWA Support) with detailed context and reasoning
- `docs/AgentMemory.md` — Added PWA support section, session log, key decision entry
- `docs/Changelog.md` — Added v0.4.0 section

**Build verification:** ✅ Build passes (hybrid SSR)

### 2026-07-28 — Raw Obligations & Suggested Payments UI Filters

**Completed:** Disabled debt simplification algorithm, added `expense_settlements` DB table, and introduced interactive Suggested Payment UI filters ("All", "You Owe", "Owed to You").

**Key changes:**

- Replaced greedy graph reduction algorithm in `backend/src/services/settlement.ts` with unsimplified per-expense obligation preservation.
- Created `expense_settlements` table in Drizzle schema and added `expense_id` to `settlements` table (`0003_lucky_marvel_apes.sql`).
- Updated API routes (`/groups/:id`, `/settlements`, `/expenses`) to handle and persist targeted expense obligations.
- Added segmented pill filters (**All**, **You Owe**, **Owed to You**) with count badges in group details UI (`groups/[id].astro`).
- Updated documentation across `Database.md`, `Architecture.md`, `API.md`, `Decisions.md`, `Changelog.md`, and `AgentMemory.md`.
- Migrated production database (`npm run db:migrate`) and pushed all changes to `origin/main` on GitHub.

**Build verification:** ✅ Tests pass (`npm test`, 19 passed), backend TypeScript clean (`tsc --noEmit`), frontend build clean (`astro build`).

### 2026-07-31 — Show QR Code Payment Modal & SEO Engine (v1.4.0)

**Completed:** Replaced browser-dependent UPI deep links with an in-app responsive **Show QR Code Payment Modal**, added Copy UPI ID + PNG Download features, integer paise split math, multi-payer strike-through fixes, and full SEO/Lighthouse optimization.

**Key changes:**
- Removed `openUpiApp` / `window.location.href` redirects; replaced all "Pay via UPI" buttons with **Show QR**.
- Integrated `qrcode` package to dynamically generate 600×600px high-resolution canvas QR codes encoding standard `upi://pay` URIs.
- Built responsive `#qr-modal` with glassmorphic styling, background scroll lock (`document.body.style.overflow = "hidden"`), ESC key listener, and backdrop click to close.
- Implemented **Copy UPI ID** via `navigator.clipboard` with toast confirmation.
- Implemented **Download QR** saving crisp PNG files with custom white background padding (`splitmate-payment-{receiver}-{amount}.png`).
- Added `robots.txt`, `sitemap.xml`, Open Graph meta, Twitter Card meta, Canonical links, and JSON-LD `SoftwareApplication` structured data.
- Optimized Google Fonts (`font-display: swap`) and touch-target padding for 100/100 Lighthouse scores.
- Pushed commits to GitHub `origin/main`.

**Build verification:** ✅ Frontend build (`astro build`, 12 pages) clean, backend build (`tsc`) clean.

