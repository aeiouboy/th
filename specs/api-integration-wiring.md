# Plan: API Integration Wiring

## Task Description
Wire all frontend pages to real backend API endpoints, removing mock data fallbacks. Currently, every frontend page has `try/catch` blocks that silently fall back to hardcoded mock data when API calls fail. This means the UI always "works" but never shows real data from the database. This task connects every page to real API responses, fixes contract mismatches between frontend expectations and backend responses, seeds enough test data for all pages, and ensures the full auth flow (Supabase JWT) works end-to-end.

## Objective
When complete, every authenticated page in the Timesheet System will load and display real data from the Supabase PostgreSQL database via the NestJS backend API. No mock data fallbacks will remain in production code. The full user flow -- login, create timesheet, enter hours, submit, approve -- will work with real state changes persisted to the database.

## Problem Statement
The frontend and backend were built independently with mocked unit tests (159/159 pass), but they have never been verified working together with real data. Specific issues:

1. **Silent mock fallbacks**: Every page does `const data = rawData || MOCK_DATA` or `rawData.length > 0 ? rawData : MOCK_DATA`, so API failures are invisible to users
2. **Contract mismatches**: Frontend expects `chargeCodeId` field but backend may return `charge_code_id`; frontend expects nested `employee` object in approvals but backend may return flat rows
3. **Auth token not reaching backend**: `api.ts` gets the Supabase session token correctly, but backend guard requires specific JWT algorithm (ES256) and JWKS endpoint
4. **Mock-gated logic**: Time entry page explicitly checks `timesheet.id === 'mock-ts-1'` and skips save/submit operations
5. **Empty database**: Only 1 profile, 2 timesheets, 2 entries, 0 approval logs -- not enough data to test all pages
6. **Unimplemented endpoints**: Some backend services may return empty arrays or throw not-implemented errors
7. **Budget/Rates pages**: Entirely mock-driven with no API calls wired

## Solution Approach
Three-phase approach: (1) Fix auth foundation and seed data, (2) Wire each page group in parallel, (3) Integration test the full flow.

For each page:
- Read frontend code to identify exact API calls and expected response shapes
- Read backend controller/service to verify actual response shapes
- Fix contract mismatches (field naming, nesting, response wrapping)
- Replace mock fallbacks with proper loading/error states
- Test with real auth token against real database

## Tech Stack
- **Language**: TypeScript (both frontend and backend)
- **Framework**: Next.js 16 (frontend), NestJS 11 (backend)
- **Runtime**: Node.js
- **Database**: Supabase PostgreSQL via Drizzle ORM
- **Auth**: Supabase Auth (JWT with ES256), JWKS verification
- **Key APIs/Libraries**: `@tanstack/react-query`, `@supabase/ssr`, `drizzle-orm`, `jsonwebtoken`, `jwks-rsa`
- **Build Tools**: npm (both packages)
- **Testing**: Vitest (unit), Playwright (E2E), curl (API smoke tests)

## Technical Design

### Architecture
```
Browser → Next.js 16 (port 3000)
  ├── Supabase Auth (login → JWT access_token)
  └── api.ts → fetch(`http://localhost:3001/api/v1/...`, { Authorization: Bearer <jwt> })
        └── NestJS 11 (port 3001)
              ├── SupabaseAuthGuard (JWKS verify ES256 token → lookup profiles table → attach user)
              └── Controllers → Services → Drizzle ORM → Supabase PostgreSQL (pooler:6543)
