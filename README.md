# SplitMate

Modern expense sharing built for India with UPI QR settlements.

Track group expenses, preserve original debt chains, and settle instantly using any UPI app—without payment gateway commissions.

[![License](https://img.shields.io/github/license/reck98/SplitMate?style=flat)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/reck98/SplitMate?style=flat)](https://github.com/reck98/SplitMate/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/reck98/SplitMate?style=flat)](https://github.com/reck98/SplitMate/network/members)
[![GitHub Issues](https://img.shields.io/github/issues/reck98/SplitMate?style=flat)](https://github.com/reck98/SplitMate/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/reck98/SplitMate?style=flat)](https://github.com/reck98/SplitMate/pulls)
[![Last Commit](https://img.shields.io/github/last-commit/reck98/SplitMate?style=flat)](https://github.com/reck98/SplitMate/commits/main)
[![Repository Size](https://img.shields.io/github/repo-size/reck98/SplitMate?style=flat)](https://github.com/reck98/SplitMate)
[![Top Language](https://img.shields.io/github/languages/top/reck98/SplitMate?style=flat)](https://github.com/reck98/SplitMate)
[![Astro](https://img.shields.io/badge/Astro-BC52EE?style=flat&logo=astro&logoColor=white)](https://astro.build/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=flat&logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![Open Source](https://img.shields.io/badge/Open_Source-%E2%9D%A4-red?style=flat)](https://github.com/reck98/SplitMate)
[![Maintained](https://img.shields.io/badge/Maintained-yes-brightgreen?style=flat)](https://github.com/reck98/SplitMate)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat)](https://github.com/reck98/SplitMate/pulls)

<p align="center">
  <img src="assets/dashboard.png" alt="SplitMate Landing Page & Dashboard" width="100%">
</p>

## Quick Navigation

- [Features](#features)
- [User Flow](#user-flow)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Features

### Expense Management

- **Create Expenses**: Easily log bill items with customizable titles, dates, and amounts using integer paise calculation to eliminate rounding issues.
- **Equal Split**: Evenly divide bill costs across all selected group members with automatic balance calculation.
- **Unequal Split**: Assign exact custom debt amounts to individual participants.
- **Exact Amount Split**: Input specific monetary contributions for each participant in a single bill.
- **Percentage Split**: Allocate shared expenses based on precise percentage ratios across group members.

### Groups

- **Create Groups**: Organize expenses seamlessly for trips, shared households, events, or roommate bills.
- **Invite Members**: Instantly onboard friends using unique group invite codes or shareable direct join links.
- **Manage Members**: View active group participants, monitor contribution history, and manage access.

### Settlements

- **Preserve Original Debt Chain**: Retain explicit debtor-creditor transaction chains or activate greedy debt minimization.
- **Suggested Settlements**: Automatically generate the optimal, minimal set of transactions required to resolve all group balances.
- **Generate UPI QR**: Dynamic generation of scannable UPI QR codes pre-filled with payee VPA and settlement amounts for apps like GPay, PhonePe, and Paytm.
- **Copy UPI ID**: One-click action to instantly copy the payee's UPI VPA to clipboard.
- **Download QR**: Export generated settlement QR codes as PNG images to share offline or via messaging apps.
- **Mark Settlements as Paid**: Record manual cash or UPI settlements with live line-item strike-through balance updates.

### Authentication

- **Google Authentication**: Secure, one-click authentication powered by Firebase Authentication with Google OAuth 2.0.

### User Experience

- **Responsive Design**: Modern glassmorphic interface engineered for smooth performance on desktop, tablet, and mobile displays.
- **Mobile-Friendly**: Installable Progressive Web App (PWA) with Workbox offline caching and app-like mobile experience.
- **Fast Performance**: Instant client state hydrations (<10ms load times) using Nano Stores and SWR client-side caching.
- **Real-Time Updates**: Instant live state synchronization across group members using Server-Sent Events (SSE).

## User Flow

The diagram below outlines the complete user journey within SplitMate, illustrating authentication, group management, expense splits, dynamic balance calculations, and UPI QR settlements:

```mermaid
flowchart TD
    subgraph Auth["🔐 1. Authentication Flow"]
        A[Landing Page] --> B{Authenticated?}
        B -- No --> C[Google OAuth Login]
        C --> D[Firebase Auth Token Verification]
        D --> E[Establish User Session]
        B -- Yes --> E
    end

    subgraph Workspace["📱 2. Group Workspace"]
        E --> F[Dashboard]
        F --> G{Select Action}
        G -- Create --> H[Create New Group]
        G -- Join --> I[Enter Invite Code / Link]
        H --> J[Group Dashboard]
        I --> J
    end

    subgraph ExpenseFlow["💸 3. Expense Creation & Splitting"]
        J --> K[View Group Overview & Balances]
        K --> L[Click 'Add Expense']
        L --> M[Enter Amount, Title & Date]
        M --> N{Select Split Type}
        N -- Equal --> O1[Split Equally]
        N -- Unequal --> O2[Specify Custom Amounts]
        N -- Percentage --> O3[Allocate Percentages %]
        O1 --> P[Validate & Save Expense]
        O2 --> P
        O3 --> P
        P --> Q[Backend Transaction Saved]
        Q --> R[Calculate Net Balances & Minimum Debt Graph]
        R --> S[Real-Time SSE Sync to Group Members]
    end

    subgraph SettlementFlow["🤝 4. Settlement & UPI Payment"]
        S --> T[View Updated Balances]
        T --> U{User Action}
        U -- View Details --> V[Expense History & Itemized Debts]
        U -- Settle Debt --> W[View Suggested Settlements]
        W --> X[Click 'Show QR Payment Modal']
        X --> Y[Generate Dynamic UPI Payment URI & QR Code]
        Y --> Z{Payment Action}
        Z -- Scan QR --> AA1[Open GPay / PhonePe / Paytm / CRED]
        Z -- Copy UPI ID --> AA2[Copy VPA to Clipboard]
        Z -- Download QR --> AA3[Save QR PNG Image]
        AA1 --> AB[Complete Payment in UPI App]
        AA2 --> AB
        AA3 --> AB
        AB --> AC[Click 'Mark as Paid' / Cash Settle]
        AC --> AD[Record Settlement Transaction]
        AD --> AE[Re-calculate Balances & Update Status]
    end
```

## Tech Stack

### Frontend

- **Astro**: High-performance web framework for hybrid server-side rendering and static pages.
- **TypeScript**: End-to-end static typing for robust development and maintainability.
- **Tailwind CSS**: Utility-first CSS framework with glassmorphism design tokens and dark mode.
- **Nano Stores**: Lightweight, framework-agnostic reactive state management.

### Backend

- **Node.js**: Asynchronous event-driven JavaScript runtime environment.
- **Express**: Fast, unopinionated REST API framework with Server-Sent Events (SSE).
- **TypeScript**: Shared domain models, Drizzle schemas, and utility types.

### Database

- **PostgreSQL / Turso (SQLite)**: Edge-replicated database engine for quick query responses.
- **Drizzle ORM**: Type-safe SQL ORM and database migration toolkit.

### Authentication

- **Google OAuth 2.0**: Secure social authentication handled via Firebase Authentication.

### Payments

- **UPI QR**: Standardized Indian Unified Payments Interface URI scheme (`upi://pay`).

### Deployment

- **Render**: Containerized edge hosting for production frontend and backend web services.

## Architecture

SplitMate utilizes a modular, decoupled architecture dividing client presentation, server processing, database storage, and external integrations:

```mermaid
graph TD
    subgraph ClientLayer["📱 Client Layer (Browser & PWA)"]
        UI["Astro Glassmorphic UI<br/>(Tailwind CSS & Design Tokens)"]
        PWA["PWA Service Worker<br/>(Workbox Offline Caching)"]
        State["Nano Stores<br/>(Client-Side Reactive State)"]
    end

    subgraph FrontendServer["⚡ Frontend Server (Astro Node App / Render)"]
        Pages["Astro Server Routes<br/>(Hybrid SSR & Static Pages)"]
        APIClient["API Client / Fetch Wrapper<br/>(With SWR & Auth Headers)"]
    end

    subgraph BackendServer["⚙️ Backend Server (Express Node.js / Render)"]
        AuthMiddleware["Firebase Auth Middleware<br/>(ID Token Verification)"]
        Routes["Express API Routes<br/>(/auth, /groups, /expenses, /settlements)"]
        SSEEngine["SSE Broadcast Engine<br/>(Real-Time Live Updates)"]
        DebtAlgo["Greedy Debt Minimizer<br/>(Zero-Storage Balance Algorithm)"]
    end

    subgraph DatabaseLayer["🗄️ Database Layer"]
        Drizzle["Drizzle ORM Schema Client"]
        Turso["Turso Database<br/>(SQLite / PostgreSQL compatible)"]
    end

    subgraph ExternalServices["🔌 External Services & Protocols"]
        FirebaseAuth["Firebase Authentication<br/>(Google OAuth Provider)"]
        UPIPay["UPI QR Payment Flow<br/>(PhonePe, GPay, Paytm, CRED)"]
    end

    UI -->|"Google OAuth"| FirebaseAuth
    UI -->|"HTTP REST API"| Routes
    UI -->|"SSE Connection"| SSEEngine
    UI -->|"Show QR / Copy VPA"| UPIPay

    Pages --> APIClient
    APIClient -->|"Bearer Token REST"| Routes

    Routes --> AuthMiddleware
    Routes --> DebtAlgo
    Routes --> Drizzle
    Routes --> SSEEngine

    Drizzle -->|"SQL Driver"| Turso
```

### High-Level System Design

- **Frontend Application**: Constructed with Astro SSR and Tailwind CSS, incorporating Nano Stores for fast client-side state transitions and Workbox PWA offline capabilities.
- **Backend API & Real-Time Sync**: Express.js server providing REST API endpoints secured with Firebase Admin SDK middleware, broadcasting real-time data using Server-Sent Events (SSE).
- **Database & Persistence**: Managed with Drizzle ORM connected to Turso/PostgreSQL, enforcing strict foreign key constraints and atomic transaction updates.
- **Authentication System**: Google OAuth 2.0 via Firebase Auth. Client apps pass verified Bearer tokens on every backend request.
- **Expense Calculation Engine**: Converts all financial inputs into integer paise to guarantee zero precision loss across equal, unequal, exact, and percentage split models.
- **Settlement Engine**: Implements a Greedy Debt Minimization algorithm that computes optimal payment transfers on demand without unnecessary state persistence.
- **UPI QR Engine**: Generates valid `upi://pay` URIs dynamically compiled into PNG QR codes containing recipient VPA, payee name, transaction note, and exact debt amount.

## Installation

Follow these steps to configure and run SplitMate locally on your system.

### Prerequisites

- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **Git**: Installed on your system

### Setup Instructions

1. **Clone the Repository**

   ```bash
   git clone https://github.com/reck98/SplitMate.git
   cd SplitMate
   ```

2. **Install Dependencies**

   ```bash
   # Install root dependencies
   npm install

   # Install backend dependencies
   cd backend && npm install

   # Install frontend dependencies
   cd ../frontend && npm install

   # Return to root directory
   cd ..
   ```

3. **Configure Environment Variables**

   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

4. **Initialize Database**

   ```bash
   # Generate Drizzle migration files
   npm run db:generate

   # Apply migrations to database
   npm run db:migrate
   ```

5. **Run Development Servers**
   ```bash
   npm run dev
   ```
   - **Frontend App**: [http://localhost:4321](http://localhost:4321)
   - **Backend API**: [http://localhost:3000](http://localhost:3000)

## Environment Variables

### Backend Configuration (`backend/.env`)

| Variable                | Purpose                                                 | Required | Example / Default                    |
| :---------------------- | :------------------------------------------------------ | :------: | :----------------------------------- |
| `PORT`                  | Port number for Express REST API server                 |   Yes    | `3000`                               |
| `CLIENT_URL`            | Frontend client URL allowed by CORS policy              |   Yes    | `http://localhost:4321`              |
| `JWT_SECRET`            | Secret key used for internal JWT signature verification |   Yes    | `your-jwt-secret-key`                |
| `TURSO_DATABASE_URL`    | Connection URL for Turso / SQLite edge database         |   Yes    | `libsql://your-db.turso.io`          |
| `TURSO_AUTH_TOKEN`      | Authentication token for database connections           |   Yes    | `your-turso-auth-token`              |
| `FIREBASE_PROJECT_ID`   | Firebase project ID for token verification              |   Yes    | `your-firebase-project-id`           |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin SDK service account email                |   Yes    | `firebase-adminsdk@...`              |
| `FIREBASE_PRIVATE_KEY`  | Firebase Admin SDK service account private key          |   Yes    | `"-----BEGIN PRIVATE KEY-----\n..."` |

### Frontend Configuration (`frontend/.env`)

| Variable                      | Purpose                                        | Required | Example / Default              |
| :---------------------------- | :--------------------------------------------- | :------: | :----------------------------- |
| `PUBLIC_API_URL`              | Base URL of backend REST API server            |   Yes    | `http://localhost:3000`        |
| `PUBLIC_FIREBASE_API_KEY`     | Firebase Web API key for client authentication |   Yes    | `AIzaSy...`                    |
| `PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Authentication domain host            |   Yes    | `your-project.firebaseapp.com` |
| `PUBLIC_FIREBASE_PROJECT_ID`  | Firebase project ID for web app initialization |   Yes    | `your-firebase-project-id`     |
| `PUBLIC_FIREBASE_APP_ID`      | Firebase App ID for web client initialization  |   Yes    | `1:123456789:web:abcdef`       |

## Project Structure

```text
SplitMate/
├── assets/                  # Documentation media & hero images
├── backend/                 # Express API server
│   └── src/
│       ├── db/              # Drizzle ORM schema & database client
│       ├── middleware/      # Auth verification & CORS middleware
│       ├── routes/          # API route handlers (/auth, /groups, /expenses)
│       ├── services/        # Business logic & greedy debt settlement engine
│       ├── types/           # Domain TypeScript types & contracts
│       └── utils/           # Logger & calculation utilities
├── docs/                    # Architecture, API & DB documentation
├── frontend/                # Astro frontend application
│   └── src/
│       ├── assets/          # Static UI icons & graphics
│       ├── components/      # UI components (QR Modal, Expense Card, Forms)
│       ├── layouts/         # Base layout wrappers
│       ├── lib/             # API client, SWR cache & Firebase helpers
│       ├── pages/           # Astro SSR pages & routes
│       └── styles/          # Design system CSS tokens & Tailwind styles
├── scripts/                 # Database migration & utility scripts
├── LICENSE                  # MIT License
├── package.json             # Root monorepo scripts & dependencies
└── README.md                # Project README
```

## Contributing

Contributions are welcome! If you'd like to report a bug, suggest an enhancement, or submit a feature:

1. Fork the repository (`https://github.com/reck98/SplitMate/fork`)
2. Create a new feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to your branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please run code formatting and lint checks (`npm run lint`, `npm run format`) before opening a PR.

## License

This project is licensed under the [MIT License](LICENSE).
