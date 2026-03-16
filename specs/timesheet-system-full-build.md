# Plan: Timesheet & Cost Allocation System

## Task Description
Build a complete Timesheet & Cost Allocation System from scratch. The system enables organizations to track employee effort across projects, allocate labor costs to charge codes/cost centers, monitor budget vs actual in near real-time, and provide management reporting for resource utilization, chargeability, and financial P/L analysis.

This is a greenfield project — no existing application code exists.

## Objective
Deliver a fully functional web application that covers:
1. **Time Logging** — employees log hours daily/weekly with charge code allocation
2. **Charge Code Management** — hierarchical charge codes (Program > Project > Activity > Task)
3. **Approval Workflow** — Employee > Line Manager > Charge Code Approver flow
4. **Budget Tracking** — actual cost calculation and budget monitoring
5. **Reporting & Analytics** — dashboards for cost, utilization, chargeability, and financial impact
6. **User Role Management** — Employee, Charge Manager, PMO, Finance, Admin roles
7. **Advanced Features** — Teams integration, chatbot, reminders, calendar, project tracking uploads

## Problem Statement
The organization lacks a centralized system to track labor hours, allocate costs to the correct charge codes, and monitor budget vs actuals. This causes:
- Inaccurate cost allocation across business units
- Delayed budget overrun detection
- Poor visibility into resource utilization and chargeability
- Inability to analyze financial P/L impact from over-budget or low chargeability

## Solution Approach
Build a modern full-stack web application with:
- **Next.js 16.1.6 (App Router)** for the frontend with server components
- **Python FastAPI** backend for business logic and API
- **PostgreSQL** for relational data (charge code hierarchy, timesheets, approvals)
- **Redis** for caching and session management
- **Microsoft Teams SDK** for chatbot and notifications (advanced features)

The system uses a modular architecture where each feature domain (time logging, charge codes, approvals, budget, reporting) is an independent module with clear API boundaries, enabling parallel development by separate agents.

## Tech Stack
- **Language**: Python 3.12+ (backend), TypeScript 5.x (frontend)
- **Framework**: FastAPI 0.128.0 (backend API), Next.js 16.1.6 App Router (frontend)
- **Runtime**: Node.js 20+, Python 3.12+
- **Database**: PostgreSQL 16 with SQLAlchemy 2.1.0 ORM + Alembic migrations
- **Cache**: Redis 7
- **Key APIs/Libraries**:
  - Backend: FastAPI 0.128.0, SQLAlchemy 2.1.0, Alembic, Pydantic v2.12, python-jose (JWT), celery (async tasks)
  - Frontend: React 19, TailwindCSS 4, shadcn/ui (CLI 3.5.0), Recharts 3.3.0, TanStack Query v5.84.1, TanStack Table v8
  - Integration: Microsoft Bot Framework SDK (Teams), Microsoft Graph API
- **Build Tools**: uv (Python), pnpm (Node.js)
- **Testing**: pytest (backend), vitest + React Testing Library (frontend)

## Technical Design

### Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 16.1.6)                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Time Log │ │ Charge   │ │ Approval │ │ Reports  │          │
│  │ Module   │ │ Code Mgmt│ │ Workflow │ │ Dashboard│          │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │
│       └─────────────┴────────────┴─────────────┘                │
│                        API Client Layer                          │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST API (JSON)
┌────────────────────────────┴────────────────────────────────────┐
│                      Backend (FastAPI)                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Time     │ │ Charge   │ │ Approval │ │ Budget   │          │
│  │ Service  │ │ Code Svc │ │ Service  │ │ Service  │          │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Report   │ │ User/    │ │ Teams    │ │ Calendar │          │
│  │ Service  │ │ Auth Svc │ │ Bot Svc  │ │ Service  │          │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │
│       └─────────────┴────────────┴─────────────┘                │
│                        Data Access Layer                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │         PostgreSQL           │
              │  + Redis (cache/sessions)    │
              └─────────────────────────────┘
```

### Key Design Decisions
1. **Modular monolith** — Each domain (time, charge codes, approvals, budget, reports) is a separate Python package with its own router, service, models, and schemas. This enables parallel agent development without conflicts.
2. **Hierarchical charge codes with materialized path** — Use a `path` column (e.g., `PRG001/PRJ001/ACT001/TSK001`) for efficient ancestor/descendant queries and cost roll-up.
3. **Charge code ID format** — Prefix-based: `PRG-xxx` (Program), `PRJ-xxx` (Project), `ACT-xxx` (Activity), `TSK-xxx` (Task) for easy visual differentiation.
4. **Cutoff logic** — System auto-locks timesheets on the 15th and end of month via a scheduled Celery task.
5. **Cost calculation** — `Actual Cost = Logged Hours x Employee Cost Rate (by Job Grade)`. Cost rates stored in a lookup table by job grade and effective date.
6. **Approval state machine** — Draft > Submitted > Manager Approved > Charge Code Approved > Locked. Rejection returns to Draft with comments.
7. **RBAC** — Role-based access with 5 roles (Employee, Charge Manager, PMO, Finance, Admin). Charge code access is additionally controlled by charge code owner hierarchy.

### Data Model

```
User
├── id (UUID)
├── email
├── name
├── job_grade
├── cost_rate (derived from job_grade via CostRate table)
├── manager_id (FK → User)
├── role (Employee | ChargeManager | PMO | Finance | Admin)
└── department

