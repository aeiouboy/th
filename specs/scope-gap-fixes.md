# Plan: Timesheet Scope Gap Fixes

## Task Description
Implement missing features and tests identified by comparing the Timesheet Scope CSV requirements against the current test results and UI screenshots. The gap analysis found 7 high/medium priority items and 2 low priority items that are either not implemented, partially implemented, or missing test coverage.

Key findings from codebase exploration:
- `description` column already exists in `timesheet_entries` schema + DTO, but the UI note icon in EntryCell is a non-functional placeholder
- `costCenter` already exists in charge_codes schema AND in ChargeCodeForm — the gap analysis screenshot was from E2E test data that didn't fill it; **no code change needed, only E2E test verification**
- `getFinancialImpact()` exists in ReportsService but is cost-focused only (no P/L margin, no team-level breakdown)
- Min 8hr/day validation does NOT exist in backend submit logic
- Teams bot + notification services have full implementations but ZERO tests

## Objective
Close all gaps between the Timesheet Scope CSV requirements and the current implementation, ensuring every requirement has both working code and verified test coverage.

## Problem Statement
The Timesheet Scope CSV defines 6 core modules + 6 expected outputs + 6 advance features. While 455 tests pass (136 backend + 274 frontend + 45 E2E), the gap analysis identified:
1. **Work description** — schema exists but UI is non-functional (note icon is placeholder)
2. **Min 8hr/day enforcement** — UI shows variance but submit is not blocked
3. **Financial P/L report** — only cost impact exists, no margin/team-level P/L
4. **Low chargeability alerts** — only budget overrun alerts exist
5. **Forecast drill-down** — forecast card exists but no task-level root cause
6. **CC access control E2E** — unit tests exist but no E2E proving restricted access
7. **Teams integration tests** — full bot + notification code with zero tests

## Solution Approach
Implement in 3 phases:
1. **Foundation** — Backend changes (min 8hr validation, P/L endpoint, low chargeability alerts)
2. **UI/UX** — Frontend changes (description modal, P/L report section, alert types)
3. **Testing** — E2E tests for all new features + tests for existing untested code (Teams bot, notifications, CC access control)

## Tech Stack
- **Language**: TypeScript
- **Framework**: NestJS 11 (backend), Next.js 16 (frontend)
- **Runtime**: Node.js
- **Key APIs/Libraries**: Drizzle ORM, Supabase Auth (ES256 JWKS), TanStack Query, Recharts, shadcn/ui, Playwright
- **Build Tools**: pnpm, Vitest, Jest
- **Testing**: Jest (backend), Vitest + React Testing Library (frontend), Playwright (E2E)

## Technical Design

### Architecture
No new modules needed. All changes are additions to existing modules:

```
Backend Changes:
├── timesheets.service.ts      → Add min 8hr validation in submit()
├── reports.service.ts         → Enhance getFinancialImpact() with team P/L
├── budgets.service.ts         → Add low chargeability alert generation
└── integrations/*.ts          → No code changes, just add tests

Frontend Changes:
├── EntryCell.tsx              → Wire up note icon → description modal
├── TimesheetGrid.tsx          → Pass description callbacks
├── time-entry/page.tsx        → Handle description state + min-hrs warning
├── reports/page.tsx           → Add Financial P/L section
├── AlertList.tsx              → Support 'chargeability' alert type
└── budget/page.tsx            → Add forecast drill-down table
```

### Key Design Decisions
1. **Min 8hr validation = soft warning + backend reject** — Backend returns 400 on submit if any weekday < 8hrs (using calendar service to know holidays). Frontend shows warning dialog before submit but user can't bypass backend check.
2. **Description modal via shadcn Dialog** — Click note icon on EntryCell → opens small Dialog with textarea. Saves via existing `description` field in upsert-entries DTO. No new API endpoint needed.
3. **P/L report = enhancement to existing getFinancialImpact()** — Add team-level breakdown, margin calculation (revenue proxy from billable hours × billing rate vs cost rate), and period filtering.
4. **Low chargeability alerts = new alert type in BudgetsService** — Reuse existing AlertList component, add `type: 'chargeability'` alongside existing `type: 'budget'` alerts.
5. **Forecast drill-down = expand existing budget table rows** — Show child-level forecast breakdown when clicking a row. Data already available from budget API.

### Data Model

**No new tables needed.** Changes to existing structures:

```typescript
// Enhanced BudgetAlert interface (add chargeability alerts)
interface Alert {
  type: 'budget' | 'chargeability';  // NEW field
  chargeCodeId?: string;             // for budget alerts
  employeeId?: string;               // for chargeability alerts
  name: string;
  severity: 'red' | 'orange' | 'yellow' | 'green';
  // budget-specific
  budget?: number;
  actual?: number;
  forecast?: number | null;
  rootCauseActivity?: string | null;
  // chargeability-specific
  billableHours?: number;
  totalHours?: number;
  chargeability?: number;
  target?: number;
}

// Enhanced Financial Impact response
interface FinancialPLReport {
  period: string;
  overBudgetCost: number;
  overBudgetCount: number;
  lowChargeabilityCost: number;
  netImpact: number;
  avgCostRate: number;
  // NEW fields
  byTeam: Array<{
    department: string;
    totalHours: number;
    billableHours: number;
    chargeability: number;
    totalCost: number;
    billableRevenue: number;  // billable hrs × avg billing rate
    margin: number;           // revenue - cost
    marginPercent: number;
  }>;
  byChargeCode: Array<{
    chargeCodeId: string;
    name: string;
    budget: number;
    actual: number;
    variance: number;
    forecastOverrun: number;
  }>;
}
```

### API / Interface Contracts

**Modified Endpoints:**

```
POST /api/v1/timesheets/:id/submit
  - NEW: Returns 400 if any weekday has < 8 total hours
  - Error response: { message: "Minimum 8 hours required on weekdays", details: { date: "2026-03-17", logged: 4, required: 8 } }

GET /api/v1/reports/financial-impact?period=2026-03&team=Engineering
  - ENHANCED: Now accepts optional period + team query params
  - Returns: FinancialPLReport (see data model above)

GET /api/v1/budgets/alerts
  - ENHANCED: Now returns both budget AND chargeability alerts
  - Returns: Alert[] (unified alert type)
```

**No new endpoints needed** — description is handled by existing upsert-entries endpoint.

## UX/UI Design

### Figma / Design Reference
No external design provided — ASCII wireframes below serve as the design spec.

### Wireframes

**Entry Description Modal (triggered from note icon on EntryCell):**
```
┌─────────────────────────────────────┐
│  Note for ACT-001 · Mon Mar 16      │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ Worked on API design for order  ││
│  │ service endpoints. Completed    ││
│  │ OpenAPI spec review with team.  ││
│  │                                 ││
│  └─────────────────────────────────┘│
│                                     │
│              [Cancel]  [Save Note]  │
└─────────────────────────────────────┘
```

**Min Hours Warning (shown before submit):**
```
┌─────────────────────────────────────┐
│  ⚠ Incomplete Hours                 │
│                                     │
│  The following days have less than  │
│  8 hours logged:                    │
│                                     │
│  • Tue Mar 17: 4.00h (need 4.00h)  │
│  • Wed Mar 18: 0.00h (need 8.00h)  │
│                                     │
│  You cannot submit until all        │
│  weekdays have minimum 8 hours.     │
│                                     │
│                        [OK, Got It] │
└─────────────────────────────────────┘
```

