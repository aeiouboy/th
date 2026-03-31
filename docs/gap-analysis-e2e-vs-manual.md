# Gap Analysis: E2E Tests vs Business Functional (BF) Specs

> Generated: 2026-03-31 | E2E Specs: 33 files | BF Test Cases: 10 | Screenshots: 264+

---

## Coverage Matrix

| Test File | Feature Tested | Key Assertions | User Flows | Screenshot Evidence | Suspected Gaps |
|---|---|---|---|---|---|
| `login.spec.ts` | Login Module — auth, validation, redirect | Login redirect works; invalid credentials show error; empty fields show validation | Single user login | `e2e-login-01-*`, `e2e-login-02-*`, `e2e-login-03-*` (3 screenshots) | **No BF spec** — login has no BF-LG-* test case ID |
| `dashboard.spec.ts` | Dashboard Module — KPIs, greeting, navigation | Greeting visible (Good morning/afternoon/evening); KPI cards visible (Hours, Chargeability, Active codes) | Employee views dashboard | `e2e-dash-01-*`, `e2e-dash-02-*`, `dashboard--desktop.png`, `dashboard-sidebar--desktop.png` | **No BF spec** — dashboard display not covered by BF tests |
| `dashboard-cr1.spec.ts` | Dashboard CR-01/02/03 — Chargeability YTD trend, Program Distribution, real backend KPIs | API 200 for `/dashboard/chargeability-ytd`; months array exists; ytdChargeability property; Trend chart visible; Distribution chart visible | Employee views KPI charts | `e2e-dash-02-*`, `e2e-dash-03-*` | **No BF spec** — CR enhancements not in BF suite |
| `time-entry.spec.ts` | Time Entry Module — grid, period selector, navigation | Page loads; period dropdown opens; week navigation works; charge code selector | Employee enters time | `e2e-te-01-*` through `e2e-te-06-*`, `time-entry--desktop.png` | Partially covered by **BF-TE-01 to BF-TE-05** |
| `time-entry-cr1.spec.ts` | Time Entry CR-04/05/06/07 — copy previous, add request, navigation | Copy from Previous button works; Request button visible; form opens; week navigation prev/next | Employee uses CR features | `e2e-cr05-*`, `e2e-cr07-*`, `e2e-te-05-*` | CR-04 (description) covered by `description-and-minhrs.spec.ts`. **No BF spec** for CR features |
| `bf-time-entry.spec.ts` | BF Time Entry — BF-TE-01 to BF-TE-05 | Save draft 8hr; OT >8hr shows variance; <8hr submit warning; submitted = read-only; copy from previous | Employee time entry lifecycle | `bf-te-01-*` through `bf-te-05-*` (15+ screenshots) | **Full BF coverage** — maps to BF-TE-01 through BF-TE-05 |
| `description-and-minhrs.spec.ts` | E2E-DESC: Entry Description Modal + Minimum Hours | Description dialog opens/closes; note persists after reload; cancel preserves original; min hours warning shown; empty draft saved | Employee adds notes, handles min-hours | `e2e-desc-01-*`, `e2e-desc-02-*`, `e2e-min-01-*`, `e2e-min-02-*` (16+ screenshots) | **No BF spec** — description and min-hours validation not in BF suite |
| `approvals.spec.ts` | Approvals Module — search, list, approve action | Pending list visible; search works; approve button works; clear search; empty state | Manager approves timesheets | `e2e-ap-01-*`, `e2e-ap-02-*`, `e2e-ap-03-*`, `approvals--desktop.png` | Partially covered by **BF-AP-01, BF-AP-02** |
| `approvals-cr1.spec.ts` | Approvals CR-12 — employee search in approvals | Search by employee name (Wichai); results filter correctly; clear search restores full list | Manager searches pending approvals | `e2e-cr12-*`, `approvals-search--desktop.png` | **No BF spec** — search feature not in BF suite |
| `approvals-cr1-filter.spec.ts` | Approvals CR-1: Multi-Select Program Filter | Program filter dropdown; multi-select active; filter cleared; API verified with filter params | Manager filters by program | `e2e-ap-filter-01-*`, `e2e-ap-filter-02-*`, `approvals-cr1--desktop.png` | **No BF spec** — filter enhancement not in BF suite |
| `bf-approval-workflow.spec.ts` | BF Approval Workflow — BF-AP-01 to BF-AP-03 | Full cycle: draft→submitted→approved→locked; reject with reason; employee RBAC (no Approvals menu) | Multi-user: employee submit → manager approve/reject | `bf-ap-01-*` through `bf-ap-03-*` (12+ screenshots) | **Full BF coverage** — maps to BF-AP-01, BF-AP-02, BF-AP-03 |
| `workflow-approval.spec.ts` | Workflow Approval Tests (serial) — multi-step approval | Employee submits; manager sees pending; manager approves; CC owner approves; employee locked; reject + re-submit; budget impact; reports update | 3-role workflow: employee→manager→CC owner | `e2e-wf-01-*` through `e2e-wf-10-*` (20+ screenshots) | Overlaps **BF-AP-01/02** but broader scope. Budget/report impact steps have **no BF spec** |
| `charge-codes.spec.ts` | Charge Codes Module (serial) — CRUD, validation, search | Create charge code (dialog, form); create sub-code; validation prevents empty submit; edit existing; search filter | Admin manages charge codes | `e2e-cc-01-*` through `e2e-cc-05-*`, `charge-codes--desktop.png` | Partially covered by **BF-CC-01, BF-CC-02** |
| `charge-codes-cr1.spec.ts` | Charge Codes CR-08/09/10/11 — tree view, cascade, budget detail | Tree hierarchy rendered; node click shows detail; search filters tree; cascade selection works; budget detail panel | Admin navigates charge code tree | `e2e-cc-tree-*`, `e2e-cc-cascade-*`, `e2e-cc-bud-*` | **No BF spec** — tree view / cascade / budget detail not in BF suite |
| `bf-charge-codes.spec.ts` | BF Charge Codes — BF-CC-01, BF-CC-02 | Employee sees assigned codes in dropdown; admin creates new code; validation error on missing parent | Employee + admin charge code operations | `bf-cc-01-*`, `bf-cc-02-*` (6 screenshots) | **Full BF coverage** — maps to BF-CC-01, BF-CC-02 |
| `cc-access-control.spec.ts` | E2E-ACC: Charge Code Access Control | Time entry loads; CC selector opens; charge manager created; employee blocked; admin tree loaded; financial impact accessible; structure ok | Multi-role access verification | `e2e-acc-01-*` through `e2e-acc-06-*` | **No BF spec** — access control matrix not in BF suite |
| `budget.spec.ts` | Budget Module — data, alerts | Budget data loaded; alerts section visible | Admin/PMO views budget | `e2e-bud-01-*`, `e2e-bud-02-*`, `budget--desktop.png` | **No BF spec** — budget module not in BF suite |
| `budget-cr1.spec.ts` | Budget CR-16/17 — filtered API, team breakdown | Filtered API verified; page loads; team breakdown table; team API verified | Admin filters budget data | `e2e-bud-cr16-*`, `e2e-bud-cr17-*`, `budget-cr16--desktop.png`, `budget-cr17--desktop.png` | **No BF spec** |
| `reports.spec.ts` | Reports Module — charts, data, export | Page loads; report data loaded; charts visible; sections visible | PMO/Admin views reports | `e2e-rpt-01-*`, `reports--desktop.png` | **No BF spec** — reporting not in BF suite |
| `reports-cr1.spec.ts` | Reports CR-13/14/15 — export, cost center, by-person | Export button works; cost center tab active; API verified; by-person tab active | PMO exports and drills into reports | `e2e-rpt-02-*`, `e2e-rpt-03-*`, `reports-by-person--desktop.png` | **No BF spec** |
| `reports-consolidated.spec.ts` | E2E-RPT-CON: Consolidated Reports Layout | Consolidated layout visible; alerts tab active; P&L tab active | PMO views consolidated report | `e2e-rpt-con-01-*` | **No BF spec** |
| `financial-pl.spec.ts` | E2E-PL: Financial P/L Report | P&L stat cards; team table; chargeability tab; alerts; admin can view; period filter | PMO/Admin views financial P&L | `e2e-pl-01-*` through `e2e-pl-04-*` | **No BF spec** — financial reporting not in BF suite |
| `rbac.spec.ts` | RBAC Tests — role-based sidebar & access | Employee sidebar (limited); admin sidebar (full); charge manager sidebar + create dialog; PMO reports page; admin access blocked for non-admin | Multi-role sidebar verification | `e2e-rbac-01-*` through `e2e-rbac-05-*` | Partially overlaps **BF-AP-03** (employee RBAC). Broader RBAC matrix has **no BF spec** |
| `role-workflow.spec.ts` | Role Access — employee, finance, PMO sidebar + multi-step workflow | Employee sidebar; finance sidebar; PMO sidebar; Wichai submits; Nattaya approves; status check | 5-role verification + workflow | `e2e-role-*` (9+ screenshots) | Partially overlaps **BF-AP-01**. Per-role sidebar checks have **no BF spec** |
| `admin-calendar.spec.ts` | Admin Calendar Module (serial) — holiday CRUD, year navigation | Holiday dialog opens; holiday created (API 200); year navigation; holiday deleted; country selector visible | Admin manages holidays | `e2e-cal-01-*` through `e2e-cal-03-*`, `admin-calendar--desktop.png` | **No BF spec** — admin calendar not in BF suite |
| `admin-rates.spec.ts` | Admin Rates Module (serial) — rate management | Rates table loaded; add rate dialog; rate created | Admin manages billing rates | `e2e-rate-01-*`, `e2e-rate-02-*`, `admin-rates--desktop.png` | **No BF spec** |
| `admin-users.spec.ts` | Admin Users Module — user list, role edit | User list loaded; edit dialog opens; role dropdown available | Admin manages users | `e2e-usr-01-*`, `e2e-usr-02-*`, `admin-users--desktop.png` | **No BF spec** |
| `profile-avatar.spec.ts` | Profile Avatar Upload — upload, edit, URL validation | File input present; upload area visible; edit form; cancel preserves state; invalid URL rejected; valid URL accepted | Employee manages avatar | `e2e-avatar-01-*` through `e2e-avatar-03-*`, `profile--desktop.png` | **No BF spec** |
| `notification-system.spec.ts` | E2E-AC10: Owner Authorization + Notification System | Forbidden response verified; notification center loaded; notifications triggered; mark read; mark all read; API verified | Multi-role notification lifecycle | `e2e-ac10-*`, `e2e-notif-01-*`, `e2e-notif-02-*`, `e2e-bell-*` | **No BF spec** — notification system not in BF suite |
| `ai-chatbox.spec.ts` | AI ChatBox — Time Entry | Page loaded; chat button visible; panel opens with welcome; message sent; bot response received; API charge-codes 200 | Employee interacts with AI chat | `tc-621-*` (6 screenshots), `time-entry-chat--desktop.png` | **No BF spec** — AI chatbox not in BF suite |
| `system-cr1.spec.ts` | System CR-18/19/20/21 + BUG-01/02/03 | Logo verified; page loaded; avatar initials; admin users loaded; no active badges | System-level checks + bug regression | `e2e-sys-01-*` through `e2e-sys-04-*`, `e2e-bug-*` | **No BF spec** |
| `reject-cases-test.spec.ts` | RC-01: Employee Submit → Manager Reject → Employee Re-edit | Employee submits; manager rejects; employee sees rejected; re-edit flow; RBAC checks (reports, admin blocked); PMO sidebar; submitted status checks | Multi-user reject + re-edit workflow | `rc-*` (27 screenshots in reject-cases/) | Partially overlaps **BF-AP-02** (rejection). Extended re-edit flow has **no BF spec** |
| `cr1-remaining.spec.ts` | CR-05/07/08/12/16 — copy previous, request form, drill down, search, multi-filter | Copy button; request form opens; drill-down expands; search by name; multi-filter select/clear | Various CR enhancement features | `e2e-cr05-*`, `e2e-cr07-*`, `e2e-cr08-*`, `e2e-cr12-*`, `e2e-cr16-*`, `budget-drill-down--desktop.png`, `budget-multi-filter--desktop.png` | **No BF spec** — all CR items lack BF test case IDs |

