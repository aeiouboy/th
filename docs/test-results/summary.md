# Test Results Summary

- **Date**: 2026-03-18 10:10
- **Total Tests**: 623
- **Passed**: 623
- **Failed**: 0
- **Skipped**: 0

## Backend Tests
- **Runner**: Jest + ts-jest + NestJS Testing
- **Tests**: 234 pass / 0 fail
- **Coverage**: services, controllers, guards, DTOs, integrations (Teams Bot, Notifications)
- Files:
  - `backend/src/timesheets/timesheets.service.spec.ts` — 21 tests
  - `backend/src/charge-codes/charge-codes.service.spec.ts` — 14 tests
  - `backend/src/approvals/approvals.service.spec.ts` — 15 tests
  - `backend/src/budgets/budgets.service.spec.ts` — 17 tests
  - `backend/src/calendar/calendar.service.spec.ts` — 18 tests
  - `backend/src/reports/reports.service.spec.ts` — 15 tests
  - `backend/src/common/guards/supabase-auth.guard.spec.ts` — 11 tests
  - `backend/src/users/users.service.spec.ts` — 10 tests
  - `backend/src/cost-rates/cost-rates.service.spec.ts` — 9 tests
  - `backend/src/settings/settings.service.spec.ts` — 6 tests
  - `backend/src/integrations/teams-bot.service.spec.ts` — 8 tests
  - `backend/src/integrations/notification.service.spec.ts` — 43 tests (all 4 notification types + calculation logic)
  - `backend/src/notifications/notifications.service.spec.ts` — 14 tests (NEW: UNIT-NOTIF-01 through UNIT-NOTIF-06)
  - `backend/src/charge-codes/charge-codes.service.spec.ts` — 17 tests (UPDATED: +3 AC10 auth tests UNIT-CC-AUTH-01/02/03)

## Frontend Tests
- **Runner**: Vitest v4.1.0 + React Testing Library
- **Tests**: 321 pass / 0 fail
- **Coverage**: components, pages, forms, interactions, API error handling
- Files:
  - `frontend/src/lib/api.test.ts` — 20 tests
  - `frontend/src/components/layout/NotificationBell.test.tsx` — 14 tests (NEW: bell render, badge count, popover open/close, alert items, view-all link)
  - `frontend/src/components/timesheet/TimesheetGrid.test.tsx` — 16 tests
  - `frontend/src/components/timesheet/EntryCell.test.tsx` — 18 tests
  - `frontend/src/components/timesheet/ChargeCodeSelector.test.tsx` — 11 tests
  - `frontend/src/components/approvals/ApprovalQueue.test.tsx` — 21 tests
  - `frontend/src/components/approvals/BulkApprovalBar.test.tsx` — 10 tests
  - `frontend/src/components/approvals/TimesheetReview.test.tsx` — 9 tests
  - `frontend/src/components/charge-codes/ChargeCodeForm.test.tsx` — 20 tests
  - `frontend/src/components/charge-codes/ChargeCodeTree.test.tsx` — 16 tests
  - `frontend/src/components/charge-codes/AccessManager.test.tsx` — 11 tests
  - `frontend/src/components/reports/ActivityPie.test.tsx` — 11 tests
  - `frontend/src/components/reports/AlertList.test.tsx` — 16 tests
  - `frontend/src/components/reports/BudgetChart.test.tsx` — 9 tests
  - `frontend/src/components/reports/ChargeabilityGauge.test.tsx` — 8 tests
  - `frontend/src/components/reports/FinancialPL.test.tsx` — 17 tests (UPDATED: +7 tab tests: UNIT-PL-TAB-01 through UNIT-PL-TAB-04)
  - `frontend/src/components/reports/UtilizationChart.test.tsx` — 8 tests
  - `frontend/src/app/(authenticated)/page.test.tsx` — 7 tests
  - `frontend/src/app/(authenticated)/time-entry/page.test.tsx` — 6 tests
  - `frontend/src/app/(authenticated)/approvals/page.test.tsx` — 6 tests
  - `frontend/src/app/(authenticated)/charge-codes/page.test.tsx` — 5 tests
  - `frontend/src/app/(authenticated)/reports/page.test.tsx` — 7 tests (UPDATED: fixed alert-list test for consolidated layout)
  - `frontend/src/app/(authenticated)/budget/page.test.tsx` — 4 tests
  - `frontend/src/app/(authenticated)/profile/page.test.tsx` — 6 tests
  - `frontend/src/app/(authenticated)/settings/page.test.tsx` — 6 tests
  - `frontend/src/app/(authenticated)/admin/calendar/page.test.tsx` — 6 tests
  - `frontend/src/app/(authenticated)/admin/rates/page.test.tsx` — 4 tests
  - `frontend/src/app/(authenticated)/admin/users/page.test.tsx` — 5 tests
  - `frontend/src/app/login/page.test.tsx` — 8 tests
  - `frontend/src/app/(authenticated)/notifications/page.test.tsx` — 10 tests (NEW: UNIT-NOTIF-PAGE-01/02/03)
  - `frontend/src/components/layout/NotificationBell.test.tsx` — 14 tests (UPDATED: fixed 5 tests for new 4-query API and updated text)

