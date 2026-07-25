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

## Key Design Decisions

- **Polling over WebSockets** (D-001): Simpler deployment, stateless backend
- **No stored balances** (D-002): Always computed, prevents sync bugs
- **JWT in httpOnly cookie** (D-003): More secure than localStorage (deprecated — now using Firebase tokens via Authorization header)
- **Greedy debt simplification** (D-004): O(n log n), near-minimal transactions
- **Adaptive polling** (D-005): 10s active / 15s idle
- **Monorepo** (D-006): Single repo with frontend/ and backend/
- **CSS Custom Properties Design System** (D-009): Theme and components via CSS, no React/Framer Motion
- **Toast over alert()** (D-010): Non-blocking notification system via DOM

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
| Component | Purpose |
|---|---|
| GlassCard.astro | Glassmorphism card container (supports hover) |
| GlassButton.astro | Button (primary/secondary/ghost/danger, sm/md/lg, link or button) |
| GlassInput.astro | Form input with label, hint, error state |
| GlassBadge.astro | Badge/tag (default/success/warning/danger/info) |
| GlassAvatar.astro | Avatar with image or initial fallback |
| GlassModal.astro | Modal dialog with backdrop blur |
| Skeleton.astro | Loading skeleton with shimmer animation |
| EmptyState.astro | Empty state with icon and action slot |
| ThemeToggle.astro | Dark/light mode toggle |
| Toast.astro | Toast notification container |

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