---

## Gap Summary

### 1. Features with E2E Coverage but No BF Spec

These features are tested by automated E2E specs but have **no corresponding Business Functional test case ID** (BF-*):

| E2E Spec File | Feature | Risk Level |
|---|---|---|
| `login.spec.ts` | Authentication — login, validation, redirect | **High** — login is critical path |
| `dashboard.spec.ts` | Dashboard KPIs, greeting | Medium |
| `dashboard-cr1.spec.ts` | Chargeability YTD trend (CR-01), Program Distribution (CR-02), Backend KPIs (CR-03) | Low |
| `description-and-minhrs.spec.ts` | Entry description modal, minimum hours validation | **High** — min-hours is a business rule |
| `approvals-cr1.spec.ts` | Employee search in approvals (CR-12) | Low |
| `approvals-cr1-filter.spec.ts` | Multi-select program filter (CR-01) | Low |
| `charge-codes-cr1.spec.ts` | Tree view, cascade selection, budget detail (CR-08/09/10/11) | Medium |
| `cc-access-control.spec.ts` | Charge code access control matrix | **High** — RBAC enforcement |
| `budget.spec.ts` | Budget data and alerts | Medium |
| `budget-cr1.spec.ts` | Budget filters and team breakdown (CR-16/17) | Low |
| `reports.spec.ts` | Reports — charts, sections, data | Medium |
| `reports-cr1.spec.ts` | Reports export, cost center, by-person (CR-13/14/15) | Medium |
| `reports-consolidated.spec.ts` | Consolidated reports layout | Low |
| `financial-pl.spec.ts` | Financial P&L report | Medium |
| `admin-calendar.spec.ts` | Holiday calendar management | Medium |
| `admin-rates.spec.ts` | Billing rate management | Medium |
| `admin-users.spec.ts` | User management | **High** — admin user ops |
| `profile-avatar.spec.ts` | Avatar upload and profile edit | Low |
| `notification-system.spec.ts` | Notification bell, mark-read, authorization | Medium |
| `ai-chatbox.spec.ts` | AI chatbox in time entry | Low |
| `system-cr1.spec.ts` | System checks + bug regression (CR-18-21, BUG-01-03) | Low |
| `cr1-remaining.spec.ts` | CR-05/07/08/12/16 composite | Low |
| `workflow-approval.spec.ts` | Extended workflow (budget impact, report updates) — beyond BF-AP scope | Medium |
| `role-workflow.spec.ts` | 5-role sidebar verification + workflow | Medium |
| `rbac.spec.ts` | Full RBAC matrix (5 roles) | **High** — only BF-AP-03 covers employee RBAC |

