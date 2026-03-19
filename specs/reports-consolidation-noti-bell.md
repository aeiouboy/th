# Plan: Reports Page Consolidation + Notification Bell

## Task Description
Consolidate the Reports & Analytics page layout by removing duplicate Financial Impact sections and integrating Alerts into the FinancialPL component as a tabbed view. Wire the notification bell icon in the app layout to display real alert counts and a dropdown with recent alerts.

## Objective
Reduce the Reports page from 5 content rows to 3, eliminate duplicate financial data display, and make the Bell icon functional with real-time alert data from existing backend endpoints.

## Problem Statement
The Reports page currently has 3 overlapping sections:
1. **Row 3 right**: Inline "Financial Impact Summary" card (lines 334-346 in reports/page.tsx) showing over-budget cost, low chargeability, net P/L
2. **Row 3b**: `<FinancialPL />` component (line 350) showing the SAME stat cards + team P/L table
3. **Row 4**: Standalone `<AlertList />` section (lines 353-365) showing budget + chargeability alerts

This makes the page long, repetitive, and confusing. Additionally, the Bell icon in the top bar (layout.tsx line 281-283) is a non-functional placeholder despite having alert data available from existing API endpoints.

## Solution Approach
1. **Remove** the inline Financial Impact Summary card (row 3 right) — FinancialPL already covers this
2. **Embed AlertList into FinancialPL** as a tabbed interface: "P/L Summary" | "Alerts (N)" — eliminating the standalone Alerts section
3. **Move Activity Distribution** into the charts row (2-col → 3-col grid on large screens)
4. **Create NotificationBell component** that fetches alert counts and shows a dropdown popover with top alerts
5. **Replace the dead `<button>` Bell** in layout.tsx with the new component

## Tech Stack
- **Language**: TypeScript
- **Framework**: Next.js 16 (App Router)
- **Runtime**: Browser (React client components)
- **Key APIs/Libraries**: TanStack Query v5, shadcn/ui (Tabs, Popover, Badge), Lucide icons
- **Build Tools**: pnpm, Vitest
- **Testing**: Vitest + React Testing Library (unit), Playwright (E2E)

## Technical Design

### Architecture
No new modules or API endpoints needed. All changes are frontend-only, consuming existing backend endpoints:
- `GET /api/v1/reports/budget-alerts` — budget overrun alerts
- `GET /api/v1/budgets/chargeability-alerts` — chargeability gap alerts
- `GET /api/v1/reports/financial-impact` — P/L data

```
Layout (layout.tsx)
├── NotificationBell ← NEW (fetches alerts, shows badge + popover)
│   ├── Badge (count)
│   └── Popover
│       ├── Alert summary items (top 5)
│       └── "View all" → /reports
│
Reports Page (reports/page.tsx)
├── KPI Cards (row 1) — unchanged
├── Charts (row 2) — now 3-col: Budget, Chargeability, Activity Pie
└── FinancialPL (row 3) — ENHANCED with tabs
    ├── Tab: "P/L Summary" — stat cards + team table (existing)
    └── Tab: "Alerts (N)" — AlertList embedded here
```

### Key Design Decisions
1. **Tabs in FinancialPL, not in a wrapper** — FinancialPL already owns the financial data query. Adding alerts as a tab keeps all financial/risk info in one place. AlertList is passed as a prop or rendered internally.
2. **NotificationBell is a standalone component** — It has its own TanStack Query for alert counts (30s stale time). It's independent of the Reports page and works from any page.
3. **Badge shows total alert count** — Sum of budget alerts + chargeability alerts. Badge hidden when count is 0.
4. **Popover, not dropdown** — shadcn Popover gives more layout control for alert items than DropdownMenu. Each item shows severity dot + name + one-line detail.
5. **Activity Pie moves to charts row** — On `lg` screens, the charts row becomes 3-col. On smaller screens, it stacks naturally.

### Data Model
No new data structures. Reuses existing interfaces:
- `BudgetAlert` from AlertList
- `ChargeabilityAlert` from AlertList
- `FinancialImpactResponse` from FinancialPL

### API / Interface Contracts
No new endpoints. Existing endpoints used:
```
GET /api/v1/reports/budget-alerts → BudgetAlert[]
GET /api/v1/budgets/chargeability-alerts → ChargeabilityAlert[]
GET /api/v1/reports/financial-impact?period=&team= → FinancialImpactResponse
```

