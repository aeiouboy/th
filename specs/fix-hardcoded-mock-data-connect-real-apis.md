# Plan: Fix All Hardcoded Mock Data — Connect to Real APIs

## Task Description
Replace all hardcoded mock data, placeholder values, and non-functional UI elements across the frontend with real API connections and dynamic data. The audit found 12 issues across 6 files where the UI displays fake data, has dead links, or shows non-functional buttons. Every fix must connect to a real backend endpoint — no new mocks.

## Objective
1. Remove ALL hardcoded/placeholder values from production frontend code
2. Connect every dynamic UI element to a real backend API
3. Ensure no fake data is ever shown to users (show loading/empty states instead)
4. Add missing backend endpoints where needed (user initials, period listing)

## Problem Statement
The frontend was initially built with placeholder data to prototype the UI. Many of these placeholders remain in production:
- Notification bell shows "3" permanently with no backend
- Avatar shows "U" instead of user initials
- Dashboard shows fake deltas ("+4h vs last period", "+2% vs prior")
- Approvals page has hardcoded period dropdown (only Jan-Mar 2026)
- TimesheetReview falls back to "John Doe" mock data on API failure
- Admin users page shows "Active" badge for all users (no status field exists)
- "Period closes Mar 31" is hardcoded
- Settings notification preferences aren't persisted
- "Send Reminders" button does nothing
- Help & Support link goes to `href="#"`

## Solution Approach
- **Remove non-functional elements** that have no backend support yet (notification bell badge, Send Reminders button, Help link)
- **Connect to existing APIs** where data already exists (user profile for avatar initials, periods from timesheets)
- **Add lightweight backend endpoints** where needed (available periods list)
- **Replace mock fallbacks** with proper error/empty states
- **Compute real deltas** using existing API data (compare current vs previous period)

## Tech Stack
- **Language**: TypeScript
- **Framework**: Next.js 16 (frontend), NestJS 11 (backend)
- **Runtime**: Node.js 20+
- **Key APIs/Libraries**: @tanstack/react-query, date-fns, Supabase Auth
- **Build Tools**: pnpm
- **Testing**: Vitest (unit), Playwright (E2E)

## Technical Design

### Architecture
No new architecture needed. All fixes are within existing components and services. One new backend endpoint is added for listing available periods.

### Key Design Decisions
- **Remove vs Connect**: Items with no backend support (notification bell badge, Send Reminders, Help link) are removed/simplified rather than building entire new subsystems. The bell icon stays but the fake "3" badge is removed.
- **Avatar initials**: The layout already fetches `/users/me` for role — reuse that response for `fullName` to generate initials.
- **Period dropdown**: Add `GET /timesheets/periods` endpoint that returns distinct periods from the timesheets table. Frontend generates period options dynamically.
- **Mock data removal**: TimesheetReview shows an error message on API failure instead of fake data. No mock data in production code.
- **User status**: Since the `profiles` table has no `status` column, remove the hardcoded "Active" badge entirely. It's misleading.
- **Dashboard deltas**: Fetch previous period's timesheet data and compute real deltas. If no previous data, don't show delta.

### Data Model
No schema changes. The `profiles` table already has `fullName` for initials. The `timesheets` table already has `periodStart` for period listing.

### API / Interface Contracts
New endpoint:
- `GET /api/v1/timesheets/periods` — Returns `string[]` of distinct `periodStart` values from timesheets for the current user, sorted desc. Example: `["2026-03-10", "2026-03-03", "2026-02-24"]`

Existing endpoints used:
- `GET /api/v1/users/me` — Returns `{ id, email, fullName, role, department, jobGrade }` (already fetched in layout)
- `GET /api/v1/timesheets?period=<date>` — Returns timesheet for a period
- `GET /api/v1/timesheets/<id>/entries` — Returns entries for a timesheet
- `GET /api/v1/calendar` — Returns calendar data including period end dates

## Relevant Files

### Files to Modify
- `frontend/src/app/(authenticated)/layout.tsx` — Remove bell badge "3", fix avatar "U" → real initials, remove Help `href="#"`
- `frontend/src/app/(authenticated)/page.tsx` — Remove hardcoded deltas ("+4h", "+2%"), fix "Period closes Mar 31", remove "Send Reminders" button
- `frontend/src/app/(authenticated)/approvals/page.tsx` — Dynamic period dropdown, dynamic default period
- `frontend/src/components/approvals/TimesheetReview.tsx` — Remove mockDetail, show error state on API failure
- `frontend/src/app/(authenticated)/admin/users/page.tsx` — Remove hardcoded "Active" badge
- `backend/src/timesheets/timesheets.controller.ts` — Add `GET /timesheets/periods` endpoint
- `backend/src/timesheets/timesheets.service.ts` — Add `getAvailablePeriods()` method

