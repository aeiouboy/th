# Plan: E2E Test Rewrite — Real User Flow Testing

## Task Description
Rewrite all Playwright E2E tests for the Timesheet & Cost Allocation System. The current 48 E2E tests are shallow — they only check element visibility (headings, buttons exist) without performing real user actions or verifying outcomes. This plan replaces them with proper Given-When-Then tests that perform real actions against the real running backend.

## Objective
Replace all shallow E2E tests with real user flow tests that:
1. Perform actual user actions (click, fill, select, submit) against real running servers
2. Verify both UI state AND backend/API state after actions
3. Include negative test cases for every module (invalid input, missing fields, unauthorized)
4. Cover every core module: Login, Time Entry, Charge Codes, Approvals, Reports, Budget, Admin
5. Catch real bugs like the parent-selection issue that shallow tests missed

## Problem Statement
The existing 48 E2E tests across 12 spec files only verify that UI elements are visible on page load. They use mocked API responses and never perform real user actions. This means:
- The "A project must have a parent" bug was not caught despite having a charge-codes E2E test
- No test verifies that forms actually submit data to the backend
- No test verifies that created/updated data appears correctly after actions
- No negative test cases exist (invalid input, missing required fields)
- All API responses are mocked, so backend validation is never tested

## Solution Approach
1. Delete all existing shallow E2E tests in `frontend/e2e/*.spec.ts`
2. Rewrite `global-setup.ts` to authenticate via real Supabase auth and save storageState
3. Write new E2E tests per the Given-When-Then specifications below
4. Tests run against real backend (:3001) and frontend (:3000) with real Supabase database
5. No mocked API responses — all tests hit real endpoints

## Tech Stack
- **Language**: TypeScript
- **Framework**: Playwright Test
- **Runtime**: Node.js 20+
- **Key APIs/Libraries**: @playwright/test, @supabase/supabase-js (for auth in global-setup)
- **Build Tools**: pnpm
- **Testing**: Playwright (E2E), vitest (existing unit tests unchanged)

## Technical Design

### Architecture
```
Playwright Tests → Real Next.js Frontend (:3000) → Real NestJS Backend (:3001) → Real Supabase PostgreSQL
                                                                                      ↕
                                                                              Real Supabase Auth
```

### Key Design Decisions
- **Real auth via global-setup**: Login once via Supabase REST API, save storageState for all tests
- **No mocks**: All tests use real backend — this catches validation bugs, DB constraint errors, auth issues
- **Sequential execution**: Tests run in order within each file (some depend on data created by earlier tests)
- **Cleanup strategy**: Tests create data with unique names (timestamp suffix) to avoid conflicts
- **API verification**: Tests use `page.request` to verify backend state after UI actions

### Data Model
Tests rely on seed data already in the database:
- Programs: "Digital Transformation", "General Operations", "Staff Training"
- Projects under programs (e.g., "Web Portal Redesign", "Mobile App Redesign")
- Test user: `tachongrak@central.co.th` / `password1234` (admin role, profile ID: `d3055e90-4396-4fb6-95fa-3767eafb8349`)

### API / Interface Contracts
Backend global prefix: `/api/v1`. Key endpoints tested:

| Module | Create | Read | Update | Delete |
|--------|--------|------|--------|--------|
| Charge Codes | POST /charge-codes | GET /charge-codes/tree | PUT /charge-codes/:id | - |
| Timesheets | POST /timesheets | GET /timesheets?period= | PUT /timesheets/:id/entries | - |
| Approvals | POST /approvals/:id/approve | GET /approvals/pending | POST /approvals/:id/reject | - |
| Calendar | POST /calendar/holidays | GET /calendar?year= | PUT /calendar/holidays/:id | DELETE /calendar/holidays/:id |
| Users | - | GET /users/me | PUT /users/me | - |
| Reports | - | GET /reports/utilization | - | - |
| Budgets | - | GET /budgets/summary | - | - |

## Relevant Files

### Existing Files (to delete/rewrite)
- `frontend/e2e/*.spec.ts` — All 12 existing shallow spec files (DELETE all)
- `frontend/e2e/global-setup.ts` — Current no-op setup (REWRITE with real auth)
- `frontend/e2e/helpers.ts` — Screenshot helpers (KEEP, extend)
- `frontend/playwright.config.ts` — Config (UPDATE: remove E2E_TEST bypass, add storageState)