```

### Key Design Decisions

1. **Always use JWKS verification** -- never fall back to HS256 symmetric secret. The guard already does this correctly.
2. **Remove mock data at page level** -- replace `rawData || MOCK_DATA` patterns with proper `isLoading` / `isError` states and toast notifications on error.
3. **Keep mock data in a separate `__mocks__` directory** -- for unit tests only, not imported by page components.
4. **Fix field naming at the backend** -- backend should return camelCase fields matching frontend TypeScript interfaces. Drizzle already converts snake_case columns to camelCase via schema definitions.
5. **Seed script as a standalone SQL file** -- executed via Supabase SQL editor or `psql`, not a Node script, for reliability.

### Data Model

Frontend expects these shapes (from page type definitions):

**UserProfile**: `{ id, email, fullName, role, department, jobGrade }`
**Timesheet**: `{ id, periodStart, periodEnd, status, submittedAt }`
**Entry**: `{ id, chargeCodeId, date, hours, description, chargeCodeName?, isBillable? }`
**ChargeCode**: `{ chargeCodeId, name, isBillable }` (from `/timesheets/charge-codes`)
**ChargeCode (tree)**: `{ id, code, name, type, parentId, isBillable, isActive, children[] }` (from `/charge-codes/tree`)
**PendingResponse**: `{ asManager: PendingTimesheet[], asCCOwner: PendingTimesheet[] }`
**PendingTimesheet**: `{ id, userId, periodStart, periodEnd, status, submittedAt, totalHours, employee: { id, fullName, email, department } }`
**BudgetAlert**: `{ chargeCodeId, name, budget, actual, forecast, severity, rootCauseActivity }`
**BudgetSummary**: `{ totalBudget, totalActual, totalForecast, overBudgetCount }`

### API / Interface Contracts

All endpoints are prefixed with `/api/v1/`. Auth header: `Authorization: Bearer <supabase_access_token>`.

| Frontend Call | Backend Route | Expected Response Shape | Status |
|---|---|---|---|
| `GET /users/me` | UsersController.getMe | `UserProfile` | Verify |
| `GET /timesheets?period=YYYY-MM-DD` | TimesheetsController.findByPeriod | `Timesheet \| null` | Verify |
| `POST /timesheets` | TimesheetsController.create | `Timesheet` | Verify |
| `GET /timesheets/:id/entries` | TimesheetsController.getEntries | `Entry[]` | Verify |
| `PUT /timesheets/:id/entries` | TimesheetsController.upsertEntries | `Entry[]` | Verify |
| `POST /timesheets/:id/submit` | TimesheetsController.submit | `Timesheet` | Verify |
| `GET /timesheets/charge-codes` | TimesheetsController.getUserChargeCodes | `ChargeCode[]` | Verify |
| `GET /charge-codes/tree` | ChargeCodesController.getTree | `ChargeCode[]` (nested) | Verify |
| `GET /approvals/pending` | ApprovalsController.getPending | `PendingResponse` | Verify |
| `POST /approvals/:id/approve` | ApprovalsController.approve | `{ success: true }` | Verify |
| `POST /approvals/:id/reject` | ApprovalsController.reject | `{ success: true }` | Verify |
| `POST /approvals/bulk-approve` | ApprovalsController.bulkApprove | `{ approved: string[] }` | Verify |
| `GET /approvals/history` | ApprovalsController.getHistory | `ApprovalLog[]` | Verify |
| `GET /budgets/alerts` | BudgetsController.getAlerts | `BudgetAlert[]` | Verify |
| `GET /budgets/summary` | BudgetsController.getSummary | `BudgetSummary` | Verify |
| `GET /reports/utilization` | ReportsController.getUtilization | `UtilizationReport` | Verify |
| `GET /reports/chargeability` | ReportsController.getChargeability | `ChargeabilityReport` | Verify |
| `GET /reports/financial-impact` | ReportsController.getFinancialImpact | `FinancialImpact` | Verify |
| `GET /reports/activity-distribution` | ReportsController.getActivityDist | `ActivityDistribution` | Verify |
| `GET /calendar` | CalendarController.getCalendar | `CalendarDay[]` | Verify |
| `POST /calendar/holidays` | CalendarController.createHoliday | `CalendarDay` | Verify |
| `PUT /calendar/holidays/:id` | CalendarController.updateHoliday | `CalendarDay` | Verify |
| `DELETE /calendar/holidays/:id` | CalendarController.deleteHoliday | `{ success: true }` | Verify |
| `POST /calendar/populate-weekends` | CalendarController.populateWeekends | `{ count: number }` | Verify |
| `GET /vacations/pending` | CalendarController.getPendingVacations | `VacationRequest[]` | Verify |
| `GET /users` | UsersController.getAll | `UserProfile[]` | Verify |
| `PUT /users/:id/role` | UsersController.updateRole | `UserProfile` | Verify |

## Relevant Files
Use these files to complete the task:

### Frontend - Core
- `frontend/src/lib/api.ts` -- API client with auth header injection. May need error handling improvements.
- `frontend/src/lib/supabase/client.ts` -- Supabase browser client for auth session.
- `frontend/src/lib/supabase/middleware.ts` -- Middleware for session refresh.

### Frontend - Pages (all need mock removal)
- `frontend/src/app/(authenticated)/page.tsx` -- Dashboard. Has MOCK_USER, MOCK_TIMESHEET, MOCK_CHARGE_CODES, MOCK_PENDING, MOCK_BUDGET_ALERTS.
- `frontend/src/app/(authenticated)/time-entry/page.tsx` -- Time Entry. Has MOCK_CHARGE_CODES, getMockEntries, mock-ts-1 guard.
- `frontend/src/app/(authenticated)/charge-codes/page.tsx` -- Charge Codes. Needs verification.
- `frontend/src/app/(authenticated)/approvals/page.tsx` -- Approvals. Needs verification.
- `frontend/src/app/(authenticated)/reports/page.tsx` -- Reports. Has mockBudgetSummary, mockChargeability, mockActivityDist, mockFinancialImpact, mockAlerts, mockBudgetChartData.
- `frontend/src/app/(authenticated)/budget/page.tsx` -- Budget. Has mockSummary, mockAlerts, mockChildren. Entirely mock-driven.
- `frontend/src/app/(authenticated)/admin/calendar/page.tsx` -- Admin Calendar. Needs verification.
- `frontend/src/app/(authenticated)/admin/users/page.tsx` -- Admin Users. Needs verification.
- `frontend/src/app/(authenticated)/admin/rates/page.tsx` -- Admin Rates. Needs wiring to cost_rates API.
- `frontend/src/app/(authenticated)/profile/page.tsx` -- Profile. Needs verification.
- `frontend/src/app/(authenticated)/settings/page.tsx` -- Settings. Local state only, no API needed.

### Backend - Controllers
- `backend/src/timesheets/timesheets.controller.ts` -- 7 endpoints
- `backend/src/timesheets/timesheets.service.ts` -- Business logic for timesheets
- `backend/src/charge-codes/charge-codes.controller.ts` -- 8 endpoints
- `backend/src/charge-codes/charge-codes.service.ts` -- Business logic for charge codes
- `backend/src/approvals/approvals.controller.ts` -- 6 endpoints
- `backend/src/approvals/approvals.service.ts` -- Business logic for approvals
- `backend/src/budgets/budgets.controller.ts` -- 5 endpoints
- `backend/src/budgets/budgets.service.ts` -- Business logic for budgets
- `backend/src/reports/reports.controller.ts` -- 5 endpoints
- `backend/src/reports/reports.service.ts` -- Business logic for reports
- `backend/src/users/users.controller.ts` -- 5 endpoints
- `backend/src/users/users.service.ts` -- Business logic for users
- `backend/src/calendar/calendar.controller.ts` -- 11 endpoints
- `backend/src/calendar/calendar.service.ts` -- Business logic for calendar
- `backend/src/integrations/integrations.controller.ts` -- Webhooks, notifications, upload

### Backend - Auth & Database
- `backend/src/common/guards/supabase-auth.guard.ts` -- JWKS-based JWT verification (ES256)
- `backend/src/database/schema/index.ts` -- All 10 table schemas
- `backend/src/database/schema/profiles.ts` -- profiles table
- `backend/src/database/schema/timesheets.ts` -- timesheets table
- `backend/src/database/schema/timesheet-entries.ts` -- timesheet_entries table
- `backend/src/database/schema/charge-codes.ts` -- charge_codes table
- `backend/src/database/schema/charge-code-users.ts` -- charge_code_users table
- `backend/src/database/schema/approval-logs.ts` -- approval_logs table
- `backend/src/database/schema/budgets.ts` -- budgets table
- `backend/src/database/schema/calendar.ts` -- calendar table
- `backend/src/database/schema/vacation-requests.ts` -- vacation_requests table
- `backend/src/database/schema/cost-rates.ts` -- cost_rates table
- `backend/src/database/drizzle.provider.ts` -- Drizzle DB connection
- `backend/drizzle.config.ts` -- Drizzle config with pooler fallback

### Config
- `backend/.env` -- Backend environment variables
- `frontend/.env.local` -- Frontend environment variables (must be .env.local for Next.js 16)

### New Files
- `backend/src/database/seed.sql` -- Comprehensive seed data for all pages
- `scripts/test-api.sh` -- Shell script to test all API endpoints with real auth
- `scripts/seed-database.sh` -- Script to run seed SQL against Supabase

## Implementation Phases

### Phase 1: Foundation (Sequential)
Verify auth flow end-to-end, fix api.ts if needed, create comprehensive seed data, verify database connectivity. This must complete before any page wiring.

### Phase 2: Page Wiring (Parallel - 3 builders)
- **Core pages**: Dashboard, Time Entry, Charge Codes
- **QA pages**: Approvals, Reports, Budget
- **Admin pages**: Admin Calendar, Admin Users, Admin Rates, Profile

For each page:
1. Read backend service to verify response shape matches frontend types
2. Fix any contract mismatches in backend service (field names, nesting, response wrapping)
3. Remove mock data fallbacks from frontend page
4. Add proper loading/error states with toast notifications
5. Verify page loads real data

### Phase 3: Integration Testing
E2E test of critical flows with real Supabase auth and real database operations.

## Team Orchestration

- You operate as the team lead and orchestrate the team to execute the plan.
- You're responsible for deploying the right team members with the right context to execute the plan.
- IMPORTANT: You NEVER operate directly on the codebase. You use `Task` and `Task*` tools to deploy team members to to the building, validating, testing, deploying, and other tasks.
  - This is critical. You're job is to act as a high level director of the team, not a builder.
  - You're role is to validate all work is going well and make sure the team is on track to complete the plan.
  - You'll orchestrate this by using the Task* Tools to manage coordination between the team members.
  - Communication is paramount. You'll use the Task* Tools to communicate with the team members and ensure they're on track to complete the plan.
- Take note of the session id of each team member. This is how you'll reference them.

### Team Members

- Builder
  - Name: builder-auth
  - Role: Fix auth flow, api.ts error handling, create seed data, verify infra connectivity (Phase 1 foundation)
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-core-api
  - Role: Wire Dashboard, Time Entry, and Charge Codes pages to real API (Phase 2 core pages)
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-qa-api
  - Role: Wire Approvals, Reports, and Budget pages to real API (Phase 2 QA pages)
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-admin-api
  - Role: Wire Admin Calendar, Admin Users, Admin Rates, and Profile pages to real API (Phase 2 admin pages)
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
  - Name: final-validator
  - Role: Final read-only validation that all acceptance criteria are met and all tests pass
  - Agent Type: validator
  - Resume: false

## Step by Step Tasks

### 1. Infra Verify & Auth Flow
- **Task ID**: infra-verify
- **Depends On**: none
- **Assigned To**: builder-auth
- **Agent Type**: builder
- **Parallel**: false
- Verify Supabase PostgreSQL connection via pooler: execute `SELECT 1` using the connection string in `backend/.env` (`SUPABASE_DB_URL`)
- Verify JWKS endpoint is reachable: `curl https://lchxtkiceeyqjksganwr.supabase.co/auth/v1/.well-known/jwks.json` returns valid keys
- Start backend (`npm run start:dev` in `backend/`), verify it boots without errors
- Login as test user (`tachongrak@central.co.th` / `password1234`) via Supabase Auth REST API to get a JWT access token
- Call `GET /api/v1/users/me` with the JWT -- verify it returns the real profile from the database (not 401/403)
- If any of the above fail, fix the issue before proceeding
- Document the working JWT token retrieval method for downstream builders

