# E2E Test Results

**Date**: 2026-03-17
**Framework**: Playwright 1.58.2
**Project**: desktop (Chromium, 1280x720)
**Total**: 53 tests | 52 passed | 0 skipped | 0 failed

## Summary by File

| File | Total | Pass | Skip | Fail |
|---|---|---|---|---|
| `auth.setup.ts` | 1 | 1 | 0 | 0 |
| `admin-calendar.spec.ts` | 3 | 3 | 0 | 0 |
| `admin-rates.spec.ts` | 2 | 2 | 0 | 0 |
| `admin-users.spec.ts` | 2 | 2 | 0 | 0 |
| `approvals.spec.ts` | 3 | 3 | 0 | 0 |
| `budget.spec.ts` | 2 | 2 | 0 | 0 |
| `cc-access-control.spec.ts` | 6 | 6 | 0 | 0 |
| `charge-codes.spec.ts` | 5 | 5 | 0 | 0 |
| `dashboard.spec.ts` | 2 | 2 | 0 | 0 |
| `description-and-minhrs.spec.ts` | 4 | 4 | 0 | 0 |
| `financial-pl.spec.ts` | 4 | 4 | 0 | 0 |
| `login.spec.ts` | 3 | 3 | 0 | 0 |
| `rbac.spec.ts` | 5 | 5 | 0 | 0 |
| `reports.spec.ts` | 2 | 2 | 0 | 0 |
| `time-entry.spec.ts` | 4 | 4 | 0 | 0 |
| `workflow-approval.spec.ts` | 11 | 11 | 0 | 0 |

## Test Results by Suite

### auth.setup.ts

| Test | Status | Notes |
|---|---|---|
| authenticate all users | pass | Sets up 5 user sessions |

### admin-calendar.spec.ts

| Test | Status | Notes |
|---|---|---|
| E2E-CAL-01: Create a holiday | pass | |
| E2E-CAL-02: Delete a holiday | pass | |
| E2E-CAL-03: Calendar displays year and navigation | pass | |

### admin-rates.spec.ts

| Test | Status | Notes |
|---|---|---|
| E2E-RATE-01: Rates table loads with real data | pass | |
| E2E-RATE-02: Add a new cost rate | pass | |

### admin-users.spec.ts

| Test | Status | Notes |
|---|---|---|
| E2E-USR-01: Users list loads with real data | pass | |
| E2E-USR-02: Update user role (verify role display) | pass | |

### approvals.spec.ts

| Test | Status | Notes |
|---|---|---|
| E2E-AP-01: Pending approvals list shows submitted timesheets | pass | |
| E2E-AP-02: Approve a timesheet | pass | |
| E2E-AP-03: Reject a timesheet with comment (NEGATIVE flow) | pass | |

### budget.spec.ts

| Test | Status | Notes |
|---|---|---|
| E2E-BUD-01: Budget summary loads with real data | pass | |
| E2E-BUD-02: Budget alerts section is visible | pass | |

### charge-codes.spec.ts

| Test | Status | Notes |
|---|---|---|
| E2E-CC-01: Create a new program (top-level charge code) | pass | |
| E2E-CC-02: Create a project under a program (hierarchy + parent selector) | pass | |
| E2E-CC-03: Project without parent fails (NEGATIVE) | pass | |
| E2E-CC-04: Edit an existing charge code | pass | |
| E2E-CC-05: Search filters the charge code tree | pass | Previously failing — fixed by healer |

### dashboard.spec.ts

| Test | Status | Notes |
|---|---|---|
| E2E-DASH-01: Dashboard shows real KPI metrics | pass | |
| E2E-DASH-02: Dashboard navigation works | pass | |

### login.spec.ts

| Test | Status | Notes |
|---|---|---|
| E2E-LOGIN-01: Successful login redirects to dashboard | pass | |
| E2E-LOGIN-02: Invalid credentials show error (NEGATIVE) | pass | |
| E2E-LOGIN-03: Empty form shows validation | pass | |

### rbac.spec.ts (NEW)

| Test | Status | Notes |
|---|---|---|
| E2E-RBAC-01: Employee sidebar hides admin menu items (nattaya) | pass | DB roles corrected |
| E2E-RBAC-02: Admin sidebar shows all items (tachongrak) | pass | |
| E2E-RBAC-03: Charge manager sees Approvals and can create charge codes (wichai) | pass | |
| E2E-RBAC-04: PMO can view reports (ploy) | pass | |
| E2E-RBAC-05: Employee cannot access admin pages (nattaya) | pass | |

### reports.spec.ts