### Backend Files (read-only reference for test writers)
- `backend/src/charge-codes/charge-codes.controller.ts` — Charge code endpoints
- `backend/src/timesheets/timesheets.controller.ts` — Timesheet endpoints
- `backend/src/approvals/approvals.controller.ts` — Approval endpoints
- `backend/src/budgets/budgets.controller.ts` — Budget endpoints
- `backend/src/reports/reports.controller.ts` — Report endpoints
- `backend/src/calendar/calendar.controller.ts` — Calendar endpoints
- `backend/src/users/users.controller.ts` — User endpoints

### Frontend Files (read-only reference)
- `frontend/src/lib/api.ts` — API client with auth token injection
- `frontend/src/app/(authenticated)/charge-codes/page.tsx` — Charge codes page
- `frontend/src/components/charge-codes/ChargeCodeForm.tsx` — Create/edit charge code form (recently fixed: parent selector)
- `frontend/src/components/charge-codes/ChargeCodeTree.tsx` — Tree with "+" add-child button

### New Files
- `frontend/e2e/auth.setup.ts` — Real Supabase auth + storageState save
- `frontend/e2e/login.spec.ts` — Login flow tests (REWRITE)
- `frontend/e2e/charge-codes.spec.ts` — Charge code CRUD tests (REWRITE)
- `frontend/e2e/time-entry.spec.ts` — Timesheet flow tests (REWRITE)
- `frontend/e2e/approvals.spec.ts` — Approval workflow tests (REWRITE)
- `frontend/e2e/reports.spec.ts` — Reports verification tests (REWRITE)
- `frontend/e2e/budget.spec.ts` — Budget tracking tests (REWRITE)
- `frontend/e2e/admin-calendar.spec.ts` — Calendar management tests (REWRITE)
- `frontend/e2e/admin-users.spec.ts` — User management tests (REWRITE)
- `frontend/e2e/admin-rates.spec.ts` — Rate management tests (REWRITE)
- `frontend/e2e/dashboard.spec.ts` — Dashboard verification tests (REWRITE)

## Implementation Phases

### Phase 1: Foundation
- Delete all existing shallow spec files
- Rewrite global-setup with real Supabase authentication
- Update playwright.config.ts to use storageState pattern (no E2E_TEST bypass)
- Verify backend and frontend start and are reachable

### Phase 2: Core E2E Tests
- Implement all E2E specs per the Given-When-Then specifications
- Each spec file covers one module with positive + negative tests
- Run tests sequentially to verify each passes

### Phase 3: Validation & Results
- Run full test suite, capture results
- Save test-cases.csv, test-cases.md, summary.md, screenshots
- Code review for test quality
- Validator cross-references tests against acceptance criteria

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
  - Name: builder-e2e-foundation
  - Role: Delete old tests, rewrite global-setup and playwright config for real auth
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-e2e-tests
  - Role: Write all new E2E test spec files following the Given-When-Then specifications exactly
  - Agent Type: builder
  - Resume: true

- Code Reviewer
  - Name: reviewer
  - Role: Review and fix code quality, efficiency, and reuse issues after builders complete their work
  - Agent Type: code-reviewer
  - Resume: false

- Test Writer
  - Name: tester
  - Role: Run all tests, capture results, generate test-cases.csv/md and summary.md, capture screenshots
  - Agent Type: test-writer
  - Resume: false

- Docs Writer
  - Name: docs
  - Role: Update test documentation in docs/test-results/
  - Agent Type: docs-writer
  - Resume: false

- Validator
  - Name: validator
  - Role: Final read-only validation that all acceptance criteria are met and all tests pass
  - Agent Type: validator
  - Resume: false

## Step by Step Tasks

### 1. Verify Infrastructure
- **Task ID**: infra-verify
- **Depends On**: none
- **Assigned To**: builder-e2e-foundation
- **Agent Type**: builder
- **Parallel**: false
- Verify backend starts: `cd backend && pnpm run start:dev` (port 3001)
- Verify frontend starts: `cd frontend && pnpm dev` (port 3000)
- Verify Supabase auth works: `curl -s -X POST 'https://lchxtkiceeyqjksganwr.supabase.co/auth/v1/token?grant_type=password' -H 'apikey: <anon-key>' -H 'Content-Type: application/json' -d '{"email":"tachongrak@central.co.th","password":"password1234"}'` returns access_token
- Verify backend API reachable with token: `GET /api/v1/users/me` returns profile
- If any check fails, fix before proceeding

