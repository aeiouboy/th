# Architecture

## System Overview

The system is a full-stack TypeScript application with three layers: a Next.js 16 frontend (App Router), a NestJS 11 backend REST API, and Supabase providing PostgreSQL and authentication.

```mermaid
graph TD
    Browser[Browser Client]
    NextJS["Next.js 16 Frontend<br/>React 19 / App Router<br/>Port 3000"]
    Middleware["Next.js Middleware<br/>Session Refresh"]
    SupabaseAuth["Supabase Auth<br/>ECC P-256 / ES256 JWTs<br/>JWKS Endpoint"]
    NestAPI["NestJS 11 Backend<br/>Global Prefix: /api/v1<br/>Port 3001"]
    AuthGuard["SupabaseAuthGuard<br/>JWKS Verification<br/>Profile Lookup"]
    RolesGuard["RolesGuard<br/>RBAC Enforcement"]
    Modules["Feature Modules<br/>Controllers + Services"]
    DrizzleORM["Drizzle ORM"]
    SupabaseDB[("Supabase PostgreSQL<br/>Transaction Pooler :6543")]
    Scheduler["Scheduler Module<br/>Cron Jobs"]
    TeamsBotFW["Microsoft Teams<br/>Bot Framework"]

    Browser --> NextJS
    NextJS --> Middleware --> SupabaseAuth
    SupabaseAuth -->|"JWT (ES256)"| NextJS
    NextJS -->|"Authorization: Bearer token"| NestAPI
    NestAPI --> AuthGuard
    AuthGuard -->|"Profile lookup"| DrizzleORM
    AuthGuard --> RolesGuard --> Modules
    Modules --> DrizzleORM --> SupabaseDB
    Scheduler -->|"Periodic recalculation"| Modules
    TeamsBotFW -->|"Webhook POST"| NestAPI
```

---

## Backend Module Map

```
AppModule
├── ConfigModule (global)
├── ScheduleModule (cron)
├── DatabaseModule (Drizzle provider)
├── UsersModule
├── ChargeCodesModule          ← CR-07: access requests, CR-11: cascade access
├── TimesheetsModule           ← CR-05: copy-from-previous
├── BudgetsModule              ← CR-16/17: multi-select filter, team breakdown
├── ApprovalsModule
├── CalendarModule
├── CostRatesModule
├── DashboardModule            ← NEW (CR-01/02/03): chargeability-ytd, program-distribution
├── SchedulersModule
│   ├── TimesheetsScheduler
│   ├── BudgetsScheduler
│   ├── ReportsScheduler
│   └── NotificationService
├── ReportsModule              ← CR-13/14/15: by-program, by-cost-center, by-person
├── SettingsModule             ← Company billing rate settings
└── IntegrationsModule
    ├── Teams bot (Bot Framework)
    ├── NotificationService
    └── CSV upload (projects)
```

---

## Frontend Page Tree

All pages under `(authenticated)/` require a valid Supabase session. The Next.js middleware refreshes the session on every request and redirects unauthenticated users to `/login`.

```
app/
├── login/                        # Public — Supabase email/password login
├── auth/callback/                # Public — OAuth callback handler
└── (authenticated)/              # Protected layout group (layout.tsx)
    │   # Layout includes: sidebar (RIS logo — CR-19), mobile nav, topbar with NotificationBell
    │   # Layout also includes: ChatWidget (CR-21 chatbot)
    ├── page.tsx                  # Dashboard: KPIs, ChargeabilityTrend, ProgramDistribution (CR-01/02/03)
    ├── time-entry/
    │   └── page.tsx              # Timesheet entry: PeriodSelector, daily grid, RequestChargeCode (CR-04/07)
    ├── charge-codes/
    │   └── page.tsx              # Charge code browser: ChargeCodeTree, BudgetDetail, TeamBreakdown (CR-08/09/10/11)
    ├── approvals/
    │   └── page.tsx              # Approval queue: pending + history tabs (search fixed — CR-12)
    ├── budget/
    │   └── page.tsx              # Budget tracking: MultiSelectFilter, TeamBreakdown (CR-16/17)
    ├── reports/
    │   └── page.tsx              # Analytics: tabs By Program / By Cost Center / By Person / Overview (CR-13/14/15)
    ├── notifications/
    │   └── page.tsx              # Notification Center: filter tabs, read/unread, pagination
    ├── profile/
    │   └── page.tsx              # User profile: edit name, department
    ├── settings/
    │   └── page.tsx              # App settings
    └── admin/
        ├── users/
        │   └── page.tsx          # User management: roles, job grades
        ├── calendar/
        │   └── page.tsx          # Calendar admin: holidays, vacations
        └── rates/
            └── page.tsx          # Cost rate management: job grade → hourly rate, company billing rate
```

