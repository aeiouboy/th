# Plan: Timesheet System — Fix & Verify

## Task Description
Fix runtime issues and verify the existing Timesheet & Cost Allocation System works end-to-end against real Supabase infrastructure. The codebase was built by a team of agents and compiles cleanly (159/159 unit tests pass), but has never been verified against real services. This plan fixes known issues, adds E2E smoke tests, and validates every feature against the live database.

## Objective
- Every API endpoint returns real data from Supabase PostgreSQL
- Auth flow works end-to-end (login → JWT → protected API → response with DB data)
- All frontend pages render without errors when connected to real backend
- E2E smoke tests prove the system works (not just unit tests with mocks)
- All known infra bugs are verified fixed

## Problem Statement
The initial build used mocked unit tests exclusively. All 159 tests pass, but the system fails at runtime because:
- Connection strings, JWKS paths, and JWT algorithms were wrong
- No test ever connected to real Supabase
- Frontend pages may crash when receiving real API responses (shape mismatches, null handling)
- Features like charge code creation, timesheet submission, and approval workflow have never been tested against real data

## Solution Approach
1. **Infra Verify first** — confirm DB, auth, and env are correct before touching any code
2. **Fix backend runtime issues** — test each API endpoint with real auth tokens and fix failures
3. **Fix frontend runtime issues** — load each page in browser, fix crashes and data binding errors
4. **Add E2E smoke tests** — real tests against real Supabase (not mocks)
5. **Validate everything** — runtime validation with real servers, real data, real auth

## Tech Stack
- **Language**: TypeScript 5.x
- **Framework**: NestJS 11 (backend), Next.js 16 App Router (frontend)
- **Runtime**: Node.js 20+
- **Database**: Supabase PostgreSQL via pooler (`aws-1-ap-northeast-1.pooler.supabase.com:6543`)
- **Auth**: Supabase Auth (ECC P-256 / ES256 via JWKS)
- **Key Libraries**: Drizzle ORM, TanStack Query v5, shadcn/ui, Recharts
- **Testing**: Jest (backend), Vitest + React Testing Library (frontend), curl (E2E smoke)
- **Build Tools**: pnpm

## Technical Design

### Architecture
Existing architecture is sound — no structural changes needed. Fix is focused on runtime correctness.

```
Browser → Next.js (localhost:3000) → Supabase Auth (login/signup)
                                   → NestJS API (localhost:3001) → Supabase PostgreSQL (pooler:6543)
                                   ← JWT (ES256, JWKS verified)
```

### Key Design Decisions
1. **Fix in place** — do not rebuild modules, fix what's broken in existing code
2. **Infra verify is gate** — no feature work until DB + auth confirmed working
3. **E2E smoke tests use curl + real tokens** — no browser automation needed for backend validation
4. **Frontend fixes tested by loading pages** — check for runtime errors in dev server logs

### Supabase Project Config (verified)
- Ref: `lchxtkiceeyqjksganwr`
- Region: `ap-northeast-1` (Tokyo)
- Pooler: `aws-1-ap-northeast-1.pooler.supabase.com:6543`
- JWKS: `https://lchxtkiceeyqjksganwr.supabase.co/auth/v1/.well-known/jwks.json`
- JWT algorithm: ES256 (ECC P-256)
- Test user: `tachongrak@central.co.th` / `password1234` (role: admin)

## Relevant Files

### Backend (fix targets)
- `backend/src/common/guards/supabase-auth.guard.ts` — auth guard (already fixed, verify)
- `backend/src/database/drizzle.provider.ts` — DB connection
- `backend/drizzle.config.ts` — migration config
- `backend/src/timesheets/timesheets.service.ts` — timesheet business logic
- `backend/src/charge-codes/charge-codes.service.ts` — charge code CRUD
- `backend/src/approvals/approvals.service.ts` — approval workflow
- `backend/src/budgets/budgets.service.ts` — budget calculations
- `backend/src/calendar/calendar.service.ts` — calendar/holiday service
- `backend/src/reports/reports.service.ts` — reporting aggregations
- `backend/.env.sample` — env template