### 2. Rewrite E2E Foundation
- **Task ID**: rewrite-foundation
- **Depends On**: infra-verify
- **Assigned To**: builder-e2e-foundation
- **Agent Type**: builder
- **Parallel**: false
- Delete ALL existing `frontend/e2e/*.spec.ts` files (12 files)
- Delete `frontend/e2e/mock-supabase-server.js` (no more mocks)
- Rewrite `frontend/e2e/auth.setup.ts` (was `global-setup.ts`):
  - Use Supabase REST API to login with test credentials
  - Save auth session to `frontend/e2e/.auth/user.json` (storageState)
  - This runs ONCE before all tests
- Update `frontend/playwright.config.ts`:
  - Remove `NEXT_PUBLIC_E2E_TEST=true` env var (no more bypassing auth)
  - Add `setup` project that runs `auth.setup.ts`
  - Configure `storageState: 'e2e/.auth/user.json'` for Desktop/Mobile projects
  - Both projects depend on `setup`
  - Keep webServer config for auto-starting frontend dev server
- Update `frontend/e2e/helpers.ts`:
  - Keep screenshot helpers
  - Add `apiRequest(page, method, path, body?)` helper that calls backend API with auth
  - Add `uniqueName(prefix)` helper that returns `prefix-{timestamp}` for test data

### 3. Write E2E Tests — All Modules
- **Task ID**: write-e2e-tests
- **Depends On**: rewrite-foundation
- **Assigned To**: builder-e2e-tests
- **Agent Type**: builder
- **Parallel**: false
- Implement EVERY E2E spec listed in the `## E2E Test Specifications` section below
- Each spec maps to one test in the corresponding spec file
- Every test MUST:
  - Perform at least 1 real user action (click, fill, selectOption)
  - Assert UI state AFTER the action (not just on page load)
  - Where specified, also verify API response
- Create these spec files:
  - `frontend/e2e/login.spec.ts` — E2E-LOGIN-01 through E2E-LOGIN-03
  - `frontend/e2e/dashboard.spec.ts` — E2E-DASH-01 through E2E-DASH-02
  - `frontend/e2e/charge-codes.spec.ts` — E2E-CC-01 through E2E-CC-05
  - `frontend/e2e/time-entry.spec.ts` — E2E-TS-01 through E2E-TS-04
  - `frontend/e2e/approvals.spec.ts` — E2E-AP-01 through E2E-AP-03
  - `frontend/e2e/reports.spec.ts` — E2E-RPT-01 through E2E-RPT-02
  - `frontend/e2e/budget.spec.ts` — E2E-BUD-01 through E2E-BUD-02
  - `frontend/e2e/admin-calendar.spec.ts` — E2E-CAL-01 through E2E-CAL-03
  - `frontend/e2e/admin-users.spec.ts` — E2E-USR-01 through E2E-USR-02
  - `frontend/e2e/admin-rates.spec.ts` — E2E-RATE-01 through E2E-RATE-02
- After writing all tests, run `cd frontend && npx playwright test` to verify they pass
- Fix any test failures (in test code only, not implementation code)

### 4. Code Review
- **Task ID**: code-review
- **Depends On**: write-e2e-tests
- **Assigned To**: reviewer
- **Agent Type**: code-reviewer
- **Parallel**: false
- Review all new/modified E2E test files for quality, efficiency, reuse, and accessibility issues
- Verify every test follows the Given-When-Then pattern with real actions + assertions
- Verify no test uses mocked API responses
- Fix all issues found directly
- Report what was fixed and what was skipped