**Total: 25 E2E spec files** have features with no BF test case counterpart.

### 2. BF Spec IDs with No Standalone E2E Counterpart

All 10 BF test case IDs **do have** E2E coverage via dedicated `bf-*.spec.ts` files:

| BF ID | Description | E2E File | Status |
|---|---|---|---|
| BF-TE-01 | Save Draft 8hr normal entry | `bf-time-entry.spec.ts` | Covered |
| BF-TE-02 | OT >8hr shows Variance | `bf-time-entry.spec.ts` | Covered |
| BF-TE-03 | Submit <8hr triggers validation | `bf-time-entry.spec.ts` | Covered |
| BF-TE-04 | Submitted fields read-only | `bf-time-entry.spec.ts` | Covered |
| BF-TE-05 | Copy from Previous Week | `bf-time-entry.spec.ts` | Covered |
| BF-AP-01 | Full approval cycle | `bf-approval-workflow.spec.ts` | Covered |
| BF-AP-02 | Reject with reason | `bf-approval-workflow.spec.ts` | Covered |
| BF-AP-03 | Employee RBAC — no Approvals menu | `bf-approval-workflow.spec.ts` | Covered |
| BF-CC-01 | Employee assigned charge codes | `bf-charge-codes.spec.ts` | Covered |
| BF-CC-02 | Admin create charge code + validation | `bf-charge-codes.spec.ts` | Covered |