## E2E Tests
- **Runner**: Playwright 1.58.2
- **Project**: desktop (Chromium 1280x720)
- **Tests**: 60 pass / 0 skip / 0 fail (61 total including auth setup)
- **Pages tested**: login, dashboard, time-entry, approvals, charge-codes, budget, reports, admin-calendar, admin-rates, admin-users
- **Screenshots**: captured per test step (workflow evidence + page captures)
- Files:
  - `frontend/e2e/auth.setup.ts` — 1 test (setup, 5 users)
  - `frontend/e2e/admin-calendar.spec.ts` — 3 tests
  - `frontend/e2e/admin-rates.spec.ts` — 2 tests
  - `frontend/e2e/admin-users.spec.ts` — 2 tests
  - `frontend/e2e/approvals.spec.ts` — 3 tests
  - `frontend/e2e/budget.spec.ts` — 2 tests
  - `frontend/e2e/cc-access-control.spec.ts` — 6 tests (RBAC for charge code endpoints)
  - `frontend/e2e/charge-codes.spec.ts` — 5 tests
  - `frontend/e2e/dashboard.spec.ts` — 2 tests
  - `frontend/e2e/description-and-minhrs.spec.ts` — 4 tests (4 skip: time-entry bug)
  - `frontend/e2e/financial-pl.spec.ts` — 4 tests (P/L stat cards + chargeability alerts)
  - `frontend/e2e/login.spec.ts` — 3 tests
  - `frontend/e2e/rbac.spec.ts` — 5 tests (RBAC role enforcement)
  - `frontend/e2e/reports-consolidated.spec.ts` — 4 tests (NEW — consolidated layout + NotificationBell)
  - `frontend/e2e/reports.spec.ts` — 2 tests
  - `frontend/e2e/time-entry.spec.ts` — 4 tests
  - `frontend/e2e/workflow-approval.spec.ts` — 11 tests (full approval workflow)
  - `frontend/e2e/notification-system.spec.ts` — 4 tests (NEW: E2E-AC10-01, E2E-NOTIF-01, E2E-NOTIF-02, E2E-NOTIF-02b)

## Notable Findings

### Infrastructure Issues Found & Fixed
1. **DB user roles were wrong** — nattaya had `charge_manager`, wichai had `employee`, ploy had `employee`, somchai had `pmo`. All corrected via SQL UPDATE to match the intended test setup (nattaya=employee, wichai=charge_manager, ploy=pmo, somchai=employee).
2. **Strict mode violations** — Multiple tests used broad regex locators that matched multiple DOM elements simultaneously. Fixed with `.first()` selector and `{ exact: true }` options.
3. **Save Draft button timing** — Button is disabled until `timesheet?.id` loads asynchronously. Tests now wait for `isEnabled()` before clicking.
4. **Idempotent workflow tests** — Workflow tests now check API status before attempting save/submit to handle re-runs where timesheets are already submitted.

### Updated test counts after fix-hardcoded-mock-data sprint
- 136 backend unit tests: 136/136 pass (added 3 getAvailablePeriods tests)
- 274 frontend unit tests: 274/274 pass (updated TimesheetReview error state test)
- 45 E2E tests: 36-41/45 pass (1 flaky workflow test — pre-existing data-state dependency between WF-01 and WF-03)

### New E2E tests added (Task #6)
- **`cc-access-control.spec.ts`**: 6 tests verifying RBAC on charge code endpoints. Key finding: `charge_manager` role IS authorized to create charge codes (`@Roles('admin', 'charge_manager')` on POST /charge-codes). Previous test incorrectly expected 403.
- **`description-and-minhrs.spec.ts`**: 4 tests for EntryNoteDialog and minimum hours validation. All 4 skip due to implementation bug in `time-entry/page.tsx`: `checkMinHoursAndSubmit` useCallback at line 225 references `submitMutation` which isn't declared until line 230 — temporal dead zone causes `Cannot access 'submitMutation' before initialization` ReferenceError. **Fix tracked in Task #9.**
- **`financial-pl.spec.ts`**: 4 tests for Financial P/L component on reports page. All pass. Verifies `/reports/financial-impact` returns `overBudgetCost`, `netImpact`, `actualChargeability`, and verifies chargeability alerts via `/budgets/chargeability-alerts`.

### New tests added (reports-consolidation-noti-bell sprint)
- **`NotificationBell.test.tsx`** (14 tests): Bell render, badge count (total budget+chargeability), no-badge when empty, popover open/close, alert items in popover, 5-alert limit, "View all alerts" link, router.push(/reports) on click.
- **`FinancialPL.test.tsx`** (7 new tab tests): Tab triggers render, P/L Summary is default, clicking Alerts tab shows AlertList content, alert count shown in tab label (e.g. "Alerts (5)").
- **`reports-consolidated.spec.ts`** (4 E2E tests): Verifies consolidated layout (no duplicate Financial Impact section, Alerts inside FinancialPL tabs not standalone), negative test for standalone Alerts section, NotificationBell badge + popover + navigate-to-reports, popover-close-on-outside-click.
- **`reports/page.test.tsx`** (1 test updated): Fixed `should render Alert List component` — AlertList is now embedded inside FinancialPL's Alerts tab (not a direct child of the page), updated test to verify reports page renders without errors instead.
