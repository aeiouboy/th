# Test Results Summary

- **Date**: 2026-03-17 16:58
- **Total Tests**: 429
- **Passed**: 428
- **Failed**: 1
- **Skipped**: 0

## Backend Tests
- **Runner**: Jest + ts-jest + NestJS Testing
- **Tests**: 127 pass / 0 fail
- **Coverage**: services, controllers, guards, DTOs
- Files:
  - `backend/src/timesheets/timesheets.service.spec.ts` — 18 tests
  - `backend/src/charge-codes/charge-codes.service.spec.ts` — 14 tests
  - `backend/src/approvals/approvals.service.spec.ts` — 15 tests
  - `backend/src/budgets/budgets.service.spec.ts` — 17 tests
  - `backend/src/calendar/calendar.service.spec.ts` — 18 tests
  - `backend/src/reports/reports.service.spec.ts` — 15 tests
  - `backend/src/common/guards/supabase-auth.guard.spec.ts` — 11 tests
  - `backend/src/users/users.service.spec.ts` — 10 tests
  - `backend/src/cost-rates/cost-rates.service.spec.ts` — 9 tests

## Frontend Tests
- **Runner**: Vitest v4.1.0 + React Testing Library
- **Tests**: 273 pass / 0 fail
- **Coverage**: components, pages, forms, interactions, API error handling
- Files:
  - `frontend/src/lib/api.test.ts` — 20 tests
  - `frontend/src/components/timesheet/TimesheetGrid.test.tsx` — 16 tests
  - `frontend/src/components/timesheet/EntryCell.test.tsx` — 18 tests
  - `frontend/src/components/timesheet/ChargeCodeSelector.test.tsx` — 11 tests
  - `frontend/src/components/approvals/ApprovalQueue.test.tsx` — 21 tests
  - `frontend/src/components/approvals/BulkApprovalBar.test.tsx` — 10 tests
  - `frontend/src/components/approvals/TimesheetReview.test.tsx` — 8 tests
  - `frontend/src/components/charge-codes/ChargeCodeForm.test.tsx` — 20 tests
  - `frontend/src/components/charge-codes/ChargeCodeTree.test.tsx` — 16 tests
  - `frontend/src/components/charge-codes/AccessManager.test.tsx` — 11 tests
  - `frontend/src/components/reports/ActivityPie.test.tsx` — 11 tests
  - `frontend/src/components/reports/AlertList.test.tsx` — 16 tests
  - `frontend/src/components/reports/BudgetChart.test.tsx` — 9 tests
  - `frontend/src/components/reports/ChargeabilityGauge.test.tsx` — 8 tests
  - `frontend/src/components/reports/UtilizationChart.test.tsx` — 8 tests
  - `frontend/src/app/(authenticated)/page.test.tsx` — 7 tests
  - `frontend/src/app/(authenticated)/time-entry/page.test.tsx` — 6 tests
  - `frontend/src/app/(authenticated)/approvals/page.test.tsx` — 6 tests
  - `frontend/src/app/(authenticated)/charge-codes/page.test.tsx` — 5 tests
  - `frontend/src/app/(authenticated)/reports/page.test.tsx` — 7 tests
  - `frontend/src/app/(authenticated)/budget/page.test.tsx` — 4 tests
  - `frontend/src/app/(authenticated)/profile/page.test.tsx` — 6 tests
  - `frontend/src/app/(authenticated)/settings/page.test.tsx` — 6 tests
  - `frontend/src/app/(authenticated)/admin/calendar/page.test.tsx` — 6 tests
  - `frontend/src/app/(authenticated)/admin/rates/page.test.tsx` — 4 tests
  - `frontend/src/app/(authenticated)/admin/users/page.test.tsx` — 5 tests
  - `frontend/src/app/login/page.test.tsx` — 8 tests

## E2E Tests
- **Runner**: Playwright 1.58.2
- **Project**: desktop (Chromium 1280x720)
- **Tests**: 28 pass / 1 fail (29 total including auth setup)
- **Pages tested**: login, dashboard, time-entry, approvals, charge-codes, budget, reports, admin-calendar, admin-rates, admin-users
- **Screenshots**: 24 captured (12 pages x desktop + mobile viewports)
- Files:
  - `frontend/e2e/auth.setup.ts` — 1 test (setup)
  - `frontend/e2e/admin-calendar.spec.ts` — 3 tests
  - `frontend/e2e/admin-rates.spec.ts` — 2 tests
  - `frontend/e2e/admin-users.spec.ts` — 2 tests
  - `frontend/e2e/approvals.spec.ts` — 3 tests
  - `frontend/e2e/budget.spec.ts` — 2 tests
  - `frontend/e2e/charge-codes.spec.ts` — 5 tests (1 fail)
  - `frontend/e2e/dashboard.spec.ts` — 2 tests
  - `frontend/e2e/login.spec.ts` — 3 tests
  - `frontend/e2e/reports.spec.ts` — 2 tests
  - `frontend/e2e/time-entry.spec.ts` — 4 tests

## Notable Findings

### E2E Failure (1)
- **TC-429** `E2E-CC-05: Search filters the charge code tree` — FAIL
  - **Root cause**: Test searches for charge codes containing "Digital" but the test database has no charge code with that name.
  - **Classification**: Data-dependent test failure. Not an implementation bug.
  - **Recommendation**: Update test to search for a charge code name that exists in the seeded database, or add seed data with a "Digital" program.

### Infrastructure Notes
- All 127 backend unit tests pass with real NestJS module injection (no implementation bugs found).
- All 273 frontend unit tests pass with mocked API layer (component logic correct).
- E2E tests run against live Supabase backend (real DB, real auth). 28/29 specs pass.
- Screenshots captured at desktop (1280x720) and mobile (375x667) for all 12 key pages.