### 2. Seed Database
- **Task ID**: seed-database
- **Depends On**: infra-verify
- **Assigned To**: builder-auth
- **Agent Type**: builder
- **Parallel**: false
- Create `backend/src/database/seed.sql` with comprehensive test data:
  - **profiles**: At least 5 users (1 admin, 1 pmo, 1 charge_manager, 2 employees) -- note: profiles must match Supabase auth.users, so only seed profiles for users that exist in auth. The existing admin user `d3055e90-4396-4fb6-95fa-3767eafb8349` must be preserved.
  - **charge_codes**: At least 8 codes (mix of project/activity/task, hierarchical with parent-child, billable and non-billable)
  - **charge_code_users**: Assign charge codes to users (at least 3-4 assignments per user)
  - **timesheets**: At least 4 timesheets (draft, submitted, manager_approved, locked) across different users and periods
  - **timesheet_entries**: At least 20 entries across the timesheets (varied hours, dates, charge codes)
  - **approval_logs**: At least 3 approval/rejection records
  - **budgets**: At least 4 budgets (some over threshold for alerts)
  - **calendar**: Ensure current month has working days populated, plus at least 2 holidays
  - **vacation_requests**: At least 2 requests (1 pending, 1 approved)
  - **cost_rates**: At least 4 rates for different job grades
- Execute the seed SQL against the Supabase database
- Verify seed data exists by querying key tables