### 5. Run Tests & Generate Results
- **Task ID**: write-tests
- **Depends On**: code-review
- **Assigned To**: tester
- **Agent Type**: test-writer
- **Parallel**: false
- Run full E2E test suite: `cd frontend && npx playwright test --reporter=json`
- Run existing unit tests: `cd backend && pnpm test -- --json` and `cd frontend && pnpm vitest run --reporter=json`
- Capture screenshots of every page at desktop (1280×720) and mobile (375×667)
- **MANDATORY: Save test results to `docs/test-results/`** with this structure:
  ```
  docs/test-results/
  ├── summary.md
  ├── test-cases.csv
  ├── test-cases.md
  ├── unit/
  │   ├── unit-results.json
  │   └── unit-results.md
  ├── e2e/
  │   ├── e2e-results.json
  │   └── e2e-results.md
  ├── screenshots/
  │   ├── login--desktop.png
  │   ├── dashboard--desktop.png
  │   ├── time-entry--desktop.png
  │   ├── charge-codes--desktop.png
  │   ├── approvals--desktop.png
  │   ├── reports--desktop.png
  │   ├── budget--desktop.png
  │   ├── admin-calendar--desktop.png
  │   ├── admin-users--desktop.png
  │   ├── admin-rates--desktop.png
  │   └── (mobile variants)
  └── healing-log.md
  ```

### 6. Update Docs
- **Task ID**: update-docs
- **Depends On**: write-tests
- **Assigned To**: docs
- **Agent Type**: docs-writer
- **Parallel**: false
- Update `docs/test-results/summary.md` with new E2E test counts and results
- Update `docs/test-results/test-cases.csv` and `test-cases.md` with new E2E test IDs
- Update `docs/troubleshooting.md` with any new issues found during E2E testing
- Verify all doc links resolve

### 7. Validate Final Output
- **Task ID**: validate-all
- **Depends On**: code-review, write-tests, update-docs
- **Assigned To**: validator
- **Agent Type**: validator
- **Parallel**: false
- Run all validation commands listed below
- Run all automated tests (unit + E2E)
- **Validate E2E Test Quality**: Read each E2E spec file and verify it contains real actions + assertions (not just visibility checks)
- **Validate Acceptance Criteria Traceability**: For each feature criterion, verify the linked test IDs exist and meaningfully assert the criterion
- Verify runtime: start servers, curl key endpoints, verify HTTP 200 with real data
- Report pass/fail for each criterion

### 8. Heal Failures (if any)
- **Task ID**: heal
- **Depends On**: validate-all
- **Assigned To**: team-lead (you)
- **Parallel**: false
- **Max Retries**: 2
- Only run this step if step 7 (validate-all) has failures
- Run: `python3 .claude/skills/validate/validate.py --json e2e-test-rewrite`
- Parse JSON output and route failures to the correct agent
- After fixes, re-run validation
- If still failing after 2 retries, stop and report to user

## Pipeline

```
Infra Verify → Rewrite Foundation → Write E2E Tests → Code Review → Run Tests + Results → Update Docs → Validate → Heal (if needed) → Re-validate
```

- **Infra Verify**: MANDATORY. Verify Supabase auth, backend API, frontend all reachable and working.
- **Build**: Rewrite foundation (auth setup, config) then write all E2E test specs.
- **Code Review**: MANDATORY. Review test quality — reject any test that only checks visibility.
- **Write Tests**: MANDATORY. Run all tests, capture JSON results, screenshots, and generate reports.
- **Update Docs**: MANDATORY. Update test-results documentation.
- **Validate Final**: MANDATORY. Cross-reference tests against acceptance criteria, verify test quality.
- **Heal**: CONDITIONAL. Fix failures and re-validate. Max 2 retries.

## Acceptance Criteria

IMPORTANT: Every feature criterion MUST have a `Verified by:` line linking to specific test IDs. Criteria without test coverage are NOT considered complete.

### Feature Criteria

- [ ] Login flow works end-to-end with real Supabase auth
      Verified by: E2E-LOGIN-01 (successful login → redirect to dashboard)
- [ ] Login shows error for invalid credentials
      Verified by: E2E-LOGIN-02 (wrong password → error message)
- [ ] Dashboard displays real KPI data after login
      Verified by: E2E-DASH-01 (metric cards show real numbers from API)
- [ ] Charge codes support 4-level hierarchy with parent selection
      Verified by: E2E-CC-01 (create program), E2E-CC-02 (create project under program with parent selector)
- [ ] Creating a project without parent shows validation error
      Verified by: E2E-CC-03 (negative: submit project without parent → error)