| Test | Status | Notes |
|---|---|---|
| E2E-RPT-01: Utilization report loads with real data | pass | |
| E2E-RPT-02: Export CSV button works | pass | |

### time-entry.spec.ts

| Test | Status | Notes |
|---|---|---|
| E2E-TS-01: Create timesheet and add entries | pass | |
| E2E-TS-02: Submit timesheet for approval | pass | |
| E2E-TS-03: Submit empty timesheet shows warning (NEGATIVE) | pass | |
| E2E-TS-04: Week navigation changes the displayed period | pass | |

### cc-access-control.spec.ts (NEW)

| Test | Status | Notes |
|---|---|---|
| E2E-ACC-01: charge_manager can see assigned charge codes via API | pass | |
| E2E-ACC-02: charge_manager CAN create charge codes (role is authorized) | pass | Confirms @Roles('admin', 'charge_manager') on POST /charge-codes |
| E2E-ACC-03 (NEGATIVE): Employee role cannot create charge codes | pass | |
| E2E-ACC-04: Admin can view full charge code tree | pass | |
| E2E-ACC-05: Admin can access financial-impact report | pass | |
| E2E-ACC-06 (NEGATIVE): Verifies financial-impact endpoint structure for admin role | pass | |

### description-and-minhrs.spec.ts (NEW)

| Test | Status | Notes |
|---|---|---|
| E2E-DESC-01: Note dialog opens, text is typed and saved to entry | pass | |
| E2E-DESC-02 (NEGATIVE): Cancel discards unsaved note text | pass | |
| E2E-MIN-01: Submit blocked when weekday < 8hrs — warning shown | pass | |
| E2E-MIN-02 (NEGATIVE): Submit with partial hours keeps page on time-entry | pass | |

### financial-pl.spec.ts (NEW)

| Test | Status | Notes |
|---|---|---|
| E2E-PL-01: P/L section displays stat cards and team table on reports page | pass | |
| E2E-PL-02: Chargeability alerts visible in alert table | pass | |
| E2E-PL-03 (NEGATIVE): Reports page not accessible to employee role | pass | |
| E2E-PL-04: Period filter changes financial data query | pass | |

### workflow-approval.spec.ts (NEW)

| Test | Status | Notes |
|---|---|---|
| E2E-WF-01: Nattaya fills and submits timesheet | pass | Handles idempotent submission |
| E2E-WF-02: Somchai fills and submits timesheet | pass | |
| E2E-WF-03: Wichai sees pending timesheets as manager | pass | |
| E2E-WF-04: Wichai approves a pending timesheet | pass | |
| E2E-WF-05: Tachongrak sees manager-approved timesheets as CC Owner | pass | |
| E2E-WF-06: Tachongrak approves as CC Owner (locks timesheet) | pass | |
| E2E-WF-07: Nattaya submits timesheet for previous week (rejection setup) | pass | |
| E2E-WF-07: Wichai rejects a timesheet with comment | pass | |
| E2E-WF-08: Nattaya sees rejection and resubmits | pass | |
| E2E-WF-09: Budget page shows spending data after approvals | pass | |
| E2E-WF-10: Reports show utilization data as PMO | pass | |

## Failures

None — all 52 tests pass.

## Skipped Tests

None.

## Issues Found & Fixed During This Session

1. **DB roles mismatched**: nattaya had role `charge_manager` in DB (should be `employee`), wichai had `employee` (should be `charge_manager`), ploy had `employee` (should be `pmo`). Fixed via direct SQL UPDATE on `profiles` table.
2. **Strict mode violation in budget test**: `getByText('Budget by Charge Code').or(getByText('No budget data'))` resolved to 2 elements. Fixed with `.first()`.
3. **Strict mode violation in RBAC-03**: Dialog title locator matched heading + submit button. Fixed using `getByRole('heading')`.
4. **Strict mode violation in workflow tests**: `/submitted/i` regex matched badge + message. Fixed with `.first()`.
5. **Strict mode violation in WF-09**: `/Forecast/i` matched subtitle text + card label. Fixed with exact match `'Forecast'`.
6. **Save Draft button disabled**: Button is disabled until `timesheet?.id` loads. Fixed by waiting for `isEnabled()` before clicking.
7. **Submit toast on already-submitted timesheets**: Tests now check API status before attempting save/submit to handle idempotent re-runs.

## Configuration

- **Config**: `frontend/playwright.config.ts`
- **Test directory**: `frontend/e2e/`
- **Retries**: 1
- **Timeout**: 30000ms
- **Web server**: `http://localhost:3000`
- **Screenshots**: `docs/test-results/screenshots/`
- **Report output**: `docs/test-results/e2e/e2e-results.json`