### Frontend (fix targets)
- `frontend/src/lib/api.ts` — API client
- `frontend/src/lib/supabase/client.ts` — Supabase browser client
- `frontend/src/app/(authenticated)/page.tsx` — dashboard
- `frontend/src/app/(authenticated)/charge-codes/page.tsx` — charge code management
- `frontend/src/app/(authenticated)/time-entry/page.tsx` — timesheet grid
- `frontend/src/app/(authenticated)/approvals/page.tsx` — approval queue
- `frontend/src/app/(authenticated)/reports/page.tsx` — reports dashboard
- `frontend/src/app/(authenticated)/admin/calendar/page.tsx` — calendar admin

### New Files
- `scripts/e2e-smoke.sh` — E2E smoke test script (curl-based, real auth)
- `scripts/seed-data.ts` — Seed test data into Supabase
- `docs/test-results/e2e/e2e-results.md` — E2E test results
- `docs/troubleshooting.md` — common errors and fixes

## Implementation Phases

### Phase 1: Infrastructure Verification
Verify all connections work before touching any code.

### Phase 2: Backend Runtime Fixes
Start backend, hit every endpoint with real auth, fix failures.

### Phase 3: Frontend Runtime Fixes
Load every page, fix crashes and data binding issues.

### Phase 4: E2E Smoke Tests + Validation
Add real smoke tests, run full validation.

## Team Orchestration

- You operate as the team lead and orchestrate the team to execute the plan.
- Each task is focused and scoped — builders fix specific issues, not rebuild.

### Team Members

- Builder
  - Name: builder-infra
  - Role: Verify and fix infrastructure — DB connection, auth flow, env vars, seed data
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-backend
  - Role: Fix backend API runtime issues — test each endpoint with real auth, fix query errors, null handling
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-frontend
  - Role: Fix frontend runtime issues — load each page against real backend, fix crashes, data binding
  - Agent Type: builder
  - Resume: true

- Code Reviewer
  - Name: reviewer
  - Role: Review all fixes for quality, ensure no regressions
  - Agent Type: code-reviewer
  - Resume: false

- Test Writer
  - Name: tester
  - Role: Write E2E smoke tests (real Supabase) + update unit tests if needed
  - Agent Type: test-writer
  - Resume: false

- Validator
  - Name: validator
  - Role: Final runtime validation — start servers, run E2E smoke, verify all acceptance criteria
  - Agent Type: validator
  - Resume: false

## Step by Step Tasks

### 1. Infra Verify & Seed Data
- **Task ID**: infra-verify
- **Depends On**: none
- **Assigned To**: builder-infra
- **Agent Type**: builder
- **Parallel**: false (must pass before anything else)
- Verify DB connection: run `SELECT 1` via the configured `SUPABASE_DB_URL` (pooler)
- Verify JWKS endpoint: curl `https://lchxtkiceeyqjksganwr.supabase.co/auth/v1/.well-known/jwks.json` and confirm ES256 key returned
- Verify auth flow: obtain JWT for test user (`tachongrak@central.co.th` / `password1234`), call `GET /api/v1/users/me`, confirm profile returned
- Verify all tables exist: query `information_schema.tables` for all 10 expected tables
- Fix any connection issues found (update .env.sample with correct values)
- Seed test data into Supabase for downstream testing:
  - 2 cost rates (job grades L4, L5)
  - 1 program charge code (PRG-001), 1 project (PRJ-001), 1 activity (ACT-001)
  - Assign test user to charge codes
  - 1 draft timesheet with entries for current week
  - Calendar: populate weekends for 2026, add 2 holidays
- Create `scripts/seed-data.ts` that uses Supabase service role key to insert test data
- Report: list each check as PASS/FAIL with details