- [ ] Charge code tree shows created codes in correct hierarchy
      Verified by: E2E-CC-02 (verify new project nested under parent in tree)
- [ ] Charge code details update correctly
      Verified by: E2E-CC-04 (edit charge code name → verify updated)
- [ ] Time entries can be created and saved
      Verified by: E2E-TS-01 (create timesheet → add entries → verify saved)
- [ ] Timesheet can be submitted for approval
      Verified by: E2E-TS-02 (submit timesheet → status changes to submitted)
- [ ] Submit without minimum hours shows validation
      Verified by: E2E-TS-03 (negative: submit with 0 hours)
- [ ] Pending approvals appear for managers
      Verified by: E2E-AP-01 (submitted timesheet appears in pending queue)
- [ ] Timesheets can be approved
      Verified by: E2E-AP-02 (approve timesheet → status changes)
- [ ] Timesheets can be rejected with comment
      Verified by: E2E-AP-03 (reject with comment → status reverts to draft)
- [ ] Reports page loads with real data and charts render
      Verified by: E2E-RPT-01 (utilization report shows data from API)
- [ ] Report export button is functional
      Verified by: E2E-RPT-02 (click export → file downloads or content changes)
- [ ] Budget summary shows real spending data
      Verified by: E2E-BUD-01 (budget page shows amounts from API)
- [ ] Budget alerts display for over-budget codes
      Verified by: E2E-BUD-02 (alerts section shows data or empty state)
- [ ] Admin can create holidays
      Verified by: E2E-CAL-01 (create holiday → appears in calendar)
- [ ] Admin can delete holidays
      Verified by: E2E-CAL-02 (delete holiday → removed from calendar)
- [ ] Non-admin cannot access admin pages
      Verified by: E2E-CAL-03 (negative: role-based access, if testable)
- [ ] Admin can view and manage users
      Verified by: E2E-USR-01 (user list loads with real data)
- [ ] Admin can update user role
      Verified by: E2E-USR-02 (change role → verify updated)
- [ ] Admin can view cost rates
      Verified by: E2E-RATE-01 (rates table loads with real data)
- [ ] Admin can add cost rate
      Verified by: E2E-RATE-02 (create rate → appears in table)

### E2E Test Specifications (MANDATORY for UI projects)

#### Login Module

```
E2E-LOGIN-01: Successful login redirects to dashboard
  Given: User is on /login page, not authenticated
  When: Fill email="tachongrak@central.co.th" in #login-email
  When: Fill password="password1234" in #login-password
  When: Click "Sign In" button
  Then: URL changes to / (dashboard)
  Then: Page contains greeting text "Good morning|afternoon|evening"
  Then: GET /api/v1/users/me returns 200 with user profile

E2E-LOGIN-02: Invalid credentials show error (NEGATIVE)
  Given: User is on /login page
  When: Fill email="tachongrak@central.co.th"
  When: Fill password="wrongpassword"
  When: Click "Sign In" button
  Then: Error message is visible (e.g., "Invalid login credentials")
  Then: URL remains /login (no redirect)

E2E-LOGIN-03: Empty form shows validation
  Given: User is on /login page
  When: Click "Sign In" without filling any fields
  Then: Form shows required field validation (HTML5 or custom)
```

#### Dashboard Module

```
E2E-DASH-01: Dashboard shows real KPI metrics
  Given: User is logged in (storageState)
  When: Navigate to /
  Then: "Hours This Period" card is visible with a number (not empty/loading)
  Then: "Chargeability" card shows a percentage
  Then: "Active Charge Codes" card shows a number
  Then: API call GET /api/v1/users/me returns 200

E2E-DASH-02: Dashboard navigation works
  Given: User is on dashboard
  When: Click "Time Entry" in sidebar navigation
  Then: URL changes to /time-entry
  Then: "Time Entry" heading is visible
```

#### Charge Codes Module

