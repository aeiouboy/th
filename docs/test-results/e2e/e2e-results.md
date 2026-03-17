# E2E Test Results

**Date**: 2026-03-17
**Framework**: Playwright 1.58.2
**Viewports tested**: desktop (1280x720), mobile (375x812)
**Total**: 100 tests | 100 passed | 0 failed

Each spec file runs against both desktop and mobile viewports, giving 2 test runs per spec.

---

## Summary

| File | Suite | Specs | Desktop | Mobile | Total |
|------|-------|-------|---------|--------|-------|
| `admin-calendar.spec.ts` | Admin Calendar page | 4 | PASS | PASS | 8 |
| `admin-rates.spec.ts` | Admin Rates page | 4 | PASS | PASS | 8 |
| `admin-users.spec.ts` | Admin Users page | 5 | PASS | PASS | 10 |
| `approvals.spec.ts` | Approvals page | 4 | PASS | PASS | 8 |
| `budget.spec.ts` | Budget page | 3 | PASS | PASS | 6 |
| `charge-codes.spec.ts` | Charge Codes page | 4 | PASS | PASS | 8 |
| `dashboard.spec.ts` | Dashboard page | 4 | PASS | PASS | 8 |
| `login.spec.ts` | Login page | 4 | PASS | PASS | 8 |
| `profile.spec.ts` | Profile page | 5 | PASS | PASS | 10 |
| `reports.spec.ts` | Reports page | 4 | PASS | PASS | 8 |
| `settings.spec.ts` | Settings page | 5 | PASS | PASS | 10 |
| `time-entry.spec.ts` | Time Entry page | 4 | PASS | PASS | 8 |
| **Total** | | **50 specs** | **50** | **50** | **100** |

---

## admin-calendar.spec.ts — 8 / 8 PASS

| Spec | Desktop | Mobile |
|------|---------|--------|
| renders admin calendar page with core elements | PASS | PASS |
| calendar month navigation buttons are present | PASS | PASS |
| add holiday button is present | PASS | PASS |
| holidays table or no-holidays message is shown | PASS | PASS |

Screenshots: `admin-calendar--desktop.png`, `admin-calendar--mobile.png`

---

## admin-rates.spec.ts — 8 / 8 PASS

| Spec | Desktop | Mobile |
|------|---------|--------|
| renders admin rates page with core elements | PASS | PASS |
| add rate button is present | PASS | PASS |
| rates table is rendered | PASS | PASS |
| rate card or summary is visible | PASS | PASS |

Screenshots: `admin-rates--desktop.png`, `admin-rates--mobile.png`

---

## admin-users.spec.ts — 10 / 10 PASS

| Spec | Desktop | Mobile |
|------|---------|--------|
| renders admin users page with core elements | PASS | PASS |
| search input is present | PASS | PASS |
| add user button is present | PASS | PASS |
| users table or list is rendered | PASS | PASS |
| role filter dropdown is present | PASS | PASS |

Screenshots: `admin-users--desktop.png`, `admin-users--mobile.png`

---

## approvals.spec.ts — 8 / 8 PASS

| Spec | Desktop | Mobile |
|------|---------|--------|
| renders approvals page with core elements | PASS | PASS |
| search input is visible | PASS | PASS |
| tabs for approval queues are present | PASS | PASS |
| filter dropdowns are present | PASS | PASS |

Screenshots: `approvals--desktop.png`, `approvals--mobile.png`

---

## budget.spec.ts — 6 / 6 PASS

| Spec | Desktop | Mobile |
|------|---------|--------|
| renders budget page with core elements | PASS | PASS |
| budget summary metrics are shown | PASS | PASS |
| charge code list or alerts section is visible | PASS | PASS |

Screenshots: `budget--desktop.png`, `budget--mobile.png`

---

## charge-codes.spec.ts — 8 / 8 PASS

| Spec | Desktop | Mobile |
|------|---------|--------|
| renders charge codes page with core elements | PASS | PASS |
| shows filter selects | PASS | PASS |
| search input is functional | PASS | PASS |
| charge code tree data is loaded | PASS | PASS |

Screenshots: `charge-codes--desktop.png`, `charge-codes--mobile.png`

---

## dashboard.spec.ts — 8 / 8 PASS

| Spec | Desktop | Mobile |
|------|---------|--------|
| renders dashboard with key UI elements | PASS | PASS |
| sidebar is visible on desktop | PASS | PASS |
| mobile bottom nav is visible on mobile | PASS | PASS |
| notification bell is visible in topbar | PASS | PASS |

Screenshots: `dashboard--desktop.png`, `dashboard--mobile.png`

---

## login.spec.ts — 8 / 8 PASS

| Spec | Desktop | Mobile |
|------|---------|--------|
| renders login form with correct elements | PASS | PASS |
| shows password toggle button | PASS | PASS |
| shows error when forgot password clicked without email | PASS | PASS |
| email input accepts text | PASS | PASS |

Screenshots: `login--desktop.png`, `login--mobile.png`

---

## profile.spec.ts — 10 / 10 PASS

| Spec | Desktop | Mobile |
|------|---------|--------|
| renders profile page with core elements | PASS | PASS |
| profile fields are shown | PASS | PASS |
| edit profile button is present | PASS | PASS |
| avatar or user icon is shown | PASS | PASS |
| change password section is present | PASS | PASS |

Screenshots: `profile--desktop.png`, `profile--mobile.png`

---

## reports.spec.ts — 8 / 8 PASS

| Spec | Desktop | Mobile |
|------|---------|--------|
| renders reports page with core elements | PASS | PASS |
| export buttons are present | PASS | PASS |
| period selector is present | PASS | PASS |
| report charts or summaries are rendered | PASS | PASS |

Screenshots: `reports--desktop.png`, `reports--mobile.png`

---

## settings.spec.ts — 10 / 10 PASS

| Spec | Desktop | Mobile |
|------|---------|--------|
| renders settings page with core elements | PASS | PASS |
| theme toggle is present | PASS | PASS |
| notification preferences section is visible | PASS | PASS |
| timezone selector is present | PASS | PASS |
| save settings button is present | PASS | PASS |

Screenshots: `settings--desktop.png`, `settings--mobile.png`

---

## time-entry.spec.ts — 8 / 8 PASS

| Spec | Desktop | Mobile |
|------|---------|--------|
| renders time entry page with core elements | PASS | PASS |
| week navigation buttons are present | PASS | PASS |
| timesheet grid shows rows with mock data | PASS | PASS |
| biweek toggle switches view mode | PASS | PASS |

Screenshots: `time-entry--desktop.png`, `time-entry--mobile.png`

---

## Configuration

- **Config file**: `frontend/playwright.config.ts`
- **Test directory**: `frontend/e2e/`
- **Retries**: 1 per test
- **Timeout**: 30000ms per test
- **Web server**: `pnpm dev --turbopack` at `http://localhost:3000`
- **Report output**: `docs/test-results/e2e/e2e-results.json`
- **Screenshots**: `docs/test-results/screenshots/`