**Financial P/L Section (added to Reports page below existing charts):**
```
┌─────────────────────────────────────────────────────────────┐
│  Financial P/L Summary                                       │
│                                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ OVER-BUDGET │ │ LOW CHARGE  │ │ NET IMPACT  │           │
│  │ COST        │ │ COST GAP    │ │             │           │
│  │ ฿120,000    │ │ ฿85,000     │ │ ฿-205,000   │           │
│  │ 2 codes     │ │ 3 employees │ │             │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                              │
│  Team P/L Breakdown                                          │
│  ┌──────────┬─────────┬──────────┬────────┬────────┬──────┐ │
│  │ Team     │ Cost    │ Billable │ Margin │ Margin%│ Chrg%│ │
│  ├──────────┼─────────┼──────────┼────────┼────────┼──────┤ │
│  │ Backend  │ ฿80,000 │ ฿95,000  │ ฿15,000│ 15.8%  │ 82%  │ │
│  │ Frontend │ ฿65,000 │ ฿58,000  │ ฿-7,000│ -12.1% │ 71%  │ │
│  └──────────┴─────────┴──────────┴────────┴────────┴──────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Low Chargeability Alert Row (in AlertList component):**
```
┌─────────────────────────────────────────────────────────────┐
│ 🔶 Ploy Rattanaporn  Chargeability: 65%  Target: 80%       │
│    Gap: 15% · Estimated cost impact: ฿12,500                │
│    ▸ Expand: ACT-006 (non-billable) consuming 35% of hours  │
└─────────────────────────────────────────────────────────────┘
```

### Visual Style
- Follow existing shadcn/ui design system (teal accent, clean cards, consistent spacing)
- Description modal: small Dialog (max-w-md), textarea with 4 rows
- P/L section: reuse existing card/table patterns from Budget page
- Alert severity colors: existing palette (red/orange/yellow/green)

### User Flow

**Description Flow:**
1. User fills hours in EntryCell → sees note icon on hover
2. Clicks note icon → Dialog opens with textarea
3. Types description → clicks "Save Note"
4. Note icon stays visible (filled state) to indicate description exists
5. Description saved via existing upsert-entries API call on next auto-save or manual save

**Submit with Min Hours:**
1. User clicks "Submit →" button
2. Frontend calculates daily totals for weekdays
3. If any weekday < 8hrs → warning dialog shown (list of incomplete days)
4. Dialog blocks submission (no bypass)
5. Backend also validates on POST submit → returns 400 if violated
6. User must add hours to reach minimum, then re-submit

## Relevant Files

### Backend — Modify
- `backend/src/timesheets/timesheets.service.ts` — Add min 8hr validation in `submit()`
- `backend/src/timesheets/timesheets.controller.ts` — May need to inject CalendarService for holiday check
- `backend/src/reports/reports.service.ts` — Enhance `getFinancialImpact()` with team breakdown + period filter
- `backend/src/reports/reports.controller.ts` — Add query params to financial-impact endpoint
- `backend/src/budgets/budgets.service.ts` — Add low chargeability alert generation to `getAlerts()`

### Frontend — Modify
- `frontend/src/components/timesheet/EntryCell.tsx` — Wire note icon to open description dialog
- `frontend/src/components/timesheet/TimesheetGrid.tsx` — Pass description state + handlers
- `frontend/src/app/(authenticated)/time-entry/page.tsx` — Description state management + min-hrs warning dialog
- `frontend/src/app/(authenticated)/reports/page.tsx` — Add P/L section with team breakdown table
- `frontend/src/components/reports/AlertList.tsx` — Support chargeability alert type
- `frontend/src/app/(authenticated)/budget/page.tsx` — Forecast drill-down expansion
- `frontend/src/lib/api.ts` — Add/update API functions for new params

### Backend — Test Only (no code changes)
- `backend/src/integrations/teams-bot.service.ts` — Write tests
- `backend/src/integrations/notification.service.ts` — Write tests

### New Files
- `frontend/src/components/timesheet/EntryNoteDialog.tsx` — Description modal component
- `frontend/src/components/reports/FinancialPL.tsx` — P/L summary + team table component
- `frontend/src/components/reports/FinancialPL.test.tsx` — Unit tests
- `frontend/src/components/timesheet/EntryNoteDialog.test.tsx` — Unit tests
- `backend/src/integrations/teams-bot.service.spec.ts` — Teams bot tests
- `backend/src/integrations/notification.service.spec.ts` — Notification tests
- `frontend/e2e/description-and-minhrs.spec.ts` — E2E for description + min hours
- `frontend/e2e/financial-pl.spec.ts` — E2E for P/L report
- `frontend/e2e/cc-access-control.spec.ts` — E2E for charge code access restriction

## Implementation Phases

### Phase 1: Backend Foundation
- Add min 8hr validation to `timesheets.service.ts` submit method
- Enhance `reports.service.ts` getFinancialImpact with team P/L breakdown
- Add chargeability alerts to `budgets.service.ts`
- Write unit tests for Teams bot + notification services (existing code, no changes)

### Phase 2: Frontend UI
- Build EntryNoteDialog component + wire into EntryCell
- Add min-hours warning dialog to time-entry page
- Build FinancialPL component + add to reports page
- Enhance AlertList to support chargeability alerts
- Add forecast drill-down to budget page

### Phase 3: E2E Testing & Validation
- E2E test: description entry flow
- E2E test: min 8hr submit rejection
- E2E test: P/L report displays team data
- E2E test: chargeability alerts visible
- E2E test: CC access control restriction
- Full regression run

## Team Orchestration

### Team Members

- Builder
  - Name: builder-backend
  - Role: Implement all backend changes (min 8hr validation, P/L endpoint enhancement, chargeability alerts)
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-frontend
  - Role: Implement all frontend changes (EntryNoteDialog, min-hrs warning, FinancialPL component, AlertList enhancement, budget drill-down)
  - Agent Type: builder
  - Resume: true

- Code Reviewer
  - Name: reviewer
  - Role: Review and fix code quality, efficiency, and reuse issues after builders complete their work
  - Agent Type: code-reviewer
  - Resume: false

- Test Writer
  - Name: tester
  - Role: Write comprehensive unit tests + E2E tests for all new and existing untested features
  - Agent Type: test-writer
  - Resume: true

- Docs Writer
  - Name: docs
  - Role: Update documentation to reflect new features and test results
  - Agent Type: docs-writer
  - Resume: false

- Validator
  - Name: validator
  - Role: Final read-only validation that all acceptance criteria are met and all tests pass
  - Agent Type: validator
  - Resume: false

## Step by Step Tasks

### 1. Backend: Min 8hr Validation + Chargeability Alerts
- **Task ID**: backend-validation-alerts
- **Depends On**: none
- **Assigned To**: builder-backend
- **Agent Type**: builder
- **Parallel**: true (can run alongside task 2)
- In `backend/src/timesheets/timesheets.service.ts` `submit()` method (around line 218):
  - Before changing status to `submitted`, query all entries for this timesheet grouped by date
  - Use CalendarService to determine which dates are weekdays (not holidays/weekends)
  - For each weekday, sum hours. If any weekday has < 8 hours, throw `BadRequestException` with details: `{ message: "Minimum 8 hours required on weekdays", details: [{ date, logged, required: 8 }] }`
  - Inject `CalendarService` into `TimesheetsService` (add to constructor + module imports)
- In `backend/src/budgets/budgets.service.ts` `getAlerts()` or new `getChargeabilityAlerts()`:
  - Query chargeability per employee (billable hours / total hours)
  - For employees below 80% target, generate alert with type `'chargeability'`
  - Include: employeeId, name, billableHours, totalHours, chargeability %, costImpact
  - Merge with existing budget alerts in response
- In `backend/src/reports/reports.service.ts` `getFinancialImpact()`:
  - Add optional `period` and `team` parameters
  - Add `byTeam` array: group employees by department, calculate cost, billable revenue (hours × billing rate from cost_rates), margin, margin%
  - Add `byChargeCode` array: list charge codes with budget vs actual vs forecast
- Update `backend/src/reports/reports.controller.ts` to pass query params
- Write backend unit tests for new validation logic (min 8hr edge cases: holidays, weekends, partial days)

### 2. Frontend: Entry Description + Min Hours Warning
- **Task ID**: frontend-description-minhrs
- **Depends On**: none
- **Assigned To**: builder-frontend
- **Agent Type**: builder
- **Parallel**: true (can run alongside task 1)
- Create `frontend/src/components/timesheet/EntryNoteDialog.tsx`:
  - shadcn Dialog component with textarea (4 rows)
  - Props: `open`, `onOpenChange`, `chargeCodeName`, `date`, `description`, `onSave`
  - On save: call parent callback with new description text
- In `frontend/src/components/timesheet/EntryCell.tsx`:
  - Wire existing note icon (lines 92-101) to set state that opens EntryNoteDialog
  - Show filled note icon (different color/style) when entry has non-empty description
  - Pass `onNoteClick(chargeCodeId, date)` callback from parent
- In `frontend/src/components/timesheet/TimesheetGrid.tsx`:
  - Add state for active note dialog (which entry)
  - Pass note click handler down to EntryCell
  - Render EntryNoteDialog component
  - On save: update entry description in local state + trigger save
- In `frontend/src/app/(authenticated)/time-entry/page.tsx`:
  - Add min-hours check before calling submit API
  - Calculate daily totals for weekdays (Mon-Fri, excluding holidays from calendar API)
  - If any weekday < 8hrs: show warning Dialog listing incomplete days
  - Dialog has only "OK, Got It" button (no bypass)
  - Keep existing submit flow for when validation passes
- Write unit tests for EntryNoteDialog component

### 3. Frontend: Financial P/L + Chargeability Alerts + Budget Drill-down
- **Task ID**: frontend-pl-alerts
- **Depends On**: backend-validation-alerts
- **Assigned To**: builder-frontend
- **Agent Type**: builder
- **Parallel**: false (needs backend endpoints ready)
- Create `frontend/src/components/reports/FinancialPL.tsx`:
  - 3 stat cards: Over-Budget Cost, Low Chargeability Cost Gap, Net Impact
  - Team P/L table with columns: Team, Cost, Billable Revenue, Margin, Margin%, Chargeability%
  - Use existing card/table patterns from budget page
  - Fetch from enhanced `/reports/financial-impact` endpoint
- In `frontend/src/app/(authenticated)/reports/page.tsx`:
  - Add FinancialPL section below existing Chargeability chart
  - Pass period/team filter values
- In `frontend/src/components/reports/AlertList.tsx`:
  - Support `type: 'chargeability'` alerts alongside existing budget alerts
  - Chargeability alerts show: employee name, current %, target %, cost gap
  - Add tab or filter toggle: "All" | "Budget" | "Chargeability"
- In `frontend/src/app/(authenticated)/budget/page.tsx`:
  - When expanding a budget row, show child-level breakdown table
  - Show which child activity/task is the root cause of overrun
  - Display forecast per child item
- Update `frontend/src/lib/api.ts` with enhanced API function signatures
- Write unit tests for FinancialPL component

### 4. Backend Tests for Existing Code (Teams Bot + Notifications)
- **Task ID**: backend-integration-tests
- **Depends On**: none
- **Assigned To**: tester
- **Agent Type**: test-writer
- **Parallel**: true (independent of build tasks)
- Create `backend/src/integrations/teams-bot.service.spec.ts`:
  - Test all 5 commands: log time, budget status, show timesheet, hours today, charge codes
  - Test regex parsing: hours extraction, charge code extraction, date parsing
  - Test edge cases: invalid format, unknown command, missing charge code
  - Test response format (message vs card)
- Create `backend/src/integrations/notification.service.spec.ts`:
  - Test all 4 notification types: timesheet_reminder, approval_reminder, manager_summary, weekly_insights
  - Test calculation logic: expected hours, chargeability %, overrun detection
  - Test edge cases: no reports, all complete, no overruns

### 5. Code Review
- **Task ID**: code-review
- **Depends On**: backend-validation-alerts, frontend-description-minhrs, frontend-pl-alerts, backend-integration-tests
- **Assigned To**: reviewer
- **Agent Type**: code-reviewer
- **Parallel**: false
- Review all files created/modified by builders for quality, efficiency, reuse, and accessibility issues
- Verify no security issues (input validation, XSS in description field)
- Check consistent error handling patterns
- Verify TypeScript types are correct and complete
- Fix all issues found directly
- Report what was fixed and what was skipped

### 6. Write Tests
- **Task ID**: write-tests
- **Depends On**: code-review
- **Assigned To**: tester
- **Agent Type**: test-writer
- **Parallel**: false
- Write additional unit tests for all new components and services
- Write E2E tests (see E2E specs below):
  - `frontend/e2e/description-and-minhrs.spec.ts` — description modal + min hours rejection
  - `frontend/e2e/financial-pl.spec.ts` — P/L report section
  - `frontend/e2e/cc-access-control.spec.ts` — CC access restriction
- Run all tests (backend + frontend + E2E) and ensure they pass
- **MANDATORY: Save test results to `docs/test-results/`** with required structure
- Update `docs/test-results/summary.md`, `test-cases.md`, `test-cases.csv`
- Capture screenshots for all E2E test steps
- Report coverage areas and results

### 7. Update Docs
- **Task ID**: update-docs
- **Depends On**: write-tests
- **Assigned To**: docs
- **Agent Type**: docs-writer
- **Parallel**: false
- Update `docs/README.md` with new features (description field, min hours, P/L report, chargeability alerts)
- Update `docs/api-reference.md` with enhanced endpoint params
- Update `docs/api-contracts.md` with new response shapes
- Update `docs/architecture.md` if data flow changed
- Update `docs/troubleshooting.md` with new common issues (min hours rejection, etc.)
- Verify every internal link resolves to an existing file
- Report the documentation created or modified

### 8. Validate Final Output
- **Task ID**: validate-all
- **Depends On**: code-review, write-tests, update-docs
- **Assigned To**: validator
- **Agent Type**: validator
- **Parallel**: false
- Run all backend tests: `cd backend && pnpm test`
- Run all frontend unit tests: `cd frontend && pnpm test`
- Run E2E tests: `cd frontend && npx playwright test`
- Verify acceptance criteria met (see below)
- Verify all documentation links resolve
- Start dev servers and confirm key endpoints return valid responses
- Check screenshot evidence exists for all E2E snap points
- Report pass/fail status for each criterion

### 9. Heal Failures (if any)
- **Task ID**: heal
- **Depends On**: validate-all
- **Assigned To**: team-lead (you)
- **Parallel**: false
- **Max Retries**: 2
- Only run this step if step 8 (validate-all) has failures
- Run: `python3 .claude/skills/validate/validate.py --json scope-gap-fixes`
- Parse JSON output and route failures to correct agent
- After fixes, re-run validation
- If all checks pass after healing, mark plan complete

## Pipeline

```
Build Backend (task 1) ──────────┐
Build Frontend UI (task 2) ──────┤
                                 ├─→ Build Frontend P/L (task 3) ──┐