## UX/UI Design

### Figma / Design Reference
No external design provided — ASCII wireframes below serve as the design spec.

### Wireframes

**Reports Page (consolidated — 3 rows):**
```
┌──────────────────────────────────────────────────────────────┐
│ Reports & Analytics                    [Export CSV] [Export PDF] │
├──────────────────────────────────────────────────────────────┤
│ [Program ▼]  [Period ▼]  [Team ▼]                              │
├──────────────────────────────────────────────────────────────┤
│ ROW 1: KPI Cards                                               │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│ │Total     │ │Actual    │ │Utilizatn │ │Overrun   │          │
│ │Budget    │ │Spent     │ │Rate      │ │Count     │          │
│ │฿2.5M     │ │฿1.8M     │ │78%       │ │2         │          │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
├──────────────────────────────────────────────────────────────┤
│ ROW 2: Charts (3-col on lg)                                    │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│ │ Budget vs    │ │ Chargeability│ │ Activity     │           │
│ │ Actual       │ │ by Team      │ │ Distribution │           │
│ │ [bar chart]  │ │ [gauge]      │ │ [pie chart]  │           │
│ └──────────────┘ └──────────────┘ └──────────────┘           │
├──────────────────────────────────────────────────────────────┤
│ ROW 3: Financial P/L (tabbed)                                  │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ [P/L Summary]  [Alerts (5)]                              │  │
│ ├──────────────────────────────────────────────────────────┤  │
│ │ (when P/L Summary tab active):                           │  │
│ │ ┌──────────┐ ┌──────────┐ ┌──────────┐                  │  │
│ │ │Over-budgt│ │Low charge│ │Net P/L   │                  │  │
│ │ │฿120,000  │ │฿85,000   │ │-฿205,000 │                  │  │
│ │ └──────────┘ └──────────┘ └──────────┘                  │  │
│ │                                                          │  │
│ │ Team P/L Breakdown                                       │  │
│ │ ┌────────┬───────┬────────┬────────┬────────┬──────┐     │  │
│ │ │ Team   │ Cost  │ Rev    │ Margin │ Mrgn%  │ Chrg%│     │  │
│ │ ├────────┼───────┼────────┼────────┼────────┼──────┤     │  │
│ │ │Backend │฿80K   │฿95K    │฿15K    │ 15.8%  │ 82%  │     │  │
│ │ └────────┴───────┴────────┴────────┴────────┴──────┘     │  │
│ ├──────────────────────────────────────────────────────────┤  │
│ │ (when Alerts tab active):                                │  │
│ │ [All (7)] [Budget (4)] [Chargeability (3)]               │  │
│ │ ┌────────┬──────────┬────────┬────────┬────────┐         │  │
│ │ │Severity│ Code     │ Budget │ Actual │ Overrun│         │  │
│ │ │🔴      │ PRG-001  │ ฿500K  │ ฿620K  │ +24%   │         │  │
│ │ └────────┴──────────┴────────┴────────┴────────┘         │  │
│ └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**Notification Bell (in topbar):**
```
                                    ┌─────┐
                                    │ 🔔5 │  ← badge count
                                    └──┬──┘
                                       │
                           ┌───────────▼───────────┐
                           │ Notifications          │
                           ├───────────────────────┤
                           │ 🔴 PRG-001            │
                           │    Over budget by 24%  │
                           ├───────────────────────┤
                           │ 🟠 Ploy R.            │
                           │    Chargeability: 65%  │
                           ├───────────────────────┤
                           │ 🟡 ACT-006            │
                           │    At 85% of budget    │
                           ├───────────────────────┤
                           │  View all alerts →     │
                           └───────────────────────┘