### Reference Files (read-only)
- `frontend/src/lib/api.ts` — API client
- `backend/src/database/schema/profiles.ts` — No status column (confirms Active badge must go)
- `backend/src/database/schema/timesheets.ts` — Has periodStart for period listing

## Implementation Phases

### Phase 1: Backend (add periods endpoint)
Add `GET /timesheets/periods` endpoint returning distinct period dates.

### Phase 2: Frontend Fixes (all 12 issues)
Fix all hardcoded/mock data across 5 frontend files.

### Phase 3: Validation
Verify all fixes, run tests, ensure no regressions.

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
  - Name: builder-backend
  - Role: Add periods endpoint to timesheets module
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-frontend
  - Role: Fix all 12 hardcoded/mock data issues across frontend files
  - Agent Type: builder
  - Resume: true

- Code Reviewer
  - Name: reviewer
  - Role: Review and fix code quality, efficiency, and reuse issues after builders complete their work
  - Agent Type: code-reviewer
  - Resume: false

- Test Writer
  - Name: tester
  - Role: Update tests for changed components, run all tests, capture results
  - Agent Type: test-writer
  - Resume: false

- Docs Writer
  - Name: docs-writer
  - Role: Update troubleshooting docs with mock data removal documentation
  - Agent Type: docs-writer
  - Resume: false

- Validator
  - Name: validator
  - Role: Final read-only validation that all acceptance criteria are met and all tests pass
  - Agent Type: validator
  - Resume: false

## Step by Step Tasks

### 1. Add Periods Endpoint to Backend
- **Task ID**: add-periods-endpoint
- **Depends On**: none
- **Assigned To**: builder-backend
- **Agent Type**: builder
- **Parallel**: false
- Read `backend/src/timesheets/timesheets.service.ts` and `backend/src/timesheets/timesheets.controller.ts`
- Add `getAvailablePeriods(userId: string)` to `TimesheetsService`:
  - `SELECT DISTINCT period_start FROM timesheets WHERE user_id = $1 ORDER BY period_start DESC`
  - Returns `string[]`
- Add `@Get('timesheets/periods')` to `TimesheetsController` (before parameterized routes)
- Verify: `cd backend && pnpm build` compiles clean
- Verify with real API call: GET `/api/v1/timesheets/periods` returns array

### 2. Fix Layout: Bell Badge, Avatar, Help Link
- **Task ID**: fix-layout
- **Depends On**: none
- **Assigned To**: builder-frontend
- **Agent Type**: builder
- **Parallel**: true (can run alongside task 1)
- Read `frontend/src/app/(authenticated)/layout.tsx`
- **Bell badge (L284-288)**: Remove the `<span>` badge showing "3". Keep the Bell icon button. Remove the hardcoded aria-label count. New aria-label: "Notifications"
- **Avatar (L292-296)**: The layout already fetches user profile via `api.get('/users/me')` and stores `userRole`. Expand to also store `fullName`. Generate initials from `fullName` (e.g., "Tachongrak S." → "TS"). Replace hardcoded "U" with computed initials. Fallback to "U" only if fullName is null.
- **Help link (L227-233)**: Remove the `<a href="#">Help & Support</a>` link entirely. Or replace `href="#"` with `href="/settings"` to point to a real page.
- Verify: `cd frontend && npx tsc --noEmit` passes

### 3. Fix Dashboard: Deltas, Period Close, Send Reminders
- **Task ID**: fix-dashboard
- **Depends On**: add-periods-endpoint
- **Assigned To**: builder-frontend
- **Agent Type**: builder
- **Parallel**: false
- Read `frontend/src/app/(authenticated)/page.tsx`
- **Hardcoded delta "+4h vs last period" (L294)**: Fetch previous week's timesheet using `api.get('/timesheets?period=<prev-week>')`. Compute real delta: `currentWeeklyHours - previousWeeklyHours`. Format as `+Xh vs last period` or `-Xh vs last period`. If no previous data, pass `undefined` (no delta shown).
- **Hardcoded delta "+2% vs prior" (L301)**: Similarly compute chargeability delta from previous period. If no data, don't show delta.
- **"Period closes Mar 31" (L750)**: Replace with dynamic period end date. Use the current timesheet's `periodEnd` field (already available from the timesheet query). Format: `Period closes ${format(new Date(timesheet.periodEnd + 'T00:00:00'), 'MMM d')}`. If no timesheet, show "Submit your timesheet on time".
- **"Send Reminders" button (L641-643)**: Remove the button entirely. It has no backend and misleads users.
- **"Timesheet due in 2 days" (L748)**: Calculate actual days until period end from timesheet.periodEnd. Format: `Timesheet due in ${days} days` or `Timesheet due today`.

