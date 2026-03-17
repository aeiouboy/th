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
- **NestJS 11 (TypeScript)** backend for business logic and API
- **Supabase** (hosted PostgreSQL) for database, auth, and realtime subscriptions
- **Drizzle ORM** with `drizzle-kit` for type-safe database access and migrations
- **Supabase Auth** replaces custom JWT — supports email/password + Microsoft OAuth
- **Microsoft Teams SDK** for chatbot and notifications (advanced features)

The system uses a **full TypeScript monorepo** — shared types between frontend and backend. Each feature domain (time logging, charge codes, approvals, budget, reporting) is an independent NestJS module with clear API boundaries, enabling parallel development by separate agents. The backend connects to Supabase PostgreSQL via connection pooler for all data operations.

**Supabase Project**: `lchxtkiceeyqjksganwr` (ap-southeast-1)

## Tech Stack
- **Language**: TypeScript 5.x (both backend and frontend)
- **Framework**: NestJS 11.1.16 (backend API), Next.js 16.1.6 App Router (frontend)
- **Runtime**: Node.js 20+
- **Database**: Supabase PostgreSQL (via pooler) with Drizzle ORM + drizzle-kit migrations
- **Auth**: Supabase Auth (email/password + Microsoft OAuth) — frontend uses `@supabase/supabase-js`, backend validates JWTs via custom NestJS Guard
- **Realtime**: Supabase Realtime for live approval status updates and budget alert notifications
- **Key APIs/Libraries**:
  - Backend: NestJS 11, Drizzle ORM, drizzle-kit, @nestjs/config, @nestjs/schedule, @nestjs/swagger, class-validator, class-transformer, postgres (node-postgres driver)
  - Frontend: React 19, TailwindCSS 4, shadcn/ui (CLI 3.5.0), Recharts 3.3.0, TanStack Query v5.84.1, TanStack Table v8, @supabase/supabase-js, @supabase/ssr
  - Integration: Microsoft Bot Framework SDK (Teams), Microsoft Graph API
- **Build Tools**: pnpm (both backend and frontend)
- **Testing**: jest (backend, NestJS default), vitest + React Testing Library (frontend)

## Technical Design

### Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 16.1.6)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Time Log │ │ Charge   │ │ Approval │ │ Reports  │          │
│  │ Module   │ │ Code Mgmt│ │ Workflow │ │ Dashboard│          │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │
│       └─────────────┴────────────┴─────────────┘                │
│              API Client Layer + @supabase/ssr                    │
└──────────┬─────────────────────────────────┬────────────────────┘
           │ REST API (JSON)                 │ Supabase Auth
           │                                 │ Supabase Realtime