```

### Visual Style
- Follow existing shadcn/ui design system (teal accent, stone colors, CSS variables)
- Tabs: use shadcn `Tabs` component (pill/underline style matching existing filter buttons)
- Badge: small teal/red circle on Bell icon showing count
- Popover: max-w-sm, max 5 items, severity dot + name + one-line detail
- Consistent with existing card/table patterns

### User Flow
**Reports page:**
1. User navigates to /reports → sees 3 rows (KPI, Charts, Financial P/L)
2. Financial P/L defaults to "P/L Summary" tab showing stat cards + team table
3. User clicks "Alerts (5)" tab → sees AlertList with filter buttons
4. User can toggle between tabs without losing filter state

**Notification bell:**
1. User is on ANY page → sees Bell icon with red badge "5"
2. Clicks Bell → Popover opens showing top 5 alerts sorted by severity
3. Clicks an alert item → navigates to /reports (alerts tab)
4. Clicks "View all alerts →" → navigates to /reports (alerts tab)
5. Badge shows 0 or is hidden when no alerts

## Relevant Files

### Modify
- `frontend/src/app/(authenticated)/reports/page.tsx` — Remove inline Financial Impact Summary, remove standalone Alerts section, move Activity Pie to charts row, pass alerts to FinancialPL
- `frontend/src/components/reports/FinancialPL.tsx` — Add Tabs: "P/L Summary" | "Alerts (N)", embed AlertList in Alerts tab
- `frontend/src/app/(authenticated)/layout.tsx` — Replace dead Bell button with NotificationBell component

### New Files
- `frontend/src/components/layout/NotificationBell.tsx` — Bell icon with badge + popover dropdown
- `frontend/src/components/layout/NotificationBell.test.tsx` — Unit tests

### No Changes
- `frontend/src/components/reports/AlertList.tsx` — Used as-is inside FinancialPL's Alerts tab
- `frontend/src/components/shared/StatCard.tsx` — Used as-is
- Backend endpoints — No changes needed

## Implementation Phases

### Phase 1: Reports Page Consolidation
- Remove duplicate Financial Impact Summary from reports/page.tsx
- Move Activity Pie into charts row (3-col grid)
- Remove standalone Alerts section
- Pass alert data into FinancialPL

### Phase 2: FinancialPL Tabs Enhancement
- Add shadcn Tabs to FinancialPL: "P/L Summary" | "Alerts (N)"
- P/L Summary tab = existing content (stat cards + team table)
- Alerts tab = embedded AlertList with existing filter/sort functionality

### Phase 3: Notification Bell
- Create NotificationBell component with TanStack Query for alert data
- Badge showing total count (budget + chargeability alerts)
- Popover with top 5 alerts sorted by severity
- Navigation to /reports on click

### Phase 4: Testing & Validation
- Unit tests for NotificationBell
- Update existing FinancialPL tests for tabs
- E2E test for bell interaction + reports page consolidated layout

## Team Orchestration

### Team Members

- Builder
  - Name: builder-ui
  - Role: Implement all frontend changes (reports consolidation, FinancialPL tabs, NotificationBell component)
  - Agent Type: builder
  - Resume: true

- Code Reviewer
  - Name: reviewer
  - Role: Review and fix code quality, efficiency, and reuse issues after builder completes
  - Agent Type: code-reviewer
  - Resume: false

- Test Writer
  - Name: tester
  - Role: Write unit tests + E2E tests for new/modified components
  - Agent Type: test-writer
  - Resume: true

- Docs Writer
  - Name: docs
  - Role: Update documentation to reflect layout changes
  - Agent Type: docs-writer
  - Resume: false

- Validator
  - Name: validator
  - Role: Final read-only validation that all acceptance criteria are met
  - Agent Type: validator
  - Resume: false

## Step by Step Tasks

### 1. Consolidate Reports Page + FinancialPL Tabs
- **Task ID**: consolidate-reports
- **Depends On**: none
- **Assigned To**: builder-ui
- **Agent Type**: builder
- **Parallel**: false
- Read `frontend/src/app/(authenticated)/reports/page.tsx` thoroughly
- **Remove** the inline Financial Impact Summary (lines 334-346 — the `<div>` containing `<FinancialRow>` components)
- **Move** `<ActivityPie>` from row 3 left into the charts row (row 2), making it a 3-col grid on `lg`: `grid-cols-1 lg:grid-cols-3`
- **Remove** the standalone Alerts section (lines 353-365 — the `<div>` containing `<AlertList>`)
- **Pass** `budgetAlerts` and `chargeabilityAlerts` as props to `<FinancialPL>` — add new props: `budgetAlerts`, `chargeabilityAlerts`, `loadingAlerts`
- Read `frontend/src/components/reports/FinancialPL.tsx`
- **Add shadcn Tabs** to FinancialPL wrapping the entire component content:
  - Tab "P/L Summary" — existing stat cards + team table (default active)
  - Tab "Alerts ({totalCount})" — render `<AlertList alerts={budgetAlerts} chargeabilityAlerts={chargeabilityAlerts} />`
  - Import `Tabs, TabsList, TabsTrigger, TabsContent` from `@/components/ui/tabs`
- **Update FinancialPLProps** interface to accept: `budgetAlerts?: BudgetAlert[]`, `chargeabilityAlerts?: ChargeabilityAlert[]`, `loadingAlerts?: boolean`
- **Remove** the `FinancialRow` and `SkeletonChart` helper functions from reports/page.tsx if no longer used
- Verify `pnpm build` succeeds with no errors
- Run `cd frontend && pnpm test` to check existing tests still pass

### 2. Create NotificationBell Component
- **Task ID**: notification-bell
- **Depends On**: none
- **Assigned To**: builder-ui
- **Agent Type**: builder
- **Parallel**: true (can run alongside task 1 if builder is resumed)
- Create `frontend/src/components/layout/NotificationBell.tsx`:
  - `'use client'` component
  - Use `useQuery` to fetch both `/reports/budget-alerts` and `/budgets/chargeability-alerts` with 30s staleTime
  - Calculate total count: `budgetAlerts.length + chargeabilityAlerts.length`
  - Render Bell icon from lucide-react
  - Show Badge (small red circle) with count when > 0, hidden when 0
  - On click: open shadcn `Popover` below the bell
  - Popover content:
    - Header: "Notifications"
    - List top 5 alerts sorted by severity (red first), mixing both types
    - Each item: severity dot + name + one-line detail (e.g., "Over budget by 24%" or "Chargeability: 65%")
    - Each item is a link/button that navigates to `/reports`
    - Footer: "View all alerts →" link to `/reports`
  - Close popover after navigation
- Read `frontend/src/app/(authenticated)/layout.tsx`
- **Replace** the dead `<button>` Bell (lines 281-283) with `<NotificationBell />`
- Import NotificationBell at top of layout.tsx
- Run `pnpm build` to verify

### 3. Code Review
- **Task ID**: code-review
- **Depends On**: consolidate-reports, notification-bell
- **Assigned To**: reviewer
- **Agent Type**: code-reviewer
- **Parallel**: false
- Review all modified files for quality, efficiency, and reuse
- Verify no MOCK_* constants or hardcoded placeholders
- Check TypeScript types are correct (no `any`)
- Verify shadcn Tabs import paths are correct
- Check NotificationBell doesn't cause unnecessary re-renders (queries should be independent)
- Fix all issues found directly
- Report what was fixed and what was skipped

### 4. Write Tests
- **Task ID**: write-tests
- **Depends On**: code-review
- **Assigned To**: tester
- **Agent Type**: test-writer
- **Parallel**: false
- Create `frontend/src/components/layout/NotificationBell.test.tsx`:
  - Test renders bell icon
  - Test shows badge with count when alerts exist
  - Test hides badge when no alerts
  - Test popover opens on click
  - Test popover shows alert items
  - Test "View all" link exists
- Update `frontend/src/components/reports/FinancialPL.test.tsx`:
  - Test tabs render ("P/L Summary" and "Alerts" tabs visible)
  - Test default tab is P/L Summary
  - Test clicking Alerts tab shows AlertList
  - Test alert count shown in tab label
- Write E2E test `frontend/e2e/reports-consolidated.spec.ts`:
  - E2E-RPT-CON-01: Verify consolidated layout (no duplicate financial summary)
  - E2E-BELL-01: Bell shows badge, click opens popover
- Run all tests: `cd frontend && pnpm test` and `npx playwright test e2e/reports-consolidated.spec.ts --project=desktop`
- **MANDATORY: Save test results to `docs/test-results/`**
- Update `docs/test-results/summary.md`, `test-cases.md`, `test-cases.csv`

### 5. Update Docs
- **Task ID**: update-docs
- **Depends On**: write-tests
- **Assigned To**: docs
- **Agent Type**: docs-writer
- **Parallel**: false
- Update `docs/README.md` with consolidated reports layout description
- Update `docs/architecture.md` if component tree changed
- Update `docs/troubleshooting.md` if needed
- Verify all doc links resolve

### 6. Validate Final Output
- **Task ID**: validate-all
- **Depends On**: code-review, write-tests, update-docs
- **Assigned To**: validator
- **Agent Type**: validator
- **Parallel**: false
- Run all frontend unit tests: `cd frontend && pnpm test`
- Run new E2E tests: `cd frontend && npx playwright test e2e/reports-consolidated.spec.ts --project=desktop`
- Verify test result files exist
- Start dev servers and confirm /reports page loads correctly
- Verify bell icon shows in topbar with badge
- Report pass/fail for each criterion

### 7. Heal Failures (if any)
- **Task ID**: heal
- **Depends On**: validate-all
- **Assigned To**: team-lead (you)
- **Parallel**: false
- **Max Retries**: 2
- Only run if validate-all has failures
- Route failures to correct agent per healing rules
- Re-run validation after fixes

## Pipeline

```
Consolidate Reports (task 1) ─┐
Create NotificationBell (task 2) ─┤
                                  └─→ Code Review (3) → Write Tests (4) → Update Docs (5) → Validate (6) → Heal (7)