Bot/Notification Tests (task 4) ─┤                                  │
                                 └──→ Code Review (5) → Write Tests (6) → Update Docs (7) → Validate (8) → Heal (9)
```

## Acceptance Criteria

### Feature Criteria

- [ ] EntryCell note icon opens a description dialog with textarea; saving persists the description via existing upsert-entries API
      Verified by: UNIT-NOTE-01 (dialog renders), UNIT-NOTE-02 (save callback), E2E-DESC-01

- [ ] Entries with descriptions show a filled/highlighted note icon to indicate description exists
      Verified by: UNIT-NOTE-03 (filled icon state), E2E-DESC-01 (snap: after-add-note)

- [ ] Backend rejects timesheet submission when any weekday has < 8 total hours logged (returns 400 with details)
      Verified by: UNIT-MIN-01 (below 8hr rejected), UNIT-MIN-02 (holiday excluded), UNIT-MIN-03 (exactly 8hr passes), E2E-MIN-01

- [ ] Frontend shows warning dialog listing incomplete days when user attempts to submit with < 8hrs on weekdays
      Verified by: UNIT-MIN-04 (warning dialog renders), E2E-MIN-01 (snap: min-hrs-warning)

- [ ] Reports page displays Financial P/L section with over-budget cost, low chargeability cost gap, and net impact
      Verified by: UNIT-PL-01 (component renders), UNIT-PL-02 (stat cards), E2E-PL-01

- [ ] Financial P/L shows team-level breakdown table (department, cost, revenue, margin, margin%, chargeability%)
      Verified by: UNIT-PL-03 (team table rows), E2E-PL-01 (snap: pl-team-table)

- [ ] AlertList component displays chargeability alerts alongside budget alerts with severity colors
      Verified by: UNIT-ALERT-01 (chargeability type renders), UNIT-ALERT-02 (severity color), E2E-PL-02

- [ ] Budget page forecast rows expand to show child-level breakdown with root cause identification
      Verified by: UNIT-BUD-01 (expandable rows), E2E-BUD-03 (snap: forecast-drilldown)

- [ ] Users cannot charge time to charge codes they don't have access to (E2E verified)
      Verified by: E2E-ACC-01 (snap: restricted-cc-not-in-selector)

- [ ] Teams bot service handles all 5 command types correctly
      Verified by: UNIT-BOT-01~05

- [ ] Notification service generates all 4 notification types correctly
      Verified by: UNIT-NOTIF-01~04

### E2E Test Specifications

```
E2E-DESC-01: Add description to a timesheet entry
  Given: Logged in as wichai (employee), on time-entry page, draft timesheet exists
  When: Add charge code ACT-001, fill 8 hours on Monday
  Snap: e2e-desc-01-hours-filled--desktop.png — entry shows 8.00
  When: Hover over the entry cell, click note icon
  Snap: e2e-desc-01-note-dialog-open--desktop.png — description dialog visible
  When: Type "Worked on API design" in textarea, click "Save Note"
  Snap: e2e-desc-01-after-save-note--desktop.png — note icon shows filled state
  Then: Entry cell shows filled note indicator
  Then: Save draft → reload page → note icon still filled, click to verify text persists