### 4. Fix Approvals: Dynamic Period Dropdown
- **Task ID**: fix-approvals
- **Depends On**: add-periods-endpoint
- **Assigned To**: builder-frontend
- **Agent Type**: builder
- **Parallel**: false
- Read `frontend/src/app/(authenticated)/approvals/page.tsx`
- **Default period (L69)**: Replace `useState('2026-03')` with dynamic current month: `useState(format(new Date(), 'yyyy-MM'))`.
- **Period dropdown (L137-141)**: Generate last 12 months dynamically using date-fns. Map to `<SelectItem>` with value `yyyy-MM` and label `MMM yyyy`. Example: generate from current month back 11 months.
- Verify the period filter still works with the approval API

### 5. Fix TimesheetReview: Remove Mock Data
- **Task ID**: fix-timesheet-review
- **Depends On**: none
- **Assigned To**: builder-frontend
- **Agent Type**: builder
- **Parallel**: true
- Read `frontend/src/components/approvals/TimesheetReview.tsx`
- **Remove mockDetail (L39-58)**: Delete the entire `mockDetail` constant
- **Fix error handling (L68-71)**: Instead of falling back to mock data on API failure, show an error message: "Failed to load timesheet details. Please try again."
- Set `detail` to `null` on error and render an error state in the component

### 6. Fix Admin Users: Remove Hardcoded Active Badge
- **Task ID**: fix-admin-users
- **Depends On**: none
- **Assigned To**: builder-frontend
- **Agent Type**: builder
- **Parallel**: true
- Read `frontend/src/app/(authenticated)/admin/users/page.tsx`
- **Remove "Active" badge (L264-268)**: The `profiles` table has no `status` column. Remove the entire `<TableCell>` containing the hardcoded "Active" badge. Also remove the corresponding `<TableHead>` for the Status column.
- Verify the table still renders correctly

### 7. Code Review
- **Task ID**: code-review
- **Depends On**: fix-layout, fix-dashboard, fix-approvals, fix-timesheet-review, fix-admin-users
- **Assigned To**: reviewer
- **Agent Type**: code-reviewer
- **Parallel**: false
- Review all files modified by builders for quality, efficiency, reuse, and accessibility issues
- Verify NO hardcoded mock data remains in any modified file
- Verify NO `href="#"` links remain
- Verify NO hardcoded counts, dates, or placeholder strings remain
- Fix all issues found directly
- Report what was fixed and what was skipped

### 8. Write Tests
- **Task ID**: write-tests
- **Depends On**: code-review
- **Assigned To**: tester
- **Agent Type**: test-writer
- **Parallel**: false
- Update existing tests that may assert old hardcoded values:
  - `frontend/src/app/(authenticated)/page.test.tsx` — update any assertions about "+4h", "Send Reminders", "Period closes Mar 31"
  - `frontend/src/app/(authenticated)/admin/users/page.test.tsx` — update assertions about "Active" badge
  - `frontend/src/app/(authenticated)/approvals/page.test.tsx` — update period dropdown assertions
  - `frontend/src/components/approvals/ApprovalQueue.test.tsx` — if it references mock data
- Add backend unit test for `getAvailablePeriods()` in timesheets service
- Run all tests: `cd backend && pnpm test` and `cd frontend && pnpm test`
- Run E2E: `cd frontend && npx playwright test --project=desktop`
- **MANDATORY: Save test results to `docs/test-results/`**
- Update `docs/test-results/summary.md`, `test-cases.csv`, `test-cases.md`
- Save E2E results to `docs/test-results/e2e/e2e-results.json`

### 9. Update Docs
- **Task ID**: update-docs
- **Depends On**: write-tests
- **Assigned To**: docs-writer
- **Agent Type**: docs-writer
- **Parallel**: false
- Update `docs/troubleshooting.md` with a section documenting the mock data cleanup:
  - What was removed and why
  - Which files were affected
  - How to avoid reintroducing mock data in production
- Verify `docs/env-setup.md`, `docs/architecture.md` still exist and links resolve

