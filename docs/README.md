# Timesheet & Cost Allocation System

A full-stack web application for managing employee timesheets, charge code allocation, approval workflows, budget tracking, and cost reporting.

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 10+
- Supabase account (for PostgreSQL database and auth)

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd ts

# Install dependencies
cd backend && pnpm install
cd ../frontend && pnpm install

# Configure environment variables
cp backend/.env.sample backend/.env
# Edit backend/.env with your Supabase credentials

# Create frontend env file (must be .env.local, not .env — see env-setup.md)
touch frontend/.env.local
# Add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_API_URL

# Run database migrations
cd backend && pnpm db:migrate

# Start backend (port 3001)
cd backend && pnpm start:dev

# Start frontend (port 3000)
cd frontend && pnpm dev
```

The backend API docs (Swagger) are available at `http://localhost:3001/api/docs`.

## Project Structure

```
ts/
├── backend/             # NestJS REST API
│   └── src/
│       ├── approvals/       # Approval workflow module
│       ├── budgets/         # Budget tracking module
│       ├── calendar/        # Calendar & holiday management
│       ├── charge-codes/    # Charge code hierarchy
│       ├── common/          # Guards, decorators, filters
│       ├── database/        # Drizzle ORM schema & provider
│       ├── integrations/    # Teams bot, notifications, CSV upload
│       ├── reports/         # Reporting & analytics
│       ├── schedulers/      # Cron jobs (cutoff, notifications, budgets)
│       ├── timesheets/      # Timesheet & entry management
│       └── users/           # User profile management
├── frontend/            # Next.js 16 web application
│   └── src/
│       ├── app/             # App Router pages
│       ├── components/      # Reusable UI components
│       └── lib/             # API client, Supabase, utilities
├── docs/                # Project documentation
│   └── test-results/    # Test execution results
└── specs/               # Project specifications
```

## Documentation

- [Environment Setup](env-setup.md) -- All environment variables with descriptions
- [Architecture](architecture.md) -- System architecture, data flow, and design patterns
- [API Reference](api-reference.md) -- Complete REST API endpoint documentation
- [API Contracts](api-contracts.md) -- Request/response shapes for all endpoints
- [Database Schema](database-schema.md) -- Full ERD and table definitions
- [Deployment Guide](deployment.md) -- Step-by-step deployment instructions
- [Troubleshooting](troubleshooting.md) -- Common issues and fixes
- [Test Results](test-results/summary.md) -- Test execution summary

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, TanStack Query, TanStack Table, Recharts, shadcn/ui |
| Backend | NestJS 11, TypeScript, Drizzle ORM, Swagger/OpenAPI |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth (JWT), JWKS verification |
| Scheduling | @nestjs/schedule (cron jobs) |
| Integrations | Microsoft Teams Bot Framework |