### 2. Fix Backend API Endpoints
- **Task ID**: fix-backend
- **Depends On**: infra-verify
- **Assigned To**: builder-backend
- **Agent Type**: builder
- **Parallel**: false
- Start backend with `cd backend && pnpm run start:dev`
- Obtain a real JWT token for test user
- Test EVERY endpoint with curl + real auth token, fix any that fail:
  - `GET /api/v1/users/me` — should return profile
  - `GET /api/v1/users` — should return user list (admin)
  - `POST /api/v1/timesheets` — create timesheet for current period
  - `GET /api/v1/timesheets?period=YYYY-MM-DD` — get timesheet
  - `PUT /api/v1/timesheets/:id/entries` — upsert entries
  - `POST /api/v1/timesheets/:id/submit` — submit for approval
  - `GET /api/v1/charge-codes` — list charge codes
  - `GET /api/v1/charge-codes/my` — user's charge codes
  - `POST /api/v1/charge-codes` — create charge code
  - `GET /api/v1/charge-codes/tree` — tree view
  - `GET /api/v1/approvals/pending` — pending approvals
  - `GET /api/v1/budgets/alerts` — budget alerts
  - `GET /api/v1/budgets/summary` — budget summary
  - `GET /api/v1/calendar?year=2026` — calendar
  - `POST /api/v1/calendar/holidays` — create holiday
  - `GET /api/v1/reports/utilization?period=2026-03` — utilization report
  - `GET /api/v1/reports/chargeability` — chargeability
  - `GET /api/v1/reports/activity-distribution?period=2026-03` — activity dist
  - `GET /api/v1/reports/financial-impact` — financial impact
  - `GET /api/v1/reports/budget-alerts` — budget alerts
- For each endpoint: log HTTP status + response body snippet
- Fix Drizzle query errors, null reference errors, missing joins, incorrect column names
- Ensure all endpoints return valid JSON (not 500 errors)
- Run `pnpm run build` after all fixes to confirm compilation
- Report: list each endpoint with status (PASS/FAIL/FIXED)

### 3. Fix Frontend Pages
- **Task ID**: fix-frontend
- **Depends On**: fix-backend
- **Assigned To**: builder-frontend
- **Agent Type**: builder
- **Parallel**: false
- Start both backend and frontend
- Load each page and check for:
  - JavaScript runtime errors (check Next.js dev server console output)
  - API call failures (check network tab / server logs)
  - Data binding mismatches (API returns different shape than component expects)
  - Null/undefined crashes (data not loaded yet, missing optional fields)
- Fix issues on each page:
  - `/login` — login flow completes, redirects to dashboard
  - `/` (dashboard) — loads metrics, shows real data or proper empty states
  - `/time-entry` — grid renders, can add charge codes, enter hours, save
  - `/charge-codes` — tree renders with seeded data, can create new codes
  - `/approvals` — queue renders (may be empty), no crashes
  - `/reports` — charts render with real data or proper empty states
  - `/budget` — budget table renders
  - `/admin/calendar` — calendar grid renders, holidays shown
  - `/admin/users` — user list renders
  - `/admin/rates` — rates page renders
  - `/profile` — user profile shown
- Fix common issues:
  - API response shape mismatches (snake_case from DB vs camelCase in frontend)
  - Missing null checks on optional fields
  - Empty state handling when no data exists yet
- Run `pnpm run build` after all fixes
- Report: list each page with status (PASS/FAIL/FIXED)

### 4. Code Review
- **Task ID**: code-review
- **Depends On**: infra-verify, fix-backend, fix-frontend
- **Assigned To**: reviewer
- **Agent Type**: code-reviewer
- **Parallel**: false
- Review all changes made by builders for quality and correctness
- Ensure no regressions introduced
- Check for consistent error handling across fixed endpoints
- Verify no sensitive data leaked (no hardcoded secrets)
- Fix issues directly
- Run `cd backend && pnpm run build` and `cd frontend && pnpm run build`