```
E2E-CC-01: Create a new program (top-level charge code)
  Given: User is logged in as admin, on /charge-codes
  When: Click "Create New" button
  When: Dialog opens — fill name with unique value (e.g., "Test Program {timestamp}")
  When: Level is "program" (default)
  When: Fill cost center="CC-TEST", budget=500000
  When: Click "Create" button
  Then: Dialog closes
  Then: Tree view shows the new program name
  Then: GET /api/v1/charge-codes/tree contains a node with the new program name

E2E-CC-02: Create a project under a program (hierarchy + parent selector)
  Given: User is logged in as admin, on /charge-codes, program exists in tree
  When: Click "Create New" button
  When: Select level="project" from Level dropdown
  When: Parent dropdown appears — select the existing program
  When: Fill name="Test Project {timestamp}"
  When: Click "Create" button
  Then: Dialog closes
  Then: Expand the parent program in tree → new project appears nested underneath
  Then: GET /api/v1/charge-codes/tree → new project has parentId matching the program's ID

E2E-CC-03: Project without parent fails (NEGATIVE)
  Given: User is logged in as admin, on /charge-codes
  When: Click "Create New" button
  When: Select level="project"
  When: Do NOT select any parent
  When: Fill name="Orphan Project"
  When: Click "Create" button
  Then: Error message "A project must have a parent" is visible
  Then: Dialog remains open (not closed)

E2E-CC-04: Edit an existing charge code
  Given: User is logged in as admin, on /charge-codes, a charge code is selected in tree
  When: Click "Edit" button in detail panel
  When: Change the name to "Updated Name {timestamp}"
  When: Click "Update" button
  Then: Detail panel shows the updated name
  Then: Tree view shows the updated name

E2E-CC-05: Search filters the charge code tree
  Given: User is logged in, on /charge-codes with multiple codes in tree
  When: Type "Digital" into the search input
  Then: Only charge codes matching "Digital" remain visible in tree
  When: Clear the search input
  Then: All charge codes reappear
```

#### Time Entry Module

```
E2E-TS-01: Create timesheet and add entries
  Given: User is logged in, on /time-entry
  When: A timesheet exists or is auto-created for current period
  When: Click on a cell in the timesheet grid (if editable)
  When: Enter hours (e.g., 8)
  When: Click "Save Draft" button
  Then: Save confirmation appears (toast or status change)
  Then: GET /api/v1/timesheets → returns timesheet with entries

E2E-TS-02: Submit timesheet for approval
  Given: User is logged in, on /time-entry with a draft timesheet with entries
  When: Click "Submit" button
  Then: Confirmation dialog or status change appears
  Then: Timesheet status changes to "submitted"
  Then: GET /api/v1/timesheets/:id → status is "submitted"

E2E-TS-03: Submit empty timesheet shows warning (NEGATIVE)
  Given: User is logged in, on /time-entry with no entries or 0 hours
  When: Click "Submit" button
  Then: Warning or error message appears about minimum hours
  Then: Timesheet is NOT submitted (status remains draft)

E2E-TS-04: Week navigation changes the displayed period
  Given: User is logged in, on /time-entry
  When: Click next-week chevron button
  Then: "Week of ..." text changes to the next week's date
  When: Click previous-week chevron button
  Then: "Week of ..." text changes back to the original week
```

#### Approvals Module

```
E2E-AP-01: Pending approvals list shows submitted timesheets
  Given: User is logged in as admin, at least one timesheet is submitted
  When: Navigate to /approvals
  Then: Pending approvals section is visible
  Then: GET /api/v1/approvals/pending returns at least 0 items (may be empty)
  Then: If items exist, each shows employee name and period

E2E-AP-02: Approve a timesheet
  Given: User is on /approvals with at least one pending timesheet
  When: Click approve button/checkbox on a pending timesheet
  Then: Timesheet moves out of pending list or status changes
  Then: GET /api/v1/approvals/pending no longer contains that timesheet

E2E-AP-03: Reject a timesheet with comment (NEGATIVE flow)
  Given: User is on /approvals with at least one pending timesheet
  When: Click reject button on a pending timesheet
  When: Fill rejection comment = "Hours seem incorrect, please review"
  When: Confirm rejection
  Then: Timesheet is removed from pending list
  Then: Rejection comment is saved (verify via API if possible)
```

#### Reports Module