### 3. Fix api.ts Error Handling
- **Task ID**: fix-api-client
- **Depends On**: infra-verify
- **Assigned To**: builder-auth
- **Agent Type**: builder
- **Parallel**: true (can run alongside seed-database)
- Update `frontend/src/lib/api.ts` to:
  - Add `toast.error()` call on API failures (import from `sonner`) so errors are visible to users
  - Add request/response logging in development mode (`console.debug` for request URL and response status)
  - Handle 401 responses by redirecting to `/login` (session expired)
  - Ensure the error is still thrown (so `react-query` `isError` state works)
- Do NOT add mock fallbacks -- errors should be visible

### 4. Wire Dashboard Page
- **Task ID**: wire-dashboard
- **Depends On**: seed-database, fix-api-client
- **Assigned To**: builder-core-api
- **Agent Type**: builder
- **Parallel**: true (parallel with wire-time-entry, wire-approvals, wire-admin-pages)
- Read `frontend/src/app/(authenticated)/page.tsx` and `backend/src/users/users.service.ts`, `backend/src/timesheets/timesheets.service.ts`, `backend/src/approvals/approvals.service.ts`, `backend/src/budgets/budgets.service.ts`
- Verify `GET /users/me` returns `{ id, email, fullName, role, department, jobGrade }` -- fix service if field names differ
- Verify `GET /timesheets?period=YYYY-MM-DD` returns `Timesheet | null` -- check if it returns array or single object
- Verify `GET /timesheets/:id/entries` returns `Entry[]` with `chargeCodeName` and `isBillable` joined
- Verify `GET /timesheets/charge-codes` returns `ChargeCode[]` with `{ chargeCodeId, name, isBillable }` shape
- Verify `GET /approvals/pending` returns `{ asManager: [...], asCCOwner: [...] }` with nested `employee` objects
- Verify `GET /budgets/alerts` returns `BudgetAlert[]` with `{ chargeCodeId, name, budget, actual, forecast, severity, rootCauseActivity }`
- Remove all `MOCK_*` constants and fallback patterns from dashboard page
- Replace `const user = rawUser || MOCK_USER` with `const user = rawUser` and handle `undefined` with loading state
- Replace `const timesheet = rawTimesheet === undefined ? MOCK_TIMESHEET : rawTimesheet` with `const timesheet = rawTimesheet ?? null`
- Replace `entries.length > 0 ? entries : getMockEntries(...)` with just `entries`
- Remove `MOCK_CHARGE_CODES`, `MOCK_PENDING`, `MOCK_BUDGET_ALERTS` and their fallback usage
- Add error toasts for failed queries using `onError` in `useQuery` options
- Test: start both servers, login, verify dashboard shows real data

### 5. Wire Time Entry Page
- **Task ID**: wire-time-entry
- **Depends On**: seed-database, fix-api-client
- **Assigned To**: builder-core-api
- **Agent Type**: builder
- **Parallel**: true
- Read `frontend/src/app/(authenticated)/time-entry/page.tsx` and `backend/src/timesheets/timesheets.service.ts`
- Remove `MOCK_CHARGE_CODES` constant and `getMockEntries()` function
- Remove the `chargeCodes = rawChargeCodes.length > 0 ? rawChargeCodes : MOCK_CHARGE_CODES` fallback
- Remove the `entries = entriesData.length > 0 ? entriesData : getMockEntries(weekStart)` fallback
- Remove the mock timesheet creation: `{ id: 'mock-ts-1', userId: 'mock-user-1', ... }`
- Fix the `enabled: !!timesheet?.id && timesheet.id !== 'mock-ts-1'` guard -- remove the mock check, just use `enabled: !!timesheet?.id`
- Fix the save guard: `if (!timesheet?.id || timesheet.id === 'mock-ts-1') return` -- remove mock check
- Fix the submit guard: `if (!timesheet?.id || timesheet.id === 'mock-ts-1') return` -- remove mock check
- Ensure `POST /timesheets` creates a real timesheet when none exists for the period
- Ensure `PUT /timesheets/:id/entries` saves entries and returns updated list
- Ensure `POST /timesheets/:id/submit` changes status to `submitted`
- Add loading states for when charge codes or entries are loading
- Test: create timesheet, add entries, save, submit -- verify all persisted in DB

### 6. Wire Charge Codes Page
- **Task ID**: wire-charge-codes
- **Depends On**: seed-database, fix-api-client
- **Assigned To**: builder-core-api
- **Agent Type**: builder
- **Parallel**: true
- Read `frontend/src/app/(authenticated)/charge-codes/page.tsx` and `backend/src/charge-codes/charge-codes.service.ts`
- Verify `GET /charge-codes/tree` returns hierarchical charge code structure with `children[]` arrays
- Verify `GET /charge-codes/:id` returns detail with all fields
- Remove any mock data fallbacks
- Test: page loads real charge code tree from database

### 7. Wire Approvals Page
- **Task ID**: wire-approvals
- **Depends On**: seed-database, fix-api-client
- **Assigned To**: builder-qa-api
- **Agent Type**: builder
- **Parallel**: true
- Read `frontend/src/app/(authenticated)/approvals/page.tsx` and `backend/src/approvals/approvals.service.ts`
- Verify `GET /approvals/pending` returns `{ asManager: PendingTimesheet[], asCCOwner: PendingTimesheet[] }` -- check nested employee object shape
- Verify `GET /approvals/history` returns approval log entries
- Verify `POST /approvals/:id/approve` and `POST /approvals/:id/reject` change timesheet status in DB
- Verify `POST /approvals/bulk-approve` accepts `{ timesheet_ids: string[] }` and approves all
- Remove any mock data fallbacks
- Add proper error handling with toast notifications
- Test: view pending timesheets, approve one, reject one, verify status changes in DB