### 5. Write E2E Smoke Tests
- **Task ID**: write-tests
- **Depends On**: code-review
- **Assigned To**: tester
- **Agent Type**: test-writer
- **Parallel**: false
- **E2E Smoke Tests** (REAL services, NOT mocks) — create `scripts/e2e-smoke.sh`:
  - Login: obtain real JWT token via Supabase auth API
  - Create: POST a new charge code, verify 201 + valid response
  - Read: GET charge codes list, verify created code appears
  - Timesheet: create timesheet → add entry → verify entries returned
  - Submit: submit timesheet → verify status change
  - Reports: GET utilization report → verify response has data structure
  - Calendar: GET calendar → verify weekend entries exist
  - Each test: print PASS/FAIL with endpoint and response snippet
- **Update existing unit tests** if any broke due to code changes
- Run all tests (unit + E2E) and save results:
  - `docs/test-results/summary.md` — updated with E2E results
  - `docs/test-results/test-cases.md` — add E2E test cases
  - `docs/test-results/e2e/e2e-results.md` — E2E smoke test output
  - `docs/test-results/unit/unit-results.json` — backend unit test JSON
  - `docs/test-results/unit/unit-results.md` — backend unit test report
- Report: total pass/fail for both unit and E2E

### 6. Update Docs
- **Task ID**: update-docs
- **Depends On**: write-tests
- **Assigned To**: reviewer
- **Agent Type**: code-reviewer
- **Parallel**: false
- Update `docs/env-setup.md` with correct Supabase config (region, pooler host, JWKS path)
- Update `docs/architecture.md` if any structural changes were made
- Create `docs/troubleshooting.md` with the 7 infra bugs found and their fixes:
  - JWKS endpoint path
  - JWT algorithm (ES256 vs RS256)
  - JWT_SECRET blocking JWKS
  - Pooler region
  - Direct host unresolvable
  - Frontend .env.local requirement
  - Double route prefix
- Verify all doc links resolve

### 7. Validate Final Output
- **Task ID**: validate-all
- **Depends On**: code-review, write-tests, update-docs
- **Assigned To**: validator
- **Agent Type**: validator
- **Parallel**: false
- Run ALL validation commands below
- Start backend → start frontend → run E2E smoke test script
- Verify each acceptance criterion:
  - Auth flow: login → get token → call /users/me → get real profile from DB
  - CRUD: create charge code → read it back → verify in list
  - Timesheet: create → add entries → submit → verify status change
  - Reports: at least 1 report endpoint returns structured data
  - Frontend: each page loads without JS errors (check server logs)
- Report PASS/FAIL for every criterion

### 8. Heal Failures (if any)
- **Task ID**: heal
- **Depends On**: validate-all
- **Assigned To**: team-lead (you)
- **Parallel**: false
- **Max Retries**: 2
- Only run if validate-all has failures
- Route each failure to the correct agent per Healing Rules
- Re-validate after fixes

## Pipeline

```
Infra Verify → Fix Backend → Fix Frontend → Code Review → Write Tests (unit + E2E smoke) → Update Docs → Validate (real runtime) → Heal (if needed)
```

- **Infra Verify**: MANDATORY gate. DB + auth + env must work before any code changes.
- **Fix Backend**: Test every API endpoint with real auth, fix failures.
- **Fix Frontend**: Load every page against real backend, fix crashes.
- **Code Review**: MANDATORY. Review all fixes.
- **Write Tests**: MANDATORY. E2E smoke tests with real Supabase + updated unit tests.
- **Update Docs**: MANDATORY. Troubleshooting doc + updated env-setup.
- **Validate Final**: MANDATORY. Real runtime validation — servers running, real auth, real data.
- **Heal**: CONDITIONAL. Max 2 retries.

## Acceptance Criteria

### Infrastructure Criteria
- DB connection verified: `SELECT 1` succeeds via pooler
- JWKS endpoint returns ES256 key
- Auth flow works: login → JWT → /users/me returns profile from DB
- All 10 tables exist in Supabase
- No placeholder values in .env files
- Test data seeded (charge codes, timesheet, calendar)