CostRate
├── id
├── job_grade
├── hourly_rate (Decimal)
├── effective_from (Date)
└── effective_to (Date, nullable)

ChargeCode
├── id (formatted: PRG-001, PRJ-001, ACT-001, TSK-001)
├── name
├── parent_id (FK → ChargeCode, nullable)
├── path (materialized path for hierarchy)
├── level (program | project | activity | task)
├── program_name
├── cost_center
├── activity_category
├── budget_amount (Decimal)
├── owner_id (FK → User)
├── approver_id (FK → User, default=owner)
├── valid_from (Date)
├── valid_to (Date)
├── is_billable (Boolean)
└── allowed_users (M2M → User)

Timesheet
├── id (UUID)
├── user_id (FK → User)
├── period_start (Date)
├── period_end (Date)
├── status (draft | submitted | manager_approved | cc_approved | locked | rejected)
├── submitted_at
├── locked_at
└── rejection_comment

TimesheetEntry
├── id (UUID)
├── timesheet_id (FK → Timesheet)
├── charge_code_id (FK → ChargeCode)
├── date (Date)
├── hours (Decimal, precision 2)
├── description (Text, optional)
└── calculated_cost (Decimal, computed)

ApprovalLog
├── id
├── timesheet_id (FK → Timesheet)
├── approver_id (FK → User)
├── action (approve | reject)
├── comment (Text)
├── approved_at (DateTime)
└── approval_type (manager | charge_code)

Budget
├── charge_code_id (FK → ChargeCode)
├── budget_amount (Decimal)
├── actual_spent (Decimal, computed)
├── forecast_at_completion (Decimal, computed)
└── last_updated (DateTime)

Calendar
├── id
├── date (Date, unique)
├── is_weekend (Boolean)
├── is_holiday (Boolean)
├── holiday_name (Text, nullable)
└── country_code