┌──────────┴───────────────────┐  ┌──────────┴───────────────────┐
│     Backend (NestJS 11)      │  │      Supabase Platform       │
│  ┌──────────┐ ┌──────────┐  │  │  ┌─────────┐ ┌───────────┐  │
│  │ Time     │ │ Charge   │  │  │  │  Auth    │ │ Realtime  │  │
│  │ Service  │ │ Code Svc │  │  │  │ (GoTrue)│ │ (WebSocket│  │
│  └──────────┘ └──────────┘  │  │  └─────────┘ └───────────┘  │
│  ┌──────────┐ ┌──────────┐  │  │  ┌─────────┐ ┌───────────┐  │
│  │ Approval │ │ Budget   │  │  │  │ Storage │ │ Edge Funcs│  │
│  │ Service  │ │ Service  │  │  │  │ (files) │ │ (optional)│  │
│  └──────────┘ └──────────┘  │  │  └─────────┘ └───────────┘  │
│  ┌──────────┐ ┌──────────┐  │  └───────────────┬──────────────┘
│  │ Report   │ │ Teams    │  │                   │
│  │ Service  │ │ Bot Svc  │  │                   │
│  └──────────┘ └──────────┘  │                   │
│        Data Access Layer     │                   │
│       (Drizzle ORM)         │                   │
└──────────────┬───────────────┘                   │
               │                                   │
               └──────────┬────────────────────────┘
                          │
               ┌──────────┴──────────┐
               │  Supabase PostgreSQL │
               │  (Connection Pooler) │
               │  Ref: lchxtkiceey... │
               └─────────────────────┘
```

**Connection strategy:**
- Backend (NestJS) → Supabase PostgreSQL via **Transaction Pooler** (port 6543) using Drizzle ORM + node-postgres
- Frontend → Supabase Auth directly via `@supabase/ssr` (handles session cookies in Next.js middleware)
- Frontend → Supabase Realtime for live updates (approval status, budget alerts)
- Backend validates Supabase JWT on every request via custom NestJS Guard (extracts user_id from token)
- No separate Redis needed — Supabase Realtime handles live updates, auth sessions stored in Supabase

### Key Design Decisions
1. **Modular monolith** — Each domain (time, charge codes, approvals, budget, reports) is a separate NestJS module with its own controller, service, DTOs, and Drizzle schema definitions. This enables parallel agent development without conflicts.
2. **Hierarchical charge codes with materialized path** — Use a `path` column (e.g., `PRG001/PRJ001/ACT001/TSK001`) for efficient ancestor/descendant queries and cost roll-up.
3. **Charge code ID format** — Prefix-based: `PRG-xxx` (Program), `PRJ-xxx` (Project), `ACT-xxx` (Activity), `TSK-xxx` (Task) for easy visual differentiation.
4. **Cutoff logic** — System auto-locks timesheets on the 15th and end of month via a scheduled @nestjs/schedule cron job.
5. **Cost calculation** — `Actual Cost = Logged Hours x Employee Cost Rate (by Job Grade)`. Cost rates stored in a lookup table by job grade and effective date.
6. **Approval state machine** — Draft > Submitted > Manager Approved > Charge Code Approved > Locked. Rejection returns to Draft with comments.
7. **RBAC** — Role-based access with 5 roles (Employee, Charge Manager, PMO, Finance, Admin). Charge code access is additionally controlled by charge code owner hierarchy.
8. **Auth via Supabase** — Frontend handles login/signup via `@supabase/ssr` (cookie-based sessions in Next.js middleware). Backend NestJS validates the Supabase JWT from the `Authorization: Bearer <token>` header using a custom NestJS Guard with Supabase's JWKS. User roles stored in a `profiles` table linked to `auth.users` via `id`. No custom JWT minting needed.
9. **Database connection** — Backend connects to Supabase PostgreSQL via Transaction Pooler (`pooler.supabase.com:6543`). Drizzle ORM with `postgres` (node-postgres) driver. drizzle-kit migrations run against the direct connection (port 5432) since DDL requires session mode.
10. **Supabase RLS** — Row Level Security policies on key tables (timesheets, approvals) as defense-in-depth. Primary access control remains in NestJS service layer + NestJS Guards for complex business rules.

### Data Model

```
Profile (linked to Supabase auth.users)
├── id (UUID, FK → auth.users.id, PRIMARY KEY)
├── email (synced from auth.users)
├── full_name
├── job_grade
├── cost_rate (derived from job_grade via CostRate table)
├── manager_id (FK → Profile)
├── role (Employee | ChargeManager | PMO | Finance | Admin)
├── department
├── created_at
└── updated_at

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

**User/Profile API** (auth handled by Supabase client-side, backend validates JWT)
- `GET /api/v1/users/me` — Current user profile (from JWT → profiles table)
- `PUT /api/v1/users/me` — Update own profile (name, department)
- `GET /api/v1/users` — List users (Admin only)
- `PUT /api/v1/users/{id}/role` — Update role (Admin only)
- `PUT /api/v1/users/{id}/job-grade` — Update job grade (Admin only)

**Calendar API**
- `GET /api/v1/calendar?year=2026` — Get calendar with holidays/weekends
- `POST /api/v1/calendar/holidays` — Add holidays (Admin)
- `GET /api/v1/vacations/me` — My vacations

## UX/UI Design

### Design Direction: "Precision Ledger"
An enterprise aesthetic inspired by financial trading terminals and Swiss design — high information density with razor-sharp hierarchy. Dark sidebar anchors the navigation while a warm, paper-toned content area keeps data readable during long work sessions. The design communicates **trust, accuracy, and control** — critical for a system that tracks money and time.

### Figma / Design Reference
No external design provided — ASCII wireframes below serve as the design spec. The wireframes define layout, hierarchy, and component placement. Builders should follow the visual style section for colors, typography, and component treatment.

### Global Layout Shell
All authenticated pages share this shell. Sidebar is collapsible (64px collapsed / 240px expanded). Topbar is fixed. Content area scrolls independently.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ TOPBAR (h:56px, sticky)                                                  │
│ ┌────────┬───────────────────────────────────────────────┬──────────────┐│
│ │ [=]    │  Page Title                    Period: Mar'26 │ [Bell] [AV] ││
│ │ toggle │  Breadcrumb > Path                            │  notif  usr ││
│ └────────┴───────────────────────────────────────────────┴──────────────┘│
├────────┬─────────────────────────────────────────────────────────────────┤
│SIDEBAR │ CONTENT AREA (scrollable)                                       │
│(w:240) │                                                                 │
│        │                                                                 │
│ [Logo] │                                                                 │
│ TS     │   (page-specific content below)                                │
│        │                                                                 │
│ ──────── │                                                               │
│ MAIN    │                                                                │
│ ◉ Dash  │                                                                │
│ ○ Time  │                                                                │
│ ○ Codes │                                                                │
│ ○ Appvl │                                                                │
│        │                                                                 │
│ ──────── │                                                               │
│ INSIGHT │                                                                │
│ ○ Report│                                                                │
│ ○ Budget│                                                                │
│        │                                                                 │
│ ──────── │                                                               │
│ ADMIN   │  (visible for Admin/PMO/Finance roles only)                   │
│ ○ Users │                                                                │
│ ○ Cal   │                                                                │
│ ○ Rates │                                                                │
│        │                                                                 │
│ ──────── │                                                               │
│ v1.0    │                                                                │
│ [?]Help │                                                                │
└────────┴─────────────────────────────────────────────────────────────────┘
```

**Sidebar behavior:**
- Collapsed: 64px wide, icons only, tooltip on hover
- Expanded: 240px wide, icon + label
- Active item: left border accent (3px Teal), bold label, subtle bg highlight
- Sections: MAIN, INSIGHT, ADMIN (role-gated) — separated by 1px dividers
- Bottom: version badge + help link

**Topbar behavior:**
- Left: hamburger toggle + page title + breadcrumb
- Center-right: Period selector dropdown (semi-monthly periods)
- Right: Notification bell (badge count) + Avatar dropdown (profile, settings, logout)

### Wireframes

**Screen 1: Login**
```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│                    ┌──────────────────────────────┐                      │
│                    │                              │                      │
│                    │     ╔═══╗                    │                      │
│                    │     ║TS ║  Timesheet          │                      │
│                    │     ╚═══╝  System             │                      │
│                    │                              │                      │
│                    │  ┌──────────────────────────┐│                      │
│                    │  │ Email                    ││                      │
│                    │  └──────────────────────────┘│                      │
│                    │  ┌──────────────────────────┐│                      │
│                    │  │ Password            [Eye]││                      │
│                    │  └──────────────────────────┘│                      │
│                    │                              │                      │
│                    │  [■■■■■■ Sign In ■■■■■■■■■] │                      │
│                    │   (calls supabase.auth       │                      │
│                    │    .signInWithPassword())    │                      │
│                    │                              │                      │
│                    │  ─── or ───                  │                      │
│                    │                              │                      │
│                    │  [  Sign in with Microsoft ] │                      │
│                    │   (Supabase OAuth provider)  │                      │
│                    │                              │                      │
│                    │  Forgot password?            │                      │
│                    │   (supabase.auth              │                      │
│                    │    .resetPasswordForEmail())  │                      │
│                    └──────────────────────────────┘                      │
│                                                                          │
│   Subtle animated gradient background (Slate-900 → Slate-800)           │
│   Card: frosted glass effect, border-radius: 16px                       │
└──────────────────────────────────────────────────────────────────────────┘
```

**Screen 2: Dashboard — Employee View**
```
┌────────┬─────────────────────────────────────────────────────────────────┐
│SIDEBAR │ Dashboard                                     Period: Mar 2026  │
│        ├─────────────────────────────────────────────────────────────────┤
│ ◉ Dash │                                                                 │
│ ○ Time │ ROW 1: STATUS BANNER (full width)                               │
│ ○ Codes│ ┌─────────────────────────────────────────────────────────────┐ │
│ ○ Appvl│ │  Week Mar 16-22    Status: DRAFT       [Open Timesheet ->] │ │
│        │ │  ██████████████████░░░░░░░░  32h / 40h logged  (80%)      │ │
│        │ │  Mon:8  Tue:8  Wed:8  Thu:8  Fri:0                        │ │
│        │ │  ↳ Friday missing — 8h required                            │ │
│        │ └─────────────────────────────────────────────────────────────┘ │
│        │                                                                 │
│        │ ROW 2: METRIC CARDS (4-column grid)                             │
│        │ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│        │ │ Hours This  │ │ Charge-    │ │ Pending    │ │ Active     │   │
│        │ │ Period      │ │ ability    │ │ Approvals  │ │ Charge     │   │
│        │ │             │ │            │ │            │ │ Codes      │   │
│        │ │  72 / 88    │ │  78%       │ │  3         │ │  5         │   │
│        │ │  ▲ 4h vs    │ │  target    │ │  awaiting  │ │  assigned  │   │
│        │ │  last period│ │  80%       │ │  your      │ │  to you    │   │
│        │ │             │ │  ▼ 2%      │ │  review    │ │            │   │
│        │ └────────────┘ └────────────┘ └────────────┘ └────────────┘   │
│        │                                                                 │
│        │ ROW 3: TWO-COLUMN LAYOUT                                        │
│        │ ┌─────────────────────────────┐ ┌─────────────────────────────┐ │
│        │ │ MY RECENT ENTRIES           │ │ ALERTS & NOTIFICATIONS      │ │
│        │ │                             │ │                             │ │
│        │ │ Today — Mar 18              │ │ ● PRJ-042 budget 92%       │ │
│        │ │ PRJ-042  4.0h  Web Portal   │ │   forecast overrun $12K    │ │
│        │ │ ACT-010  2.0h  Code Review  │ │   [View Budget ->]         │ │
│        │ │ TSK-005  2.0h  Meetings     │ │                             │ │
│        │ │ ─────────────────           │ │ ● Team chargeability 68%   │ │
│        │ │ Yesterday — Mar 17          │ │   below 80% target         │ │
│        │ │ PRJ-042  3.0h  Web Portal   │ │   [View Report ->]         │ │
│        │ │ ACT-010  2.0h  Code Review  │ │                             │ │
│        │ │ TSK-005  3.0h  Meetings     │ │ ● Timesheet due in 2 days  │ │
│        │ │                             │ │   Period closes Mar 31      │ │
│        │ │ [View Full Timesheet ->]    │ │                             │ │
│        │ └─────────────────────────────┘ └─────────────────────────────┘ │
│        │                                                                 │
│        │ ROW 4: QUICK ACTIONS (button row, right-aligned)                │
│        │                     [+ Log Time] [Submit Sheet] [My Codes]     │
│        │                                                                 │
└────────┴─────────────────────────────────────────────────────────────────┘
```

**Screen 3: Dashboard — Manager View (additional widgets)**
```
Managers see the same layout as Employee PLUS these panels replace ROW 3:

ROW 3: THREE-COLUMN LAYOUT
┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
│ PENDING APPROVALS │ │ TEAM STATUS       │ │ ALERTS            │
│                   │ │                   │ │                   │
│ ☐ John Doe        │ │ John    40/40  ✓  │ │ ● PRJ-042 92%    │
│   Mar 9-15  40h   │ │ Jane    32/40  ⚠  │ │ ● Team chg 68%   │
│ ☐ Jane Smith      │ │ Alex    40/40  ✓  │ │ ● 2 late sheets  │
│   Mar 9-15  38h   │ │ Sam      0/40  ✗  │ │                   │
│ ☐ Alex Kim        │ │ Pat     24/40  ⚠  │ │                   │
│   Mar 9-15  40h   │ │                   │ │                   │
│                   │ │ 3/5 complete      │ │                   │
│ [Select All]      │ │                   │ │                   │
│ [Bulk Approve]    │ │ [Send Reminders]  │ │ [View All ->]     │
└───────────────────┘ └───────────────────┘ └───────────────────┘
```

**Screen 4: Time Entry — Weekly Grid**
```
┌────────┬─────────────────────────────────────────────────────────────────┐
│SIDEBAR │ My Timesheet                                                    │
│        ├─────────────────────────────────────────────────────────────────┤
│ ○ Dash │                                                                 │
│ ◉ Time │ PERIOD NAVIGATOR                                                │
│ ○ Codes│ ┌─────────────────────────────────────────────────────────────┐ │
│ ○ Appvl│ │  [<]  Week of Mar 16 – 22, 2026  [>]    Status: DRAFT     │ │
│        │ │       Semi-monthly period 2 of 2          [Week|Bi-week]   │ │
│        │ └─────────────────────────────────────────────────────────────┘ │
│        │                                                                 │
│        │ TIMESHEET GRID (editable cells, tab-navigable)                  │
│        │ ┌──────────────────┬──────┬──────┬──────┬──────┬──────┬──────┐ │
│        │ │ Charge Code      │ Mon  │ Tue  │ Wed  │ Thu  │ Fri  │TOTAL │ │
│        │ │                  │  16  │  17  │  18  │  19  │  20  │      │ │
│        │ ├──────────────────┼──────┼──────┼──────┼──────┼──────┼──────┤ │
│        │ │ PRJ-042          │      │      │      │      │      │      │ │
│        │ │ Web Portal       │ 4.00 │ 3.00 │ 2.00 │  ___ │  ___ │ 9.00│ │
│        │ │ [billable]       │      │      │      │      │      │      │ │
│        │ ├──────────────────┼──────┼──────┼──────┼──────┼──────┼──────┤ │
│        │ │ ACT-010          │      │      │      │      │      │      │ │
│        │ │ Code Review      │ 2.00 │ 2.00 │ 2.00 │  ___ │  ___ │ 6.00│ │
│        │ │ [billable]       │      │      │      │      │      │      │ │
│        │ ├──────────────────┼──────┼──────┼──────┼──────┼──────┼──────┤ │
│        │ │ TSK-005          │      │      │      │      │      │      │ │
│        │ │ Meetings         │ 2.00 │ 3.00 │ 4.00 │  ___ │  ___ │ 9.00│ │
│        │ │ [non-billable]   │      │      │      │      │      │      │ │
│        │ ├──────────────────┼──────┼──────┼──────┼──────┼──────┼──────┤ │
│        │ │ DAILY TOTAL      │ 8.00 │ 8.00 │ 8.00 │ 0.00 │ 0.00 │24.00│ │
│        │ │ Required         │ 8.00 │ 8.00 │ 8.00 │ 8.00 │ 8.00 │40.00│ │
│        │ │ Variance         │  ✓   │  ✓   │  ✓   │ -8.0 │ -8.0 │-16.0│ │
│        │ └──────────────────┴──────┴──────┴──────┴──────┴──────┴──────┘ │
│        │                                                                 │
│        │ Cell behaviors:                                                 │
│        │ - Empty cell: light dashed border, placeholder "0.00"          │
│        │ - Filled cell: solid border, Teal text for billable            │
│        │ - Weekend/holiday columns: grey bg, disabled                   │
│        │ - Negative variance: Red text + bg tint                        │
│        │ - Met/exceeded: Green checkmark                                │
│        │ - Click cell to edit, Tab to move right, Enter to move down    │
│        │ - Optional note icon appears on hover → click to add comment   │
│        │                                                                 │
│        │ ACTIONS BAR (sticky bottom)                                     │
│        │ ┌─────────────────────────────────────────────────────────────┐ │
│        │ │ [+ Add Charge Code]              [Save Draft] [Submit ->]  │ │
│        │ │ ↳ dropdown of user's registered codes                      │ │
│        │ │ Auto-saves every 30s while editing                         │ │
│        │ └─────────────────────────────────────────────────────────────┘ │
│        │                                                                 │
└────────┴─────────────────────────────────────────────────────────────────┘
```

**Screen 5: Charge Code Management**
```
┌────────┬─────────────────────────────────────────────────────────────────┐
│SIDEBAR │ Charge Codes                              [+ Create New Code]   │
│        ├─────────────────────────────────────────────────────────────────┤
│ ○ Dash │                                                                 │
│ ○ Time │ TOOLBAR                                                         │
│ ◉ Codes│ ┌─────────────────────────────────────────────────────────────┐ │
│ ○ Appvl│ │ [Search codes...]  [Level: All ▼] [Status: Active ▼]      │ │
│        │ │                    [Billable ▼]   [My Codes Only □]        │ │
│        │ └─────────────────────────────────────────────────────────────┘ │
│        │                                                                 │
│        │ SPLIT PANEL: LEFT = Tree | RIGHT = Detail                       │
│        │ ┌────────────────────────────┬────────────────────────────────┐ │
│        │ │ HIERARCHY TREE             │ DETAIL PANEL                   │ │
│        │ │                            │                                │ │
│        │ │ ▼ PRG-001                  │ PRJ-001 Web Portal Redesign    │ │
│        │ │   Digital Transformation   │ ════════════════════════════   │ │
│        │ │   $500K budget             │                                │ │
│        │ │   ▼ PRJ-001 *selected*     │ OVERVIEW TAB                   │ │
│        │ │     Web Portal Redesign    │ ┌───────────┬────────────────┐ │ │
│        │ │     $200K budget           │ │ Level     │ Project        │ │ │
│        │ │     ▸ ACT-001 Development  │ │ Owner     │ Alice Johnson  │ │ │
│        │ │     ▸ ACT-002 Testing      │ │ Approver  │ Bob Smith      │ │ │
│        │ │     ▸ ACT-003 PM           │ │ Cost Ctr  │ CC-1001        │ │ │
│        │ │   ▸ PRJ-002 Mobile App     │ │ Valid     │ Jan-Dec 2026   │ │ │
│        │ │   ▸ PRJ-003 Data Migr.     │ │ Billable  │ Yes            │ │ │
│        │ │                            │ └───────────┴────────────────┘ │ │
│        │ │ ▸ PRG-002 Operations       │                                │ │
│        │ │   $300K budget             │ BUDGET MINI-BAR                 │ │
│        │ │                            │ ████████████░░░░ $85K / $200K  │ │
│        │ │                            │ 42.5% consumed                  │ │
│        │ │                            │                                │ │
│        │ │ Tree node colors:          │ [Overview] [Access] [Budget]   │ │
│        │ │ PRG = Slate badge          │ [Edit]  [Archive]              │ │
│        │ │ PRJ = Teal badge           │                                │ │
│        │ │ ACT = Amber badge          │ ACCESS TAB (when selected):    │ │
│        │ │ TSK = Purple badge         │ Assigned users list + [Add]    │ │
│        │ │                            │ Each user: name, role, [x]     │ │
│        │ └────────────────────────────┴────────────────────────────────┘ │
│        │                                                                 │
└────────┴─────────────────────────────────────────────────────────────────┘
```

**Screen 6: Approval Queue**
```
┌────────┬─────────────────────────────────────────────────────────────────┐
│SIDEBAR │ Approvals                          [As Manager | As CC Owner]   │
│        ├─────────────────────────────────────────────────────────────────┤
│ ○ Dash │                                                                 │
│ ○ Time │ FILTER BAR                                                      │
│ ○ Codes│ ┌─────────────────────────────────────────────────────────────┐ │
│ ◉ Appvl│ │ [Period: Mar 2026 ▼] [Status: Pending ▼] [Search name...] │ │
│        │ └─────────────────────────────────────────────────────────────┘ │
│        │                                                                 │
│        │ APPROVAL TABLE                                                  │
│        │ ┌──┬──────────────┬──────────┬───────┬─────────┬─────────────┐ │
│        │ │☐ │ Employee     │ Period   │ Hours │ Status  │ Actions     │ │
│        │ ├──┼──────────────┼──────────┼───────┼─────────┼─────────────┤ │
│        │ │☐ │ John Doe     │ Mar 1-15 │ 40.0  │ Pending │ [Eye] [✓✗] │ │
│        │ │  │ Engineering  │          │       │ 2d ago  │             │ │
│        │ ├──┼──────────────┼──────────┼───────┼─────────┼─────────────┤ │
│        │ │☐ │ Jane Smith   │ Mar 1-15 │ 38.0  │ Pending │ [Eye] [✓✗] │ │
│        │ │  │ Design       │          │ ⚠-2h  │ 1d ago  │             │ │
│        │ ├──┼──────────────┼──────────┼───────┼─────────┼─────────────┤ │
│        │ │☐ │ Alex Kim     │ Mar 1-15 │ 40.0  │ Pending │ [Eye] [✓✗] │ │
│        │ │  │ Engineering  │          │       │ 3d ago  │             │ │
│        │ └──┴──────────────┴──────────┴───────┴─────────┴─────────────┘ │
│        │                                                                 │
│        │ BULK ACTIONS (appears when checkboxes selected)                 │
│        │ ┌─────────────────────────────────────────────────────────────┐ │
│        │ │  3 selected    [Approve Selected]    [Reject Selected]     │ │
│        │ └─────────────────────────────────────────────────────────────┘ │
│        │                                                                 │
│        │ INLINE DETAIL (expands below selected row on [Eye] click)      │
│        │ ┌─────────────────────────────────────────────────────────────┐ │
│        │ │ John Doe — Mar 1-15, 2026                                  │ │
│        │ │                                                             │ │
│        │ │ Charge Code      │ Mon│Tue│Wed│Thu│Fri│Mon│Tue│...│ Total  │ │
│        │ │ PRJ-042 Portal   │ 4  │ 4 │ 4 │ 4 │ 4 │ 4 │ 4 │   │ 28.0 │ │
│        │ │ ACT-010 Review   │ 2  │ 2 │ 2 │ 2 │ 2 │ -- │ --│   │ 10.0 │ │
│        │ │ TSK-005 Meetings │ 2  │ 2 │ 2 │ 2 │ 2 │ -- │ --│   │  2.0 │ │
│        │ │ Total            │ 8  │ 8 │ 8 │ 8 │ 8 │ 4  │ 4 │   │ 40.0 │ │
│        │ │                                                             │ │
│        │ │  [Approve]   [Reject with Comment...]                      │ │
│        │ └─────────────────────────────────────────────────────────────┘ │
│        │                                                                 │
│        │ REJECTION MODAL (on Reject click):                              │
│        │ ┌─────────────────────────────────────┐                        │
│        │ │ Reject Timesheet                    │                        │
│        │ │ ┌─────────────────────────────────┐ │                        │
│        │ │ │ Reason for rejection...         │ │                        │
│        │ │ │                                 │ │                        │
│        │ │ └─────────────────────────────────┘ │                        │
│        │ │         [Cancel]  [Confirm Reject]  │                        │
│        │ └─────────────────────────────────────┘                        │
│        │                                                                 │
└────────┴─────────────────────────────────────────────────────────────────┘
```

**Screen 7: Reports Dashboard**
```
┌────────┬─────────────────────────────────────────────────────────────────┐
│SIDEBAR │ Reports & Analytics                                             │
│        ├─────────────────────────────────────────────────────────────────┤
│        │                                                                 │
│ INSIGHT│ FILTER BAR                                                      │
│ ◉Reprt │ ┌─────────────────────────────────────────────────────────────┐ │
│ ○Budgt │ │ Program: [All ▼]  Period: [Mar 2026 ▼]  Team: [All ▼]     │ │
│        │ │ [Export PDF]  [Export CSV]                                  │ │
│        │ └─────────────────────────────────────────────────────────────┘ │
│        │                                                                 │
│        │ ROW 1: KPI CARDS (4-column, colored top border)                 │
│        │ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌──────┐│
│        │ │▔▔▔▔▔(teal)▔▔▔│ │▔▔▔(amber)▔▔▔▔│ │▔▔▔(green)▔▔▔▔│ │▔(red)││
│        │ │ Total Budget  │ │ Actual Spent  │ │ Utilization   │ │Overrn││
│        │ │ $500K         │ │ $390K         │ │ 87%           │ │ 2    ││
│        │ │ across 3 prog │ │ 78% consumed  │ │ +3% vs prior  │ │ proj ││
│        │ └───────────────┘ └───────────────┘ └───────────────┘ └──────┘│
│        │                                                                 │
│        │ ROW 2: CHARTS (2-column)                                        │
│        │ ┌──────────────────────────────┐ ┌──────────────────────────── │
│        │ │ BUDGET vs ACTUAL             │ │ CHARGEABILITY BY TEAM      ││
│        │ │ (Stacked bar chart)          │ │ (Horizontal bar + target)  ││
│        │ │                              │ │                            ││
│        │ │ PRG-001 ████████░░ $390/$500 │ │ Engineering ████████░ 82% ││
│        │ │ PRG-002 ██████░░░░ $180/$300 │ │ Design      ██████░░░ 65% ││
│        │ │                              │ │ QA          █████████░ 91% ││
│        │ │ Budget ░ Actual █ Forecast ╌ │ │ PM          ███████░░ 74% ││
│        │ │                              │ │ Target: 80% ──────────    ││
│        │ └──────────────────────────────┘ └────────────────────────────┘│
│        │                                                                 │
│        │ ROW 3: CHARTS (2-column)                                        │
│        │ ┌──────────────────────────────┐ ┌──────────────────────────── │
│        │ │ ACTIVITY DISTRIBUTION        │ │ FINANCIAL IMPACT SUMMARY  ││
│        │ │ (Donut chart)                │ │ (Card with breakdown)     ││
│        │ │                              │ │                            ││
│        │ │     ┌─────┐                  │ │ Over-budget cost:  -$32K  ││
│        │ │    /  Dev  \   45%           │ │ Low chargeability: -$18K  ││
│        │ │   | Testing |  20%           │ │ ─────────────────────     ││
│        │ │   |  PM     |  15%           │ │ Net P/L Impact:    -$50K  ││
│        │ │    \ Meet  /   10%           │ │                            ││
│        │ │     └Admin─┘   10%           │ │ Trend: ▼ worse vs prior   ││
│        │ │                              │ │ [View Detailed P/L ->]    ││
│        │ └──────────────────────────────┘ └────────────────────────────┘│
│        │                                                                 │
│        │ ROW 4: ALERT TABLE (full width)                                 │
│        │ ┌─────────────────────────────────────────────────────────────┐ │
│        │ │ BUDGET OVERRUN ALERTS                                      │ │
│        │ │ Sev │ Charge Code         │ Budget  │ Actual │ Overrun     │ │
│        │ │ ──  │ ─────────────────── │ ─────── │ ────── │ ─────────── │ │
│        │ │ 🔴  │ PRJ-042 Web Portal  │ $200K   │ $184K  │ Fcst +$12K │ │
│        │ │     │ ↳ ACT-015 Dev       │ $120K   │ $118K  │ Root cause │ │
│        │ │ 🟡  │ PRJ-018 Analytics   │ $80K    │ $72K   │ Fcst +$5K  │ │
│        │ │ 🟢  │ PRJ-003 Migration   │ $150K   │ $90K   │ On track   │ │
│        │ └─────────────────────────────────────────────────────────────┘ │
│        │                                                                 │
└────────┴─────────────────────────────────────────────────────────────────┘
```

**Screen 8: Admin — Calendar & Holidays**
```
┌────────┬─────────────────────────────────────────────────────────────────┐
│SIDEBAR │ Calendar Management — 2026                                      │
│        ├─────────────────────────────────────────────────────────────────┤
│ ADMIN  │                                                                 │
│ ○ Users│ YEAR NAVIGATION                                                 │
│ ◉ Cal  │ [< 2025]  2026  [2027 >]    Country: [Thailand ▼]             │
│ ○ Rates│                                                                 │
│        │ CALENDAR GRID (12 months, 3x4 grid)                             │
│        │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│        │ │ January     │ │ February    │ │ March       │               │
│        │ │ M T W T F S S│ │ M T W T F S S│ │ M T W T F S S│               │
│        │ │ . . 1 2 3 4 5│ │ . . . . . 1 2│ │ . . . 1 2 3 4│               │
│        │ │ 6 7 8 ...    │ │ 3 4 5 ...    │ │ 5 6 7 ...    │               │
│        │ │              │ │              │ │              │               │
│        │ │ Holiday days │ │ highlighted  │ │ in RED       │               │
│        │ │ Weekends in  │ │ grey         │ │              │               │
│        │ └─────────────┘ └─────────────┘ └─────────────┘               │
│        │ ... (Apr-Jun, Jul-Sep, Oct-Dec rows)                            │
│        │                                                                 │
│        │ HOLIDAY LIST (right panel or below)                             │
│        │ ┌─────────────────────────────────────────────────────────────┐ │
│        │ │ Holidays for 2026                          [+ Add Holiday] │ │
│        │ │ Date       │ Name                    │ Actions              │ │
│        │ │ Jan 1      │ New Year's Day          │ [Edit] [Delete]     │ │
│        │ │ Apr 13-15  │ Songkran Festival       │ [Edit] [Delete]     │ │
│        │ │ May 1      │ Labour Day              │ [Edit] [Delete]     │ │
│        │ │ Dec 5      │ King's Birthday         │ [Edit] [Delete]     │ │
│        │ │ Dec 10     │ Constitution Day        │ [Edit] [Delete]     │ │
│        │ └─────────────────────────────────────────────────────────────┘ │
│        │                                                                 │
└────────┴─────────────────────────────────────────────────────────────────┘
```

**Screen 9: Notification Panel (slide-over from bell icon)**
```
┌──────────────────────────────────────────────┐
│ Notifications                     [Mark All] │
│ ─────────────────────────────────────────── │
│                                              │
│ TODAY                                        │
│ ┌──────────────────────────────────────────┐ │
│ │ ● Timesheet reminder                    │ │
│ │   Friday hours missing (8h required)    │ │
│ │   2 hours ago                           │ │
│ ├──────────────────────────────────────────┤ │
│ │ ● Budget alert                          │ │
│ │   PRJ-042 reached 92% of budget         │ │
│ │   5 hours ago                           │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ YESTERDAY                                    │
│ ┌──────────────────────────────────────────┐ │
│ │ ○ Timesheet approved                    │ │
│ │   Mar 1-15 approved by Bob Smith        │ │
│ │   1 day ago                             │ │
│ ├──────────────────────────────────────────┤ │
│ │ ○ New charge code access                │ │
│ │   You were added to ACT-020             │ │
│ │   1 day ago                             │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ ● = unread   ○ = read                       │
│ [View All Notifications ->]                  │
└──────────────────────────────────────────────┘
```

### Visual Style

**Color System (CSS Variables)**
```
--bg-primary:        #0F172A    (Slate 900 — sidebar, login bg)
--bg-secondary:      #1E293B    (Slate 800 — sidebar hover)
--bg-content:        #FAFAF9    (Stone 50  — main content area, warm paper tone)
--bg-card:           #FFFFFF    (White     — card surfaces)
--bg-card-hover:     #F5F5F4    (Stone 100 — card hover state)

--text-primary:      #1C1917    (Stone 900 — headings, primary text)
--text-secondary:    #78716C    (Stone 500 — labels, secondary text)
--text-muted:        #A8A29E    (Stone 400 — placeholders, timestamps)
--text-on-dark:      #F5F5F4    (Stone 100 — sidebar text)

--accent-teal:       #0D9488    (Teal 600  — primary action, active state, billable)
--accent-teal-light: #CCFBF1    (Teal 100  — accent bg tint)
--accent-amber:      #D97706    (Amber 600 — warning, non-billable, caution)
--accent-amber-light:#FEF3C7    (Amber 100 — warning bg tint)
--accent-red:        #DC2626    (Red 600   — danger, overrun, negative variance)
--accent-red-light:  #FEE2E2    (Red 100   — danger bg tint)
--accent-green:      #059669    (Emerald 600 — success, on-track, met target)
--accent-green-light:#D1FAE5    (Emerald 100 — success bg tint)
--accent-purple:     #7C3AED    (Violet 600 — task-level badge, special)

--border:            #E7E5E4    (Stone 200 — card borders, dividers)
--border-focus:      #0D9488    (Teal 600  — input focus ring)
```

**Dark Mode** (toggle in topbar avatar dropdown):
- Content area: Stone 950 (#0C0A09)
- Cards: Stone 900 (#1C1917)
- Sidebar stays dark (already dark in light mode)
- Text inverts to Stone 100/200

**Typography**
- **Display/Headings**: "Plus Jakarta Sans" (weight 600-700) — geometric, professional, distinctive
- **Body/UI**: "DM Sans" (weight 400-500) — clean, highly legible
- **Monospace/Numbers**: "IBM Plex Mono" (weight 400-500) — for charge codes, hours, currency, dates
- Font sizes: 12px (caption), 14px (body), 16px (subtitle), 20px (h3), 24px (h2), 30px (h1)
- Line heights: 1.4 (body), 1.2 (headings)

**Component Treatment (shadcn/ui customizations)**
- Cards: 1px Stone-200 border, 8px radius, subtle shadow (0 1px 3px rgba(0,0,0,0.04))
- Buttons primary: Teal-600 bg, white text, 6px radius, 500 weight
- Buttons secondary: Stone-100 bg, Stone-900 text, 1px border
- Buttons danger: Red-600 bg, white text
- Inputs: 8px radius, Stone-200 border, Teal-600 focus ring (2px)
- Tables: Alternating row bg (white / Stone-50), sticky header, 14px body
- Badges: Pill shape (999px radius), color-coded per charge code level
- Tooltips: Slate-800 bg, Stone-100 text, 6px radius, 12px font

**Motion & Micro-interactions**
- Page transitions: content area fade-in (150ms ease-out)
- Sidebar collapse/expand: width transition (200ms ease-in-out)
- Card hover: translateY(-1px) + shadow lift (150ms)
- Notification bell: subtle shake animation on new notification
- Timesheet cell focus: border-color transition (100ms)
- Approval row expand: height slide-down (200ms ease-out)
- Budget progress bars: width animation on mount (600ms ease-out, staggered 100ms per bar)
- Chart mount: Recharts built-in animation (800ms)
- Toast notifications: slide-in from top-right (200ms)
- Skeleton loading: pulse animation for all async data

**Responsive Breakpoints**
- Desktop (>1280px): Full sidebar + content
- Tablet (768-1279px): Collapsed sidebar (icons only), full content
- Mobile (<768px): No sidebar, bottom tab navigation, stacked cards
- Timesheet grid on mobile: horizontal scroll with sticky first column

### User Flow

**Employee daily flow:**
1. Login (email/password or Microsoft SSO) → Dashboard
2. Dashboard shows weekly status banner with hours gap → click "Open Timesheet"
3. Timesheet grid: select charge codes from dropdown, type hours, Tab between cells
4. Auto-save drafts every 30s → explicit "Submit for Approval" when complete
5. Notification when approved/rejected → if rejected, edit and re-submit

**Manager approval flow:**
1. Dashboard shows "3 Pending Approvals" card → click to go to Approvals page
2. Review table: checkbox-select multiple → "Bulk Approve" or click [Eye] to expand detail
3. Expand shows full timesheet grid inline → Approve or Reject with comment
4. Rejected timesheets return to employee as Draft with notification

**Charge Code Owner flow:**
1. Toggle "As CC Owner" tab on Approvals page
2. See only charges against codes they own
3. Approve charge allocation (second approval stage after manager)

**PMO/Finance reporting flow:**
1. Navigate to Reports → see KPI cards and charts
2. Filter by program, period, team
3. Click budget overrun alert → drill down to root-cause activity
4. Export PDF/CSV for stakeholder distribution

**Admin setup flow:**
1. Calendar page → add holidays for the year
2. Users page → assign roles, set job grades
3. Rates page → configure cost rates per job grade with effective dates
4. Charge Codes → create hierarchy (Programs → Projects → Activities → Tasks)

## Relevant Files
This is a greenfield project. All files will be new.

### New Files — Backend
- `backend/package.json` — Node.js project config with NestJS dependencies
- `backend/nest-cli.json` — NestJS CLI configuration
- `backend/tsconfig.json` — TypeScript config for backend
- `backend/tsconfig.build.json` — TypeScript build config
- `backend/drizzle.config.ts` — Drizzle migration config
- `backend/src/main.ts` — Bootstrap NestJS app
- `backend/src/app.module.ts` — Root module
- `backend/src/config/config.module.ts` — @nestjs/config with .env
- `backend/src/database/database.module.ts` — Drizzle provider module
- `backend/src/database/drizzle.provider.ts` — PostgreSQL connection via Supabase pooler
- `backend/src/database/schema/` — Drizzle schema definitions (profiles, charge-codes, timesheets, approvals, budgets, calendar)
- `backend/src/database/schema/index.ts` — Schema barrel export
- `backend/src/common/guards/supabase-auth.guard.ts` — Validates Supabase JWT
- `backend/src/common/guards/roles.guard.ts` — RBAC guard
- `backend/src/common/decorators/roles.decorator.ts` — @Roles('Admin', 'PMO')
- `backend/src/common/decorators/current-user.decorator.ts` — @CurrentUser()
- `backend/src/common/filters/http-exception.filter.ts` — Global exception filter
- `backend/src/timesheets/` — Timesheet module (controller, service, DTOs)
- `backend/src/charge-codes/` — Charge code module (controller, service, DTOs)
- `backend/src/approvals/` — Approval module (controller, service, DTOs)
- `backend/src/budgets/` — Budget module (controller, service, DTOs)
- `backend/src/reports/` — Reports module (controller, service, DTOs)
- `backend/src/calendar/` — Calendar module (controller, service, DTOs)
- `backend/src/users/` — Users module (controller, service, DTOs)
- `backend/src/integrations/` — Integrations module (Teams bot, notifications, project upload)
- `backend/drizzle/migrations/` — Generated by drizzle-kit

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
- `frontend/src/lib/api.ts` — API client (attaches Supabase JWT to requests)
- `frontend/src/lib/supabase/client.ts` — Supabase browser client
- `frontend/src/lib/supabase/server.ts` — Supabase server client (for RSC/middleware)
- `frontend/src/lib/supabase/middleware.ts` — Session refresh middleware
- `frontend/src/middleware.ts` — Next.js middleware (auth guard + session refresh)

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

### Phase 5: Quality Assurance (Tasks 11-15)
- Code review
- Automated tests + test results output
- Documentation generation
- Final validation
- Self-healing loop (if failures, max 2 retries)

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

- Docs Writer
  - Name: doc-writer
  - Role: Generate all mandatory documentation — README, env-setup, architecture, API reference, database schema, deployment guide
  - Agent Type: docs-writer
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
- Initialize NestJS backend with `pnpm add @nestjs/cli && pnpm nest new backend` — create `backend/` directory with NestJS 11, Drizzle ORM, drizzle-kit, class-validator, class-transformer, @nestjs/config, @nestjs/schedule, @nestjs/swagger
- Initialize Next.js frontend with `pnpm create next-app` — create `frontend/` with TypeScript, TailwindCSS, shadcn/ui
- Create all Drizzle schema definitions in `backend/src/database/schema/`: Profile (linked to auth.users), CostRate, ChargeCode, Timesheet, TimesheetEntry, ApprovalLog, Budget, Calendar, VacationRequest
- Create drizzle-kit migration for initial schema (run against Supabase direct connection port 5432)
- Set up `backend/src/database/drizzle.provider.ts` with Drizzle ORM + node-postgres connecting to Supabase PostgreSQL pooler (port 6543, `SUPABASE_DB_URL` env var)
- Set up `backend/src/config/config.module.ts` with @nestjs/config loading from `.env`
- Create `backend/src/main.ts` with NestJS bootstrap, CORS (allow frontend origin), and global pipes/filters
- Create `backend/src/app.module.ts` as root module importing all feature modules
- Implement Supabase JWT validation: `backend/src/common/guards/supabase-auth.guard.ts` — decode JWT using Supabase JWKS endpoint, extract user_id, load Profile from DB. Create `backend/src/common/guards/roles.guard.ts` for RBAC checking profile.role. Create `@Roles()` and `@CurrentUser()` decorators.
- Create user/profile management API: `backend/src/users/` module with controller, service, and DTOs for CRUD profiles, role assignment (Admin only)
- Set up Supabase client-side auth: `frontend/src/lib/supabase/client.ts` (browser), `server.ts` (RSC), `middleware.ts` (session refresh)
- Create `frontend/src/middleware.ts` — protect routes, refresh Supabase session cookies
- Create login page using Supabase Auth UI (`@supabase/auth-ui-react`) or custom form calling `supabase.auth.signInWithPassword()`
- Create shared frontend layout: `frontend/src/app/layout.tsx` with navigation sidebar
- Set up API client: `frontend/src/lib/api.ts` — attaches `supabase.auth.getSession()` token as Bearer header
- Create `.env.sample` with all required Supabase env vars documented

### 2. Time Logging Module
- **Task ID**: time-logging
- **Depends On**: foundation-setup
- **Assigned To**: builder-time-logging
- **Agent Type**: builder
- **Parallel**: true (parallel with tasks 3-6)
- Create `backend/src/timesheets/timesheets.controller.ts` — all timesheet CRUD endpoints
- Create `backend/src/timesheets/timesheets.service.ts` — business logic:
  - Create/get timesheets by period (weekly)
  - Batch upsert entries with validation (min 8h/day)
  - Submit timesheet (status transition to "submitted")
  - Auto-cutoff logic: lock timesheets on 15th and month-end
  - Only allow charging to user's registered/allowed charge codes
- Create `backend/src/timesheets/timesheets.module.ts` — NestJS module registration
- Create `backend/src/timesheets/dto/` — class-validator DTOs for request/response models
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
- Create `backend/src/charge-codes/charge-codes.controller.ts` — CRUD with hierarchy support
- Create `backend/src/charge-codes/charge-codes.service.ts` — business logic:
  - Create charge codes at any hierarchy level (Program > Project > Activity > Task)
  - Auto-generate formatted IDs: PRG-xxx, PRJ-xxx, ACT-xxx, TSK-xxx
  - Maintain materialized path for hierarchy queries
  - Charge code owner access control: owner can manage who charges to their code
  - Hierarchical charge code owner can control sub-levels
  - Roll-up: aggregate actual costs from children to parent
  - Valid date range enforcement
  - Billable/Non-billable flag
- Create `backend/src/charge-codes/charge-codes.module.ts` — NestJS module registration
- Create `backend/src/charge-codes/dto/` — class-validator DTOs
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
- Create `backend/src/approvals/approvals.controller.ts` — approval endpoints
- Create `backend/src/approvals/approvals.service.ts` — business logic:
  - Two-stage approval: Employee > Line Manager > Charge Code Approver
  - Manager approval: approve entire timesheet
  - Charge Code Approver: approve charges to their specific charge code
  - Bulk approval endpoint (approve multiple timesheets at once)
  - Reject with comments (returns timesheet to Draft)
  - Lock approved timesheets (no further edits)
  - Approval audit log
- Create `backend/src/approvals/approvals.module.ts` — NestJS module registration
- Create `backend/src/approvals/dto/` — class-validator DTOs
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
- Create `backend/src/budgets/budgets.controller.ts` — budget API endpoints
- Create `backend/src/budgets/budgets.service.ts` — business logic:
  - Calculate actual cost: `Logged Hours x Employee Cost Rate (by Job Grade)`
  - Look up cost rate from CostRate table by employee's job grade and entry date
  - Aggregate actuals from TimesheetEntry to charge code budget
  - Roll-up: child charge code actuals aggregate to parent
  - Forecast at completion: linear projection based on burn rate and remaining period
  - Budget overrun alerts: trigger when actual > threshold (e.g., 80%, 90%, 100%)
  - Identify which task/activity is causing the overrun
- Create `backend/src/budgets/budgets.module.ts` — NestJS module registration
- Create `backend/src/budgets/dto/` — class-validator DTOs
- No dedicated frontend page — budget data consumed by Reports dashboard and Charge Code detail views

### 6. Calendar & Holiday Management
- **Task ID**: calendar
- **Depends On**: foundation-setup
- **Assigned To**: builder-calendar
- **Agent Type**: builder
- **Parallel**: true (parallel with tasks 2-5)
- Create `backend/src/calendar/calendar.controller.ts` — calendar CRUD endpoints
- Create `backend/src/calendar/calendar.service.ts` — business logic:
  - Auto-populate weekends for a given year
  - Admin can add/manage public holidays
  - Vacation request CRUD (employee submits, manager approves)
  - Calculate working days for a period (excluding weekends, holidays, approved vacations)
  - Used by timesheet module to show non-working days as disabled
- Create `backend/src/calendar/calendar.module.ts` — NestJS module registration
- Create `backend/src/calendar/dto/` — class-validator DTOs
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
- Create `backend/src/reports/reports.controller.ts` — reporting endpoints
- Create `backend/src/reports/reports.service.ts` — business logic:
  - Project cost report: budget vs actual by charge code with drill-down
  - Program financial tracking: roll-up across projects in a program
  - Resource utilization: hours logged / available hours per employee and team
  - Chargeability: billable hours / total hours per team vs target
  - Activity distribution: breakdown of hours by activity category
  - Budget overrun alerts: list charge codes exceeding threshold
  - Low chargeability alerts: teams below target threshold
  - Financial impact analysis: cost of over-budget + lost revenue from low chargeability
  - Forecast: predict end-of-period budget position
- Create `backend/src/reports/reports.module.ts` — NestJS module registration
- Create `backend/src/reports/dto/` — class-validator DTOs for response models
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
- Create `backend/src/integrations/teams-bot.service.ts` — Teams bot logic:
  - Collaborative time logging via Teams chat/channel with suggested prompts
  - Chatbot for inquiries (e.g., "What's my budget status for PRJ-042?")
  - Parse natural language time entries (e.g., "Logged 4h on PRJ-042 today")
- Create `backend/src/integrations/notification.service.ts` — reminder system:
  - Teams reminders for employees with incomplete timesheets
  - Reminder to Charge Managers for pending approvals
  - Summary of complete/incomplete logging for managers
  - Weekly insight summary to Program Owner and Cost Center Owner
- Create `backend/src/integrations/integrations.module.ts` — NestJS module with controller for webhook endpoints for Teams bot
- Create `backend/src/integrations/project-upload.service.ts`:
  - Upload/link project tracking sheet (Excel/CSV) for basic project info
  - Parse and store relevant project data
- Document Teams app manifest and setup instructions

### 10. Scheduled Jobs & Cutoff Logic
- **Task ID**: scheduled-jobs
- **Depends On**: time-logging, approvals, calendar
- **Assigned To**: builder-foundation
- **Agent Type**: builder
- **Parallel**: true (can run alongside reports and advanced features)
- Create scheduled jobs using @nestjs/schedule (`@Cron()` decorators) in relevant service modules:
  - Auto-cutoff: lock timesheets on 15th and end of month (`backend/src/timesheets/timesheets.scheduler.ts`)
  - Daily reminder: check incomplete timesheets and send notifications (`backend/src/integrations/notification.service.ts`)
  - Weekly: generate insight summary for program/cost center owners (`backend/src/reports/reports.scheduler.ts`)
  - Budget alert: periodic check for overrun thresholds (`backend/src/budgets/budgets.scheduler.ts`)
- Register `ScheduleModule.forRoot()` in `backend/src/app.module.ts`

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
  - Proper async/await usage in NestJS controllers and services
  - SQL injection prevention (parameterized queries via Drizzle ORM)
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

**Backend tests (jest):**
- **Service unit tests**: each service method, edge cases, validation
  - Timesheet: create, submit, cutoff, min 8h validation
  - Charge codes: hierarchy CRUD, materialized path, roll-up, access control
  - Approvals: state transitions (Draft→Submitted→Approved→Locked), rejection, bulk approve
  - Budget: cost rate lookup, aggregation, forecast, overrun alerts
  - Calendar: working days calc, weekend/holiday detection
- **Controller integration tests**: API endpoints with mocked services
- **Auth guard tests**: Supabase JWT validation, RBAC enforcement per role (5 roles × key endpoints)

**Frontend tests (vitest + React Testing Library) — MANDATORY:**
- **Page render tests**: all 9 pages render without errors (dashboard, timesheet, charge-codes, approvals, reports, admin/calendar, admin/users, admin/rates, login)
- **Component tests**:
  - TimesheetGrid: cell editing, Tab/Enter navigation, daily total calc, variance display
  - ChargeCodeTree: expand/collapse, search filter, level badges
  - ApprovalQueue: checkbox select, bulk approve bar, inline expand, reject modal
  - BudgetChart + ChargeabilityGauge + ActivityPie: render with mock data
- **User interaction tests**: form submit, dropdown selection, button clicks, modal open/close
- **Conditional rendering**: sidebar admin menu hidden for Employee role, manager-only widgets
- **Form validation**: min hours warning, required fields, error messages

**E2E tests (Playwright) — MANDATORY:**
- Login flow → Dashboard → open Timesheet → fill hours → submit
- Manager approval flow → bulk approve
- Charge code tree → create new code
- Reports page → filter → verify charts render
- **Screenshots**: capture each key page at desktop (1280×720) and mobile (375×667)

**MANDATORY output — `docs/test-results/`:**
```
docs/test-results/
├── summary.md              # Backend + Frontend + E2E breakdown
├── test-cases.csv          # All test cases (backend + frontend + e2e)
├── test-cases.md           # Same data in markdown
├── backend/
│   ├── unit-results.json   # jest --json output
│   └── unit-results.md
├── frontend/
│   ├── unit-results.json   # vitest --reporter=json output
│   └── unit-results.md
├── e2e/
│   ├── e2e-results.json    # Playwright JSON report
│   └── e2e-results.md
└── screenshots/
    ├── dashboard--desktop.png
    ├── dashboard--mobile.png
    ├── timesheet--desktop.png
    ├── charge-codes--desktop.png
    ├── approvals--desktop.png
    ├── reports--desktop.png
    └── ...
```
- Run commands: `cd backend && pnpm test -- --json --outputFile=../docs/test-results/backend/unit-results.json`
- Run commands: `cd frontend && pnpm vitest run --reporter=json --outputFile=../docs/test-results/frontend/unit-results.json`
- Run commands: `cd frontend && pnpm playwright test --reporter=json --output=../docs/test-results/e2e/e2e-results.json`
- Report coverage areas and results

### 13. Update Docs
- **Task ID**: update-docs
- **Depends On**: write-tests
- **Assigned To**: doc-writer
- **Agent Type**: docs-writer
- **Parallel**: false
- **MANDATORY** — Create the following documentation files:
  - `docs/README.md` — Docs index with quick start, project structure, links to all docs below
  - `docs/env-setup.md` — All environment variables with descriptions, types, and example values (sourced from `.env` and `.env.example`)
  - `docs/architecture.md` — Mermaid data flow diagram (NestJS ↔ Supabase ↔ Next.js), component tree, key patterns
  - `docs/api-reference.md` — All 20+ REST endpoints with request/response JSON examples, error codes
  - `docs/database-schema.md` — Full ERD in Mermaid, all tables with column descriptions, key relationships, indexes
- **SHOULD HAVE** — Create if time allows:
  - `docs/deployment.md` — Step-by-step backend + frontend deployment, post-deploy checklist
  - `docs/known-issues.md` — Carried forward from code reviewer findings (if any issues were skipped)
- After writing docs, verify every internal link resolves to an existing file
- Report the documentation created

### 14. Validate Final Output
- **Task ID**: validate-all
- **Depends On**: code-review, write-tests, update-docs
- **Assigned To**: validator
- **Agent Type**: validator
- **Parallel**: false
- Run all validation commands listed in Validation Commands section
- Run all automated tests
- Verify each acceptance criterion is met:
  - All 6 expected reports generate correctly
  - All 5 user roles have correct RBAC
  - Approval workflow state machine works end-to-end
  - Budget calculations are accurate
  - Charge code hierarchy supports all 4 levels
  - Timesheet cutoff logic works on 15th and month-end
- **Verify documentation**: Check all MANDATORY docs exist, all internal links resolve, Mermaid diagrams present
- **Verify test results**: Check `docs/test-results/` has summary.md, test-cases.csv, test-cases.md, unit results
- **Verify runtime**: Start backend (`cd backend && pnpm run start:dev`) and frontend (`pnpm dev`), curl key endpoints for HTTP 200
- Report pass/fail for each criterion

### 15. Heal Failures (if any)
- **Task ID**: heal
- **Depends On**: validate-all
- **Assigned To**: team-lead (orchestrator)
- **Parallel**: false
- **Max Retries**: 2
- Only run if Task 14 (validate-all) has failures
- Run: `python3 .claude/skills/validate/validate.py --json timesheet-system-full-build`
- Parse the JSON output — each failure has a `heal` field with `agent` and `instruction`
- For each failure:
  1. Create a fix task assigned to `heal.agent` with the failure context and heal instruction
  2. Wait for the fix to complete
- Re-run validation after all fixes applied
- If still failing after 2 retries, stop and report remaining failures to the user
- If all checks pass, mark the plan as complete

## Pipeline

Every plan follows this mandatory execution pipeline:

```
Foundation → Build (parallel) → Dashboard + Reports → Advanced → Code Review → Write Tests → Update Docs → Validate → Heal (if needed) → Re-validate
```

- **Foundation** (Task 1): Scaffolding, DB, auth — all features depend on this
- **Build** (Tasks 2-6): Core features built in parallel by dedicated agents
- **Dashboard + Reports** (Tasks 7-8): Depend on core feature APIs
- **Advanced** (Tasks 9-10): Teams integration and scheduled jobs
- **Code Review**: MANDATORY. code-reviewer fixes quality/efficiency/reuse issues
- **Write Tests**: MANDATORY. test-writer creates automated tests + saves results to `docs/test-results/`
- **Update Docs**: MANDATORY. docs-writer creates README, env-setup, architecture, api-reference, database-schema
- **Validate Final**: MANDATORY. validator confirms all acceptance criteria met, docs exist, tests pass, runtime works
- **Heal**: CONDITIONAL. If validation fails, parse failures via `validate.py --json` and route each to the correct agent. Max 2 retries.

## Acceptance Criteria

### Feature Criteria
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

### Quality Criteria
- [ ] Code review passes with no remaining quality issues
- [ ] All automated tests pass

### Documentation Criteria
- [ ] `docs/README.md` exists with quick start and links to all docs
- [ ] `docs/env-setup.md` exists with all environment variable descriptions and example values
- [ ] `docs/architecture.md` exists with a Mermaid data flow diagram and component tree
- [ ] `docs/api-reference.md` exists with all endpoints documented (request/response examples)
- [ ] `docs/database-schema.md` exists with ERD in Mermaid and all table descriptions
- [ ] All documentation internal links resolve to existing files (no broken links)

### Test Results Criteria
- [ ] `docs/test-results/test-cases.csv` exists with columns: ID, Test Name, Type, Category, File, Status, Notes — includes BOTH backend AND frontend entries
- [ ] `docs/test-results/test-cases.md` exists (same data in markdown table for git review)
- [ ] `docs/test-results/summary.md` exists with date, pass/fail counts, separate backend/frontend/e2e breakdown
- [ ] `docs/test-results/backend/unit-results.json` exists with jest JSON output
- [ ] `docs/test-results/backend/unit-results.md` exists with human-readable report
- [ ] `docs/test-results/frontend/unit-results.json` exists with vitest JSON output
- [ ] `docs/test-results/frontend/unit-results.md` exists with human-readable report
- [ ] `docs/test-results/e2e/e2e-results.json` exists with Playwright JSON report
- [ ] `docs/test-results/e2e/e2e-results.md` exists with human-readable report
- [ ] `docs/test-results/screenshots/` has at least 6 screenshots (dashboard, timesheet, charge-codes, approvals, reports, login) at desktop viewport
- [ ] Frontend component tests cover: TimesheetGrid, ChargeCodeTree, ApprovalQueue, chart components
- [ ] E2E tests cover: login flow, time entry flow, approval flow

### Runtime Criteria
- [ ] Backend starts without errors (`cd backend && pnpm run start:dev`)
- [ ] Frontend builds without errors (`pnpm run build`)
- [ ] Key API endpoints return HTTP 200 at runtime

## Validation Commands
Execute these commands to validate the task is complete:

### Build & Compile
- `cd backend && pnpm run build` — Verify backend compiles
- `cd frontend && pnpm run build` — Verify frontend builds without errors

### Tests
- `cd backend && pnpm run test` — Run all backend tests
- `cd frontend && pnpm run test` — Run all frontend tests

### Lint
- `cd backend && pnpm run lint` — Lint backend code
- `cd frontend && pnpm run lint` — Lint frontend code

### Migrations
- `cd backend && pnpm drizzle-kit check` — Verify migrations are up to date

### Documentation existence
- `test -f docs/README.md` — Verify docs index exists
- `test -f docs/env-setup.md` — Verify env-setup doc exists
- `test -f docs/architecture.md` — Verify architecture doc exists
- `grep -q 'mermaid' docs/architecture.md` — Verify architecture has Mermaid diagram
- `test -f docs/api-reference.md` — Verify API reference exists
- `test -f docs/database-schema.md` — Verify database schema doc exists
- `grep -q 'mermaid' docs/database-schema.md` — Verify schema has Mermaid ERD

### Documentation link integrity
- `grep -oP '\[.*?\]\(((?!http)[^)]+)\)' docs/README.md | while read -r link; do file=$(echo "$link" | grep -oP '\(([^)]+)\)' | tr -d '()'); test -f "docs/$file" || echo "BROKEN: $file"; done` — Verify all internal doc links resolve

### Test results files
- `test -f docs/test-results/test-cases.csv && head -1 docs/test-results/test-cases.csv | grep -q 'ID,Test Name'` — Verify test-cases CSV with header
- `test -f docs/test-results/test-cases.md` — Verify test-cases markdown exists
- `test -f docs/test-results/summary.md` — Verify test summary exists
- `test -f docs/test-results/backend/unit-results.json` — Verify backend test JSON output
- `test -f docs/test-results/backend/unit-results.md` — Verify backend test report
- `test -f docs/test-results/frontend/unit-results.json` — Verify frontend test JSON output
- `test -f docs/test-results/frontend/unit-results.md` — Verify frontend test report
- `test -f docs/test-results/e2e/e2e-results.json` — Verify e2e test JSON output
- `test -f docs/test-results/e2e/e2e-results.md` — Verify e2e test report
- `ls docs/test-results/screenshots/*.png 2>/dev/null | wc -l | grep -qv '^0$'` — Verify screenshots exist
- `grep -c 'frontend' docs/test-results/test-cases.csv | grep -qv '^0$'` — Verify CSV has frontend test entries

### Runtime (start servers, check health, stop)
- `cd backend && timeout 10 pnpm run start:dev & sleep 5 && curl -sf http://localhost:3001/api > /dev/null && echo "Backend OK" || echo "Backend FAIL"; kill %1 2>/dev/null` — Verify backend starts and serves API
- `cd frontend && timeout 10 pnpm dev --port 3000 & sleep 5 && curl -sf http://localhost:3000 > /dev/null && echo "Frontend OK" || echo "Frontend FAIL"; kill %1 2>/dev/null` — Verify frontend starts

## Healing Rules
When a validation check fails, assign it to the right agent to fix:

- `compile error` → builder — Fix syntax or import errors in the failing file
- `pnpm run test` (backend) → test-writer — Fix failing backend tests or update test expectations to match implementation
- `pnpm run test` (frontend) → test-writer — Fix failing frontend tests
- `pnpm run lint` (backend) → code-reviewer — Fix backend linting issues
- `pnpm run lint` (frontend) → code-reviewer — Fix frontend linting issues
- `drizzle-kit` → builder-foundation — Fix migration issues
- `test-cases.csv` → test-writer — Generate the missing test case CSV catalog
- `test-cases.md` → test-writer — Generate the missing test case markdown catalog
- `summary.md` → test-writer — Generate the missing test summary report
- `unit-results.json` → test-writer — Configure test runner JSON output and re-run tests
- `unit-results.md` → test-writer — Generate human-readable unit test report
- `screenshots` → test-writer — Capture missing page screenshots via Playwright
- `broken link` → doc-writer — Create missing documentation files referenced in indexes
- `README.md` → doc-writer — Create or fix docs/README.md
- `env-setup` → doc-writer — Create docs/env-setup.md with all env vars from .env
- `architecture` → doc-writer — Create docs/architecture.md with Mermaid diagram
- `api-reference` → doc-writer — Create docs/api-reference.md with all endpoints
- `database-schema` → doc-writer — Create docs/database-schema.md with ERD
- `mermaid` → doc-writer — Add missing Mermaid diagram to the indicated doc file
- `Backend FAIL` → builder-foundation — Fix backend startup errors
- `Frontend FAIL` → builder-foundation — Fix frontend build/startup errors
- `HTTP 200` → builder — Fix failing API endpoint

## Notes
- **New libraries needed** (backend): `pnpm add @nestjs/core @nestjs/common @nestjs/platform-express @nestjs/config @nestjs/schedule @nestjs/swagger drizzle-orm postgres class-validator class-transformer`
- **New dev dependencies** (backend): `pnpm add -D drizzle-kit @nestjs/cli @nestjs/testing jest ts-jest @types/jest typescript @types/node`
- **New libraries needed** (frontend): `pnpm add recharts@3.3.0 react-is @tanstack/react-query@5.84.1 @tanstack/react-table@8 @supabase/supabase-js @supabase/ssr`
- **Database**: Supabase PostgreSQL (hosted). No local Docker needed. Connection via pooler at `aws-0-ap-southeast-1.pooler.supabase.com:6543`.
- **Environment variables**: Store in `.env` (not committed). Template in `.env.sample`.
- **Teams integration**: Requires Microsoft Bot Framework registration and Azure AD app. Document setup steps but don't hard-code credentials.
- **Supabase Auth**: Supports email/password out of the box. Microsoft OAuth can be configured in Supabase Dashboard > Auth > Providers. No custom JWT minting needed — frontend gets tokens from Supabase, backend validates them.
- **Supabase Realtime**: Subscribe to `approvals` and `budget_alerts` channels for live updates on approval status changes and budget threshold breaches.
- **drizzle-kit migrations**: Must run against Supabase **direct** connection (port 5432, session mode) since DDL statements don't work through the transaction pooler. Use a separate `SUPABASE_DB_DIRECT_URL` env var for migrations only.
- The charge code hierarchy is the most complex data model — materialized path approach chosen for query performance over nested sets or closure tables.
- Budget forecast uses simple linear projection. Can be enhanced later with ML-based forecasting.
- Redis removed from architecture — Supabase Realtime replaces pub/sub needs, Supabase Auth handles sessions.