### Quality Criteria
- All unit tests pass (159/159 or more)
- All E2E smoke tests pass (at least 7: login, create charge code, read charge codes, create timesheet, add entries, submit, get report)
- Code review passes with no critical issues
- Both `pnpm run build` pass (backend + frontend)

### Documentation Criteria
- `docs/troubleshooting.md` exists with 7 infra issues documented
- `docs/env-setup.md` updated with correct pooler host and region
- All doc internal links resolve

### Runtime Criteria
- Backend starts and stays running without crashes
- Frontend starts and loads all pages without JS errors
- Auth flow works end-to-end in browser (login → dashboard)
- At least 1 CRUD flow works (create charge code → see it in list)
- At least 1 report endpoint returns real aggregated data
- E2E smoke test script passes all checks

## Validation Commands

### Infra
- `cd backend && node -e "const p=require('postgres');const s=p(process.env.SUPABASE_DB_URL);s\`SELECT 1 as ok\`.then(r=>{console.log('DB:',r[0].ok===1?'PASS':'FAIL');process.exit(0)}).catch(e=>{console.error('DB: FAIL',e.message);process.exit(1)})"` — Verify DB connection
- `curl -sf https://lchxtkiceeyqjksganwr.supabase.co/auth/v1/.well-known/jwks.json | python3 -c "import sys,json;k=json.load(sys.stdin);print('JWKS: PASS' if k.get('keys') else 'JWKS: FAIL')"` — Verify JWKS endpoint

### Build
- `cd backend && pnpm run build` — Backend compiles
- `cd frontend && pnpm run build` — Frontend builds

### Tests
- `cd backend && pnpm run test` — Backend unit tests
- `cd frontend && pnpm run test` — Frontend unit tests
- `bash scripts/e2e-smoke.sh` — E2E smoke tests against real Supabase

### Runtime
- Start backend, obtain JWT, curl `/api/v1/users/me` — must return real profile JSON
- Start frontend, curl `http://localhost:3000` — must return HTTP 200

### Documentation
- `test -f docs/troubleshooting.md && grep -q 'JWKS\|pooler\|ES256' docs/troubleshooting.md` — Troubleshooting doc exists with infra issues
- `test -f docs/env-setup.md` — Env setup doc exists
- `test -f docs/architecture.md && grep -q 'mermaid' docs/architecture.md` — Architecture doc has Mermaid

### Test Results
- `test -f docs/test-results/summary.md` — Test summary exists
- `test -f docs/test-results/test-cases.md` — Test cases catalog exists
- `test -f docs/test-results/e2e/e2e-results.md` — E2E results exist
- `test -f docs/test-results/unit/unit-results.json` — Unit results JSON exists
- `test -f docs/test-results/unit/unit-results.md` — Unit results report exists

## Healing Rules
- `compile error` → builder-backend — Fix syntax or import errors
- `test` → tester — Fix failing tests or update expectations
- `code review` → reviewer — Re-review and fix quality issues
- `infra verify` → builder-infra — Fix infrastructure connection
- `E2E smoke` → tester — Fix E2E test or underlying API issue
- `runtime` → builder-backend — Fix runtime errors from real server validation
- `frontend` → builder-frontend — Fix frontend page crashes or rendering issues
- `broken link` → reviewer — Fix missing documentation files
- `missing troubleshooting` → reviewer — Create docs/troubleshooting.md
- `test-cases.md` → tester — Generate missing test case catalog
- `unit-results` → tester — Re-run tests and save results
- `screenshots` → tester — Capture missing screenshots

## Notes
- This plan assumes backend/.env has correct SUPABASE_DB_URL (`aws-1-ap-northeast-1` pooler)
- This plan assumes frontend/.env.local has correct NEXT_PUBLIC_* vars
- The test user `tachongrak@central.co.th` (admin) already exists in auth.users and profiles table
- Supabase CLI is installed and linked to the project (access token configured)
- The E2E smoke tests use curl + Supabase auth API — no browser automation required for backend validation