### 10. Validate Final Output
- **Task ID**: validate-all
- **Depends On**: code-review, write-tests, update-docs
- **Assigned To**: validator
- **Agent Type**: validator
- **Parallel**: false
- Run all validation commands
- Run all automated tests
- Verify acceptance criteria met
- **Verify all documentation links**: Check that every file referenced in docs actually exists
- **Verify runtime**: Start servers, verify key routes return real data
- Verify NO hardcoded mock data remains (grep for known patterns)

### 11. Heal Failures (if any)
- **Task ID**: heal
- **Depends On**: validate-all
- **Assigned To**: team-lead (you)
- **Parallel**: false
- **Max Retries**: 2
- Only run this step if validate-all has failures
- Route fixes per Healing Rules

## Pipeline

```
[Backend: Add Periods] + [Frontend: Fix Layout, TimesheetReview, Admin Users] → [Frontend: Fix Dashboard, Approvals] → Code Review → Write Tests → Update Docs → Validate → Heal
```

## Acceptance Criteria

### Feature Criteria

- [ ] Notification bell has NO fake badge count — just the icon
      Verified by: E2E-MOCK-01 (bell icon visible, no badge number)
- [ ] Avatar shows real user initials from profile (not "U")
      Verified by: E2E-MOCK-01 (avatar shows initials matching logged-in user)
- [ ] Help & Support link removed or points to real page (no `href="#"`)
      Verified by: E2E-MOCK-01 (no href="#" in sidebar)
- [ ] Dashboard "Hours This Period" card shows real delta or no delta (not hardcoded "+4h")
      Verified by: E2E-MOCK-02 (dashboard loads, no "+4h vs last period" text when no prior data)
- [ ] Dashboard "Chargeability" card shows real delta or no delta (not hardcoded "+2%")
      Verified by: E2E-MOCK-02 (no "+2% vs prior" text when no prior data)
- [ ] "Period closes" shows dynamic date from timesheet period (not "Mar 31")
      Verified by: E2E-MOCK-02 (alert shows current period end date)
- [ ] "Send Reminders" button is removed
      Verified by: E2E-MOCK-02 (button not present in DOM)
- [ ] Approvals period dropdown shows dynamic months (not hardcoded 3)
      Verified by: E2E-MOCK-03 (dropdown has current month and recent months)
- [ ] Approvals default period is current month (not "2026-03")
      Verified by: E2E-MOCK-03 (default selection matches current month)
- [ ] TimesheetReview shows error on API failure (not "John Doe" mock data)
      Verified by: UNIT-MOCK-01 (component renders error state on fetch failure)
- [ ] Admin users table has no "Active" status column
      Verified by: E2E-MOCK-04 (users table has no Status column header)
- [ ] `GET /api/v1/timesheets/periods` returns real period data
      Verified by: UNIT-MOCK-02 (backend service returns distinct periods)

### E2E Test Specifications (MANDATORY for UI projects)

```
E2E-MOCK-01: Layout has no fake data
  Given: Logged in as Tachongrak (admin)
  When: Navigate to / (dashboard)
  Then: Bell icon is visible but has NO numeric badge
  Then: Avatar shows initials (not "U") — e.g., "TS" or first letter of name
  Then: Sidebar footer has no href="#" link
  Negative: No element with text "3" inside the bell button

E2E-MOCK-02: Dashboard shows real data only
  Given: Logged in as Tachongrak (admin), on /
  When: Dashboard loads
  Then: If hours logged, delta is computed (not hardcoded "+4h vs last period")
  Then: If no prior period data, no delta is shown at all
  Then: "Send Reminders" button is NOT present
  Then: Employee alert (if draft timesheet) shows dynamic period end date
  Negative: Text "Period closes Mar 31" does NOT appear (unless Mar 31 is actually the period end)
  Negative: Text "+4h vs last period" does NOT appear as hardcoded

E2E-MOCK-03: Approvals period dropdown is dynamic
  Given: Logged in as Tachongrak (admin), on /approvals
  When: Page loads
  Then: Period dropdown default value matches current month (format: MMM YYYY)
  When: Open period dropdown
  Then: At least 6 month options are available (not just 3 hardcoded)
  Negative: Does NOT only show "Jan 2026", "Feb 2026", "Mar 2026"

E2E-MOCK-04: Admin users table has no fake status
  Given: Logged in as Tachongrak (admin), on /admin/users
  When: Page loads
  Then: Table headers do NOT include "Status"
  Then: No hardcoded "Active" badge appears
  Negative: Text "Active" badge does not appear in the table
```

### Infrastructure Criteria
- `GET /api/v1/timesheets/periods` endpoint exists and returns data
- All existing endpoints continue to work (no regressions)