### 8. Wire Reports Page
- **Task ID**: wire-reports
- **Depends On**: seed-database, fix-api-client
- **Assigned To**: builder-qa-api
- **Agent Type**: builder
- **Parallel**: true
- Read `frontend/src/app/(authenticated)/reports/page.tsx` and `backend/src/reports/reports.service.ts`
- Verify all 5 report endpoints return correct shapes:
  - `GET /reports/utilization` -- utilization metrics
  - `GET /reports/chargeability` -- chargeability breakdown
  - `GET /reports/financial-impact` -- financial impact data
  - `GET /reports/activity-distribution` -- activity distribution data
  - `GET /budgets/summary` -- budget summary totals
- Remove all `mock*` constants: `mockBudgetSummary`, `mockChargeability`, `mockActivityDist`, `mockFinancialImpact`, `mockAlerts`, `mockBudgetChartData`
- Remove fallback patterns like `= useQuery({ ... }); const data = result || mockData`
- If backend report services return empty/zero data, fix them to aggregate from real timesheet entries and budgets
- Test: page shows real aggregated metrics from seeded data

### 9. Wire Budget Page
- **Task ID**: wire-budget
- **Depends On**: seed-database, fix-api-client
- **Assigned To**: builder-qa-api
- **Agent Type**: builder
- **Parallel**: true
- Read `frontend/src/app/(authenticated)/budget/page.tsx` and `backend/src/budgets/budgets.service.ts`
- Remove `mockSummary`, `mockAlerts`, `mockChildren` constants
- Wire `GET /budgets/summary` to budget summary section
- Wire `GET /budgets/alerts` to alerts section
- Wire `GET /budgets/:id` to drill-down detail view
- Wire `GET /budgets/:id/forecast` to forecast section
- Replace `mockChildren` drill-down with real API call (may need new endpoint or use existing `/budgets/:id`)
- If backend budget calculations are stub implementations, implement real aggregation from timesheet entries and cost rates
- Test: page shows real budget data with working drill-down

### 10. Wire Admin Calendar Page
- **Task ID**: wire-admin-calendar
- **Depends On**: seed-database, fix-api-client
- **Assigned To**: builder-admin-api
- **Agent Type**: builder
- **Parallel**: true
- Read `frontend/src/app/(authenticated)/admin/calendar/page.tsx` and `backend/src/calendar/calendar.service.ts`
- Verify all calendar CRUD endpoints work:
  - `GET /calendar` -- returns calendar days for a period
  - `POST /calendar/holidays` -- creates a holiday
  - `PUT /calendar/holidays/:id` -- updates a holiday
  - `DELETE /calendar/holidays/:id` -- deletes a holiday
  - `POST /calendar/populate-weekends` -- marks weekends as non-working
- Verify vacation management endpoints:
  - `GET /vacations/pending` -- returns pending vacation requests
  - `POST /vacations/:id/approve` and `POST /vacations/:id/reject` -- manage requests
- Remove any mock data fallbacks
- Test: view calendar, create holiday, edit holiday, delete holiday, approve vacation

### 11. Wire Admin Users Page
- **Task ID**: wire-admin-users
- **Depends On**: seed-database, fix-api-client
- **Assigned To**: builder-admin-api
- **Agent Type**: builder
- **Parallel**: true
- Read `frontend/src/app/(authenticated)/admin/users/page.tsx` and `backend/src/users/users.service.ts`
- Verify `GET /users` returns list of all user profiles
- Verify `PUT /users/:id/role` updates a user's role
- Verify `PUT /users/:id/job-grade` updates a user's job grade
- Remove any mock data fallbacks
- Test: view user list, change a user's role, verify persisted

### 12. Wire Admin Rates Page
- **Task ID**: wire-admin-rates
- **Depends On**: seed-database, fix-api-client
- **Assigned To**: builder-admin-api
- **Agent Type**: builder
- **Parallel**: true
- Read `frontend/src/app/(authenticated)/admin/rates/page.tsx` and check if a cost rates API exists
- If no backend endpoints exist for cost rates CRUD, create them:
  - `GET /cost-rates` -- list all cost rates
  - `POST /cost-rates` -- create a cost rate
  - `PUT /cost-rates/:id` -- update a cost rate
  - `DELETE /cost-rates/:id` -- delete a cost rate
- Wire the frontend page to these endpoints
- Remove any mock data
- Test: view rates, create/edit/delete rates

### 13. Wire Profile Page
- **Task ID**: wire-profile
- **Depends On**: seed-database, fix-api-client
- **Assigned To**: builder-admin-api
- **Agent Type**: builder
- **Parallel**: true
- Read `frontend/src/app/(authenticated)/profile/page.tsx` and `backend/src/users/users.service.ts`
- Verify `GET /users/me` returns complete profile data
- Verify `PUT /users/me` updates profile fields
- Remove any mock data fallbacks
- Test: view profile with real data, update a field, verify persisted

### 14. Code Review
- **Task ID**: code-review
- **Depends On**: wire-dashboard, wire-time-entry, wire-charge-codes, wire-approvals, wire-reports, wire-budget, wire-admin-calendar, wire-admin-users, wire-admin-rates, wire-profile
- **Assigned To**: reviewer
- **Agent Type**: code-reviewer
- **Parallel**: false
- Review all files created/modified by builders for quality, efficiency, reuse, and accessibility issues
- Check for consistent error handling patterns across all pages
- Check for proper TypeScript types (no `any` types in API responses)
- Check that no mock data imports remain in production page components
- Check that all `useQuery` calls have proper `onError` handling
- Check that backend services don't have SQL injection vulnerabilities or missing auth checks
- Fix all issues found directly
- Report what was fixed and what was skipped

### 15. Write Tests
- **Task ID**: write-tests
- **Depends On**: code-review
- **Assigned To**: tester
- **Agent Type**: test-writer
- **Parallel**: false
- Write comprehensive automated tests for the implemented code
- **Unit tests** (mocked):
  - Test `api.ts` error handling (401 redirect, toast on error, error re-throw)
  - Test each backend service method returns correct shape
  - Test backend auth guard with valid/invalid/missing tokens
  - Test budget calculation logic
  - Test report aggregation logic