---

## Reports Page Component Tree

```
reports/page.tsx
├── PageHeader + Filter bar (period, program, team selectors)
├── Row 1: KPI cards (StatCard × 4)
│   └── Total Budget | Actual Spent | Utilization | Overrun Count
├── Row 2: Charts (3-col grid on lg)
│   ├── ChartCard > BudgetChart           # Bar chart: budget vs actual per charge code
│   ├── ChartCard > ChargeabilityGauge    # Gauge: chargeability by team
│   └── ChartCard > ActivityPie           # Pie: hour distribution by activity category
└── Row 3: FinancialPL (tabs)
    ├── Tab: "P/L Summary"
    │   ├── StatCard × 3 (over-budget cost, low chargeability gap, net P/L)
    │   └── Team P/L Breakdown table
    └── Tab: "Alerts (N)"
        └── AlertList (budget overruns + chargeability gaps combined)
```

---

## New Components Added in CR-01–CR-22

### Dashboard Components

```
frontend/src/components/dashboard/
├── ChargeabilityTrend.tsx    # CR-02: Line chart of monthly chargeability YTD (Recharts LineChart)
└── ProgramDistribution.tsx   # CR-03: Pie chart of hours per program, toggle Current/YTD
```

Both components fetch their own data via TanStack Query and are embedded directly on `page.tsx`.

### Time Entry Components

```
frontend/src/components/time-entry/
├── PeriodSelector.tsx        # CR-04: Dropdown with 52-week list; drives the timesheet grid period
└── RequestChargeCode.tsx     # CR-07: Dialog to search CC and submit an access request with reason
```

### Charge Codes Components

```
frontend/src/components/charge-codes/
├── ChargeCodeTree.tsx        # CR-10: Improved tree with aligned columns (ID | Name | Budget)
├── BudgetDetail.tsx          # CR-08: Budget vs actual breakdown per child charge code with progress bars
└── (charge-codes/TeamBreakdown inside BudgetDetail) # CR-09: Hours/cost/% per team
```

### Reports Components

```
frontend/src/components/reports/
├── ReportByProgram.tsx       # CR-13: Program-level budget vs actual, task/team distribution
├── ReportByCostCenter.tsx    # CR-14: Cost center chargeability and charge distribution
└── ReportByPerson.tsx        # CR-15: Per-employee hours history, project summary, vacation days
```

### Budget Components

```
frontend/src/components/budget/
├── MultiSelectFilter.tsx     # CR-16: Multi-select dropdown for filtering multiple charge codes
└── TeamBreakdown.tsx         # CR-17: Cost breakdown per department for a selected budget
```

### Layout Components

```
frontend/src/components/layout/
├── ChatWidget.tsx            # CR-21: In-app chat widget (Phase 1 — NLP via /integrations/teams/message)
└── ChatBubble.tsx            # CR-21: Individual message bubble inside ChatWidget
```

### Public Assets

```
frontend/public/
└── ris-logo.svg              # CR-19: RIS corporate logo displayed in sidebar header
```

---

### Shared Alert Types

Alert type interfaces and helper functions shared between `AlertList`, `FinancialPL`, and `NotificationBell` are defined in:

```
frontend/src/components/reports/types.ts
```

Exported members:
- `BudgetAlert` — interface for budget overrun alerts (`/reports/budget-alerts`)
- `ChargeabilityAlert` — interface for chargeability alerts (`/budgets/chargeability-alerts`)
- `severityColorClass(severity)` — maps severity string to a Tailwind CSS class
- `compareSeverity(a, b)` — comparator for sorting alerts by severity (red → orange → yellow)

---

## NotificationBell Component

Location: `frontend/src/components/layout/NotificationBell.tsx`

The `NotificationBell` is rendered in the authenticated layout topbar (`(authenticated)/layout.tsx`). It operates independently from the Reports page — it fetches its own data rather than relying on props passed from a parent.

**Data flow:**

```
layout.tsx
└── NotificationBell
    ├── useQuery → GET /reports/budget-alerts       (staleTime: 30s)
    └── useQuery → GET /budgets/chargeability-alerts (staleTime: 30s)
        → merges + sorts by severity → shows top 5 in popover
        → badge shows total count
        → click navigates to /reports
```