VacationRequest
├── id
├── user_id (FK → User)
├── start_date (Date)
├── end_date (Date)
├── status (pending | approved | rejected)
└── approved_by (FK → User)
```

### API / Interface Contracts

**Time Logging API**
- `POST /api/v1/timesheets` — Create timesheet for period
- `GET /api/v1/timesheets?period=2026-03-01` — Get user's timesheet
- `PUT /api/v1/timesheets/{id}/entries` — Batch upsert entries
- `POST /api/v1/timesheets/{id}/submit` — Submit for approval
- `GET /api/v1/timesheets/{id}/entries` — Get all entries for timesheet

**Charge Code API**
- `GET /api/v1/charge-codes` — List (with hierarchy filter)
- `POST /api/v1/charge-codes` — Create charge code
- `PUT /api/v1/charge-codes/{id}` — Update
- `GET /api/v1/charge-codes/{id}/children` — Get children
- `PUT /api/v1/charge-codes/{id}/access` — Manage allowed users
- `GET /api/v1/charge-codes/my` — Get charge codes available to current user

**Approval API**
- `GET /api/v1/approvals/pending` — Get pending approvals for current user
- `POST /api/v1/approvals/{timesheet_id}/approve` — Approve (supports bulk via body)
- `POST /api/v1/approvals/{timesheet_id}/reject` — Reject with comment
- `POST /api/v1/approvals/bulk-approve` — Bulk approve multiple timesheets

**Budget API**
- `GET /api/v1/budgets/{charge_code_id}` — Budget vs actual for charge code
- `GET /api/v1/budgets/{charge_code_id}/forecast` — Forecast at completion
- `GET /api/v1/budgets/alerts` — Budget overrun alerts

**Reports API**
- `GET /api/v1/reports/project-cost?charge_code_id=xxx` — Project cost report
- `GET /api/v1/reports/utilization?period=xxx` — Resource utilization
- `GET /api/v1/reports/chargeability?team=xxx` — Team chargeability vs target
- `GET /api/v1/reports/financial-impact` — Financial P/L from over-budget and low chargeability
- `GET /api/v1/reports/activity-distribution` — Activity distribution analytics

**User/Auth API**
- `POST /api/v1/auth/login` — Login (returns JWT)
- `GET /api/v1/users/me` — Current user profile
- `GET /api/v1/users` — List users (Admin only)
- `PUT /api/v1/users/{id}/role` — Update role (Admin only)

**Calendar API**
- `GET /api/v1/calendar?year=2026` — Get calendar with holidays/weekends
- `POST /api/v1/calendar/holidays` — Add holidays (Admin)
- `GET /api/v1/vacations/me` — My vacations

## UX/UI Design

### Wireframes

**Main Dashboard (Employee View)**
```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo] Timesheet System    [Dashboard] [My Time] [Reports]  👤│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─── Weekly Summary ─────────────────────────────────────────┐ │
│  │  Week of Mar 16-22, 2026          Total: 32h / 40h  ⚠️    │ │
│  │  ┌────┬────┬────┬────┬────┬────┬────┐                     │ │
│  │  │Mon │Tue │Wed │Thu │Fri │Sat │Sun │                     │ │
│  │  │ 8h │ 8h │ 8h │ 8h │ 0h │ -- │ -- │                     │ │
│  │  └────┴────┴────┴────┴────┴────┴────┘                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─── Quick Actions ──────┐  ┌─── Pending Approvals ────────┐ │
│  │ [+ Log Time Today]     │  │  3 timesheets pending         │ │
│  │ [Submit Weekly Sheet]   │  │  - John Doe (Mar 9-15)       │ │
│  │ [View My Charge Codes] │  │  - Jane Smith (Mar 9-15)     │ │
│  └────────────────────────┘  └───────────────────────────────┘ │
│                                                                 │
│  ┌─── Alerts ─────────────────────────────────────────────────┐ │
│  │  🔴 PRJ-042 budget at 92% — forecast overrun by $12,000   │ │
│  │  🟡 Team Alpha chargeability at 68% (target: 80%)         │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Time Entry View**
```
┌─────────────────────────────────────────────────────────────────┐
│  My Timesheet — Week of Mar 16-22, 2026         [< Prev] [Next>]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Charge Code         │ Mon │ Tue │ Wed │ Thu │ Fri │ Total     │
│  ────────────────────┼─────┼─────┼─────┼─────┼─────┼────────── │
│  PRJ-042 Web Portal  │ 4.0 │ 3.0 │ 2.0 │     │     │  9.0     │
│  ACT-010 Code Review │ 2.0 │ 2.0 │ 2.0 │     │     │  6.0     │
│  TSK-005 Meetings    │ 2.0 │ 3.0 │ 4.0 │     │     │  9.0     │
│  ────────────────────┼─────┼─────┼─────┼─────┼─────┼────────── │
│  Daily Total         │ 8.0 │ 8.0 │ 8.0 │ 0.0 │ 0.0 │ 24.0     │
│  Min Required        │ 8.0 │ 8.0 │ 8.0 │ 8.0 │ 8.0 │ 40.0     │
│                                                                 │
│  [+ Add Charge Code Row]                                        │
│                                                                 │
│  [Save Draft]                          [Submit for Approval]    │
└─────────────────────────────────────────────────────────────────┘
```

**Charge Code Management (Admin)**
```
┌─────────────────────────────────────────────────────────────────┐
│  Charge Code Management                    [+ Create New]       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🔍 Search charge codes...                                      │
│                                                                 │
│  ▼ PRG-001 Digital Transformation Program    Budget: $500,000   │
│    ▼ PRJ-001 Web Portal Redesign             Budget: $200,000   │
│      ▸ ACT-001 Development                   Budget: $120,000   │
│      ▸ ACT-002 Testing                       Budget: $50,000    │
│      ▸ ACT-003 Project Management            Budget: $30,000    │
│    ▸ PRJ-002 Mobile App                      Budget: $150,000   │
│    ▸ PRJ-003 Data Migration                  Budget: $150,000   │
│  ▸ PRG-002 Operations                        Budget: $300,000   │
│                                                                 │
│  ──── Selected: PRJ-001 Web Portal Redesign ────                │
│  │ Owner: Alice Johnson    Approver: Bob Smith               │  │
│  │ Cost Center: CC-1001   Valid: Jan 1 - Dec 31, 2026        │  │
│  │ Billable: Yes          Actual Spent: $85,000              │  │
│  │ [Edit] [Manage Access] [View Budget]                      │  │
└─────────────────────────────────────────────────────────────────┘
```