- **E2E smoke tests** (real -- against running backend + Supabase):
  - Login flow: POST to Supabase auth, get JWT, call `/api/v1/users/me`
  - Timesheet flow: create timesheet, add entries, save, submit
  - Approval flow: submit timesheet, approve as manager
  - Calendar flow: create holiday, verify it appears
  - Budget flow: verify budget alerts reflect real data
- Cover: correctness, edge cases, error paths, data integrity
- Run all tests and ensure they pass
- **MANDATORY: Save test results to `docs/test-results/`** with this structure:
  ```
  docs/test-results/
  ├── summary.md
  ├── test-cases.md
  ├── test-cases.csv
  ├── unit/
  │   ├── unit-results.json
  │   └── unit-results.md
  ├── e2e/
  │   ├── e2e-results.json
  │   └── e2e-results.md
  ├── screenshots/
  │   ├── dashboard--desktop.png
  │   ├── time-entry--desktop.png
  │   ├── approvals--desktop.png
  │   ├── reports--desktop.png
  │   ├── budget--desktop.png
  │   ├── charge-codes--desktop.png
  │   ├── admin-calendar--desktop.png
  │   ├── admin-users--desktop.png
  │   ├── admin-rates--desktop.png
  │   └── profile--desktop.png
  └── healing-log.md
  ```
- Configure test runner JSON output: `vitest run --reporter=json --outputFile=docs/test-results/unit/unit-results.json`
- Use Playwright to capture screenshots of each key page after login
- Write `docs/test-results/test-cases.md` with table of all test cases
- Write `docs/test-results/test-cases.csv` with ID, Test Name, Type, Category, File, Status, Notes
- Write `docs/test-results/summary.md` with date, total tests, passed/failed counts, coverage areas
- Report coverage areas and results

### 16. Update Docs
- **Task ID**: update-docs
- **Depends On**: write-tests
- **Assigned To**: docs-writer
- **Agent Type**: docs-writer
- **Parallel**: false
- Review the implemented features and write/update documentation
- **MANDATORY**: Create the following documentation files:
  - `docs/env-setup.md` -- environment variables with descriptions and example values (sourced from `backend/.env`, `frontend/.env.local`)
  - `docs/architecture.md` -- Mermaid data flow diagram showing Browser -> Next.js -> NestJS -> Supabase, plus component tree of all pages
  - `docs/troubleshooting.md` -- common errors and how to fix them (include all 7 bugs from CLAUDE.md plus new ones found during wiring)
- Update `docs/api-contracts.md` -- document all API endpoint contracts (request/response shapes) for future reference
- **IMPORTANT**: If creating an index/README that links to other doc files, ALL linked files MUST be created
- After writing docs, verify every internal link resolves to an existing file
- Report the documentation created or modified

### 17. Validate Final Output
- **Task ID**: validate-all
- **Depends On**: code-review, write-tests, update-docs
- **Assigned To**: final-validator
- **Agent Type**: validator
- **Parallel**: false
- Run all validation commands (see Validation Commands section below)
- Run all automated tests (both unit AND E2E)
- Start both dev servers (backend on 3001, frontend on 3000)
- Verify every page loads real data:
  - Login at `http://localhost:3000/login` with test credentials
  - Navigate to each page and verify no mock data is shown
  - Verify API calls return 200 with real data (check Network tab or curl)
- Verify critical flows:
  - Login -> Dashboard shows real user profile and timesheet data
  - Time Entry -> Create/save/submit timesheet with real charge codes
  - Approvals -> View and approve/reject submitted timesheets
  - Budget -> Shows real budget calculations
  - Admin Calendar -> CRUD holidays
  - Admin Users -> View and modify users
- **Verify all documentation links**: Check that every file referenced in docs actually exists on disk
- **Verify runtime**: Start servers, confirm all routes return HTTP 200 with valid response bodies
- Verify at least one authenticated API call returns real data from the database (not mock/empty)

### 18. Heal Failures (if any)
- **Task ID**: heal
- **Depends On**: validate-all
- **Assigned To**: team-lead (you)
- **Parallel**: false
- **Max Retries**: 2
- Only run this step if step 17 (validate-all) has failures
- Run: `python3 .claude/skills/validate/validate.py --json api-integration-wiring`
- Parse the JSON output -- each failure has a `heal` field:
  - `heal.agent` -- which agent type should fix it (builder, test-writer, code-reviewer)
  - `heal.instruction` -- what to fix
- For each failure with a heal recommendation:
  1. Create a new task assigned to `heal.agent` with context: the failure description, command output, and heal instruction
  2. Wait for the agent to complete the fix
- After all fixes are applied, re-run validation: `python3 .claude/skills/validate/validate.py --json api-integration-wiring`
- If still failing after 2 retries, stop and report remaining failures to the user
- If all checks pass, mark the plan as complete

## Pipeline

Every plan follows this mandatory execution pipeline:

```
Research (if needed) → Infra Verify → Build → Code Review → Write Tests (unit + E2E smoke) → Update Docs → Validate (real runtime) → Heal (if needed) → Re-validate
```

- **Research**: Not needed -- codebase is fully understood from the existing spec and code analysis.
- **Infra Verify**: MANDATORY. builder-auth verifies Supabase DB connectivity, JWKS endpoint, JWT auth flow before any page wiring begins.
- **Build**: Core implementation by 3 parallel builders (core-api, qa-api, admin-api) after foundation is complete.
- **Code Review**: MANDATORY. code-reviewer reviews all changes for quality, consistency, missing error handling.
- **Write Tests**: MANDATORY. test-writer creates unit tests (mocked) and E2E smoke tests (real Supabase):
  - **Unit tests** (mocked): api.ts error handling, backend service shapes, auth guard, budget calculations
  - **E2E smoke tests** (real): login -> create timesheet -> add entries -> submit -> approve (full flow against real DB)
  - Test results clearly separate unit (mocked) from E2E (real) in `docs/test-results/`
