# Plan: E2E Workflow Tests — All Roles & Approval Flow

## Task Description
Write E2E tests that cover the COMPLETE timesheet approval workflow across all 5 personas (employee, charge_manager, pmo, admin) using real user accounts. Also fix the sidebar RBAC bug where employee users see admin menu items. Tests follow the actual business flow: employee submits → manager approves → CC owner approves → locked. Includes rejection flow and role-based access verification.

## Objective
1. Fix sidebar RBAC bug (hide admin menu for non-admin roles)
2. Create multi-user auth setup for Playwright (5 separate storageState files)
3. Write E2E tests covering 6 workflow flows across all personas
4. Every test uses real backend — no mocks
5. Verify the full approval lifecycle end-to-end

## Problem Statement
Current E2E tests run as a single user (admin). They cannot test:
- Approval workflow (employee submits → manager approves → CC owner approves)
- Role-based UI visibility (sidebar admin menu hidden for employee)
- Cross-user data visibility (manager sees employee's timesheets in approval queue)
- Rejection flow (manager rejects → employee sees rejection and resubmits)

The sidebar also shows ADMIN section (Users, Calendar, Rates) to all users regardless of role.

## Solution Approach
1. Fix layout.tsx to conditionally render admin nav items based on user role
2. Extend Playwright auth setup to create per-user storageState files
3. Write workflow tests that switch between users by loading different storageState
4. Tests are sequential (serial) because later tests depend on data created by earlier tests

## Tech Stack
- **Language**: TypeScript
- **Framework**: Playwright Test, Next.js 16
- **Runtime**: Node.js 20+
- **Key APIs/Libraries**: @playwright/test, Supabase Auth REST API
- **Build Tools**: pnpm
- **Testing**: Playwright (E2E)

## Technical Design

### Architecture
```
Per-user auth setup:
  auth.setup.ts → creates 5 storageState files:
    e2e/.auth/wichai.json      (employee)
    e2e/.auth/ploy.json        (employee)
    e2e/.auth/nattaya.json     (charge_manager)
    e2e/.auth/somchai.json     (pmo)
    e2e/.auth/tachongrak.json  (admin)

Workflow test file:
  e2e/workflow-approval.spec.ts → serial tests that switch users:
    test 1: login as Wichai → fill timesheet → submit
    test 2: login as Ploy → fill timesheet → submit
    test 3: login as Nattaya → approve both as manager
    test 4: login as Tachongrak → approve both as CC owner
    test 5: Wichai submits again → Nattaya rejects → Wichai resubmits

Role-based access test:
  e2e/rbac.spec.ts → tests per role:
    test 1: Wichai (employee) → no admin menu in sidebar
    test 2: Nattaya (charge_manager) → can create charge codes
    test 3: Somchai (pmo) → can view reports
    test 4: Tachongrak (admin) → full access
```

### Key Design Decisions
- **Per-user storageState**: Each user gets own `.auth/<name>.json` file created in setup
- **test.use({ storageState })**: Each test switches user by loading different storageState
- **Serial execution**: Workflow tests must run in order (submit before approve)
- **Helper function `loginAs()`**: Utility to create storageState for any user on-the-fly

### Data Model
Test data already seeded in DB:
- New OMS program (PRG-001) with 4 projects, 11 activities, 5 tasks
- Users: Wichai + Ploy (employees, manager=Nattaya), Nattaya (charge_manager), Somchai (pmo), Tachongrak (admin)
- Charge code assignments: Wichai→Backend, Ploy→Frontend, Somchai→Infra+QA
- Tachongrak is owner/approver of all charge codes (CC owner)

### API / Interface Contracts
Key endpoints used in workflow:
- `POST /timesheets` → create timesheet for period
- `PUT /timesheets/:id/entries` → save time entries
- `POST /timesheets/:id/submit` → submit for approval
- `GET /approvals/pending` → returns `{ asManager: [...], asCCOwner: [...] }`
- `POST /approvals/:id/approve` → approve (manager or CC owner)
- `POST /approvals/:id/reject` → reject with comment
- `GET /users/me` → returns profile with role

## Relevant Files

### Files to Modify
- `frontend/src/app/(authenticated)/layout.tsx` — Fix sidebar RBAC (hide admin for non-admin)
- `frontend/e2e/auth.setup.ts` — Extend to create per-user storageState files
- `frontend/e2e/helpers.ts` — Add `loginAs()` helper
- `frontend/playwright.config.ts` — Update default storageState path

### New Files
- `frontend/e2e/workflow-approval.spec.ts` — Full approval workflow across 4 users
- `frontend/e2e/rbac.spec.ts` — Role-based access tests for all 5 roles

### Reference Files (read-only)
- `backend/src/approvals/approvals.service.ts` — Approval logic (getPending, approve, reject)
- `backend/src/timesheets/timesheets.service.ts` — Timesheet CRUD + submit
- `backend/src/common/guards/supabase-auth.guard.ts` — Auth guard extracts user from JWT

## Implementation Phases

### Phase 1: Foundation
- Fix sidebar RBAC bug in layout.tsx
- Extend auth.setup.ts for multi-user storageState
- Add loginAs() helper

### Phase 2: Core Tests
- Write workflow-approval.spec.ts (10 tests covering full lifecycle)
- Write rbac.spec.ts (5 tests covering role-based access)

### Phase 3: Validation
- Run all tests, generate results
- Verify all acceptance criteria

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
  - Name: builder-rbac-fix
  - Role: Fix sidebar RBAC bug and extend auth setup for multi-user
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-workflow-tests
  - Role: Write all workflow and RBAC E2E test specs
  - Agent Type: builder
  - Resume: true

- Code Reviewer
  - Name: reviewer
  - Role: Review and fix code quality, efficiency, and reuse issues after builders complete their work
  - Agent Type: code-reviewer
  - Resume: false

- Test Writer
  - Name: tester
  - Role: Run all tests, capture results, generate reports and screenshots
  - Agent Type: test-writer
  - Resume: false

- Docs Writer
  - Name: docs
  - Role: Update test documentation
  - Agent Type: docs-writer
  - Resume: false

- Validator
  - Name: validator
  - Role: Final read-only validation that all acceptance criteria are met and all tests pass
  - Agent Type: validator
  - Resume: false

## Step by Step Tasks

### 1. Fix Sidebar RBAC Bug
- **Task ID**: fix-rbac
- **Depends On**: none
- **Assigned To**: builder-rbac-fix
- **Agent Type**: builder
- **Parallel**: false
- Edit `frontend/src/app/(authenticated)/layout.tsx`:
  - Add state for user profile (fetch from `/api/v1/users/me` on mount)
  - Conditionally render `adminNavItems` only when `user.role === 'admin'`
  - Also conditionally render Approvals nav item only for `admin`, `charge_manager`, `pmo` (not basic employee unless they have direct reports)
- Verify: login as Wichai (employee) → sidebar should NOT show Users, Calendar, Rates
- Verify: login as Tachongrak (admin) → sidebar SHOULD show all items

### 2. Extend Auth Setup for Multi-User
- **Task ID**: multi-user-auth
- **Depends On**: fix-rbac
- **Assigned To**: builder-rbac-fix
- **Agent Type**: builder
- **Parallel**: false
- Edit `frontend/e2e/auth.setup.ts`:
  - Create storageState for ALL 5 users:
    - `e2e/.auth/wichai.json` (wichai.s@central.co.th)
    - `e2e/.auth/ploy.json` (ploy.r@central.co.th)
    - `e2e/.auth/nattaya.json` (nattaya.k@central.co.th)
    - `e2e/.auth/somchai.json` (somchai.p@central.co.th)
    - `e2e/.auth/tachongrak.json` (tachongrak@central.co.th)
  - Keep backward compatibility: also save to `e2e/.auth/user.json` (Tachongrak, for existing tests)
- Edit `frontend/e2e/helpers.ts`:
  - Add `authFile(name: string)` helper → returns path to `e2e/.auth/<name>.json`
  - Add `USERS` constant with all user credentials
- Edit `frontend/playwright.config.ts`:
  - Default storageState still points to tachongrak (admin) for existing tests
  - Existing Desktop/Mobile projects unchanged
- Verify: run `npx playwright test --project=setup` → all 5 storageState files created

### 3. Write Workflow Approval Tests
- **Task ID**: write-workflow-tests
- **Depends On**: multi-user-auth
- **Assigned To**: builder-workflow-tests
- **Agent Type**: builder
- **Parallel**: false
- Create `frontend/e2e/workflow-approval.spec.ts` implementing ALL E2E specs from the E2E Test Specifications section below
- Tests use `test.use({ storageState: authFile('wichai') })` to switch users
- Use `test.describe.serial()` — tests depend on data from previous tests
- Every test must perform real actions and verify both UI and API state
- Run tests after writing: `cd frontend && npx playwright test workflow-approval --project=desktop`

### 4. Write RBAC Tests
- **Task ID**: write-rbac-tests
- **Depends On**: multi-user-auth
- **Assigned To**: builder-workflow-tests
- **Agent Type**: builder
- **Parallel**: false
- Create `frontend/e2e/rbac.spec.ts` implementing the RBAC E2E specs
- Each test block uses different storageState for different users
- Run tests after writing: `cd frontend && npx playwright test rbac --project=desktop`

### 5. Code Review
- **Task ID**: code-review
- **Depends On**: write-workflow-tests, write-rbac-tests
- **Assigned To**: reviewer
- **Agent Type**: code-reviewer
- **Parallel**: false
- Review all files created/modified by builders for quality, efficiency, reuse, and accessibility issues
- Verify every test follows Given-When-Then with real actions
- Verify no mocked APIs
- Verify sidebar RBAC fix works correctly
- Fix all issues found directly
- Report what was fixed and what was skipped

### 6. Run Tests & Generate Results
- **Task ID**: write-tests
- **Depends On**: code-review
- **Assigned To**: tester
- **Agent Type**: test-writer
- **Parallel**: false
- Run full E2E suite: `cd frontend && npx playwright test --project=desktop`
- Run existing unit tests to verify no regressions
- Capture screenshots per user role
- **MANDATORY: Save test results to `docs/test-results/`**
- Update test-cases.csv, test-cases.md, summary.md with new workflow + RBAC tests

### 7. Update Docs
- **Task ID**: update-docs
- **Depends On**: write-tests
- **Assigned To**: docs
- **Agent Type**: docs-writer
- **Parallel**: false
- Update `docs/test-results/summary.md` with new workflow test counts
- Update `docs/troubleshooting.md` with sidebar RBAC bug fix documentation
- Verify all doc links resolve

### 8. Validate Final Output
- **Task ID**: validate-all
- **Depends On**: code-review, write-tests, update-docs
- **Assigned To**: validator
- **Agent Type**: validator
- **Parallel**: false
- Run all validation commands
- Validate E2E Test Quality: read workflow specs, verify real actions + assertions
- Validate Acceptance Criteria Traceability
- Verify runtime with real servers
- Report pass/fail

### 9. Heal Failures (if any)
- **Task ID**: heal
- **Depends On**: validate-all
- **Assigned To**: team-lead (you)
- **Parallel**: false
- **Max Retries**: 2
- Only run if validate-all has failures
- Route fixes per Healing Rules

## Pipeline

```
Fix RBAC → Multi-User Auth → Write Workflow Tests + RBAC Tests → Code Review → Run Tests → Update Docs → Validate → Heal
```

- **Build**: Fix sidebar RBAC, extend auth for multi-user, write workflow + RBAC tests
- **Code Review**: MANDATORY. Review test quality + RBAC fix
- **Write Tests**: MANDATORY. Run all tests, save results
- **Update Docs**: MANDATORY. Update test documentation
- **Validate Final**: MANDATORY. Cross-reference acceptance criteria
- **Heal**: CONDITIONAL. Max 2 retries

## Acceptance Criteria

IMPORTANT: Every feature criterion MUST have a `Verified by:` line linking to specific test IDs.

### Feature Criteria

- [ ] Employee (Wichai) can fill and submit timesheet
      Verified by: E2E-WF-01 (Wichai fills hours, saves, submits)
- [ ] Employee (Ploy) can fill and submit timesheet
      Verified by: E2E-WF-02 (Ploy fills hours, saves, submits)
- [ ] Manager (Nattaya) sees submitted timesheets in "As Manager" tab
      Verified by: E2E-WF-03 (Nattaya sees Wichai+Ploy timesheets)
- [ ] Manager can approve timesheets (status → manager_approved)
      Verified by: E2E-WF-04 (Nattaya approves, status changes)
- [ ] CC Owner (Tachongrak) sees manager-approved timesheets in "As CC Owner" tab
      Verified by: E2E-WF-05 (Tachongrak sees timesheets after manager approval)
- [ ] CC Owner can approve timesheets (status → cc_approved/locked)
      Verified by: E2E-WF-06 (Tachongrak approves, status changes to locked)
- [ ] Manager can reject with comment
      Verified by: E2E-WF-07 (Nattaya rejects Wichai's timesheet with comment)
- [ ] Employee sees rejection and can edit + resubmit
      Verified by: E2E-WF-08 (Wichai sees rejected status, edits, resubmits)
- [ ] Budget page shows actual spending after approval
      Verified by: E2E-WF-09 (budget page shows non-zero amounts)
- [ ] Reports show utilization data after timesheets are processed
      Verified by: E2E-WF-10 (reports page loads data)
- [ ] Sidebar hides admin menu for employee role
      Verified by: E2E-RBAC-01 (Wichai does not see Users/Calendar/Rates)
- [ ] Sidebar shows admin menu for admin role
      Verified by: E2E-RBAC-02 (Tachongrak sees all sidebar items)
- [ ] Charge manager can create charge codes
      Verified by: E2E-RBAC-03 (Nattaya creates a charge code)
- [ ] PMO can view reports
      Verified by: E2E-RBAC-04 (Somchai accesses reports page)
- [ ] Employee cannot access admin pages directly
      Verified by: E2E-RBAC-05 (Wichai navigates to /admin/users → redirected or blocked)

### E2E Test Specifications (MANDATORY for UI projects)

#### FLOW 1 — Employee Submits Timesheet

```
E2E-WF-01: Wichai fills and submits timesheet
  Given: Logged in as Wichai (employee), on /time-entry, current week has no entries
  When: Timesheet loads (auto-created for current period)
  When: Fill 8 hours on Monday for first available charge code (ACT-001 Order Service)
  When: Click "Save Draft"
  Then: Toast "Timesheet saved" appears
  Then: Status shows "Draft"
  When: Click "Submit"
  Then: Status changes to "Submitted" (or toast confirms submission)
  Then: API GET /timesheets?period=<current> returns status="submitted"

E2E-WF-02: Ploy fills and submits timesheet
  Given: Logged in as Ploy (employee), on /time-entry
  When: Fill 8 hours on Monday for ACT-005 (Customer Portal)
  When: Save Draft → Submit
  Then: Timesheet status = "submitted"
  Then: API confirms status
```

#### FLOW 2 — Manager Approves

```
E2E-WF-03: Nattaya sees pending timesheets as manager
  Given: Logged in as Nattaya (charge_manager), on /approvals
  When: Page loads, click "As Manager" tab
  Then: At least 1 submitted timesheet is visible (from Wichai or Ploy)
  Then: API GET /approvals/pending returns asManager array with length >= 1

E2E-WF-04: Nattaya approves timesheets
  Given: Nattaya on /approvals with pending timesheets in "As Manager" tab
  When: Click approve button on first pending timesheet
  Then: Timesheet moves out of pending list or shows "Approved" status
  Then: API GET /approvals/pending → asManager count decreased
  Negative: If no pending timesheets, test documents this as data-dependent skip
```

#### FLOW 3 — CC Owner Approves

```
E2E-WF-05: Tachongrak sees manager-approved timesheets
  Given: Logged in as Tachongrak (admin), on /approvals
  When: Click "As CC Owner" tab
  Then: At least 1 timesheet with status "manager_approved" is visible
  Then: API GET /approvals/pending returns asCCOwner array with length >= 1

E2E-WF-06: Tachongrak approves as CC Owner (→ locked)
  Given: Tachongrak on /approvals, "As CC Owner" tab has pending items
  When: Click approve button on first item
  Then: Timesheet status changes (approved/locked)
  Then: API confirms status change
```

#### FLOW 4 — Rejection Flow

```
E2E-WF-07: Nattaya rejects Wichai's second timesheet
  Given: Wichai has submitted another timesheet (for next week)
  Given: Logged in as Nattaya, on /approvals, "As Manager" tab
  When: Click reject button on Wichai's timesheet
  When: Fill rejection comment = "Please add more detail to hours"
  When: Confirm rejection
  Then: Timesheet removed from pending list
  Then: API confirms rejection

E2E-WF-08: Wichai sees rejection and resubmits
  Given: Logged in as Wichai, on /time-entry
  When: Navigate to the rejected week
  Then: Status shows "Rejected" or "Draft" (reverted)
  When: Edit hours (change value)
  When: Save Draft → Submit again
  Then: Status changes back to "Submitted"
```

#### FLOW 5 — Budget & Reports Verification

```
E2E-WF-09: Budget shows spending after approvals
  Given: Logged in as Tachongrak (admin), on /budget
  When: Page loads
  Then: "Total Budget" shows a number > 0 (from New OMS ฿5M)
  Then: API GET /budgets/summary returns 200 with data

E2E-WF-10: Reports show utilization data
  Given: Logged in as Somchai (pmo), on /reports
  When: Page loads
  Then: Utilization report section is visible
  Then: API GET /reports/utilization?period=2026-03 returns 200
```

#### FLOW 6 — Role-Based Access

```
E2E-RBAC-01: Employee sidebar hides admin menu
  Given: Logged in as Wichai (employee)
  When: Navigate to /
  Then: Sidebar shows: Dashboard, Time Entry, Charge Codes, Approvals
  Then: Sidebar does NOT show: Users, Calendar, Rates (admin section hidden)

E2E-RBAC-02: Admin sidebar shows all items
  Given: Logged in as Tachongrak (admin)
  When: Navigate to /
  Then: Sidebar shows ALL items including Users, Calendar, Rates

E2E-RBAC-03: Charge manager can create charge codes
  Given: Logged in as Nattaya (charge_manager)
  When: Navigate to /charge-codes
  When: Click "Create New"
  Then: Create dialog opens (form is accessible)
  Then: Nattaya has permission to create (role=charge_manager allowed)

E2E-RBAC-04: PMO can view reports
  Given: Logged in as Somchai (pmo)
  When: Navigate to /reports
  Then: Reports page loads without error
  Then: Charts/data section is visible

E2E-RBAC-05: Employee cannot access admin pages (NEGATIVE)
  Given: Logged in as Wichai (employee)
  When: Navigate directly to /admin/users
  Then: Either redirected away, or page shows unauthorized/empty state
  Then: User management table is NOT accessible
```

### Infrastructure Criteria
- All 5 users can login via Supabase auth
- Backend API returns correct profile for each user's JWT
- Approval flow endpoints work: submit → manager approve → CC owner approve → locked

### Quality Criteria
- Code review passes
- All existing E2E tests still pass (no regressions)
- All 15 new workflow + RBAC tests pass
- Sidebar RBAC fix verified for all roles
- No mocked APIs in any test

### Documentation Criteria
- `docs/test-results/` updated with new workflow test entries
- `docs/troubleshooting.md` updated with sidebar RBAC fix
- All doc links resolve

### Runtime Criteria
- All E2E tests pass: `cd frontend && npx playwright test --project=desktop`
- Backend unit tests pass (no regressions)
- Per-user storageState files created in `e2e/.auth/`

## Validation Commands

- `cd frontend && npx playwright test --project=desktop --reporter=list 2>&1 | tail -20` — All E2E tests pass
- `cd backend && pnpm test 2>&1 | tail -5` — Backend unit tests pass (no regressions)
- `test -f frontend/e2e/.auth/wichai.json` — Wichai storageState exists
- `test -f frontend/e2e/.auth/nattaya.json` — Nattaya storageState exists
- `test -f frontend/e2e/.auth/tachongrak.json` — Tachongrak storageState exists
- `test -f frontend/e2e/.auth/somchai.json` — Somchai storageState exists
- `test -f frontend/e2e/.auth/ploy.json` — Ploy storageState exists
- `grep -c 'WF-\|RBAC-' frontend/e2e/workflow-approval.spec.ts frontend/e2e/rbac.spec.ts | tail -2` — At least 15 test cases
- `grep -qE 'role.*admin|adminNavItems' frontend/src/app/\(authenticated\)/layout.tsx` — RBAC check exists in layout
- `test -f docs/test-results/test-cases.csv && grep -c 'WF-\|RBAC-' docs/test-results/test-cases.csv` — CSV has workflow entries
- `test -f docs/test-results/summary.md` — Summary exists
- `test -f docs/test-results/e2e/e2e-results.json` — E2E results exist
- `test -f docs/env-setup.md` — Env setup exists
- `test -f docs/architecture.md` — Architecture exists
- `grep -q 'mermaid' docs/architecture.md` — Has Mermaid diagram
- `test -f docs/troubleshooting.md` — Troubleshooting exists
- `grep -qE 'RBAC|sidebar|admin menu' docs/troubleshooting.md` — Troubleshooting has RBAC issue

## Healing Rules

- `playwright test` → test-writer — Fix failing E2E tests
- `pnpm test` → test-writer — Fix failing unit tests
- `RBAC` → builder-rbac-fix — Fix sidebar role-based visibility
- `storageState` → builder-rbac-fix — Fix multi-user auth setup
- `workflow` → builder-workflow-tests — Fix workflow test assertions or selectors
- `test-cases` → test-writer — Update test case CSV/MD catalog
- `summary.md` → test-writer — Update test summary report
- `e2e-results` → test-writer — Re-run E2E tests and save results
- `screenshots` → test-writer — Capture missing screenshots
- `broken link` → docs-writer — Fix broken documentation links
- `troubleshooting` → docs-writer — Update troubleshooting docs

## Notes
- All 5 test users already exist in both `auth.users` and `profiles` tables with matching IDs
- All passwords are `password1234`
- The workflow tests are SERIAL — they depend on data from previous tests (e.g., WF-04 needs WF-01/02 to have submitted timesheets)
- The rejection flow (WF-07/08) needs Wichai to submit a SECOND timesheet (different week) so it doesn't conflict with the first one that gets approved
- Budget/Reports tests (WF-09/10) may show zero data if cost_rates aren't properly linked — this is acceptable and should be documented
- Supabase anon key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjaHh0a2ljZWV5cWprc2dhbndyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NzA4ODUsImV4cCI6MjA4OTI0Njg4NX0.RAxjZG4Q24N--sxNv6eKbrcTHRa3cn1ojB1Oys3HdtI`
