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

## User Roles & Test Accounts

### Roles

| Role | Permissions | Sidebar Access |
|------|-----------|----------------|
| **employee** | Log time, submit timesheets, view own charge codes | Main + Insight |
| **charge_manager** | All employee permissions + approve as manager, create/manage charge codes | Main + Insight |
| **pmo** | All employee permissions + view all reports, monitor budgets | Main + Insight |
| **finance** | All employee permissions + view financial reports, cost rates | Main + Insight |
| **admin** | Full access — all of the above + manage users, calendar, rates | Main + Insight + Admin |

### Approval Workflow

```
Employee submits → Manager approves → Charge Code Owner approves → Locked
   (draft→submitted)  (submitted→manager_approved)  (manager_approved→cc_approved→locked)
```

- **Manager**: determined by `profiles.manager_id` — approves timesheets of direct reports
- **CC Owner**: determined by `charge_codes.owner_id` / `approver_id` — approves timesheets with entries on their charge codes

### Test Accounts (password: `password1234` for all)

| Email | Name | Role | Manager | Assigned Charge Codes | Test Purpose |
|-------|------|------|---------|----------------------|-------------|
| tachongrak@central.co.th | Tachongrak | admin | — | PRG-001 (program owner/approver) | CC Owner approve, admin pages |
| nattaya.k@central.co.th | Nattaya Kaewkla | charge_manager | Tachongrak | PRJ-001, PRJ-002 | Manager approve (Wichai, Ploy) |
| somchai.p@central.co.th | Somchai Prasert | pmo | Tachongrak | PRJ-003, PRJ-004, ACT-008~011 | View reports, monitor budgets |
| wichai.s@central.co.th | Wichai Srisuk | employee | Nattaya | ACT-001~004, TSK-001~003 | Submit timesheet (Backend) |
| ploy.r@central.co.th | Ploy Rattanaporn | employee | Nattaya | ACT-005~007, TSK-004~005 | Submit timesheet (Frontend) |

### Org Chart

```
Tachongrak (admin)
├── Nattaya (charge_manager) — manager of Wichai & Ploy
│   ├── Wichai (employee) — Backend API team
│   └── Ploy (employee) — Frontend App team
└── Somchai (pmo) — Infrastructure & QA oversight
```

### New OMS Project Structure

```
PRG-001 New OMS (budget: ฿5M)
├── PRJ-001 Backend API (฿2M, owner: Nattaya, approver: Tachongrak)
│   ├── ACT-001 Order Service → TSK-001 API Design, TSK-002 CRUD
│   ├── ACT-002 Payment Service → TSK-003 Payment Gateway
│   ├── ACT-003 Inventory Service
│   └── ACT-004 Shipping Integration
├── PRJ-002 Frontend App (฿1.5M, owner: Nattaya)
│   ├── ACT-005 Customer Portal → TSK-004 Wireframes, TSK-005 React Components
│   ├── ACT-006 Admin Dashboard
│   └── ACT-007 Mobile Responsive
├── PRJ-003 Infrastructure & DevOps (฿800K, owner: Somchai)
│   ├── ACT-008 CI/CD Pipeline
│   └── ACT-009 Cloud Infrastructure
└── PRJ-004 QA & Testing (฿700K, non-billable, owner: Somchai)
    ├── ACT-010 Integration Testing
    └── ACT-011 UAT
```

## Features

### Time Entry
- Weekly timesheet grid with daily hour input per charge code
- **Entry description field** — click the note icon on any cell to add a description for that entry
- **Minimum 8-hour weekday validation** — timesheets cannot be submitted until every non-holiday weekday has at least 8 hours logged across all charge codes; short days are listed in the error message

### Budget Tracking
- Budget vs actual progress bars per charge code
- **Forecast drill-down** — click any charge code row to expand child-level and grandchild-level budget breakdown inline
- Root-cause activity badge highlights the specific activity driving an overrun

### Reports & Analytics

The Reports page is organized into three rows:

1. **KPI Cards row** — four stat cards: Total Budget, Actual Spent, Utilization, and Overrun Count.
2. **Charts row** — three equal-width charts side by side: Budget vs Actual (bar), Chargeability by Team (gauge), and Activity Distribution (pie). All three charts share the same row on `lg` screens.
3. **Financial P/L row** — a tabbed panel with two tabs:
   - **P/L Summary** — three stat cards (Over-budget cost, Low chargeability gap, Net P/L impact) plus a Team P/L Breakdown table showing cost, billable revenue, margin, margin %, and chargeability per department.
   - **Alerts (N)** — consolidated list of budget overrun alerts and chargeability alerts. The tab badge shows the live alert count.

**Notification Bell** — a bell icon in the app topbar shows the total alert count as a badge. Clicking it opens a popover with the top 5 highest-severity alerts (budget + chargeability combined). Each alert item navigates to the Reports page on click.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, TanStack Query, TanStack Table, Recharts, shadcn/ui |
| Backend | NestJS 11, TypeScript, Drizzle ORM, Swagger/OpenAPI |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth (JWT), JWKS verification |
| Scheduling | @nestjs/schedule (cron jobs) |
| Integrations | Microsoft Teams Bot Framework |