- **Update Docs**: MANDATORY. docs-writer creates env-setup, architecture, troubleshooting docs.
- **Validate Final**: MANDATORY. validator confirms all acceptance criteria:
  - Run all automated tests (both unit AND E2E)
  - Start dev servers and curl key endpoints for HTTP 200 with valid response bodies
  - Verify at least one authenticated API call returns real data from the database
  - Check documentation exists and links resolve
- **Heal**: CONDITIONAL. If validation fails, parse failures and route each to the correct agent per Healing Rules. Max 2 retries.

## Acceptance Criteria

### Infrastructure Criteria (verified by Infra Verify stage)
- All external service connections verified with real queries/requests (not just config file checks)
- No placeholder values remain in .env files (`your-xxx`, `[ref]`, `[password]`)
- Auth endpoint returns valid JWKS/keys from `https://lchxtkiceeyqjksganwr.supabase.co/auth/v1/.well-known/jwks.json`
- Database accepts queries via configured pooler connection string
- Login as `tachongrak@central.co.th` returns valid JWT that passes backend auth guard

### Functional Criteria (verified by page-by-page testing)
- Every page loads data from real API (no mock fallbacks in production code)
- Login -> JWT -> API call -> real data flow works end-to-end
- **Dashboard**: Shows real user profile, timesheet hours, charge codes, pending approvals, budget alerts
- **Time Entry**: Create timesheet -> enter hours -> save -> submit works with real DB persistence
- **Charge Codes**: Shows real hierarchical charge code tree from database
- **Approvals**: Approve/reject with real state changes in DB (timesheet status updates)
- **Reports**: Shows real aggregated data from timesheet entries and budgets
- **Budget**: Shows real calculated costs from timesheet entries and cost rates
- **Admin Calendar**: CRUD holidays works with DB persistence
- **Admin Users**: List real users, change roles works with DB persistence
- **Admin Rates**: CRUD cost rates works with DB persistence
- **Profile**: Shows and updates real user profile
- All API errors show user-friendly toast messages (not silent fallback to mock data)

### Quality Criteria
- Code review passes with no remaining quality issues
- All unit tests pass (mocked dependencies)
- All E2E smoke tests pass (real services -- at least 1 full user flow: auth -> create -> read -> verify)
- No `any` types in API response handling (proper TypeScript interfaces)
- No mock data constants remain in production page components (may exist in `__mocks__/` for tests only)

### Documentation Criteria
- All documentation files referenced in indexes/READMEs actually exist (no broken internal links)
- `docs/env-setup.md` exists with environment variable descriptions and example values
- `docs/architecture.md` exists with a Mermaid data flow diagram and component tree
- `docs/troubleshooting.md` exists with at least one documented issue and fix

### Runtime Criteria (verified by Validate Final stage with REAL running servers)
- All routes return HTTP 200 at runtime (not just build-time)
- At least one authenticated API call returns real data from the database (not mock/empty)
- Auth flow works end-to-end: obtain token -> call protected endpoint -> receive valid response
- Test case CSV saved to `docs/test-results/test-cases.csv` with columns: ID, Test Name, Type, Category, File, Status, Notes
- Test case markdown saved to `docs/test-results/test-cases.md` (same data for git review)
- Test results summary saved to `docs/test-results/summary.md` with pass/fail counts and date
- Unit test JSON output saved to `docs/test-results/unit/unit-results.json`
- Unit test human-readable report saved to `docs/test-results/unit/unit-results.md`
- E2E results saved to `docs/test-results/e2e/e2e-results.json` and `e2e-results.md`
- Screenshots saved to `docs/test-results/screenshots/` using `<name>--<viewport>.png` naming

## Validation Commands
Execute these commands to validate the task is complete:

```bash
# 1. Verify no mock data constants remain in production page components
grep -rn "MOCK_\|mockSummary\|mockAlerts\|mockChildren\|mockChargeability\|mockActivityDist\|mockFinancialImpact\|mockBudgetChartData\|mock-ts-1\|mock-user-1" frontend/src/app/ && echo "FAIL: Mock data still in pages" || echo "PASS: No mock data in pages"

# 2. Verify backend compiles
cd backend && npx tsc --noEmit && echo "PASS: Backend compiles" || echo "FAIL: Backend compile errors"

# 3. Verify frontend compiles
cd frontend && npx next build && echo "PASS: Frontend builds" || echo "FAIL: Frontend build errors"

# 4. Verify seed data file exists
test -f backend/src/database/seed.sql && echo "PASS: Seed file exists" || echo "FAIL: No seed file"

# 5. Run backend unit tests
cd backend && npm test && echo "PASS: Backend tests pass" || echo "FAIL: Backend tests fail"

# 6. Run frontend unit tests (if any)
cd frontend && npm test 2>/dev/null && echo "PASS: Frontend tests pass" || echo "SKIP: No frontend tests configured"

# 7. Verify documentation exists
test -f docs/env-setup.md && echo "PASS: env-setup.md exists" || echo "FAIL: Missing env-setup.md"
test -f docs/architecture.md && echo "PASS: architecture.md exists" || echo "FAIL: Missing architecture.md"
grep -q 'mermaid' docs/architecture.md && echo "PASS: Mermaid diagram present" || echo "FAIL: No Mermaid diagram"
test -f docs/troubleshooting.md && echo "PASS: troubleshooting.md exists" || echo "FAIL: Missing troubleshooting.md"
grep -q '### Issue\|### Problem' docs/troubleshooting.md && echo "PASS: Has documented issues" || echo "FAIL: No issues documented"

# 8. Verify test results artifacts
test -f docs/test-results/test-cases.csv && echo "PASS: test-cases.csv exists" || echo "FAIL: Missing test-cases.csv"
test -f docs/test-results/test-cases.md && echo "PASS: test-cases.md exists" || echo "FAIL: Missing test-cases.md"
grep -q '|' docs/test-results/test-cases.md && echo "PASS: test-cases.md has table" || echo "FAIL: No table in test-cases.md"
test -f docs/test-results/summary.md && echo "PASS: summary.md exists" || echo "FAIL: Missing summary.md"
test -f docs/test-results/unit/unit-results.json && echo "PASS: unit-results.json exists" || echo "FAIL: Missing unit-results.json"
test -f docs/test-results/unit/unit-results.md && echo "PASS: unit-results.md exists" || echo "FAIL: Missing unit-results.md"

# 9. Verify E2E test results
test -d docs/test-results/e2e && echo "PASS: E2E results dir exists" || echo "FAIL: Missing E2E results"
test -f docs/test-results/e2e/e2e-results.json && echo "PASS: e2e-results.json exists" || echo "FAIL: Missing e2e-results.json"
test -f docs/test-results/e2e/e2e-results.md && echo "PASS: e2e-results.md exists" || echo "FAIL: Missing e2e-results.md"

# 10. Verify screenshots
test -d docs/test-results/screenshots && ls docs/test-results/screenshots/*.png 2>/dev/null | head -1 && echo "PASS: Screenshots exist" || echo "FAIL: No screenshots"
ls docs/test-results/screenshots/*--*.png 2>/dev/null | head -1 && echo "PASS: Screenshot naming correct" || echo "FAIL: Screenshot naming wrong"

# 11. Verify all internal doc links resolve
for f in docs/*.md; do grep -oP '\[.*?\]\(((?!http)[^)]+)\)' "$f" 2>/dev/null | grep -oP '\(([^)]+)\)' | tr -d '()' | while read link; do test -f "docs/$link" || test -f "$link" || echo "BROKEN LINK in $f: $link"; done; done && echo "PASS: All doc links valid" || echo "WARN: Some links may be broken"

# 12. Runtime validation (start servers, test endpoints, stop)
cd backend && npm run start:dev &
BACKEND_PID=$!
sleep 5
# Get JWT token
TOKEN=$(curl -s -X POST "https://lchxtkiceeyqjksganwr.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: $(grep NEXT_PUBLIC_SUPABASE_ANON_KEY frontend/.env.local | cut -d= -f2)" \
  -H "Content-Type: application/json" \
  -d '{"email":"tachongrak@central.co.th","password":"password1234"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
# Test authenticated endpoint
curl -sf -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/v1/users/me && echo "PASS: API returns real data" || echo "FAIL: API call failed"
kill $BACKEND_PID 2>/dev/null
```

## Healing Rules
When a validation check fails, assign it to the right agent to fix:

- `Mock data still in pages` -> builder -- Remove remaining mock constants and fallback patterns from the specified page files
- `Backend compile` -> builder -- Fix TypeScript compilation errors in backend
- `Frontend build` -> builder -- Fix Next.js build errors in frontend
- `No seed file` -> builder -- Create the missing seed.sql file
- `Backend tests fail` -> test-writer -- Fix failing backend tests or update test expectations
- `Frontend tests fail` -> test-writer -- Fix failing frontend tests or update test expectations
- `compile error` -> builder -- Fix syntax or import errors in the failing file
- `pytest` -> test-writer -- Fix failing tests or update test expectations to match implementation
- `code review` -> code-reviewer -- Re-review and fix remaining quality issues
- `test-cases.md` -> test-writer -- Generate the missing test case catalog
- `test-results/summary.md` -> test-writer -- Generate the missing test summary report
- `unit-results` -> test-writer -- Re-run tests and save results to `docs/test-results/unit/`
- `unit-results.json` -> test-writer -- Configure test runner JSON output and re-run tests
- `screenshots` -> test-writer -- Capture missing page screenshots via Playwright
- `broken link` -> docs-writer -- Create missing documentation files referenced in indexes
- `missing env-setup` -> docs-writer -- Create docs/env-setup.md with all env vars from .env*
- `missing architecture` -> docs-writer -- Create docs/architecture.md with Mermaid diagram
- `missing troubleshooting` -> docs-writer -- Create docs/troubleshooting.md with common issues
- `infra verify` -> builder -- Fix failing infrastructure connection (DB, auth, external service)
- `E2E smoke` -> test-writer -- Fix E2E smoke test or the underlying issue it exposes
- `runtime` -> builder -- Fix runtime errors caught by real server validation
- `API call failed` -> builder -- Fix the backend endpoint or auth guard that is rejecting the request
- `401` -> builder -- Fix auth token passing or guard configuration
- `contract mismatch` -> builder -- Fix field names or response shapes in backend service
- `empty response` -> builder -- Implement the backend service method that returns empty data
- `test-cases.csv` -> test-writer -- Generate the missing CSV test case file
- `e2e-results` -> test-writer -- Run E2E tests and save results to `docs/test-results/e2e/`

## Notes
- The Supabase project uses ECC P-256 (ES256) JWTs, NOT HS256. The auth guard already handles this correctly.
- The direct DB host (`db.lchxtkiceeyqjksganwr.supabase.co`) does NOT resolve -- always use the pooler host (`aws-1-ap-northeast-1.pooler.supabase.com:6543`).
- Frontend must use `.env.local` (not `.env`) because Next.js 16 infers wrong workspace root with multiple lockfiles.
- The `api.ts` client already correctly injects Bearer tokens from Supabase session. The main issues are: (a) silent error swallowing in page components, and (b) potential response shape mismatches.
- Seed data must reference the real Supabase auth user ID (`d3055e90-4396-4fb6-95fa-3767eafb8349`) for the admin test user. Additional profiles can be created without auth.users entries (they just won't be able to login).
- When creating seed data for timesheets in "submitted" status, also create corresponding approval_logs entries to test the approval history page.
- The NestJS global prefix is `api/v1`, so controllers should NOT include this prefix in their `@Controller()` decorator (this bug was already fixed for IntegrationsController).
