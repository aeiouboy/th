# E2E Test Results

**Date**: 2026-03-17
**Framework**: Playwright 1.58.2
**Project**: desktop (Chromium, 1280x720)
**Total**: 29 tests | 28 passed | 1 failed

## Summary by File

| File | Total | Pass | Fail |
|---|---|---|---|
| `auth.setup.ts` | 1 | 1 | 0 |
| `admin-calendar.spec.ts` | 3 | 3 | 0 |
| `admin-rates.spec.ts` | 2 | 2 | 0 |
| `admin-users.spec.ts` | 2 | 2 | 0 |
| `approvals.spec.ts` | 3 | 3 | 0 |
| `budget.spec.ts` | 2 | 2 | 0 |
| `charge-codes.spec.ts` | 5 | 4 | 1 |
| `dashboard.spec.ts` | 2 | 2 | 0 |
| `login.spec.ts` | 3 | 3 | 0 |
| `reports.spec.ts` | 2 | 2 | 0 |
| `time-entry.spec.ts` | 4 | 4 | 0 |

## Test Results by Suite

### auth.setup.ts

| Test | Status | Notes |
|---|---|---|
| authenticate | pass |  |

### admin-calendar.spec.ts

| Test | Status | Notes |
|---|---|---|
| E2E-CAL-01: Create a holiday | pass |  |
| E2E-CAL-02: Delete a holiday | pass |  |
| E2E-CAL-03: Calendar displays year and navigation | pass |  |

### admin-rates.spec.ts

| Test | Status | Notes |
|---|---|---|
| E2E-RATE-01: Rates table loads with real data | pass |  |
| E2E-RATE-02: Add a new cost rate | pass |  |

### admin-users.spec.ts

| Test | Status | Notes |
|---|---|---|
| E2E-USR-01: Users list loads with real data | pass |  |
| E2E-USR-02: Update user role (verify role display) | pass |  |

### approvals.spec.ts

| Test | Status | Notes |
|---|---|---|
| E2E-AP-01: Pending approvals list shows submitted timesheets | pass |  |
| E2E-AP-02: Approve a timesheet | pass |  |
| E2E-AP-03: Reject a timesheet with comment (NEGATIVE flow) | pass |  |

### budget.spec.ts

| Test | Status | Notes |
|---|---|---|
| E2E-BUD-01: Budget summary loads with real data | pass |  |
| E2E-BUD-02: Budget alerts section is visible | pass |  |

### charge-codes.spec.ts

| Test | Status | Notes |
|---|---|---|
| E2E-CC-01: Create a new program (top-level charge code) | pass |  |
| E2E-CC-02: Create a project under a program (hierarchy + parent selector) | pass |  |
| E2E-CC-03: Project without parent fails (NEGATIVE) | pass |  |
| E2E-CC-04: Edit an existing charge code | pass |  |
| E2E-CC-05: Search filters the charge code tree | FAIL | Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoCont... |

### dashboard.spec.ts

| Test | Status | Notes |
|---|---|---|
| E2E-DASH-01: Dashboard shows real KPI metrics | pass |  |
| E2E-DASH-02: Dashboard navigation works | pass |  |

### login.spec.ts

| Test | Status | Notes |
|---|---|---|
| E2E-LOGIN-01: Successful login redirects to dashboard | pass |  |
| E2E-LOGIN-02: Invalid credentials show error (NEGATIVE) | pass |  |
| E2E-LOGIN-03: Empty form shows validation | pass |  |

### reports.spec.ts

| Test | Status | Notes |
|---|---|---|
| E2E-RPT-01: Utilization report loads with real data | pass |  |
| E2E-RPT-02: Export CSV button works | pass |  |

### time-entry.spec.ts

| Test | Status | Notes |
|---|---|---|
| E2E-TS-01: Create timesheet and add entries | pass |  |
| E2E-TS-02: Submit timesheet for approval | pass |  |
| E2E-TS-03: Submit empty timesheet shows warning (NEGATIVE) | pass |  |
| E2E-TS-04: Week navigation changes the displayed period | pass |  |

## Failures

### FAIL: E2E-CC-05: Search filters the charge code tree
- **File**: `frontend/e2e/charge-codes.spec.ts`
- **Error**: Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoContainText[2m([22m[32me
- **Root Cause**: No charge codes with name containing "Digital" exist in the database
- **Action**: Test requires seed data or should use a known existing charge code name

## Configuration

- **Config**: `frontend/playwright.config.ts`
- **Test directory**: `frontend/e2e/`
- **Retries**: 1
- **Timeout**: 30000ms
- **Web server**: `http://localhost:3000`
- **Screenshots**: `docs/test-results/screenshots/`
- **Report output**: `docs/test-results/e2e/e2e-results.json`