```
E2E-RPT-01: Utilization report loads with real data
  Given: User is logged in, on /reports
  When: Page loads and API calls complete
  Then: At least one chart/visualization renders (not empty placeholder)
  Then: GET /api/v1/reports/utilization?period=2026-03 returns 200 with data
  Then: "Total Budget" KPI card shows a formatted number

E2E-RPT-02: Export CSV button works (NEGATIVE if no data)
  Given: User is on /reports with data loaded
  When: Click "Export CSV" button
  Then: Either a file download triggers OR a success toast appears
  Then: If no data, an appropriate message is shown
```

#### Budget Module

```
E2E-BUD-01: Budget summary loads with real data
  Given: User is logged in, on /budget
  When: Page loads
  Then: "Total Budget" metric shows a formatted number
  Then: GET /api/v1/budgets/summary returns 200
  Then: Budget table or cards display charge code budget info

E2E-BUD-02: Budget alerts section is visible
  Given: User is on /budget
  When: Page loads
  Then: Alerts section is visible (may show alerts or "no alerts" message)
  Then: GET /api/v1/budgets/alerts returns 200
```

#### Admin Calendar Module

```
E2E-CAL-01: Create a holiday
  Given: User is logged in as admin, on /admin/calendar
  When: Click "Add Holiday" button
  When: Fill holiday name = "Test Holiday {timestamp}"
  When: Select a date
  When: Click save/create button
  Then: New holiday appears in the calendar/table
  Then: GET /api/v1/calendar?year=2026 includes the new holiday

E2E-CAL-02: Delete a holiday
  Given: User is on /admin/calendar with at least one holiday visible
  When: Click delete button on a holiday
  When: Confirm deletion
  Then: Holiday is removed from the list
  Then: GET /api/v1/calendar?year=2026 no longer includes it

E2E-CAL-03: Calendar displays year and navigation (NEGATIVE: non-admin access)
  Given: User is logged in as admin, on /admin/calendar
  When: Page loads
  Then: Current year (2026) is visible
  Then: Navigation controls for months are present
  Note: If non-admin role test user is available, verify /admin/calendar redirects or shows unauthorized
```

#### Admin Users Module

```
E2E-USR-01: Users list loads with real data
  Given: User is logged in as admin, on /admin/users
  When: Page loads
  Then: Users table is visible with at least 1 row
  Then: GET /api/v1/users returns 200 with user array
  Then: Table shows email and role columns

E2E-USR-02: Update user role (or verify role display)
  Given: User is on /admin/users with user list loaded
  When: Click on a user row or role dropdown
  Then: Role options are available (employee, charge_manager, pmo, finance, admin)
  Note: If role change is destructive (changing own role), verify via API only
```

#### Admin Rates Module

```
E2E-RATE-01: Rates table loads with real data
  Given: User is logged in as admin, on /admin/rates
  When: Page loads
  Then: Rates table is visible
  Then: "Active Rates" label/card is visible
  Then: Table contains at least headers (Job Grade, Rate, Effective Date)

E2E-RATE-02: Add a new cost rate
  Given: User is on /admin/rates
  When: Click "Add Rate" button
  When: Fill job grade, hourly rate, effective date
  When: Click save/create
  Then: New rate appears in the rates table
```

### Infrastructure Criteria (verified by Infra Verify stage)
- [ ] Supabase auth returns access_token for test user
- [ ] Backend GET /api/v1/users/me returns 200 with real profile data
- [ ] Frontend loads at http://localhost:3000 without JS errors
- [ ] No placeholder values in .env files

### Quality Criteria
- [ ] Code review passes with no remaining quality issues
- [ ] All existing unit tests still pass (no regressions)
- [ ] All 28+ E2E tests pass against real running servers
- [ ] No E2E test uses mocked API responses
- [ ] Every E2E test performs at least 1 real user action (click/fill/submit)
- [ ] Every E2E test has at least 1 assertion after an action
- [ ] At least 4 negative test cases pass (LOGIN-02, CC-03, TS-03, AP-03)

### Documentation Criteria
- [ ] `docs/test-results/test-cases.csv` updated with all new E2E test entries
- [ ] `docs/test-results/test-cases.md` updated (same data in markdown)
- [ ] `docs/test-results/summary.md` updated with new E2E counts
- [ ] `docs/test-results/e2e/e2e-results.json` has Playwright JSON output
- [ ] `docs/test-results/e2e/e2e-results.md` has human-readable report
- [ ] `docs/test-results/screenshots/` has at least 10 screenshots (1 per page, desktop)
- [ ] All doc links resolve to existing files