**Reports Dashboard**
```
┌─────────────────────────────────────────────────────────────────┐
│  Reports & Analytics                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─── Budget vs Actual ──────────┐  ┌─── Chargeability ──────┐ │
│  │  ████████████░░░ 78%          │  │  Team Alpha  ███░ 82%  │ │
│  │  $390K / $500K (PRG-001)      │  │  Team Beta   ██░░ 65%  │ │
│  │  ⚠️ Forecast: $520K (+$20K)  │  │  Team Gamma  ████ 91%  │ │
│  │  [View Details]               │  │  Target: 80% ──────    │ │
│  └───────────────────────────────┘  └────────────────────────┘ │
│                                                                 │
│  ┌─── Resource Utilization ──────┐  ┌─── Financial Impact ───┐ │
│  │  [Bar chart: hours by team]   │  │  Over-budget: -$32K    │ │
│  │                               │  │  Low charge:  -$18K    │ │
│  │                               │  │  Net impact:  -$50K    │ │
│  └───────────────────────────────┘  └────────────────────────┘ │
│                                                                 │
│  ┌─── Activity Distribution ─────────────────────────────────┐ │
│  │  [Pie chart: Development 45%, Testing 20%, PM 15%,       │ │
│  │   Meetings 10%, Admin 10%]                                │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─── Overrun Alerts ────────────────────────────────────────┐ │
│  │  🔴 PRJ-042 over budget by $12K — Task: ACT-015 Dev      │ │
│  │  🟡 PRJ-018 at 90% budget — forecast: +$5K overrun       │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Visual Style
- Clean, professional enterprise UI with light theme (dark mode toggle)
- Primary color: Indigo (#4F46E5) for actions, Blue (#2563EB) for info
- Warning: Amber (#F59E0B), Danger: Red (#EF4444), Success: Green (#10B981)
- Font: Inter for UI, JetBrains Mono for numbers/codes
- shadcn/ui components for consistency
- Subtle animations for state transitions

### User Flow
1. Employee logs in > sees dashboard with weekly summary and alerts
2. Clicks "Log Time Today" or navigates to weekly timesheet
3. Selects from their registered charge codes, enters hours per day (min 8h/day)
4. Saves draft or submits for approval
5. Line Manager sees pending approvals > bulk approves or rejects with comment
6. Charge Code Approver gets notified > approves charge allocation
7. System auto-locks on 15th and month-end
8. PMO/Finance views reports dashboard for budget tracking and chargeability

## Relevant Files
This is a greenfield project. All files will be new.

### New Files — Backend
- `backend/pyproject.toml` — Python project config with dependencies
- `backend/app/main.py` — FastAPI application entry point
- `backend/app/config.py` — Settings and environment config
- `backend/app/database.py` — Database connection and session management
- `backend/app/models/` — SQLAlchemy models (user, charge_code, timesheet, approval, budget, calendar)
- `backend/app/schemas/` — Pydantic schemas for each domain
- `backend/app/routers/` — API routers (time, charge_codes, approvals, budget, reports, users, calendar)
- `backend/app/services/` — Business logic services for each domain
- `backend/app/auth/` — JWT authentication and RBAC middleware
- `backend/alembic/` — Database migration scripts
- `backend/alembic.ini` — Alembic config

### New Files — Frontend
- `frontend/package.json` — Node.js project config
- `frontend/next.config.ts` — Next.js configuration
- `frontend/tailwind.config.ts` — TailwindCSS config
- `frontend/src/app/layout.tsx` — Root layout
- `frontend/src/app/page.tsx` — Dashboard page
- `frontend/src/app/timesheet/page.tsx` — Time entry page
- `frontend/src/app/charge-codes/page.tsx` — Charge code management
- `frontend/src/app/approvals/page.tsx` — Approval workflow page
- `frontend/src/app/reports/page.tsx` — Reports dashboard
- `frontend/src/app/admin/page.tsx` — Admin panel
- `frontend/src/components/` — Shared UI components
- `frontend/src/lib/api.ts` — API client
- `frontend/src/lib/auth.ts` — Auth utilities

## Implementation Phases

### Phase 1: Foundation (Tasks 1-3)
- Project scaffolding (backend + frontend)
- Database models and migrations
- Authentication and RBAC

### Phase 2: Core Features (Tasks 4-8) — Parallel
- Time logging module (backend + frontend)
- Charge code management (backend + frontend)
- Approval workflow (backend + frontend)
- Budget tracking engine
- Calendar and holiday management

### Phase 3: Reporting & Analytics (Task 9)
- Reports API with aggregation queries
- Dashboard with charts and alerts

### Phase 4: Advanced Features (Tasks 10-11)
- Teams integration (chatbot, reminders)
- Project tracking upload and insights

### Phase 5: Quality Assurance (Tasks 12-14)
- Code review
- Automated tests
- Final validation

## Team Orchestration

- You operate as the team lead and orchestrate the team to execute the plan.
- Each feature gets a dedicated builder agent that works independently.
- Builders do NOT interfere with each other — each owns specific directories/files.

### Team Members

- Builder
  - Name: builder-foundation
  - Role: Project scaffolding, database models, migrations, config, and auth system
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-time-logging
  - Role: Time logging backend API (router, service, schemas) and frontend (timesheet entry page, components)
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-charge-codes
  - Role: Charge code management backend API (hierarchical CRUD, access control) and frontend (tree view, management page)
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-approvals
  - Role: Approval workflow backend (state machine, bulk approval) and frontend (approval queue page)
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-budget
  - Role: Budget tracking engine backend (cost calculation, forecast, alerts) and budget API
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-calendar
  - Role: Calendar service (weekends, holidays, vacations) backend and frontend
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-reports
  - Role: Reporting & analytics backend (aggregation queries) and frontend dashboard (charts, alerts)
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-advanced
  - Role: Advanced features — Teams chatbot integration, reminders, weekly insights, project tracking upload
  - Agent Type: builder
  - Resume: true

- Code Reviewer
  - Name: reviewer
  - Role: Review and fix code quality, efficiency, and reuse issues after builders complete their work
  - Agent Type: code-reviewer
  - Resume: false

- Test Writer
  - Name: tester
  - Role: Write comprehensive automated tests for the implemented code
  - Agent Type: test-writer
  - Resume: false

- Validator
  - Name: validator
  - Role: Final read-only validation that all acceptance criteria are met and all tests pass
  - Agent Type: validator
  - Resume: false

## Step by Step Tasks

### 1. Project Scaffolding & Database Foundation
- **Task ID**: foundation-setup
- **Depends On**: none
- **Assigned To**: builder-foundation
- **Agent Type**: builder
- **Parallel**: false (must complete first — all other tasks depend on this)
- Initialize Python backend with `uv init` — create `backend/` directory with FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2, python-jose, celery
- Initialize Next.js frontend with `pnpm create next-app` — create `frontend/` with TypeScript, TailwindCSS, shadcn/ui
- Create all SQLAlchemy models: User, CostRate, ChargeCode, Timesheet, TimesheetEntry, ApprovalLog, Budget, Calendar, VacationRequest
- Create Alembic migration for initial schema
- Set up `backend/app/database.py` with async PostgreSQL connection
- Set up `backend/app/config.py` with Pydantic Settings
- Create `backend/app/main.py` with FastAPI app, CORS, and router mounting
- Implement JWT auth system: `backend/app/auth/` with login, token refresh, RBAC decorator
- Create user management API: CRUD for users, role assignment
- Create shared frontend layout: `frontend/src/app/layout.tsx` with navigation sidebar
- Set up API client: `frontend/src/lib/api.ts` with auth token handling
- Set up auth context: `frontend/src/lib/auth.ts` and login page
- Create `docker-compose.yml` for PostgreSQL + Redis local dev

### 2. Time Logging Module
- **Task ID**: time-logging
- **Depends On**: foundation-setup
- **Assigned To**: builder-time-logging
- **Agent Type**: builder
- **Parallel**: true (parallel with tasks 3-6)
- Create `backend/app/routers/timesheets.py` — all timesheet CRUD endpoints
- Create `backend/app/services/timesheet_service.py` — business logic:
  - Create/get timesheets by period (weekly)
  - Batch upsert entries with validation (min 8h/day)
  - Submit timesheet (status transition to "submitted")
  - Auto-cutoff logic: lock timesheets on 15th and month-end
  - Only allow charging to user's registered/allowed charge codes
- Create `backend/app/schemas/timesheet.py` — Pydantic request/response models
- Create `frontend/src/app/timesheet/page.tsx` — Weekly timesheet grid view
  - Week selector with prev/next navigation
  - Editable grid: rows = charge codes, columns = days
  - Daily total row with minimum 8h validation (visual warning)
  - Add/remove charge code rows (dropdown of user's registered codes)
  - Optional description field per entry
  - Save Draft and Submit buttons
  - Status indicator (Draft, Submitted, Approved, Locked)
- Create `frontend/src/components/timesheet/` — TimesheetGrid, EntryCell, ChargeCodeSelector components

### 3. Charge Code Management Module
- **Task ID**: charge-codes
- **Depends On**: foundation-setup
- **Assigned To**: builder-charge-codes
- **Agent Type**: builder
- **Parallel**: true (parallel with tasks 2, 4-6)
- Create `backend/app/routers/charge_codes.py` — CRUD with hierarchy support
- Create `backend/app/services/charge_code_service.py` — business logic:
  - Create charge codes at any hierarchy level (Program > Project > Activity > Task)
  - Auto-generate formatted IDs: PRG-xxx, PRJ-xxx, ACT-xxx, TSK-xxx
  - Maintain materialized path for hierarchy queries
  - Charge code owner access control: owner can manage who charges to their code
  - Hierarchical charge code owner can control sub-levels
  - Roll-up: aggregate actual costs from children to parent
  - Valid date range enforcement
  - Billable/Non-billable flag
- Create `backend/app/schemas/charge_code.py` — Pydantic models
- Create `frontend/src/app/charge-codes/page.tsx` — Charge code tree view
  - Expandable/collapsible tree display
  - Search and filter
  - Create/Edit modal with all attributes
  - Access management panel (add/remove users who can charge)
  - Budget summary per charge code
  - Visual indicators for billable vs non-billable
- Create `frontend/src/components/charge-codes/` — ChargeCodeTree, ChargeCodeForm, AccessManager components

### 4. Approval Workflow Module
- **Task ID**: approvals
- **Depends On**: foundation-setup
- **Assigned To**: builder-approvals
- **Agent Type**: builder
- **Parallel**: true (parallel with tasks 2, 3, 5, 6)
- Create `backend/app/routers/approvals.py` — approval endpoints
- Create `backend/app/services/approval_service.py` — business logic:
  - Two-stage approval: Employee > Line Manager > Charge Code Approver
  - Manager approval: approve entire timesheet
  - Charge Code Approver: approve charges to their specific charge code
  - Bulk approval endpoint (approve multiple timesheets at once)
  - Reject with comments (returns timesheet to Draft)
  - Lock approved timesheets (no further edits)
  - Approval audit log
- Create `backend/app/schemas/approval.py` — Pydantic models
- Create `frontend/src/app/approvals/page.tsx` — Approval queue
  - List of pending timesheets grouped by approval type (manager vs charge code)
  - Expandable view showing timesheet details and entries
  - Bulk select + approve button
  - Reject with comment modal
  - Approval history tab
  - Filter by employee, period, status
- Create `frontend/src/components/approvals/` — ApprovalQueue, TimesheetReview, BulkApprovalBar components

### 5. Budget Tracking Module
- **Task ID**: budget-tracking
- **Depends On**: foundation-setup
- **Assigned To**: builder-budget
- **Agent Type**: builder
- **Parallel**: true (parallel with tasks 2-4, 6)
- Create `backend/app/routers/budgets.py` — budget API endpoints
- Create `backend/app/services/budget_service.py` — business logic:
  - Calculate actual cost: `Logged Hours x Employee Cost Rate (by Job Grade)`
  - Look up cost rate from CostRate table by employee's job grade and entry date
  - Aggregate actuals from TimesheetEntry to charge code budget
  - Roll-up: child charge code actuals aggregate to parent
  - Forecast at completion: linear projection based on burn rate and remaining period
  - Budget overrun alerts: trigger when actual > threshold (e.g., 80%, 90%, 100%)
  - Identify which task/activity is causing the overrun
- Create `backend/app/schemas/budget.py` — Pydantic models
- No dedicated frontend page — budget data consumed by Reports dashboard and Charge Code detail views

### 6. Calendar & Holiday Management
- **Task ID**: calendar
- **Depends On**: foundation-setup
- **Assigned To**: builder-calendar
- **Agent Type**: builder
- **Parallel**: true (parallel with tasks 2-5)
- Create `backend/app/routers/calendar.py` — calendar CRUD endpoints
- Create `backend/app/services/calendar_service.py` — business logic:
  - Auto-populate weekends for a given year
  - Admin can add/manage public holidays
  - Vacation request CRUD (employee submits, manager approves)
  - Calculate working days for a period (excluding weekends, holidays, approved vacations)
  - Used by timesheet module to show non-working days as disabled
- Create `backend/app/schemas/calendar.py` — Pydantic models
- Create `frontend/src/app/admin/calendar/page.tsx` — Holiday management page
  - Year calendar view with highlighted holidays
  - Add/edit/delete holidays
  - Vacation request list (for managers)

### 7. Dashboard & Navigation
- **Task ID**: dashboard
- **Depends On**: time-logging, charge-codes, approvals, budget-tracking, calendar
- **Assigned To**: builder-time-logging
- **Agent Type**: builder
- **Parallel**: false (needs all core APIs available)
- Create `frontend/src/app/page.tsx` — Main dashboard
  - Weekly summary card (hours logged vs required)
  - Quick action buttons (Log Time, Submit Sheet, View Charge Codes)
  - Pending approvals count (for managers)
  - Budget alerts (top 3 overrun warnings)
  - Chargeability summary (for PMO)
- Wire up all navigation links in the sidebar layout

### 8. Reporting & Analytics Module
- **Task ID**: reports
- **Depends On**: time-logging, charge-codes, budget-tracking
- **Assigned To**: builder-reports
- **Agent Type**: builder
- **Parallel**: false (needs core data APIs)
- Create `backend/app/routers/reports.py` — reporting endpoints
- Create `backend/app/services/report_service.py` — business logic:
  - Project cost report: budget vs actual by charge code with drill-down
  - Program financial tracking: roll-up across projects in a program
  - Resource utilization: hours logged / available hours per employee and team
  - Chargeability: billable hours / total hours per team vs target
  - Activity distribution: breakdown of hours by activity category
  - Budget overrun alerts: list charge codes exceeding threshold
  - Low chargeability alerts: teams below target threshold
  - Financial impact analysis: cost of over-budget + lost revenue from low chargeability
  - Forecast: predict end-of-period budget position
- Create `backend/app/schemas/report.py` — Pydantic response models
- Create `frontend/src/app/reports/page.tsx` — Reports dashboard
  - Budget vs Actual bar/progress chart (per program/project)
  - Chargeability gauge per team vs target
  - Resource utilization bar chart
  - Activity distribution pie chart
  - Financial impact summary card
  - Budget overrun alert list with drill-down to causing task
  - Low chargeability alert list
  - Date range and filter controls
- Create `frontend/src/components/reports/` — BudgetChart, ChargeabilityGauge, UtilizationChart, ActivityPie, AlertList components
- Use Recharts for all chart components

### 9. Advanced Features — Teams Integration & Chatbot
- **Task ID**: advanced-features
- **Depends On**: time-logging, approvals, reports
- **Assigned To**: builder-advanced
- **Agent Type**: builder
- **Parallel**: false (depends on core features)
- Create `backend/app/services/teams_bot_service.py` — Teams bot logic:
  - Collaborative time logging via Teams chat/channel with suggested prompts
  - Chatbot for inquiries (e.g., "What's my budget status for PRJ-042?")
  - Parse natural language time entries (e.g., "Logged 4h on PRJ-042 today")
- Create `backend/app/services/notification_service.py` — reminder system:
  - Teams reminders for employees with incomplete timesheets
  - Reminder to Charge Managers for pending approvals
  - Summary of complete/incomplete logging for managers
  - Weekly insight summary to Program Owner and Cost Center Owner
- Create `backend/app/routers/integrations.py` — webhook endpoints for Teams bot
- Create `backend/app/services/project_upload_service.py`:
  - Upload/link project tracking sheet (Excel/CSV) for basic project info
  - Parse and store relevant project data
- Document Teams app manifest and setup instructions

### 10. Scheduled Jobs & Cutoff Logic
- **Task ID**: scheduled-jobs
- **Depends On**: time-logging, approvals, calendar
- **Assigned To**: builder-foundation
- **Agent Type**: builder
- **Parallel**: true (can run alongside reports and advanced features)
- Create `backend/app/tasks/` — Celery task definitions:
  - Auto-cutoff: lock timesheets on 15th and end of month
  - Daily reminder: check incomplete timesheets and send notifications
  - Weekly: generate insight summary for program/cost center owners
  - Budget alert: periodic check for overrun thresholds
- Create `backend/app/celery_app.py` — Celery configuration
- Create `backend/app/tasks/scheduler.py` — Beat schedule config

### 11. Code Review
- **Task ID**: code-review
- **Depends On**: foundation-setup, time-logging, charge-codes, approvals, budget-tracking, calendar, dashboard, reports, advanced-features, scheduled-jobs
- **Assigned To**: reviewer
- **Agent Type**: code-reviewer
- **Parallel**: false
- Review all files created/modified by builders for quality, efficiency, reuse, and accessibility issues
- Check for:
  - Duplicated business logic across modules
  - Consistent error handling patterns
  - Proper async/await usage in FastAPI
  - SQL injection prevention (parameterized queries via SQLAlchemy)
  - Frontend component reuse opportunities
  - API response consistency
- Fix all issues found directly
- Report what was fixed and what was skipped

### 12. Write Tests
- **Task ID**: write-tests
- **Depends On**: code-review
- **Assigned To**: tester
- **Agent Type**: test-writer
- **Parallel**: false
- Write comprehensive automated tests:
  - **Backend unit tests**: each service method, edge cases, validation
  - **Backend integration tests**: API endpoints with test database
  - **Charge code hierarchy tests**: tree operations, materialized path, roll-up
  - **Approval workflow tests**: state transitions, rejection, bulk approval, locking
  - **Budget calculation tests**: cost rate lookup, aggregation, forecast accuracy
  - **Auth tests**: JWT validation, RBAC enforcement per role
  - **Frontend component tests**: TimesheetGrid, ChargeCodeTree, ApprovalQueue
- Run all tests and ensure they pass
- Report coverage areas and results

### 13. Validate Final Output
- **Task ID**: validate-all
- **Depends On**: code-review, write-tests
- **Assigned To**: validator
- **Agent Type**: validator
- **Parallel**: false
- Run all validation commands
- Run all automated tests
- Verify each acceptance criterion is met:
  - All 6 expected outputs generate correctly
  - All 5 user roles have correct access
  - Approval workflow state machine works end-to-end
  - Budget calculations are accurate
  - Charge code hierarchy supports all 4 levels
  - Timesheet cutoff logic works on 15th and month-end
- Report pass/fail for each criterion

## Pipeline

Every plan follows this mandatory execution pipeline:

```
Foundation → Build (parallel features) → Dashboard + Reports → Advanced → Code Review → Write Tests → Validate Final
```

- **Foundation** (Task 1): Scaffolding, DB, auth — all features depend on this
- **Build** (Tasks 2-6): Core features built in parallel by dedicated agents
- **Dashboard + Reports** (Tasks 7-8): Depend on core feature APIs
- **Advanced** (Tasks 9-10): Teams integration and scheduled jobs
- **Code Review**: MANDATORY. code-reviewer fixes quality/efficiency/reuse issues
- **Write Tests**: MANDATORY. test-writer creates automated tests
- **Validate Final**: MANDATORY. validator confirms all acceptance criteria met

If the validator fails, the lead sends findings back to a builder to fix, then re-runs Code Review > Write Tests > Validate (max 2 retries).

## Acceptance Criteria
- [ ] Employees can log time daily/weekly with min 8h/day validation
- [ ] Time entries can be split across multiple charge codes per day
- [ ] Charge codes support 4-level hierarchy (Program > Project > Activity > Task)
- [ ] Charge code IDs have level-specific prefixes (PRG-, PRJ-, ACT-, TSK-)
- [ ] Charge code owners can control access to their charge codes
- [ ] Charges roll up from child to parent charge codes
- [ ] 3-stage approval: Employee > Manager > Charge Code Approver
- [ ] Bulk approval supported
- [ ] Reject with comments returns timesheet to Draft
- [ ] Approved timesheets are locked
- [ ] System auto-locks timesheets on 15th and month-end
- [ ] Actual cost calculated as Hours x Cost Rate by Job Grade
- [ ] Budget vs actual tracking per charge code
- [ ] Forecast at completion calculation
- [ ] Budget overrun alerts identifying causing task
- [ ] 6 expected reports/outputs generated: project cost, program financial, utilization, activity distribution, budget overrun alerts, low chargeability alerts
- [ ] Chargeability analysis per team vs target
- [ ] Financial P/L impact analysis from over-budget and low chargeability
- [ ] 5 user roles with correct RBAC: Employee, Charge Manager, PMO, Finance, Admin
- [ ] Auto calendar for weekends, holidays, vacations
- [ ] Teams chatbot for collaborative time logging (advanced)
- [ ] Teams reminders for incomplete timesheets and pending approvals (advanced)
- [ ] Weekly insight summaries to program/cost center owners (advanced)
- [ ] Upload/link project tracking sheet support (advanced)
- [ ] Code review passes with no remaining quality issues
- [ ] All automated tests pass

## Validation Commands
Execute these commands to validate the task is complete:

- `cd backend && uv run python -m py_compile app/main.py` — Verify backend compiles
- `cd backend && uv run pytest --tb=short` — Run all backend tests
- `cd frontend && pnpm run build` — Verify frontend builds without errors
- `cd frontend && pnpm run test` — Run all frontend tests
- `cd backend && uv run alembic check` — Verify migrations are up to date
- `cd backend && uv run ruff check app/` — Lint backend code
- `cd frontend && pnpm run lint` — Lint frontend code

## Notes
- **New libraries needed** (backend): `uv add "fastapi[standard]>=0.128.0,<0.129.0" "sqlalchemy[asyncio]>=2.1.0,<2.2.0" alembic "pydantic>=2.12.0,<3.0.0" pydantic-settings python-jose[cryptography] celery redis asyncpg`
- **New libraries needed** (frontend): `pnpm add recharts@3.3.0 react-is @tanstack/react-query@5.84.1 @tanstack/react-table@8`
- **Database**: PostgreSQL 16 required. Use docker-compose for local dev.
- **Environment variables**: Store in `.env` (not committed). Document in `.env.example`.
- **Teams integration**: Requires Microsoft Bot Framework registration and Azure AD app. Document setup steps but don't hard-code credentials.
- The charge code hierarchy is the most complex data model — materialized path approach chosen for query performance over nested sets or closure tables.
- Budget forecast uses simple linear projection. Can be enhanced later with ML-based forecasting.