```

## Acceptance Criteria

### Feature Criteria

- [ ] Reports page has NO duplicate Financial Impact sections (inline summary removed)
      Verified by: E2E-RPT-CON-01 (snap: consolidated-layout)

- [ ] Activity Distribution chart is in the same row as Budget and Chargeability charts (3-col on lg)
      Verified by: E2E-RPT-CON-01 (snap: charts-row-3col)

- [ ] FinancialPL component has two tabs: "P/L Summary" and "Alerts (N)"
      Verified by: UNIT-PL-TAB-01 (tabs render), UNIT-PL-TAB-02 (default tab), E2E-RPT-CON-01

- [ ] Clicking "Alerts" tab shows the AlertList with budget + chargeability alerts and filter buttons
      Verified by: UNIT-PL-TAB-03 (alerts tab click), E2E-RPT-CON-01 (snap: alerts-tab-active)

- [ ] Reports page has NO standalone Alerts section (it's now inside FinancialPL)
      Verified by: E2E-RPT-CON-01

- [ ] Bell icon in topbar shows badge with total alert count when > 0
      Verified by: UNIT-BELL-01 (badge visible), UNIT-BELL-02 (count correct), E2E-BELL-01

- [ ] Bell icon badge is hidden when alert count is 0
      Verified by: UNIT-BELL-03 (no badge when empty)

- [ ] Clicking Bell opens a popover with top 5 alerts sorted by severity
      Verified by: UNIT-BELL-04 (popover opens), UNIT-BELL-05 (items shown), E2E-BELL-01

- [ ] Each alert in popover shows severity indicator + name + detail
      Verified by: UNIT-BELL-05

- [ ] Popover has "View all alerts →" link that navigates to /reports
      Verified by: UNIT-BELL-06 (link exists)

### E2E Test Specifications

```
E2E-RPT-CON-01: Reports page shows consolidated layout
  Given: Logged in as tachongrak (admin)
  When: Navigate to /reports
  Snap: e2e-rpt-con-01-page-loaded--desktop.png — page loaded
  Then: Page has KPI cards row, Charts row (3 charts), FinancialPL section
  Then: NO duplicate "Financial Impact Summary" card exists
  Then: NO standalone "Alerts" section outside FinancialPL
  Snap: e2e-rpt-con-01-consolidated-layout--desktop.png — full page layout
  When: Scroll to FinancialPL section
  Then: "P/L Summary" tab is active by default
  Snap: e2e-rpt-con-01-pl-tab-active--desktop.png — P/L tab showing stat cards
  When: Click "Alerts" tab
  Then: AlertList is shown with filter buttons (All/Budget/Chargeability)
  Snap: e2e-rpt-con-01-alerts-tab-active--desktop.png — Alerts tab content visible
  Negative: Old standalone Alerts section heading not found outside FinancialPL