**Behavior:**
- Badge is hidden when `totalCount === 0`
- Popover closes on outside click (via `mousedown` event listener)
- Each alert item in the popover navigates to `/reports` on click
- "View all alerts" footer link also navigates to `/reports`

---

## Supabase Storage — Avatar Uploads

Profile avatars are stored in Supabase Storage, not on the backend server.

**Bucket:** `avatars`
**Access policy:** Public (URLs are readable without authentication)
**Size limit:** 2 MB per file
**Accepted MIME types:** `image/jpeg`, `image/png`, `image/gif`, `image/webp`

**Upload flow:**

```
Browser
  └─▶ Supabase Storage (PUT /storage/v1/object/avatars/<userId>/<filename>)
          └─▶ Returns a public URL
                └─▶ Frontend calls PUT /api/v1/users/me/avatar { avatarUrl: "<public URL>" }
                        └─▶ Backend stores URL in profiles.avatar_url
                                └─▶ Avatar displayed in layout topbar and profile page
```

The backend validates that `avatarUrl` is a valid HTTP/HTTPS URL before persisting it. File type and size enforcement is performed by the Supabase Storage bucket policy — the backend does not re-validate these constraints.

---

## Authentication Flow

1. User submits email and password on `/login`.
2. Next.js calls Supabase Auth, which returns an ES256-signed JWT access token.
3. Next.js middleware runs on every request to the `(authenticated)` group, refreshing the session token silently.
4. Frontend API calls attach the JWT as `Authorization: Bearer <token>`.
5. `SupabaseAuthGuard` on the backend:
   - Fetches the JWKS public keys from `https://lchxtkiceeyqjksganwr.supabase.co/auth/v1/.well-known/jwks.json`.
   - Verifies the token signature using the ES256 algorithm.
   - Loads the corresponding `profiles` row from the database using the JWT `sub` claim (user UUID).
   - Attaches the profile to `request.user`.
6. `RolesGuard` checks the `@Roles()` decorator on the handler. Roles not listed will receive `403 Forbidden`.
7. Controllers access the authenticated profile via `@CurrentUser()`.

Endpoints decorated with `@Public()` bypass both guards entirely.

---

## Role-Based Access Control

| Role | Description |
|------|-------------|
| `employee` | Can create/submit own timesheets; view assigned charge codes |
| `charge_manager` | Approves timesheets at the CC-owner stage; manages charge code access |
| `pmo` | Project management office; read access to reports and notifications |
| `finance` | Read access to cost rates and financial reports |
| `admin` | Full access to all endpoints including user management and admin CRUD |

---

## Timesheet State Machine

Timesheets follow a two-stage approval workflow before being locked.

```
draft ──submit──▶ submitted ──manager approve──▶ manager_approved ──cc approve──▶ cc_approved ──cron──▶ locked
  ▲                   │                                  │
  │                reject                             reject
  └───────────────────┴──────────────────────────────────┘
                       ▼
                   rejected (employee can revise and resubmit)
```

**Submit validation (min 8 hours):** Before transitioning from `draft` to `submitted`, the backend checks that every weekday (excluding holidays from the `calendar_days` table) in the period has at least 8 hours logged across all charge codes for that day. If any day falls short, the submit returns `400` with a `details` array listing each short day.

---

## Charge Code Hierarchy

Charge codes use a **materialized path** pattern:

```
PROG-001 (program)
└── PROJ-001 (project)
    ├── ACT-001 (activity)
    │   └── TASK-001 (task)
    └── ACT-002 (activity)
```

Each row stores:
- `id` — the charge code identifier (e.g., `ACT-001`)
- `path` — full path string (e.g., `PROG-001/PROJ-001/ACT-001`)
- `level` — enum: `program | project | activity | task`
- `parent_id` — foreign key to the parent charge code

This allows efficient tree queries without recursive CTEs.

---

## Database Overview

Twelve tables managed by Drizzle ORM:

| Table | Purpose |
|-------|---------|
| `profiles` | User accounts, roles, job grades |
| `charge_codes` | Hierarchical project/activity codes |
| `charge_code_access` | User-to-charge-code assignments |
| `charge_code_requests` | Employee requests to join a charge code (NEW — CR-07) |
| `timesheets` | Per-user, per-period timesheet records |
| `timesheet_entries` | Daily hour entries within a timesheet |
| `approval_logs` | Audit log of all approval actions |
| `budgets` | Budget tracking per charge code |
| `calendar_days` | Working days, weekends, and holidays |
| `vacation_requests` | Employee vacation requests (added `leave_type` column — CR-06) |
| `cost_rates` | Hourly cost rates by job grade |
| `notifications` | Per-user notification inbox with read state and Teams delivery |

See [database-schema.md](database-schema.md) for the full ERD and column definitions.

---

## API Prefix Convention

All backend endpoints are served under the global prefix `/api/v1`. Controllers must not include this prefix in their `@Controller()` decorator — the global prefix is registered once in `main.ts` via `app.setGlobalPrefix('api/v1')`.

Correct:
```typescript
@Controller('timesheets')       // resolves to /api/v1/timesheets
```

Incorrect:
```typescript
@Controller('api/v1/timesheets') // resolves to /api/v1/api/v1/timesheets
```

See [troubleshooting.md](troubleshooting.md#issue-double-route-prefix-in-controllers) for details on this bug.

---

## Key Patterns

### Server-Side Rendering with Bearer Auth

Next.js server components and `fetch()` calls include the Supabase session token in the `Authorization` header. The `api.ts` utility retrieves the current session from Supabase client and injects the token automatically.

### Scheduled Jobs

Three cron jobs run on the backend:

- `TimesheetsScheduler` — locks approved timesheets after the cutoff date
- `BudgetsScheduler` — recalculates `actual_spent` and `forecast_at_completion` from approved entries
- `ReportsScheduler` — pre-aggregates report data for fast queries

### Notification Flow

```mermaid
graph TD
    Schedulers["SchedulersModule<br/>(cron jobs)"]
    IntegSvc["IntegrationNotificationService<br/>(sends & persists)"]
    NotiSvc["NotificationsService<br/>(DB + Teams delivery)"]
    NotiDB[("notifications table")]
    TeamsWebhook["TeamsWebhookService<br/>POST TEAMS_WEBHOOK_URL"]
    Bell["NotificationBell<br/>(layout topbar)"]
    NotiPage["/notifications page"]

    Schedulers -->|"sendAllNotifications()"| IntegSvc
    IntegSvc -->|"create(type, recipientId, subject, body)"| NotiSvc
    NotiSvc -->|"INSERT"| NotiDB
    NotiSvc -->|"fire-and-forget"| TeamsWebhook

    Bell -->|"GET /notifications/unread-count (30s)"| NotiDB
    NotiPage -->|"GET /notifications?limit=20&offset=0"| NotiDB
    NotiPage -->|"PATCH /notifications/:id/read"| NotiDB
    NotiPage -->|"POST /notifications/read-all"| NotiDB
```

**Cron schedule:**
- Timesheet reminders — sent when a user has logged fewer hours than expected for days elapsed in the current week
- Approval reminders — sent to managers with pending timesheets awaiting their approval
- Manager summary — weekly digest of direct-report timesheet statuses
- Weekly insights — chargeability and budget summary sent to `pmo`, `finance`, and `admin` users

Teams delivery is fire-and-forget: a failure to reach the webhook does not block DB persistence or the API response.

### Cost Calculation

`calculated_cost` per entry = `hours × hourly_rate` where the hourly rate is looked up from `cost_rates` by the user's `job_grade`. This is computed at entry save time and stored on `timesheet_entries.calculated_cost`.

### Financial P/L Report

`GET /reports/financial-impact` aggregates approved timesheet entries to compute:

1. **Over-budget cost** — sum of `(actual − budget)` for every charge code where `actual > budget`.
2. **Low chargeability cost** — estimated revenue gap from chargeability falling below target (80%). Computed as `(target_rate − actual_rate) × total_hours × avg_hourly_rate`.
3. **Net P/L impact** — sum of the two costs above.
4. **`byTeam`** — per-department breakdown: total cost, billable revenue, margin, margin %, and chargeability rate.
5. **`byChargeCode`** — per charge code: budget, actual, variance, and forecast overrun.

The `period` query param filters entries to a specific month. The `team` query param restricts the `byTeam` array.

### Chargeability Alerts

`GET /budgets/chargeability-alerts` computes each employee's chargeability rate from approved timesheet entries and flags those below 80% (the default target). Each alert includes a `costImpact` estimate: hours × average hourly rate × chargeability gap.