### Runtime Criteria (verified by Validate Final stage with REAL running servers)
- [ ] Backend starts and serves API on :3001
- [ ] Frontend starts and serves pages on :3000
- [ ] Auth flow works: login → JWT → protected endpoint returns real data
- [ ] `cd frontend && npx playwright test` exits with 0 (all tests pass)

## Validation Commands

- `cd frontend && npx playwright test --reporter=list 2>&1 | tail -5` — Run all E2E tests and show summary
- `cd backend && pnpm test 2>&1 | tail -5` — Run backend unit tests (no regressions)
- `test -f docs/test-results/test-cases.csv && head -1 docs/test-results/test-cases.csv | grep -q 'ID,Test Name'` — Verify test-cases CSV exists with header
- `test -f docs/test-results/test-cases.md && grep -q '| ID' docs/test-results/test-cases.md` — Verify test-cases markdown has table
- `test -f docs/test-results/summary.md` — Verify test summary exists
- `test -f docs/test-results/e2e/e2e-results.json` — Verify E2E JSON results exist
- `test -f docs/test-results/e2e/e2e-results.md` — Verify E2E markdown report exists
- `ls docs/test-results/screenshots/*--desktop.png 2>/dev/null | wc -l | xargs test 6 -le` — Verify at least 6 desktop screenshots
- `grep -c 'e2e' docs/test-results/test-cases.csv | xargs test 10 -le` — Verify CSV has at least 10 E2E entries
- `grep -cE 'click|fill|selectOption|press' frontend/e2e/*.spec.ts | awk -F: '{s+=$2} END {print s}' | xargs test 20 -le` — Verify tests contain at least 20 real user actions total
- `grep -lc 'toBeVisible.*only\|\.goto.*only' frontend/e2e/*.spec.ts | wc -l | xargs test 0 -eq` — Verify no test file is visibility-only
- `test -f docs/test-results/unit/unit-results.json` — Verify unit test JSON exists
- `test -f docs/test-results/unit/unit-results.md` — Verify unit test report exists
- `test -f docs/env-setup.md` — Verify env-setup doc exists
- `test -f docs/architecture.md` — Verify architecture doc exists
- `grep -q 'mermaid' docs/architecture.md` — Verify Mermaid diagram present
- `test -f docs/troubleshooting.md` — Verify troubleshooting doc exists
- `grep -q '### Issue\|### Problem' docs/troubleshooting.md` — Verify at least one issue documented

## Healing Rules

- `playwright test` → test-writer — Fix failing E2E tests (adjust selectors, waits, or assertions)
- `pnpm test` → test-writer — Fix failing unit tests
- `visibility-only` → builder-e2e-tests — Rewrite shallow test to include real user actions and assertions
- `test-cases.csv` → test-writer — Generate or update test case CSV catalog
- `test-cases.md` → test-writer — Generate or update test case markdown catalog
- `summary.md` → test-writer — Generate or update test summary report
- `e2e-results` → test-writer — Re-run E2E tests and save results to docs/test-results/e2e/
- `unit-results` → test-writer — Re-run unit tests and save results to docs/test-results/unit/
- `screenshots` → test-writer — Capture missing page screenshots via Playwright
- `broken link` → docs-writer — Create missing documentation files
- `infra verify` → builder-e2e-foundation — Fix infrastructure connection issues
- `runtime` → builder-e2e-foundation — Fix runtime errors
- `code review` → code-reviewer — Re-review and fix remaining quality issues

## Notes
- The test user `tachongrak@central.co.th` has admin role — this allows testing all admin pages
- If a second test user with non-admin role is needed for RBAC tests, it can be created via Supabase dashboard
- E2E tests should use `test.describe.serial()` within files where tests depend on data from previous tests (e.g., create then edit)
- Supabase anon key is needed for auth — read from `frontend/.env.local` NEXT_PUBLIC_SUPABASE_ANON_KEY
- Backend expects JWT in Authorization header — frontend's `api.ts` client handles this automatically
- The `NEXT_PUBLIC_E2E_TEST=true` bypass must be REMOVED — tests must use real auth flow