### Quality Criteria
- Code review passes with no remaining mock data
- All unit tests pass
- All E2E tests pass
- No `href="#"` in any production code
- No hardcoded "John Doe", "3 unread", "Active", "+4h", "Mar 31" in production code

### Documentation Criteria
- `docs/troubleshooting.md` updated with mock data cleanup section
- All doc links resolve
- `docs/test-results/` updated with latest results

### Runtime Criteria
- All E2E tests pass: `cd frontend && npx playwright test --project=desktop`
- Backend tests pass: `cd backend && pnpm test`
- Frontend tests pass: `cd frontend && pnpm test`

## Validation Commands

- `cd /Users/tachongrak/Projects/ts/backend && pnpm test 2>&1 | tail -5` — Backend tests pass
- `cd /Users/tachongrak/Projects/ts/frontend && pnpm test 2>&1 | tail -5` — Frontend tests pass
- `cd /Users/tachongrak/Projects/ts/frontend && npx playwright test --project=desktop --reporter=list 2>&1 | tail -20` — E2E tests pass
- `grep -rn 'href="#"' /Users/tachongrak/Projects/ts/frontend/src/app/ /Users/tachongrak/Projects/ts/frontend/src/components/ | grep -v node_modules | grep -v '.test.'` — No dead links in production code
- `grep -rn 'John Doe\|mockDetail' /Users/tachongrak/Projects/ts/frontend/src/components/approvals/TimesheetReview.tsx` — No mock data (should return empty)
- `grep -rn "'>3<\|\"3 unread\|Notifications (3" /Users/tachongrak/Projects/ts/frontend/src/` — No hardcoded notification count
- `grep -rn "'Active'" /Users/tachongrak/Projects/ts/frontend/src/app/\(authenticated\)/admin/users/page.tsx` — No hardcoded Active badge (should return empty)
- `grep -rn "Send Reminders" /Users/tachongrak/Projects/ts/frontend/src/app/\(authenticated\)/page.tsx` — No Send Reminders button (should return empty)
- `grep -rn "Period closes Mar" /Users/tachongrak/Projects/ts/frontend/src/` — No hardcoded period close date (should return empty)
- `grep -rn "+4h vs last\|+2% vs prior" /Users/tachongrak/Projects/ts/frontend/src/` — No hardcoded deltas (should return empty)
- `test -f /Users/tachongrak/Projects/ts/docs/test-results/summary.md && echo PASS` — Summary exists
- `test -f /Users/tachongrak/Projects/ts/docs/test-results/e2e/e2e-results.json && echo PASS` — E2E results exist
- `test -f /Users/tachongrak/Projects/ts/docs/env-setup.md && echo PASS` — Env setup exists
- `test -f /Users/tachongrak/Projects/ts/docs/architecture.md && echo PASS` — Architecture exists
- `grep -q 'mermaid' /Users/tachongrak/Projects/ts/docs/architecture.md && echo PASS` — Has Mermaid diagram
- `test -f /Users/tachongrak/Projects/ts/docs/troubleshooting.md && echo PASS` — Troubleshooting exists
- `grep -qE 'mock data|hardcoded|placeholder' /Users/tachongrak/Projects/ts/docs/troubleshooting.md && echo PASS` — Has mock cleanup section

## Healing Rules

- `pnpm test` → test-writer — Fix failing unit tests
- `playwright test` → test-writer — Fix failing E2E tests
- `href="#"` → builder-frontend — Remove remaining dead links
- `mockDetail\|John Doe` → builder-frontend — Remove remaining mock data
- `Active` → builder-frontend — Remove remaining hardcoded badges
- `Send Reminders` → builder-frontend — Remove remaining non-functional buttons
- `+4h\|+2%\|Mar 31` → builder-frontend — Remove remaining hardcoded values
- `timesheets/periods` → builder-backend — Fix periods endpoint
- `test-cases` → test-writer — Update test case catalog
- `summary.md` → test-writer — Update test summary
- `broken link` → docs-writer — Fix broken documentation links
- `troubleshooting` → docs-writer — Update troubleshooting docs

## Notes
- The notification system (bell with real unread count) is a separate feature — not in scope. We just remove the fake badge.
- User status ("Active"/"Inactive") could be a future feature requiring a schema migration to add `status` to profiles. Not in scope — we remove the misleading badge.
- The "Send Reminders" feature would require email/notification infrastructure. Not in scope — we remove the non-functional button.
- The Help & Support page is not yet built. We remove the dead link rather than building a help system.
- Dashboard deltas require fetching the previous period's data. This adds one extra API call but avoids showing fake comparison data.
