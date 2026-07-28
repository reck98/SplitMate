# SplitMate

Lightweight expense-sharing application built for Indian users. Track expenses, calculate balances, and settle debts through your preferred UPI app — no payment gateways required.

## Features

- Google Sign-In via Firebase Authentication
- Create groups with invite codes
- Join groups via invite code or link
- Add expenses with equal or custom splits
- Dynamic balance calculation (never stored)
- Simplified debt settlement algorithm
- One-click UPI deep links for payments
- Manual & cash settlement recording (modal & inline cash settle)
- Real-time updates via Server-Sent Events (SSE)
- Instant SWR client caching (<10ms load time)
- Mobile-first responsive glassmorphic design

## Technology Stack

| Layer      | Technology                                   |
| ---------- | -------------------------------------------- |
| Frontend   | Astro, TypeScript, Tailwind CSS, Nano Stores |
| Backend    | Node.js, Express, TypeScript, Drizzle ORM    |
| Database   | Turso (SQLite-compatible)                    |
| Auth       | Firebase Authentication (Google Provider)    |
| Deployment | Vercel (frontend), Railway (backend)         |

## Project Structure

```
SplitMate/
├── backend/             # Express API server
│   └── src/
│       ├── routes/      # Route handlers
│       ├── middleware/   # Auth, validation, error handling
│       ├── db/          # Drizzle schema + client
│       ├── services/    # Business logic
│       ├── utils/       # Utilities
│       └── types/       # Shared types
├── frontend/            # Astro web app
│   └── src/
│       ├── pages/       # Route pages
│       ├── layouts/     # Layouts
│       ├── components/  # UI components
│       ├── stores/      # Nano Stores
│       ├── lib/         # API client, helpers
│       └── styles/      # Global CSS
├── docs/                # Documentation
└── scripts/             # Utility scripts
```

## Local Setup

### Prerequisites

- Node.js 18+
- npm

### 1. Clone and install

```bash
git clone <repo-url>
cd SplitMate

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install

# Go back to root
cd ..
```

### 2. Environment variables

Copy the example env files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Fill in the required values:

**backend/.env**

```
PORT=3000
CLIENT_URL=http://localhost:4321
JWT_SECRET=your-jwt-secret
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**frontend/.env**

```
PUBLIC_API_URL=http://localhost:3000
PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project-id
PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### 3. Database setup

```bash
# Generate migrations
npm run db:generate

# Apply migrations
npm run db:migrate
```

### 4. Run development servers

```bash
# From root — runs both backend and frontend
npm run dev

# Or run individually:
npm run dev:backend   # http://localhost:3000
npm run dev:frontend  # http://localhost:4321
```

## Development Commands

| Command                | Description                    |
| ---------------------- | ------------------------------ |
| `npm run dev`          | Run both services              |
| `npm run dev:backend`  | Run backend only               |
| `npm run dev:frontend` | Run frontend only              |
| `npm run build`        | Build both services            |
| `npm run lint`         | Type-check both services       |
| `npm run db:generate`  | Generate Drizzle migrations    |
| `npm run db:migrate`   | Apply migrations to Turso      |
| `npm run db:studio`    | Open Drizzle Studio            |
| `npm run format`       | Format all files with Prettier |

## Deployment

### Frontend (Render — Web Service)

Since group pages are dynamically rendered, the frontend runs as a Node server.

| Setting           | Value                                         |
| ----------------- | --------------------------------------------- |
| **Type**          | Web Service                                   |
| **Build Command** | `cd frontend && npm install && npm run build` |
| **Start Command** | `cd frontend && node ./dist/server/entry.mjs` |
| **Node Version**  | 18                                            |

Add environment variables from `frontend/.env.example`.

### Backend (Render — Web Service)

| Setting           | Value                                        |
| ----------------- | -------------------------------------------- |
| **Type**          | Web Service                                  |
| **Build Command** | `cd backend && npm install && npm run build` |
| **Start Command** | `cd backend && npm start`                    |
| **Node Version**  | 18                                           |

Add environment variables from `backend/.env.example`.

### Database (Turso)

1. Create a Turso database
2. Copy the database URL and auth token
3. Run `npm run db:migrate` to apply schema

## High-Level System Architecture

```mermaid
graph TD
    subgraph ClientLayer["📱 Client Layer (Browser & PWA)"]
        UI["Astro Glassmorphic UI<br/>(Tailwind CSS & Design Tokens)"]
        PWA["PWA Service Worker<br/>(Workbox Offline Caching)"]
        State["Nano Stores<br/>(Client-Side Reactive State)"]
    end

    subgraph FrontendServer["⚡ Frontend Server (Astro Node App / Vercel)"]
        Pages["Astro Server Routes<br/>(Hybrid SSR & Static Pages)"]
        APIClient["API Client / Fetch Wrapper<br/>(With SWR & Auth Headers)"]
    end

    subgraph BackendServer["⚙️ Backend Server (Express Node.js / Railway)"]
        AuthMiddleware["Firebase Auth Middleware<br/>(ID Token Verification)"]
        Routes["Express API Routes<br/>(/auth, /groups, /expenses, /settlements)"]
        SSEEngine["SSE Broadcast Engine<br/>(Real-Time Live Updates)"]
        DebtAlgo["Greedy Debt Minimizer<br/>(Zero-Storage Balance Algorithm)"]
    end

    subgraph DatabaseLayer["🗄️ Database Layer"]
        Drizzle["Drizzle ORM Schema Client"]
        Turso["Turso Database<br/>(SQLite-compatible Edge DB)"]
    end

    subgraph ExternalServices["🔌 External Services & Protocols"]
        FirebaseAuth["Firebase Authentication<br/>(Google OAuth Provider)"]
        UPIPay["Native UPI Deep Links<br/>(PhonePe, GPay, Paytm, CRED)"]
    end

    UI -->|"Google OAuth"| FirebaseAuth
    UI -->|"HTTP REST API"| Routes
    UI -->|"SSE Connection"| SSEEngine
    UI -->|"1-Click Deep Links"| UPIPay

    Pages --> APIClient
    APIClient -->|"Bearer Token REST"| Routes

    Routes --> AuthMiddleware
    Routes --> DebtAlgo
    Routes --> Drizzle
    Routes --> SSEEngine

    Drizzle -->|"SQL Driver"| Turso
```

See [docs/Architecture.md](docs/Architecture.md) for detailed architecture documentation.

## API

See [docs/API.md](docs/API.md) for complete API documentation.

## Database Schema

See [docs/Database.md](docs/Database.md) for schema details.

## Development Status

See [docs/Development.md](docs/Development.md) for current milestone and roadmap.

## License

MIT