**No orphaned BF IDs** — all have E2E automation. However, the BF suite is narrow (3 modules, 10 cases) and does not cover:
- Login/Authentication
- Dashboard
- Budget
- Reports / Financial P&L
- Admin modules (calendar, rates, users)
- Notifications
- RBAC beyond employee role
- AI Chatbox

### 3. Features with No Screenshots

| Feature | E2E File | Screenshot Gap |
|---|---|---|
| *None critical* | — | All 33 E2E spec files have matching screenshot evidence |

**All E2E tests have at least partial screenshot coverage.** The naming convention (`e2e-{module}-{seq}-{step}--desktop.png` and `bf-{module}-{seq}-{step}--desktop.png`) provides traceability.

Notable screenshot-only artifacts with no dedicated E2E spec:
- `charge-codes-budget--desktop.png` — may be from manual testing
- `time-entry-vacation--desktop.png` — vacation flow not covered by any spec
- `time-entry-copy--desktop.png` — generic copy screenshot (likely from manual BF-TE-05 run)
- `time-entry-validation--desktop.png` — generic validation screenshot

### 4. Key Observations

| Observation | Impact |
|---|---|
| **BF suite covers only 3 of 12+ modules** | High — login, dashboard, budget, reports, admin, notifications all lack formal BF acceptance criteria |
| **E2E suite is comprehensive (33 specs)** | Automated coverage is strong, but many specs use `test.skip()` for missing DB state — actual execution may be less than 100% |
| **No mobile/responsive screenshots** | Medium — all 264 screenshots are `--desktop` viewport only |
| **Fragile selectors in E2E specs** | High — many specs use CSS class selectors instead of `data-testid`, making them brittle to UI refactors |
| **Dual-verification pattern** (UI + API) | Strength — newer specs verify both UI rendering and API responses, catching more bugs |
| **3 BF spec files implement all 10 BF test cases** | The BF-to-E2E mapping is clean (1:1), but the BF spec scope should expand to match E2E breadth |

### 5. Recommended BF Spec Additions

To close the gap, these BF test cases should be authored (prioritized by risk):

| Proposed BF ID | Module | Feature | Priority |
|---|---|---|---|
| BF-LG-01 | Login | Valid credentials → redirect to dashboard | **P0** |
| BF-LG-02 | Login | Invalid credentials → error message | **P0** |
| BF-RB-01 | RBAC | 5-role sidebar access matrix | **P0** |
| BF-AC-01 | Access Control | Charge code owner authorization | **P0** |
| BF-DH-01 | Dashboard | KPIs display correct values | P1 |
| BF-RP-01 | Reports | Utilization report data accuracy | P1 |
| BF-BD-01 | Budget | Budget data and alerts display | P1 |
| BF-MH-01 | Time Entry | Min-hours validation on submit | P1 |
| BF-NT-01 | Notifications | Notification lifecycle (trigger, read, clear) | P2 |
| BF-AU-01 | Admin Users | User CRUD operations | P2 |
| BF-AH-01 | Admin Calendar | Holiday CRUD | P2 |
| BF-AR-01 | Admin Rates | Rate management | P2 |
