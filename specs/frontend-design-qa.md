# Plan: Frontend Design Improvement & Comprehensive QA

## Task Description
Improve the Timesheet System frontend to match the "Precision Ledger" visual design specification, then comprehensively test every page and component to achieve 100% pass rate. This includes vitest unit/component tests for all 11 pages and 16 components, Playwright E2E tests for critical flows, and screenshots of every page at desktop and mobile viewports.

## Objective
1. **Design Alignment** -- Update the frontend to fully match the "Precision Ledger" design system (colors, typography, component treatments, motion, responsive behavior, dark mode)
2. **Complete Test Coverage** -- Every page renders without errors, every component works per acceptance criteria
3. **Visual Verification** -- Playwright screenshots of every page at desktop (1280x720) and mobile (375x667)
4. **Healing Loop** -- Fix all failures iteratively until 100% pass

## Problem Statement
The frontend has been built with basic functionality but needs design polish to match the original specification and lacks comprehensive test coverage. Currently only 3 component tests exist (TimesheetGrid, ChargeCodeTree, ApprovalQueue). No page-level render tests exist. No E2E tests exist. No screenshots have been captured.

## Current State Inventory

### Existing Pages (11)
| # | Page | Route | File |
|---|------|-------|------|
| 1 | Login | `/login` | `src/app/login/page.tsx` |
| 2 | Dashboard | `/` | `src/app/(authenticated)/page.tsx` |
| 3 | Time Entry | `/time-entry` | `src/app/(authenticated)/time-entry/page.tsx` |
| 4 | Charge Codes | `/charge-codes` | `src/app/(authenticated)/charge-codes/page.tsx` |
| 5 | Approvals | `/approvals` | `src/app/(authenticated)/approvals/page.tsx` |
| 6 | Reports | `/reports` | `src/app/(authenticated)/reports/page.tsx` |
| 7 | Budget | `/budget` | `src/app/(authenticated)/budget/page.tsx` |
| 8 | Admin Calendar | `/admin/calendar` | `src/app/(authenticated)/admin/calendar/page.tsx` |
| 9 | Admin Users | `/admin/users` | `src/app/(authenticated)/admin/users/page.tsx` |
| 10 | Admin Rates | `/admin/rates` | `src/app/(authenticated)/admin/rates/page.tsx` |
| 11 | Profile | `/profile` | `src/app/(authenticated)/profile/page.tsx` |
| 12 | Settings | `/settings` | `src/app/(authenticated)/settings/page.tsx` |

### Existing Components (16 custom + shadcn/ui)
**Timesheet**: TimesheetGrid, EntryCell, ChargeCodeSelector
**Charge Codes**: ChargeCodeTree, ChargeCodeForm, AccessManager
**Approvals**: ApprovalQueue, TimesheetReview, BulkApprovalBar
**Reports**: BudgetChart, ChargeabilityGauge, UtilizationChart, ActivityPie, AlertList
**UI (shadcn)**: avatar, badge, button, calendar, card, dialog, dropdown-menu, input, select, separator, sheet, sonner, table, tabs, tooltip

### Existing Tests (3)
- `src/components/timesheet/TimesheetGrid.test.tsx`
- `src/components/charge-codes/ChargeCodeTree.test.tsx`
- `src/components/approvals/ApprovalQueue.test.tsx`

### Testing Stack
- **Unit/Component**: vitest 4.1.0, @testing-library/react 16.3.2, @testing-library/user-event 14.6.1, jsdom 29.0.0
- **E2E**: Playwright (needs `pnpm exec playwright install`)
- **Config**: `vitest.config.ts` with jsdom, globals, `@` alias, `src/test-setup.ts`

## Solution Approach
Execute in phases: design system first (global changes), then page-by-page improvements, then comprehensive testing, then healing loop. Each builder owns a non-overlapping set of files.

## Tech Stack
- **Framework**: Next.js 16.1.6, React 19.2.3, TailwindCSS 4, shadcn/ui 4.0.8
- **Charts**: Recharts 3.8.0
- **Fonts**: Plus Jakarta Sans (headings), DM Sans (body), IBM Plex Mono (numbers/codes)
- **Testing**: vitest 4.1.0, @testing-library/react, Playwright
- **Build**: pnpm

## Design Specification: "Precision Ledger"

### Color System (CSS Variables)
```
--bg-primary:        #0F172A    (Slate 900 -- sidebar, login bg)
--bg-secondary:      #1E293B    (Slate 800 -- sidebar hover)
--bg-content:        #FAFAF9    (Stone 50  -- main content area, warm paper tone)
--bg-card:           #FFFFFF    (White     -- card surfaces)
--bg-card-hover:     #F5F5F4    (Stone 100 -- card hover state)
--text-primary:      #1C1917    (Stone 900 -- headings, primary text)
--text-secondary:    #78716C    (Stone 500 -- labels, secondary text)
--text-muted:        #A8A29E    (Stone 400 -- placeholders, timestamps)
--text-on-dark:      #F5F5F4    (Stone 100 -- sidebar text)
--accent-teal:       #0D9488    (Teal 600  -- primary action, active state, billable)
--accent-teal-light: #CCFBF1    (Teal 100  -- accent bg tint)
--accent-amber:      #D97706    (Amber 600 -- warning, non-billable, caution)
--accent-amber-light:#FEF3C7    (Amber 100 -- warning bg tint)
--accent-red:        #DC2626    (Red 600   -- danger, overrun, negative variance)
--accent-red-light:  #FEE2E2    (Red 100   -- danger bg tint)
--accent-green:      #059669    (Emerald 600 -- success, on-track, met target)
--accent-green-light:#D1FAE5    (Emerald 100 -- success bg tint)
--accent-purple:     #7C3AED    (Violet 600 -- task-level badge, special)
--border:            #E7E5E4    (Stone 200 -- card borders, dividers)
--border-focus:      #0D9488    (Teal 600  -- input focus ring)
```