E2E-MIN-01: Submit timesheet blocked when weekday < 8 hours
  Given: Logged in as wichai (employee), draft timesheet, Monday has 4 hours only
  When: Click "Submit →" button
  Snap: e2e-min-01-warning-dialog--desktop.png — warning dialog listing Mon as incomplete
  Then: Timesheet status remains "Draft" (not submitted)
  When: Add 4 more hours to Monday (total 8), fill remaining weekdays to 8
  When: Click "Submit →" again
  Snap: e2e-min-01-after-submit--desktop.png — status changes to "Submitted"
  Then: Status is "Submitted"
  Negative: Try submitting with 0 hours on Wednesday
  Snap: e2e-min-01-negative-zero-hrs--desktop.png — warning shows Wed as incomplete

E2E-PL-01: Financial P/L section displays on reports page
  Given: Logged in as tachongrak (admin), some approved timesheets exist with costs
  When: Navigate to Reports page
  Snap: e2e-pl-01-reports-loaded--desktop.png — reports page with filters
  When: Scroll to Financial P/L section
  Snap: e2e-pl-01-pl-section--desktop.png — P/L stat cards visible (over-budget, chargeability gap, net impact)
  Then: At least one stat card shows a non-zero value
  Then: Team P/L table has at least one row with department name
  Snap: e2e-pl-01-pl-team-table--desktop.png — team breakdown table visible