E2E-BELL-01: Notification bell shows alerts
  Given: Logged in as tachongrak (admin), alerts exist
  When: Look at topbar
  Snap: e2e-bell-01-badge-visible--desktop.png — bell icon with badge count
  Then: Bell icon has a badge showing a number > 0
  When: Click bell icon
  Snap: e2e-bell-01-popover-open--desktop.png — popover with alert items
  Then: Popover shows alert items with severity dots
  Then: "View all alerts" link is visible
  When: Click "View all alerts"
  Then: Navigates to /reports page
  Snap: e2e-bell-01-navigated-to-reports--desktop.png — landed on reports page
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

### Documentation Criteria
- All documentation files referenced in indexes/READMEs actually exist
- `docs/env-setup.md` exists with environment variable descriptions
- `docs/architecture.md` exists with Mermaid data flow diagram
- `docs/troubleshooting.md` exists with at least one documented issue and fix

### Runtime Criteria
- All routes return HTTP 200 at runtime
- At least one authenticated API call returns real data
- Auth flow works end-to-end
- Test results saved to `docs/test-results/`

## Validation Commands

```bash
# Frontend unit tests
cd frontend && pnpm test 2>&1 | tail -20

# E2E tests (new consolidated + bell)
cd frontend && npx playwright test e2e/reports-consolidated.spec.ts --project=desktop 2>&1 | tail -15

# Verify new component exists
test -f frontend/src/components/layout/NotificationBell.tsx && echo "PASS: NotificationBell" || echo "FAIL: NotificationBell missing"
test -f frontend/src/components/layout/NotificationBell.test.tsx && echo "PASS: NotificationBell tests" || echo "FAIL: tests missing"

# Verify no duplicate Financial Impact in reports page
grep -c "Financial Impact Summary" frontend/src/app/\(authenticated\)/reports/page.tsx | xargs -I{} test {} -eq 0 && echo "PASS: no duplicate" || echo "FAIL: duplicate still exists"

# Verify Tabs import in FinancialPL
grep -q "TabsList\|TabsTrigger" frontend/src/components/reports/FinancialPL.tsx && echo "PASS: tabs added" || echo "FAIL: no tabs"

# Verify NotificationBell in layout
grep -q "NotificationBell" frontend/src/app/\(authenticated\)/layout.tsx && echo "PASS: bell wired" || echo "FAIL: bell not wired"

# Verify test results
test -f docs/test-results/summary.md && echo "PASS: summary" || echo "FAIL: summary"
test -f docs/test-results/test-cases.csv && echo "PASS: test-cases.csv" || echo "FAIL: test-cases.csv"
test -f docs/test-results/test-cases.md && echo "PASS: test-cases.md" || echo "FAIL: test-cases.md"

# Verify docs
test -f docs/env-setup.md && echo "PASS: env-setup" || echo "FAIL: env-setup"
test -f docs/architecture.md && echo "PASS: architecture" || echo "FAIL: architecture"
grep -q 'mermaid' docs/architecture.md && echo "PASS: mermaid" || echo "FAIL: no mermaid"
test -f docs/troubleshooting.md && echo "PASS: troubleshooting" || echo "FAIL: troubleshooting"

# Verify screenshots
ls docs/test-results/screenshots/e2e-rpt-con-*.png 2>/dev/null | wc -l | xargs -I{} test {} -ge 3 && echo "PASS: consolidated screenshots" || echo "FAIL: missing screenshots"
ls docs/test-results/screenshots/e2e-bell-*.png 2>/dev/null | wc -l | xargs -I{} test {} -ge 2 && echo "PASS: bell screenshots" || echo "FAIL: missing bell screenshots"

# Runtime check
cd backend && timeout 15 pnpm start:dev &
sleep 8
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/v1/reports/budget-alerts | grep -q "401\|200" && echo "PASS: budget-alerts endpoint" || echo "FAIL: endpoint down"
kill %1 2>/dev/null
```

## Healing Rules

- `compile error` → builder — Fix syntax or import errors in the failing file
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
- `duplicate` → builder — Remove remaining duplicate Financial Impact section
- `NotificationBell` → builder — Fix NotificationBell component
- `runtime` → builder — Fix runtime errors

## Notes

- **No new npm packages needed** — shadcn Tabs, Popover, and Badge are already installed
- **AlertList component is NOT modified** — it's used as-is inside FinancialPL's Alerts tab
- **Bell popover data is independent** — it fetches its own alert data, not sharing with Reports page queries. This ensures the bell works from any page.
- **Tab state is local** — switching between P/L Summary and Alerts tabs doesn't affect URL or other state
- The `FinancialRow` helper function in reports/page.tsx can be deleted after removing the inline summary — verify it's not used elsewhere first
- The `SkeletonChart` function may still be needed for the Activity Pie loading state — check before deleting