### Dark Mode
- Content area: Stone 950 (#0C0A09)
- Cards: Stone 900 (#1C1917)
- Sidebar stays dark (already dark in light mode)
- Text inverts to Stone 100/200

### Typography
- **Display/Headings**: "Plus Jakarta Sans" (weight 600-700)
- **Body/UI**: "DM Sans" (weight 400-500)
- **Monospace/Numbers**: "IBM Plex Mono" (weight 400-500) -- charge codes, hours, currency, dates
- Font sizes: 12px (caption), 14px (body), 16px (subtitle), 20px (h3), 24px (h2), 30px (h1)

### Component Treatments (shadcn/ui customizations)
- Cards: 1px Stone-200 border, 8px radius, subtle shadow `0 1px 3px rgba(0,0,0,0.04)`
- Buttons primary: Teal-600 bg, white text, 6px radius, 500 weight
- Buttons secondary: Stone-100 bg, Stone-900 text, 1px border
- Buttons danger: Red-600 bg, white text
- Inputs: 8px radius, Stone-200 border, Teal-600 focus ring (2px)
- Tables: Alternating row bg (white / Stone-50), sticky header, 14px body
- Badges: Pill shape (999px radius), color-coded per charge code level
- Tooltips: Slate-800 bg, Stone-100 text, 6px radius, 12px font

### Motion
- Page transitions: content area fade-in (150ms ease-out)
- Sidebar collapse/expand: width transition (200ms ease-in-out)
- Card hover: translateY(-1px) + shadow lift (150ms)
- Notification bell: subtle shake on new notification
- Timesheet cell focus: border-color transition (100ms)
- Approval row expand: height slide-down (200ms ease-out)
- Budget progress bars: width animation on mount (600ms ease-out, staggered 100ms per bar)
- Chart mount: Recharts built-in animation (800ms)
- Toast: slide-in from top-right (200ms)
- Skeleton loading: pulse animation for all async data

### Responsive Breakpoints
- Desktop (>1280px): Full sidebar + content
- Tablet (768-1279px): Collapsed sidebar (icons only), full content
- Mobile (<768px): No sidebar, bottom tab navigation, stacked cards
- Timesheet grid on mobile: horizontal scroll with sticky first column

## Team Orchestration

### Team Members

- Builder
  - Name: builder-layout
  - Role: Global shell (sidebar, topbar, theme provider, design tokens), font loading, CSS variables, dark mode toggle, responsive shell behavior, and the Login page design
  - Agent Type: builder
  - Resume: false

- Builder
  - Name: builder-pages-core
  - Role: Dashboard (employee + manager views), Time Entry page, Charge Codes page -- design improvements and component polish
  - Agent Type: builder
  - Resume: false

- Builder
  - Name: builder-pages-qa
  - Role: Approvals page, Reports page, Budget page -- design improvements and component polish
  - Agent Type: builder
  - Resume: false

- Builder
  - Name: builder-pages-admin
  - Role: Admin Calendar, Admin Users, Admin Rates, Profile, Settings pages -- design improvements and component polish
  - Agent Type: builder
  - Resume: false

- Code Reviewer
  - Name: reviewer
  - Role: Review all design and test changes for consistency, accessibility, and code quality
  - Agent Type: code-reviewer
  - Resume: false

- Test Writer
  - Name: tester
  - Role: Write vitest page render tests, component tests, E2E Playwright tests, capture screenshots, generate test results reports
  - Agent Type: test-writer
  - Resume: false

- Docs Writer
  - Name: doc-writer
  - Role: Update test results documentation (summary.md, test-cases.csv, test-cases.md, screenshot index)
  - Agent Type: docs-writer
  - Resume: false

- Validator
  - Name: validator
  - Role: Final validation -- run all tests, verify screenshots, check acceptance criteria, report pass/fail
  - Agent Type: validator
  - Resume: false

## Step by Step Tasks

### 1. Design System & Global Layout
- **Task ID**: design-system-setup
- **Depends On**: none
- **Assigned To**: builder-layout
- **Agent Type**: builder
- **Parallel**: false (must complete first -- all other design tasks depend on the global tokens)

**Files to create/modify:**
- `frontend/src/app/globals.css` -- Add CSS custom properties for the full color system (light + dark mode), font-face declarations for Plus Jakarta Sans, DM Sans, IBM Plex Mono (via Google Fonts or local files)
- `frontend/src/app/layout.tsx` -- Add font loading (next/font/google for Plus Jakarta Sans, DM Sans, IBM Plex Mono), apply font CSS variables to `<html>`, wrap with theme provider
- `frontend/src/app/(authenticated)/layout.tsx` -- Update sidebar to match spec:
  - Dark sidebar (#0F172A bg) with icon + label navigation
  - Collapsible: 240px expanded / 64px collapsed with 200ms transition
  - Active item: 3px left Teal border, bold label, subtle bg highlight
  - Sections: MAIN, INSIGHT, ADMIN separated by 1px dividers
  - Bottom: version badge + help link
  - Responsive: full on desktop, collapsed on tablet, bottom tabs on mobile
- `frontend/src/app/(authenticated)/layout.tsx` -- Update topbar to match spec:
  - 56px height, sticky
  - Left: hamburger toggle + page title + breadcrumb
  - Center-right: period selector dropdown
  - Right: notification bell (badge count) + avatar dropdown (profile, settings, logout)
- `frontend/src/components/ui/button.tsx` -- Update variants: Teal-600 primary, Stone-100 secondary, Red-600 danger, 6px radius
- `frontend/src/components/ui/card.tsx` -- 1px Stone-200 border, 8px radius, subtle shadow, hover lift animation
- `frontend/src/components/ui/input.tsx` -- 8px radius, Stone-200 border, Teal-600 focus ring
- `frontend/src/components/ui/table.tsx` -- Alternating row bg, sticky header, 14px body
- `frontend/src/components/ui/badge.tsx` -- Pill shape (999px radius), color variants for charge code levels
- `frontend/src/components/ui/tooltip.tsx` -- Slate-800 bg, Stone-100 text, 6px radius, 12px font
- `frontend/src/app/login/page.tsx` -- Update login page:
  - Animated gradient background (Slate-900 to Slate-800)
  - Frosted glass card (backdrop-blur), 16px radius
  - Logo + "Timesheet System" branding
  - Email/password fields + Sign In button (Teal-600)
  - "or" divider + "Sign in with Microsoft" button
  - "Forgot password?" link
- Add page content fade-in animation (150ms ease-out) to the authenticated layout content wrapper

**Acceptance Criteria:**
- [ ] CSS variables for all colors defined and used (light + dark)
- [ ] Three fonts loaded and applied (headings, body, monospace)
- [ ] Sidebar matches wireframe: collapsible, dark bg, sections, active state
- [ ] Topbar matches wireframe: 56px, sticky, breadcrumb, period selector, notifications, avatar
- [ ] Dark mode toggle works (sidebar stays dark, content/cards switch)
- [ ] Mobile responsive: bottom tabs below 768px
- [ ] Tablet responsive: collapsed sidebar 768-1279px
- [ ] Login page: frosted glass card, gradient bg, SSO button
- [ ] All shadcn/ui base components updated to design spec
- [ ] Page fade-in animation on route change

---

### 2. Dashboard, Time Entry & Charge Codes Pages
- **Task ID**: pages-core
- **Depends On**: design-system-setup
- **Assigned To**: builder-pages-core
- **Agent Type**: builder
- **Parallel**: true (parallel with tasks 3, 4)

**Dashboard -- `frontend/src/app/(authenticated)/page.tsx`:**
- Status banner (full width): week label, status badge, progress bar (hours logged/required), daily breakdown, missing hours callout
- 4 metric cards in grid: Hours This Period, Chargeability (%), Pending Approvals, Active Charge Codes -- each with delta indicator
- Two-column layout: My Recent Entries (grouped by day) | Alerts & Notifications (budget alerts, chargeability warnings, deadline reminders)
- Quick actions row: [+ Log Time] [Submit Sheet] [My Codes]
- Manager view additions: replace two-column with three-column (Pending Approvals with checkboxes, Team Status with completion indicators, Alerts)
- All numbers rendered in IBM Plex Mono
- Card hover lift animation
- Skeleton loading states for async data

**Time Entry -- `frontend/src/app/(authenticated)/time-entry/page.tsx`:**
- Period navigator: prev/next arrows, week label, status badge, week/bi-week toggle
- Timesheet grid (TimesheetGrid component):
  - Rows = charge codes (with level badge + billable indicator), Columns = Mon-Fri + TOTAL
  - Editable cells: dashed border when empty, solid when filled, Teal text for billable
  - Weekend/holiday columns: grey bg, disabled
  - Daily total row, Required row, Variance row (red for negative, green checkmark for met)
  - Tab to move right, Enter to move down
  - Note icon on hover
- Actions bar (sticky bottom): [+ Add Charge Code] [Save Draft] [Submit]
- Auto-save indicator
- All hours in IBM Plex Mono

**Charge Codes -- `frontend/src/app/(authenticated)/charge-codes/page.tsx`:**
- Toolbar: search, level filter, status filter, billable filter, "My Codes Only" checkbox, [+ Create New Code]
- Split panel layout:
  - Left: Hierarchy tree (ChargeCodeTree) with expand/collapse, color-coded badges (PRG=Slate, PRJ=Teal, ACT=Amber, TSK=Purple), budget amount per node
  - Right: Detail panel with tabs (Overview, Access, Budget)
    - Overview: key-value pairs (Level, Owner, Approver, Cost Center, Valid dates, Billable)
    - Budget mini-bar: progress bar with $ spent / $ budget
    - Access tab: assigned users list with [Add] and [Remove]
    - Budget tab: detailed budget breakdown
  - [Edit] [Archive] buttons

**Files modified:**
- `frontend/src/app/(authenticated)/page.tsx`
- `frontend/src/app/(authenticated)/time-entry/page.tsx`
- `frontend/src/app/(authenticated)/charge-codes/page.tsx`
- `frontend/src/components/timesheet/TimesheetGrid.tsx`
- `frontend/src/components/timesheet/EntryCell.tsx`
- `frontend/src/components/timesheet/ChargeCodeSelector.tsx`
- `frontend/src/components/charge-codes/ChargeCodeTree.tsx`
- `frontend/src/components/charge-codes/ChargeCodeForm.tsx`
- `frontend/src/components/charge-codes/AccessManager.tsx`

**Acceptance Criteria:**
- [ ] Dashboard: status banner, 4 metric cards, recent entries, alerts, quick actions visible
- [ ] Dashboard: manager view shows pending approvals, team status, alerts in 3-column layout
- [ ] Time Entry: period navigator with prev/next and status badge
- [ ] Time Entry: editable grid with charge code rows, day columns, totals, variance
- [ ] Time Entry: cell behaviors (empty dashed, filled solid, weekend grey, Tab/Enter navigation)
- [ ] Time Entry: sticky actions bar with Add Code, Save Draft, Submit
- [ ] Charge Codes: split panel with tree on left, detail on right
- [ ] Charge Codes: tree nodes color-coded by level
- [ ] Charge Codes: detail panel with Overview, Access, Budget tabs
- [ ] All numbers/codes in IBM Plex Mono
- [ ] Skeleton loading states present

---

### 3. Approvals, Reports & Budget Pages
- **Task ID**: pages-qa
- **Depends On**: design-system-setup
- **Assigned To**: builder-pages-qa
- **Agent Type**: builder
- **Parallel**: true (parallel with tasks 2, 4)

**Approvals -- `frontend/src/app/(authenticated)/approvals/page.tsx`:**
- Tab toggle: [As Manager | As CC Owner]
- Filter bar: period dropdown, status dropdown, search by name
- Approval table (TanStack Table):
  - Columns: checkbox, Employee (name + department), Period, Hours (with warning if < required), Status, Actions ([Eye] [Check] [X])
  - Alternating row bg, sticky header
  - Inline expand on [Eye]: shows full timesheet grid (read-only) with charge code breakdown
  - [Approve] and [Reject with Comment] buttons in expanded view
- Bulk action bar (appears when checkboxes selected): "N selected" + [Approve Selected] + [Reject Selected]
- Rejection modal (Dialog): textarea for reason, [Cancel] [Confirm Reject]
- Approval row expand: slide-down animation (200ms)

**Reports -- `frontend/src/app/(authenticated)/reports/page.tsx`:**
- Filter bar: Program dropdown, Period dropdown, Team dropdown, [Export PDF] [Export CSV]
- ROW 1: 4 KPI cards with colored top border (teal=Total Budget, amber=Actual Spent, green=Utilization, red=Overruns)
- ROW 2: 2 charts side by side
  - Budget vs Actual (stacked bar chart, Recharts) -- per program with budget/actual/forecast
  - Chargeability by Team (horizontal bar + 80% target line)
- ROW 3: 2 charts side by side
  - Activity Distribution (donut/pie chart)
  - Financial Impact Summary (card with over-budget cost, low chargeability cost, net P/L impact, trend)
- ROW 4: Budget Overrun Alerts table (full width) -- severity icon, charge code, budget, actual, overrun status
- All chart components use Recharts with 800ms mount animation
- Budget progress bars: 600ms width animation, staggered 100ms per bar

**Budget -- `frontend/src/app/(authenticated)/budget/page.tsx`:**
- Budget overview cards (total budget, total spent, remaining, forecast)
- Budget table by charge code with progress bars
- Drill-down: click charge code to see child-level budget breakdown
- Alert indicators for codes approaching/exceeding budget

**Files modified:**
- `frontend/src/app/(authenticated)/approvals/page.tsx`
- `frontend/src/app/(authenticated)/reports/page.tsx`
- `frontend/src/app/(authenticated)/budget/page.tsx`
- `frontend/src/components/approvals/ApprovalQueue.tsx`
- `frontend/src/components/approvals/TimesheetReview.tsx`
- `frontend/src/components/approvals/BulkApprovalBar.tsx`
- `frontend/src/components/reports/BudgetChart.tsx`
- `frontend/src/components/reports/ChargeabilityGauge.tsx`
- `frontend/src/components/reports/UtilizationChart.tsx`
- `frontend/src/components/reports/ActivityPie.tsx`
- `frontend/src/components/reports/AlertList.tsx`

**Acceptance Criteria:**
- [ ] Approvals: table with checkboxes, inline expand, bulk actions bar, reject modal
- [ ] Approvals: manager/CC owner tab toggle
- [ ] Reports: 4 KPI cards with colored top borders
- [ ] Reports: 4 charts render (Budget vs Actual, Chargeability, Activity Dist, Financial Impact)
- [ ] Reports: alert table with severity indicators
- [ ] Budget: overview cards, progress bars per charge code, drill-down
- [ ] All charts animate on mount
- [ ] Budget bars animate with stagger

---

### 4. Admin, Profile & Settings Pages
- **Task ID**: pages-admin
- **Depends On**: design-system-setup
- **Assigned To**: builder-pages-admin
- **Agent Type**: builder
- **Parallel**: true (parallel with tasks 2, 3)

**Admin Calendar -- `frontend/src/app/(authenticated)/admin/calendar/page.tsx`:**
- Year navigation: [< prev] year label [next >], country dropdown
- Calendar grid: 12 months in 3x4 grid, each month showing day cells
  - Weekend days in grey
  - Holiday days in red
  - Click day to add/edit holiday
- Holiday list table: Date, Name, Actions ([Edit] [Delete])
- [+ Add Holiday] button

**Admin Users -- `frontend/src/app/(authenticated)/admin/users/page.tsx`:**
- User table: Name, Email, Role (dropdown to change), Job Grade, Department, Status, Actions
- [+ Add User] button (or invite flow)
- Role assignment dropdown inline in table
- Search/filter bar

**Admin Rates -- `frontend/src/app/(authenticated)/admin/rates/page.tsx`:**
- Cost rate table: Job Grade, Hourly Rate (IBM Plex Mono), Effective From, Effective To, Actions
- [+ Add Rate] button
- Edit inline or modal
- Effective date range validation

**Profile -- `frontend/src/app/(authenticated)/profile/page.tsx`:**
- User info card: avatar, name, email, role badge, department, job grade
- Edit form: name, department (email and role read-only)
- Change password section

**Settings -- `frontend/src/app/(authenticated)/settings/page.tsx`:**
- Theme toggle (light/dark)
- Notification preferences (email, in-app, Teams)
- Default view preferences (weekly/bi-weekly)
- Timezone setting

**Files modified:**
- `frontend/src/app/(authenticated)/admin/calendar/page.tsx`
- `frontend/src/app/(authenticated)/admin/users/page.tsx`
- `frontend/src/app/(authenticated)/admin/rates/page.tsx`
- `frontend/src/app/(authenticated)/profile/page.tsx`
- `frontend/src/app/(authenticated)/settings/page.tsx`

**Acceptance Criteria:**
- [ ] Admin Calendar: year grid with 12 months, holidays in red, weekends in grey, holiday list
- [ ] Admin Users: user table with role dropdown, search, add user
- [ ] Admin Rates: rate table with job grade, hourly rate, effective dates
- [ ] Profile: user info card, edit form, change password
- [ ] Settings: theme toggle, notification prefs, default view, timezone
- [ ] All tables use alternating row bg and sticky headers
- [ ] All number/money values in IBM Plex Mono

---

### 5. Code Review
- **Task ID**: code-review
- **Depends On**: design-system-setup, pages-core, pages-qa, pages-admin
- **Assigned To**: reviewer
- **Agent Type**: code-reviewer
- **Parallel**: false

**Review checklist:**
- Design consistency: all pages use CSS variables (no hardcoded colors), fonts applied correctly
- Component reuse: no duplicated layout patterns, shared card/metric components extracted
- Accessibility: proper aria labels, color contrast meets WCAG AA, keyboard navigation works
- Responsive: all pages tested at desktop/tablet/mobile breakpoints conceptually
- Dark mode: all pages work in dark mode (no missing variable mappings)
- Performance: no unnecessary re-renders, images optimized, fonts preloaded
- shadcn/ui: customizations applied via CSS variables not inline styles
- Motion: animations are subtle, respect prefers-reduced-motion
- Code quality: proper TypeScript types, no `any`, consistent naming

**Fix directly** -- do not just report issues, fix them in place.

---

### 6. Write Tests -- Vitest Component & Page Tests
- **Task ID**: write-vitest-tests
- **Depends On**: code-review
- **Assigned To**: tester
- **Agent Type**: test-writer
- **Parallel**: false

**Test setup prerequisites:**
- Verify `vitest.config.ts` has jsdom environment, globals, setup file
- Verify `src/test-setup.ts` imports `@testing-library/jest-dom`
- Create shared test utilities: `src/test-utils.tsx` with custom render wrapper (providers, router mock, theme mock)
- Create mock data fixtures: `src/__mocks__/` with sample timesheets, charge codes, approvals, users, budgets, reports data

**Page render tests (NEW -- one test file per page):**

| Test File | Page | Key Assertions |
|-----------|------|----------------|
| `src/app/login/page.test.tsx` | Login | Renders email input, password input, Sign In button, Microsoft SSO button, logo |
| `src/app/(authenticated)/page.test.tsx` | Dashboard | Renders status banner, 4 metric cards, recent entries, alerts, quick actions |
| `src/app/(authenticated)/time-entry/page.test.tsx` | Time Entry | Renders period navigator, timesheet grid, actions bar |
| `src/app/(authenticated)/charge-codes/page.test.tsx` | Charge Codes | Renders toolbar, tree panel, detail panel |
| `src/app/(authenticated)/approvals/page.test.tsx` | Approvals | Renders filter bar, approval table, bulk action bar |
| `src/app/(authenticated)/reports/page.test.tsx` | Reports | Renders filter bar, KPI cards, chart containers |
| `src/app/(authenticated)/budget/page.test.tsx` | Budget | Renders overview cards, budget table |
| `src/app/(authenticated)/admin/calendar/page.test.tsx` | Admin Calendar | Renders year nav, month grid, holiday list |
| `src/app/(authenticated)/admin/users/page.test.tsx` | Admin Users | Renders user table, search, add button |
| `src/app/(authenticated)/admin/rates/page.test.tsx` | Admin Rates | Renders rate table, add button |
| `src/app/(authenticated)/profile/page.test.tsx` | Profile | Renders user info, edit form |
| `src/app/(authenticated)/settings/page.test.tsx` | Settings | Renders theme toggle, notification prefs |

**Component tests (UPDATE existing + NEW):**

| Test File | Status | Key Assertions |
|-----------|--------|----------------|
| `components/timesheet/TimesheetGrid.test.tsx` | UPDATE | Add: variance row colors, billable Teal text, weekend disabled cells, IBM Plex Mono class on numbers |
| `components/timesheet/EntryCell.test.tsx` | NEW | Focus/blur behavior, dashed border empty, solid filled, Tab/Enter navigation, note icon hover |
| `components/timesheet/ChargeCodeSelector.test.tsx` | NEW | Dropdown opens, search filters codes, level badges rendered |
| `components/charge-codes/ChargeCodeTree.test.tsx` | UPDATE | Add: expand/collapse, level badge colors (PRG=Slate, PRJ=Teal, ACT=Amber, TSK=Purple), budget display |
| `components/charge-codes/ChargeCodeForm.test.tsx` | NEW | Form fields render, validation errors show, submit calls handler |
| `components/charge-codes/AccessManager.test.tsx` | NEW | User list renders, add user, remove user |
| `components/approvals/ApprovalQueue.test.tsx` | UPDATE | Add: checkbox select, inline expand, reject modal, manager/CC tab toggle |
| `components/approvals/TimesheetReview.test.tsx` | NEW | Renders read-only timesheet grid, approve/reject buttons |
| `components/approvals/BulkApprovalBar.test.tsx` | NEW | Shows count, approve/reject buttons, appears when items selected |
| `components/reports/BudgetChart.test.tsx` | NEW | Renders Recharts BarChart with mock data, legend present |
| `components/reports/ChargeabilityGauge.test.tsx` | NEW | Renders horizontal bars, target line at 80% |
| `components/reports/UtilizationChart.test.tsx` | NEW | Renders bar chart with utilization data |
| `components/reports/ActivityPie.test.tsx` | NEW | Renders PieChart/donut with activity categories |
| `components/reports/AlertList.test.tsx` | NEW | Renders alert rows with severity icons, charge code links |

**Interaction tests (within component test files):**
- Form submit with valid/invalid data
- Dropdown selection
- Button click handlers
- Modal open/close
- Checkbox select/deselect
- Tab switching
- Search/filter input

**Conditional rendering tests:**
- Sidebar: admin menu hidden for Employee role
- Dashboard: manager widgets only for Manager role
- Approvals: CC Owner tab only for Charge Manager role

**Run command:**
```bash
cd frontend && pnpm vitest run --reporter=json --outputFile=../docs/test-results/frontend/unit-results.json 2>&1 | tee ../docs/test-results/frontend/unit-results.log
```

**Acceptance Criteria:**
- [ ] Every page has a render test (12 page tests)
- [ ] Every custom component has a test (14 component tests, 3 updated + 11 new)
- [ ] All tests pass with `pnpm vitest run`
- [ ] JSON output saved to `docs/test-results/frontend/unit-results.json`
- [ ] Test utilities and mock data created for reuse

---

### 7. Write Tests -- Playwright E2E & Screenshots
- **Task ID**: write-e2e-tests
- **Depends On**: write-vitest-tests
- **Assigned To**: tester
- **Agent Type**: test-writer
- **Parallel**: false

**Setup:**
- Install Playwright: `cd frontend && pnpm add -D @playwright/test && pnpm exec playwright install chromium`
- Create `frontend/playwright.config.ts`:
  - Base URL: `http://localhost:3000`
  - Projects: desktop (1280x720), mobile (375x667)
  - Screenshot on failure + explicit screenshot capture
  - JSON reporter output to `docs/test-results/e2e/e2e-results.json`
  - Web server: `pnpm dev` with auto-start

**E2E test files:**

| Test File | Flow | Steps |
|-----------|------|-------|
| `e2e/login.spec.ts` | Login flow | Navigate to /login, fill email/password, click Sign In, verify redirect to dashboard |
| `e2e/dashboard.spec.ts` | Dashboard | Verify status banner, metric cards, recent entries, alerts render |
| `e2e/time-entry.spec.ts` | Time entry flow | Navigate to /time-entry, verify grid, click cell to edit, type hours, verify total updates |
| `e2e/charge-codes.spec.ts` | Charge code tree | Navigate to /charge-codes, expand tree node, click to select, verify detail panel |
| `e2e/approvals.spec.ts` | Approval flow | Navigate to /approvals, select checkbox, verify bulk bar appears, click expand |
| `e2e/reports.spec.ts` | Reports page | Navigate to /reports, verify KPI cards, charts render (check SVG elements) |
| `e2e/budget.spec.ts` | Budget page | Navigate to /budget, verify overview cards, budget table |
| `e2e/admin-calendar.spec.ts` | Admin calendar | Navigate to /admin/calendar, verify year grid, holiday list |
| `e2e/admin-users.spec.ts` | Admin users | Navigate to /admin/users, verify user table |
| `e2e/admin-rates.spec.ts` | Admin rates | Navigate to /admin/rates, verify rate table |
| `e2e/profile.spec.ts` | Profile | Navigate to /profile, verify user info |
| `e2e/settings.spec.ts` | Settings | Navigate to /settings, verify theme toggle |

**Screenshot capture (within each E2E test):**
Every test captures a screenshot at the end. Output directory: `docs/test-results/screenshots/`

| Screenshot File | Viewport | Page |
|----------------|----------|------|
| `login--desktop.png` | 1280x720 | Login |
| `login--mobile.png` | 375x667 | Login |
| `dashboard--desktop.png` | 1280x720 | Dashboard |
| `dashboard--mobile.png` | 375x667 | Dashboard |
| `time-entry--desktop.png` | 1280x720 | Time Entry |
| `time-entry--mobile.png` | 375x667 | Time Entry |
| `charge-codes--desktop.png` | 1280x720 | Charge Codes |
| `charge-codes--mobile.png` | 375x667 | Charge Codes |
| `approvals--desktop.png` | 1280x720 | Approvals |
| `approvals--mobile.png` | 375x667 | Approvals |
| `reports--desktop.png` | 1280x720 | Reports |
| `reports--mobile.png` | 375x667 | Reports |
| `budget--desktop.png` | 1280x720 | Budget |
| `budget--mobile.png` | 375x667 | Budget |
| `admin-calendar--desktop.png` | 1280x720 | Admin Calendar |
| `admin-calendar--mobile.png` | 375x667 | Admin Calendar |
| `admin-users--desktop.png` | 1280x720 | Admin Users |
| `admin-users--mobile.png` | 375x667 | Admin Users |
| `admin-rates--desktop.png` | 1280x720 | Admin Rates |
| `admin-rates--mobile.png` | 375x667 | Admin Rates |
| `profile--desktop.png` | 1280x720 | Profile |
| `profile--mobile.png` | 375x667 | Profile |
| `settings--desktop.png` | 1280x720 | Settings |
| `settings--mobile.png` | 375x667 | Settings |

Total: 24 screenshots (12 pages x 2 viewports)

**Run command:**
```bash
cd frontend && pnpm exec playwright test --reporter=json --output=../docs/test-results/e2e/ 2>&1 | tee ../docs/test-results/e2e/e2e-results.log
```

**Note on auth mocking:** Since E2E tests run against the real frontend (no backend), tests must either:
1. Mock Supabase auth at the page level (intercept auth API calls via Playwright route interception), OR
2. Bypass the auth middleware for test mode (e.g., `NEXT_PUBLIC_TEST_MODE=true` env var that skips redirect in middleware.ts)

The tester should implement option 1 (Playwright route interception) to mock authenticated state.

**Acceptance Criteria:**
- [ ] Playwright installed and configured
- [ ] 12 E2E test files (one per page)
- [ ] All E2E tests pass
- [ ] 24 screenshots captured (12 desktop + 12 mobile)
- [ ] Screenshots saved to `docs/test-results/screenshots/`
- [ ] JSON report saved to `docs/test-results/e2e/e2e-results.json`
- [ ] Auth properly mocked for test execution

---

### 8. Generate Test Results Documentation
- **Task ID**: test-docs
- **Depends On**: write-vitest-tests, write-e2e-tests
- **Assigned To**: doc-writer
- **Agent Type**: docs-writer
- **Parallel**: false

**Files to create:**

`docs/test-results/summary.md`:
- Date, overall pass/fail counts
- Frontend vitest breakdown: total tests, passed, failed, skipped
- E2E Playwright breakdown: total tests, passed, failed, skipped
- Screenshot count and listing
- Link to detailed reports

`docs/test-results/test-cases.csv`:
- Columns: ID, Test Name, Type (unit|component|e2e), Category (page|component|flow), File, Status (pass|fail|skip), Notes
- Must include ALL frontend vitest tests AND all E2E tests

`docs/test-results/test-cases.md`:
- Same data as CSV in markdown table format for git review

`docs/test-results/frontend/unit-results.md`:
- Human-readable report from vitest JSON output
- Test suite breakdown by file
- Pass/fail counts

`docs/test-results/e2e/e2e-results.md`:
- Human-readable report from Playwright JSON output
- Test breakdown by page/flow
- Screenshot references

**Acceptance Criteria:**
- [ ] `docs/test-results/summary.md` exists with date and breakdowns
- [ ] `docs/test-results/test-cases.csv` exists with correct header and all test entries
- [ ] `docs/test-results/test-cases.md` exists as markdown table
- [ ] `docs/test-results/frontend/unit-results.md` exists
- [ ] `docs/test-results/e2e/e2e-results.md` exists
- [ ] All screenshots listed and referenced

---

### 9. Final Validation
- **Task ID**: validate-all
- **Depends On**: code-review, write-vitest-tests, write-e2e-tests, test-docs
- **Assigned To**: validator
- **Agent Type**: validator
- **Parallel**: false

**Validation checklist:**

Build:
```bash
cd frontend && pnpm run build
```
- [ ] Frontend builds without errors

Vitest:
```bash
cd frontend && pnpm vitest run
```
- [ ] All vitest tests pass (0 failures)

Playwright:
```bash
cd frontend && pnpm exec playwright test
```
- [ ] All E2E tests pass (0 failures)

Screenshot existence:
```bash
ls docs/test-results/screenshots/*.png | wc -l
```
- [ ] At least 24 screenshots exist (12 pages x 2 viewports)

Test results files:
```bash
test -f docs/test-results/summary.md && echo "OK" || echo "MISSING"
test -f docs/test-results/test-cases.csv && echo "OK" || echo "MISSING"
test -f docs/test-results/test-cases.md && echo "OK" || echo "MISSING"
test -f docs/test-results/frontend/unit-results.json && echo "OK" || echo "MISSING"
test -f docs/test-results/frontend/unit-results.md && echo "OK" || echo "MISSING"
test -f docs/test-results/e2e/e2e-results.json && echo "OK" || echo "MISSING"
test -f docs/test-results/e2e/e2e-results.md && echo "OK" || echo "MISSING"
```
- [ ] All 7 test result files exist

Page render verification (from vitest output):
- [ ] Login page test passes
- [ ] Dashboard page test passes
- [ ] Time Entry page test passes
- [ ] Charge Codes page test passes
- [ ] Approvals page test passes
- [ ] Reports page test passes
- [ ] Budget page test passes
- [ ] Admin Calendar page test passes
- [ ] Admin Users page test passes
- [ ] Admin Rates page test passes
- [ ] Profile page test passes
- [ ] Settings page test passes

Component test verification:
- [ ] TimesheetGrid tests pass (including variance, billable, weekend cells)
- [ ] EntryCell tests pass
- [ ] ChargeCodeSelector tests pass
- [ ] ChargeCodeTree tests pass (including level badges)
- [ ] ChargeCodeForm tests pass
- [ ] AccessManager tests pass
- [ ] ApprovalQueue tests pass (including bulk, expand, reject modal)
- [ ] TimesheetReview tests pass
- [ ] BulkApprovalBar tests pass
- [ ] BudgetChart tests pass
- [ ] ChargeabilityGauge tests pass
- [ ] UtilizationChart tests pass
- [ ] ActivityPie tests pass
- [ ] AlertList tests pass

Design verification (visual inspection of screenshots):
- [ ] Sidebar is dark (#0F172A)
- [ ] Content area is warm paper tone (#FAFAF9)
- [ ] Primary buttons are Teal-600
- [ ] Cards have 8px radius and subtle shadow
- [ ] Numbers/codes use monospace font
- [ ] Headings use Plus Jakarta Sans
- [ ] Mobile screenshots show bottom tab navigation

**Report:** Generate pass/fail summary for every criterion above.

---

### 10. Heal Failures
- **Task ID**: heal
- **Depends On**: validate-all
- **Assigned To**: team-lead (orchestrator)
- **Parallel**: false
- **Max Retries**: 2

**Only run if Task 9 (validate-all) has failures.**

**Healing rules:**
| Failure Type | Assigned To | Action |
|-------------|-------------|--------|
| Build error (pnpm build) | builder-layout | Fix TypeScript/import errors |
| Vitest page test failure | tester | Fix test expectations or page component |
| Vitest component test failure | tester | Fix test or component |
| Playwright E2E failure | tester | Fix test, mock, or page |
| Missing screenshot | tester | Re-run Playwright for that page |
| Missing test results file | doc-writer | Generate the missing file |
| Design inconsistency (from screenshot review) | builder-layout / builder-pages-* | Fix styling |
| Lint error | reviewer | Fix lint issue |

**Process:**
1. Parse validation output from Task 9
2. For each failure, create a fix task assigned to the correct agent per healing rules
3. Wait for all fixes to complete
4. Re-run validation (Task 9)
5. If still failing after 2 retries, stop and report remaining failures

---

## Pipeline

```
design-system-setup
    |
    +---> pages-core (parallel)
    +---> pages-qa (parallel)
    +---> pages-admin (parallel)
    |
    v
code-review
    |
    v
write-vitest-tests
    |
    v
write-e2e-tests
    |
    v
test-docs
    |
    v
validate-all
    |
    v
heal (if needed, max 2 retries)
    |
    v
DONE
```

## Acceptance Criteria

### Design Criteria
- [ ] CSS custom properties defined for full color system (light + dark mode)
- [ ] Three Google Fonts loaded: Plus Jakarta Sans, DM Sans, IBM Plex Mono
- [ ] Sidebar: dark bg (#0F172A), collapsible (240px/64px), 200ms transition, active item with Teal left border
- [ ] Topbar: 56px, sticky, breadcrumb, period selector, notification bell, avatar dropdown
- [ ] Login: gradient bg, frosted glass card, email/password, Microsoft SSO, forgot password
- [ ] Cards: 8px radius, Stone-200 border, subtle shadow, hover lift
- [ ] Primary buttons: Teal-600 bg, white text, 6px radius
- [ ] Tables: alternating rows, sticky header, 14px body
- [ ] Badges: pill shape, color-coded by charge code level
- [ ] Dark mode: content/cards switch, sidebar stays dark, text inverts
- [ ] Responsive: desktop (full sidebar), tablet (collapsed), mobile (bottom tabs)
- [ ] Page fade-in animation (150ms)
- [ ] All numbers/codes in IBM Plex Mono
- [ ] Skeleton loading states on all async-data pages

### Test Criteria
- [ ] 12 page render tests exist and pass
- [ ] 14 component test files exist and pass (3 updated + 11 new)
- [ ] 12 E2E test files exist and pass
- [ ] 24 screenshots captured (12 desktop + 12 mobile)
- [ ] All vitest tests pass: `cd frontend && pnpm vitest run` exits 0
- [ ] All E2E tests pass: `cd frontend && pnpm exec playwright test` exits 0
- [ ] Frontend builds: `cd frontend && pnpm run build` exits 0

### Test Results Documentation Criteria
- [ ] `docs/test-results/summary.md` exists with date, pass/fail counts, frontend + E2E breakdown
- [ ] `docs/test-results/test-cases.csv` exists with columns: ID, Test Name, Type, Category, File, Status, Notes
- [ ] `docs/test-results/test-cases.md` exists (markdown table)
- [ ] `docs/test-results/frontend/unit-results.json` exists (vitest JSON output)
- [ ] `docs/test-results/frontend/unit-results.md` exists (human-readable)
- [ ] `docs/test-results/e2e/e2e-results.json` exists (Playwright JSON output)
- [ ] `docs/test-results/e2e/e2e-results.md` exists (human-readable)
- [ ] `docs/test-results/screenshots/` has at least 24 PNG files

## Validation Commands

### Build
```bash
cd frontend && pnpm run build
```

### Vitest
```bash
cd frontend && pnpm vitest run
cd frontend && pnpm vitest run --reporter=json --outputFile=../docs/test-results/frontend/unit-results.json
```

### Playwright
```bash
cd frontend && pnpm exec playwright test
cd frontend && pnpm exec playwright test --reporter=json > ../docs/test-results/e2e/e2e-results.json
```

### Lint
```bash
cd frontend && pnpm run lint
```

### Screenshot count
```bash
ls docs/test-results/screenshots/*.png 2>/dev/null | wc -l
# Expected: >= 24
```

### Test results files existence
```bash
for f in \
  docs/test-results/summary.md \
  docs/test-results/test-cases.csv \
  docs/test-results/test-cases.md \
  docs/test-results/frontend/unit-results.json \
  docs/test-results/frontend/unit-results.md \
  docs/test-results/e2e/e2e-results.json \
  docs/test-results/e2e/e2e-results.md; do
  test -f "$f" && echo "OK: $f" || echo "MISSING: $f"
done
```

### Test CSV header validation
```bash
head -1 docs/test-results/test-cases.csv | grep -q 'ID,Test Name' && echo "CSV header OK" || echo "CSV header WRONG"
```

### Frontend runtime (manual check)
```bash
cd frontend && timeout 15 pnpm dev --port 3000 & sleep 8 && curl -sf http://localhost:3000 > /dev/null && echo "Frontend OK" || echo "Frontend FAIL"; kill %1 2>/dev/null
```

## Healing Rules

| Failure Pattern | Assigned To | Instruction |
|----------------|-------------|-------------|
| `pnpm run build` fails | builder-layout | Fix TypeScript compilation errors in the failing file |
| `pnpm vitest run` -- page test fails | tester | Fix the failing page test or update the page component to render correctly |
| `pnpm vitest run` -- component test fails | tester | Fix the failing component test or update the component |
| `playwright test` fails | tester | Fix E2E test, auth mock, or page rendering |
| Missing screenshot | tester | Re-capture screenshot via Playwright |
| Missing `summary.md` | doc-writer | Generate summary from test outputs |
| Missing `test-cases.csv` | doc-writer | Generate CSV from all test files |
| Missing `test-cases.md` | doc-writer | Generate markdown from CSV |
| Missing `unit-results.json` | tester | Re-run vitest with JSON reporter |
| Missing `unit-results.md` | doc-writer | Generate from JSON output |
| Missing `e2e-results.json` | tester | Re-run Playwright with JSON reporter |
| Missing `e2e-results.md` | doc-writer | Generate from JSON output |
| Design inconsistency | builder-layout | Fix CSS variables or component styling |
| Lint error (frontend) | reviewer | Fix linting issues |
| `Frontend FAIL` (runtime) | builder-layout | Fix Next.js startup errors |

## Notes
- **Playwright installation**: Must run `pnpm exec playwright install chromium` before E2E tests. Only chromium needed (not all browsers) to keep CI fast.
- **Auth mocking in E2E**: Use Playwright `page.route()` to intercept Supabase auth API calls and return mock session tokens. Also intercept the Next.js middleware redirect by mocking the auth cookie.
- **Recharts in vitest**: Recharts uses SVG rendering which jsdom supports partially. Mock Recharts components in vitest if SVG rendering causes issues. E2E tests will verify actual chart rendering.
- **next/font in tests**: vitest cannot load Google Fonts. Mock `next/font/google` to return plain font objects. The `vitest.config.ts` may need an alias or mock for `next/font`.
- **shadcn/ui and @base-ui/react**: The existing tests already mock `@base-ui/react` modules. New tests should follow the same pattern.
- **File ownership boundaries**: builders only modify files listed in their task. No cross-builder file conflicts.
- **Test data**: All tests use mock/fixture data. No real API calls. Pages should gracefully handle empty/loading states.
- **Existing 3 tests**: The tester should UPDATE (not replace) the 3 existing test files to add new assertions per the design spec, while keeping existing passing assertions.