E2E-PL-02: Chargeability alerts visible in reports
  Given: Logged in as tachongrak (admin), at least one employee below 80% chargeability
  When: Navigate to Reports page, scroll to alerts section
  Snap: e2e-pl-02-alerts-section--desktop.png — alerts visible
  Then: At least one alert with type "chargeability" is shown
  Then: Alert shows employee name, current %, target 80%

E2E-BUD-03: Budget forecast drill-down shows child breakdown
  Given: Logged in as tachongrak (admin), budget data exists
  When: Navigate to Budget page
  Snap: e2e-bud-03-budget-loaded--desktop.png — budget table visible
  When: Click on a program row to expand
  Snap: e2e-bud-03-drilldown-expanded--desktop.png — child items visible with individual forecasts
  Then: Child rows show charge code name, budget, actual, forecast
  Negative: Program with no children shows "No child items" message

E2E-ACC-01: Charge code access control prevents unauthorized charging
  Given: Logged in as ploy (employee), assigned to ACT-005~007 only
  When: Navigate to time-entry page
  When: Open charge code selector dropdown
  Snap: e2e-acc-01-cc-selector--desktop.png — only assigned codes visible
  Then: ACT-001 (Wichai's code) is NOT in the dropdown
  Then: ACT-005, ACT-006, ACT-007 ARE in the dropdown
  Negative: Ploy cannot see or select ACT-001~004
  Snap: e2e-acc-01-restricted-cc-not-in-selector--desktop.png — confirms restricted codes absent
```

### Infrastructure Criteria
- All external service connections verified with real queries/requests
- No placeholder values remain in .env files
- Auth endpoint returns valid JWKS/keys
- Database accepts queries via configured connection string

### Quality Criteria
- Code review passes with no remaining quality issues
- All unit tests pass (mocked dependencies)
- All E2E tests pass against real running servers
- Every feature criterion has at least 1 test ID in its `Verified by:` line
- Description field properly escapes HTML to prevent XSS

### Documentation Criteria
- All documentation files referenced in indexes/READMEs actually exist
- `docs/env-setup.md` exists with environment variable descriptions
- `docs/architecture.md` exists with Mermaid data flow diagram
- `docs/troubleshooting.md` exists with at least one documented issue and fix
- `docs/api-reference.md` updated with enhanced financial-impact endpoint
- `docs/api-contracts.md` updated with new response shapes

### Runtime Criteria
- All routes return HTTP 200 at runtime
- At least one authenticated API call returns real data
- Auth flow works end-to-end
- Test case CSV saved to `docs/test-results/test-cases.csv`
- Test case markdown saved to `docs/test-results/test-cases.md`
- Test results summary saved to `docs/test-results/summary.md`
- Unit test JSON saved to `docs/test-results/unit/unit-results.json`
- Unit test report saved to `docs/test-results/unit/unit-results.md`
- E2E results saved to `docs/test-results/e2e/e2e-results.json` and `e2e-results.md`
- Screenshots saved to `docs/test-results/screenshots/` using kebab-case naming

## Validation Commands

```bash
# Backend tests
cd backend && pnpm test 2>&1 | tail -20

# Frontend unit tests
cd frontend && pnpm test 2>&1 | tail -20

# E2E tests
cd frontend && npx playwright test 2>&1 | tail -30

# Verify test result files exist
test -f docs/test-results/test-cases.csv && echo "PASS: test-cases.csv" || echo "FAIL: test-cases.csv missing"
test -f docs/test-results/test-cases.md && echo "PASS: test-cases.md" || echo "FAIL: test-cases.md missing"
test -f docs/test-results/summary.md && echo "PASS: summary.md" || echo "FAIL: summary.md missing"
test -f docs/test-results/unit/unit-results.json && echo "PASS: unit-results.json" || echo "FAIL: unit-results.json missing"
test -f docs/test-results/unit/unit-results.md && echo "PASS: unit-results.md" || echo "FAIL: unit-results.md missing"
test -f docs/test-results/e2e/e2e-results.json && echo "PASS: e2e-results.json" || echo "FAIL: e2e-results.json missing"
test -f docs/test-results/e2e/e2e-results.md && echo "PASS: e2e-results.md" || echo "FAIL: e2e-results.md missing"

# Verify screenshots exist with correct naming
ls docs/test-results/screenshots/e2e-desc-*.png 2>/dev/null | wc -l | xargs -I{} test {} -ge 3 && echo "PASS: description screenshots" || echo "FAIL: missing description screenshots"
ls docs/test-results/screenshots/e2e-min-*.png 2>/dev/null | wc -l | xargs -I{} test {} -ge 2 && echo "PASS: min-hrs screenshots" || echo "FAIL: missing min-hrs screenshots"
ls docs/test-results/screenshots/e2e-pl-*.png 2>/dev/null | wc -l | xargs -I{} test {} -ge 3 && echo "PASS: P/L screenshots" || echo "FAIL: missing P/L screenshots"
ls docs/test-results/screenshots/e2e-acc-*.png 2>/dev/null | wc -l | xargs -I{} test {} -ge 2 && echo "PASS: access control screenshots" || echo "FAIL: missing access screenshots"

# Verify docs exist
test -f docs/env-setup.md && echo "PASS: env-setup" || echo "FAIL: missing env-setup"
test -f docs/architecture.md && echo "PASS: architecture" || echo "FAIL: missing architecture"
grep -q 'mermaid' docs/architecture.md && echo "PASS: mermaid diagram" || echo "FAIL: no mermaid"
test -f docs/troubleshooting.md && echo "PASS: troubleshooting" || echo "FAIL: missing troubleshooting"

# Verify doc links resolve
grep -oP '\[.*?\]\(((?!http)[^)]+)\)' docs/README.md | grep -oP '\(([^)]+)\)' | tr -d '()' | while read f; do test -f "docs/$f" && echo "PASS: $f" || echo "FAIL: broken link $f"; done

# Runtime check (start backend, curl, stop)
cd backend && timeout 15 pnpm start:dev &
sleep 8
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/v1/health | grep -q 200 && echo "PASS: backend health" || echo "FAIL: backend not running"
kill %1 2>/dev/null
```

## Healing Rules

- `compile error` → builder — Fix syntax or import errors in the failing file
- `BadRequestException` → builder — Fix validation logic or DTO validation
- `Cannot find module` → builder — Fix missing imports or module registration
- `test.*fail` → test-writer — Fix failing tests or update test expectations
- `playwright` → test-writer — Fix E2E test selectors or timing issues
- `screenshot` → test-writer — Capture missing screenshots
- `test-cases` → test-writer — Generate missing test case catalog
- `summary.md` → test-writer — Generate missing test summary
- `unit-results` → test-writer — Re-run tests with JSON output
- `code review` → code-reviewer — Re-review and fix remaining issues
- `broken link` → docs-writer — Create missing documentation files
- `missing env-setup` → docs-writer — Create docs/env-setup.md
- `missing architecture` → docs-writer — Create docs/architecture.md
- `missing troubleshooting` → docs-writer — Create docs/troubleshooting.md
- `infra verify` → builder — Fix infrastructure connection issues
- `runtime` → builder — Fix runtime errors
- `E2E smoke` → test-writer — Fix E2E smoke test or underlying issue
- `XSS` → code-reviewer — Sanitize user input in description field

## Notes

- **No new npm packages needed** — all features use existing shadcn/ui, Recharts, and NestJS patterns
- **Cost Center field already exists** in charge code form (ChargeCodeForm.tsx line with `costCenter` input). The gap analysis false-positive was due to E2E test data not filling it. Only need E2E test to verify it works.
- **Description column already exists** in DB schema and DTO. No migration needed — only UI wiring.
- **getFinancialImpact() already exists** — enhance it, don't create a separate endpoint.
- **Calendar service already handles holidays** — inject it into TimesheetsService for min-hours validation.
- The Teams bot service is fully implemented with 5 commands and regex parsing — just needs test coverage.
- Notification service has 4 notification types with calculation logic — just needs test coverage.
- **Billing rate** for P/L margin calculation: use cost_rates table hourly_rate as proxy if no separate billing rate exists. The margin calculation should note this assumption.
