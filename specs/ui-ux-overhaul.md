# Plan: UI/UX Overhaul — Modern Interface & Typography Refresh

## Task Description
Complete visual redesign of the Timesheet & Cost Allocation System frontend. The app is fully functional but looks dated, uses hard-to-read fonts, and has poor visual hierarchy. This plan modernizes the entire interface — typography, colors, cards, tables, empty states, sidebar, and page layouts — while preserving all existing functionality and passing all E2E tests.

## Objective
Transform the app from a "cheap admin template" look to a modern, polished SaaS-quality interface:
1. Replace font system for better readability
2. Modernize card and table designs with depth and spacing
3. Fix color contrast and visual hierarchy
4. Add meaningful empty states with illustrations
5. Polish sidebar navigation
6. Ensure all 45+ E2E tests still pass after redesign

## Problem Statement
Based on screenshot review of all 11 pages, the current UI suffers from:
- **Typography**: DM Sans body font too thin (400 weight), ALL CAPS labels hard to read, mono font overused on numbers, heading/body size hierarchy unclear
- **Visual design**: Flat cards with thin borders look generic, no depth/shadows, almost monochrome (white-gray + teal), sidebar navy-to-white contrast too harsh
- **Tables**: Plain HTML tables with ALL CAPS tiny headers, no modern styling
- **Empty states**: Just text ("No pending approvals") — no illustrations or helpful guidance
- **Spacing**: Cards feel cramped, insufficient whitespace between sections

## Solution Approach
Systematic redesign in 3 phases:
1. **Foundation** — Replace font stack, update CSS design tokens (colors, shadows, spacing), update globals.css
2. **Components** — Redesign shared UI components (cards, tables, badges, sidebar), add empty state component
3. **Pages** — Update each page to use new design system, fix specific layout issues

All changes are CSS/component-level — no backend changes needed. E2E tests must pass after every phase.

## Tech Stack
- **Language**: TypeScript
- **Framework**: Next.js 16 App Router
- **Runtime**: Node.js 20+
- **Key APIs/Libraries**: TailwindCSS 4, shadcn/ui, next/font/google (Inter), Recharts, lucide-react
- **Build Tools**: pnpm, Turbopack
- **Testing**: Playwright (E2E), vitest (unit)

## Technical Design

### Architecture
Changes are purely frontend — CSS variables, font imports, component styles, page layouts.
```
globals.css          → New design tokens, font vars, shadows, spacing
layout.tsx (root)    → New font imports (Inter replaces DM Sans)
layout.tsx (auth)    → Sidebar redesign, topbar polish
components/ui/*      → Updated shadcn components (card, table, badge)
components/shared/   → New: EmptyState, StatCard, PageHeader components
app/(auth)/*/page    → Each page updated with new components
```

### Key Design Decisions
- **Inter** replaces DM Sans — better readability at small sizes, wider weight range (300-700), excellent for data-heavy UIs
- **Keep Plus Jakarta Sans** for headings — distinctive but increase weight/size differentiation
- **Reduce IBM Plex Mono** — only for charge code IDs and actual code, NOT for currency/hours/percentages
- **Sentence case labels** — replace ALL CAPS on KPI cards and table headers
- **Soft shadows** — replace flat bordered cards with subtle elevation (`shadow-sm` + border)
- **Warmer gray palette** — stone/warm gray for backgrounds instead of pure gray
- **Sidebar softened** — slightly lighter navy, better section visibility, smooth transitions

### Data Model
No data model changes — this is a pure visual overhaul.

### API / Interface Contracts
No API changes — all endpoints remain the same.

## UX/UI Design

### Figma / Design Reference
No external design provided — the design system below serves as the spec.

### Visual Style

**Typography Scale:**
```
Display:    Inter 28px/700  — Page greetings ("Good evening, Wichai")
H1:         Plus Jakarta Sans 22px/700  — Page titles ("Dashboard")
H2:         Plus Jakarta Sans 18px/600  — Section titles ("Pending Approvals")
H3:         Plus Jakarta Sans 15px/600  — Card titles ("Budget by Charge Code")
Body:       Inter 14px/400  — Default text
Body-med:   Inter 14px/500  — Emphasized body (table cells, nav items)
Caption:    Inter 12px/400  — Secondary info, timestamps
Label:      Inter 11px/500 tracking-wide — Card labels (sentence case, NOT uppercase)
Mono:       IBM Plex Mono 13px/500 — Charge code IDs only (ACT-001, PRG-001)
```

**Color Palette (updated):**
```css
/* Backgrounds — warmer, less sterile */
--bg-content:     #F8F7F6;    /* warm off-white instead of #FAFAF9 */
--bg-card:        #FFFFFF;
--bg-card-hover:  #F5F4F2;
--bg-subtle:      #F0EEEC;    /* NEW — for table headers, section backgrounds */

/* Text — better contrast */
--text-primary:   #1A1614;    /* darker for better readability */
--text-secondary: #5C554E;    /* was #78716C — darker for readability */
--text-muted:     #8C857E;    /* was #A8A29E — darker for readability */

/* Accents — richer, more variety */
--accent-teal:    #0D9488;    /* keep — primary brand */
--accent-blue:    #3B82F6;    /* NEW — for info states, links */
--accent-amber:   #D97706;    /* keep — warnings */
--accent-red:     #DC2626;    /* keep — errors */
--accent-green:   #059669;    /* keep — success */
--accent-purple:  #7C3AED;    /* keep — task badges */

/* Borders — slightly warmer */
--border-default: #E5E2DF;    /* was #E7E5E4 — warmer */
--border-subtle:  #F0EEEC;    /* NEW — very subtle dividers */

/* Shadows — NEW depth system */
--shadow-xs:  0 1px 2px rgba(0,0,0,0.04);
--shadow-sm:  0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
--shadow-md:  0 4px 6px rgba(0,0,0,0.04), 0 2px 4px rgba(0,0,0,0.03);
--shadow-lg:  0 10px 15px rgba(0,0,0,0.04), 0 4px 6px rgba(0,0,0,0.03);

/* Sidebar — softened */
--sidebar:        #141B2D;    /* slightly lighter than #0F172A */
--sidebar-hover:  #1C2640;    /* NEW — hover state */
--sidebar-active: #1E3048;    /* NEW — active state bg */
```

**Card Design:**
```
Before: border border-[var(--border-default)] bg-white
After:  bg-white rounded-xl shadow-sm border border-[var(--border-subtle)]
        hover:shadow-md transition-shadow
```

**KPI Stat Cards:**
```
Before: ALL CAPS label, giant mono number, thin border
After:  Sentence case label (Inter 11px/500),
        Inter 600 number (not mono),
        colored left accent bar (4px),
        subtle shadow, icon in muted circle
```

**Table Headers:**
```
Before: ALL CAPS 10px tracking-wider text-muted
After:  Sentence case 12px/500 text-secondary, bg-subtle
```

**Empty States:**
```
Before: "No pending approvals" plain text
After:  Centered layout with:
        - Relevant lucide icon (48px, muted)
        - Clear title ("No pending approvals")
        - Helpful description ("Timesheets submitted by your team will appear here")
        - Optional CTA button
```

### User Flow
No user flow changes — all navigation and functionality stays the same. Only visual appearance changes.

## Relevant Files

### Files to Modify
**Foundation (Phase 1):**
- `frontend/src/app/layout.tsx` — Replace DM Sans with Inter, adjust weights
- `frontend/src/app/globals.css` — Update all CSS variables (colors, shadows, spacing)

**Shared Components (Phase 2):**
- `frontend/src/app/(authenticated)/layout.tsx` — Sidebar + topbar redesign
- `frontend/src/components/ui/card.tsx` — Updated card with shadow
- `frontend/src/components/ui/table.tsx` — Modern table headers
- `frontend/src/components/ui/badge.tsx` — Better badge colors/contrast
- `frontend/src/components/ui/tabs.tsx` — Tab styling refresh
- `frontend/src/components/ui/button.tsx` — Button polish

**Page Updates (Phase 3):**
- `frontend/src/app/(authenticated)/page.tsx` — Dashboard: KPI cards, greeting, quick actions
- `frontend/src/app/(authenticated)/time-entry/page.tsx` — Grid readability
- `frontend/src/app/(authenticated)/charge-codes/page.tsx` — Tree + detail panel
- `frontend/src/app/(authenticated)/approvals/page.tsx` — Queue + empty states
- `frontend/src/app/(authenticated)/reports/page.tsx` — Chart containers
- `frontend/src/app/(authenticated)/budget/page.tsx` — Budget cards + progress
- `frontend/src/app/(authenticated)/admin/users/page.tsx` — User table
- `frontend/src/app/(authenticated)/admin/calendar/page.tsx` — Calendar grid
- `frontend/src/app/(authenticated)/admin/rates/page.tsx` — Rates table
- `frontend/src/app/login/page.tsx` — Minor polish

### New Files
- `frontend/src/components/shared/EmptyState.tsx` — Reusable empty state with icon + text + optional CTA
- `frontend/src/components/shared/StatCard.tsx` — Reusable KPI stat card with accent bar + icon
- `frontend/src/components/shared/PageHeader.tsx` — Consistent page header with title + description + actions

## Implementation Phases

### Phase 1: Foundation (font + design tokens)
- Replace DM Sans with Inter in root layout
- Update globals.css with new color, shadow, spacing tokens
- Verify all pages render correctly (no broken styles)

### Phase 2: Shared Components
- Create EmptyState, StatCard, PageHeader reusable components
- Update shadcn ui/card, ui/table, ui/badge, ui/tabs
- Redesign sidebar + topbar in auth layout
- Fix ALL CAPS labels across all components

### Phase 3: Page-by-Page Updates
- Update each page to use new components and design patterns
- Replace inline KPI cards with StatCard component
- Replace inline empty messages with EmptyState component
- Add consistent PageHeader to each page
- Fix table headers from ALL CAPS to sentence case
- Reduce mono font usage to charge code IDs only

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
  - Name: builder-foundation
  - Role: Phase 1 — Replace fonts, update CSS design tokens, verify rendering
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-components
  - Role: Phase 2 — Create shared components, update shadcn/ui, redesign sidebar
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-pages
  - Role: Phase 3 — Update all 11 pages with new design system
  - Agent Type: builder
  - Resume: true

- Code Reviewer
  - Name: reviewer
  - Role: Review and fix code quality, efficiency, and reuse issues after builders complete their work
  - Agent Type: code-reviewer
  - Resume: false

- Test Writer
  - Name: tester
  - Role: Run all E2E tests, capture new screenshots, generate test results
  - Agent Type: test-writer
  - Resume: false

- Docs Writer
  - Name: docs
  - Role: Update documentation
  - Agent Type: docs-writer
  - Resume: false

- Validator
  - Name: validator
  - Role: Final read-only validation that all acceptance criteria are met and all tests pass
  - Agent Type: validator
  - Resume: false

## Step by Step Tasks

### 1. Font & Design Token Foundation
- **Task ID**: foundation
- **Depends On**: none
- **Assigned To**: builder-foundation
- **Agent Type**: builder
- **Parallel**: false
- Edit `frontend/src/app/layout.tsx`:
  - Replace `DM_Sans` import with `Inter` from `next/font/google`
  - `Inter({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" })`
  - Keep `Plus_Jakarta_Sans` for `--font-heading` but add weight "800" to array
  - Keep `IBM_Plex_Mono` for `--font-mono`
- Edit `frontend/src/app/globals.css`:
  - Update `:root` variables with new color values from Visual Style section
  - Add new shadow CSS variables (`--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`)
  - Add `--bg-subtle` and `--border-subtle` variables
  - Update `.dark` theme to match
  - Change body font-weight base to include 400, 500, 600
- Verify: `cd frontend && pnpm build` succeeds, no TypeScript errors

### 2. Create Shared Components
- **Task ID**: shared-components
- **Depends On**: foundation
- **Assigned To**: builder-components
- **Agent Type**: builder
- **Parallel**: false
- Create `frontend/src/components/shared/EmptyState.tsx`:
  - Props: `icon` (LucideIcon), `title` (string), `description` (string), `action?` ({ label, href })
  - Centered flex layout, icon 48px muted circle, title 16px/600, description 14px text-secondary, optional Button CTA
- Create `frontend/src/components/shared/StatCard.tsx`:
  - Props: `label` (string), `value` (string | number), `subtext?` (string), `icon?` (LucideIcon), `accent?` (color), `trend?` ({ value, direction })
  - White card with shadow-sm, 4px left colored accent bar, sentence-case label (Inter 11px/500), large value (Inter 24px/600, NOT mono), icon in muted circle top-right
- Create `frontend/src/components/shared/PageHeader.tsx`:
  - Props: `title`, `description?`, `actions?` (ReactNode)
  - Consistent header layout: title (22px/700 heading font) + description + right-aligned actions

### 3. Update Shared UI Components
- **Task ID**: update-ui-components
- **Depends On**: foundation
- **Assigned To**: builder-components
- **Agent Type**: builder
- **Parallel**: false (can run after foundation, same builder continues)
- Edit `frontend/src/components/ui/card.tsx`:
  - Default card class: add `shadow-sm` and `border-[var(--border-subtle)]` to base
  - Add `rounded-xl` by default, `transition-shadow hover:shadow-md`
- Edit `frontend/src/components/ui/table.tsx`:
  - Table header: change from `uppercase text-[10px] tracking-wider` to `text-xs font-medium text-[var(--text-secondary)]` (sentence case)
  - Header bg: `bg-[var(--bg-subtle)]`
  - Row hover: `hover:bg-[var(--bg-card-hover)] transition-colors`
- Edit `frontend/src/components/ui/badge.tsx`:
  - Ensure all badge variants have sufficient contrast (WCAG AA)
  - Role badges: Admin=teal, Charge Manager=blue, PMO=purple, Employee=stone
- Edit `frontend/src/components/ui/tabs.tsx`:
  - Active tab: bolder indicator, better font weight contrast

### 4. Redesign Sidebar & Topbar
- **Task ID**: sidebar-redesign
- **Depends On**: foundation
- **Assigned To**: builder-components
- **Agent Type**: builder
- **Parallel**: false (same builder continues)
- Edit `frontend/src/app/(authenticated)/layout.tsx`:
  - Sidebar background: `#141B2D` (slightly lighter)
  - Section labels ("MAIN", "INSIGHT", "ADMIN"): change from `text-[10px] uppercase` to `text-[11px] uppercase tracking-wide text-slate-500` — more visible
  - Active nav item: add `bg-[var(--sidebar-active)]` with rounded-lg, teal left border thicker (4px)
  - Hover state: `bg-[var(--sidebar-hover)]` with smooth transition
  - Topbar: add subtle bottom shadow `shadow-xs`, user avatar shows first letter of name (not "U")
  - Fix sidebar RBAC: conditionally render admin section based on user role (fetch from `/api/v1/users/me`)

### 5. Update Dashboard Page
- **Task ID**: update-dashboard
- **Depends On**: shared-components, update-ui-components, sidebar-redesign
- **Assigned To**: builder-pages
- **Agent Type**: builder
- **Parallel**: false
- Replace inline KPI cards with `<StatCard>` components
- Replace "HOURS THIS PERIOD" → "Hours this period" (sentence case)
- Greeting section: increase title size to 28px/700 (display), better spacing
- Timesheet mini-chart: add subtle card wrapper with shadow
- Empty "Pending Approvals" and "Team Status" sections: use `<EmptyState>` component
- Quick action buttons at bottom: style as filled + outlined button group

### 6. Update Time Entry Page
- **Task ID**: update-time-entry
- **Depends On**: shared-components, update-ui-components
- **Assigned To**: builder-pages
- **Agent Type**: builder
- **Parallel**: false (same builder continues)
- Table header: sentence case ("Charge Code", "Mon 16", not all caps)
- Grid cells: increase padding, better focus state (teal ring instead of default)
- Daily Total row: bolder styling, separate visually from data rows
- Variance row: keep red for negative but softer red text, add subtle bg tint
- "Save Draft" / "Submit" buttons: ensure consistent spacing and sizing
- Period navigator: larger chevrons, clearer "Week of" text

### 7. Update Charge Codes Page
- **Task ID**: update-charge-codes
- **Depends On**: shared-components, update-ui-components
- **Assigned To**: builder-pages
- **Agent Type**: builder
- **Parallel**: false
- Tree panel: better indentation, node hover effect, tree connector lines
- Detail panel: use card sections with subtle dividers
- Create dialog: ensure form fields have proper spacing
- Search input: more prominent with icon
- Filter dropdowns: ensure consistent sizing

### 8. Update Approvals Page
- **Task ID**: update-approvals
- **Depends On**: shared-components, update-ui-components
- **Assigned To**: builder-pages
- **Agent Type**: builder
- **Parallel**: false
- Empty state: use `<EmptyState icon={CheckCircle} title="No pending approvals" description="Timesheets submitted by your team will appear here" />`
- Tab styling: use updated tabs
- Approval cards: add employee avatar, better layout for name/period/hours
- History table: sentence case headers, better row styling

### 9. Update Reports & Budget Pages
- **Task ID**: update-reports-budget
- **Depends On**: shared-components, update-ui-components
- **Assigned To**: builder-pages
- **Agent Type**: builder
- **Parallel**: false
- Reports: Replace KPI cards with StatCard, chart containers with proper card wrapping, filter bar spacing
- Budget: Replace KPI cards with StatCard (with colored top accent), progress bars with smoother gradients, "No budget data" → EmptyState
- Currency display: use Inter font NOT mono (฿5,000,000 not in IBM Plex Mono)

### 10. Update Admin Pages
- **Task ID**: update-admin
- **Depends On**: shared-components, update-ui-components
- **Assigned To**: builder-pages
- **Agent Type**: builder
- **Parallel**: false
- Users: Table headers sentence case, role badges with new colors, better action buttons (icon-only → icon+text on hover)
- Calendar: Month grid slightly larger cells, better holiday highlighting (soft red bg not just red text), weekends more subtle
- Rates: Table sentence case, reduce "L-TEST-xxx" visual noise (truncate + tooltip)
- All admin pages: consistent PageHeader with title + description

### 11. Update Login Page
- **Task ID**: update-login
- **Depends On**: foundation
- **Assigned To**: builder-pages
- **Agent Type**: builder
- **Parallel**: true (independent of other pages)
- Minor polish: ensure Inter font renders, check form field styling, adjust card shadow
- Keep existing dark theme background — it works well

### 12. Code Review
- **Task ID**: code-review
- **Depends On**: update-dashboard, update-time-entry, update-charge-codes, update-approvals, update-reports-budget, update-admin, update-login
- **Assigned To**: reviewer
- **Agent Type**: code-reviewer
- **Parallel**: false
- Review all modified files for:
  - Consistent use of design tokens (no hardcoded colors)
  - Reuse of shared components (StatCard, EmptyState, PageHeader)
  - No duplicate styles — extract to shared classes
  - Responsive behavior preserved (mobile views)
  - Accessibility: color contrast, focus states, aria labels
- Fix all issues found

### 13. Run Tests & Capture Screenshots
- **Task ID**: write-tests
- **Depends On**: code-review
- **Assigned To**: tester
- **Agent Type**: test-writer
- **Parallel**: false
- Run ALL existing E2E tests: `cd frontend && npx playwright test --project=desktop`
- All 45+ tests MUST still pass (no visual regressions breaking functionality)
- Re-capture ALL screenshots (static page + workflow evidence) with new design
- Update test-cases.csv, test-cases.md, summary.md
- Report any test failures caused by selector changes (fix in test code if needed)

### 14. Update Docs
- **Task ID**: update-docs
- **Depends On**: write-tests
- **Assigned To**: docs
- **Agent Type**: docs-writer
- **Parallel**: false
- Update `docs/architecture.md` — note the design system changes (font, color tokens)
- Update `docs/troubleshooting.md` — add note about font changes if relevant
- Verify all doc links resolve

### 15. Validate Final Output
- **Task ID**: validate-all
- **Depends On**: code-review, write-tests, update-docs
- **Assigned To**: validator
- **Agent Type**: validator
- **Parallel**: false
- Run all validation commands
- Verify ALL E2E tests pass
- Verify new screenshots show visual improvements (not just same as before)
- Compare before/after screenshots — visual regression check
- Verify runtime: all pages load, no JS errors

### 16. Heal Failures (if any)
- **Task ID**: heal
- **Depends On**: validate-all
- **Assigned To**: team-lead (you)
- **Parallel**: false
- **Max Retries**: 2
- Route failures per Healing Rules

## Pipeline

```
Foundation (font + tokens) → Shared Components + UI Updates + Sidebar → Pages (8 pages parallel-ish) → Code Review → Tests + Screenshots → Docs → Validate → Heal
```

## Acceptance Criteria

### Feature Criteria

- [ ] Body font is Inter (not DM Sans), rendering at 14px/400-500 with good readability
      Verified by: E2E-DASH-01 (dashboard KPI data loaded — visual check in screenshot)
- [ ] KPI card labels are sentence case (not ALL CAPS)
      Verified by: E2E-DASH-01 snap, E2E-RPT-01 snap, E2E-BUD-01 snap (screenshots show sentence case)
- [ ] Currency and hour values use Inter font (not IBM Plex Mono)
      Verified by: E2E-BUD-01 snap (budget values in Inter)
- [ ] Mono font used only for charge code IDs (ACT-001, PRG-001)
      Verified by: E2E-CC-01 snap (charge code ID in mono, name in Inter)
- [ ] Cards have subtle shadows and rounded corners
      Verified by: All page screenshots (visual check)
- [ ] Table headers are sentence case with bg-subtle background
      Verified by: E2E-USR-01 snap (user table), E2E-RATE-01 snap (rates table)
- [ ] Empty states show icon + title + description (not plain text)
      Verified by: E2E-AP-01 snap (approvals empty state if no pending)
- [ ] Sidebar admin section hidden for non-admin roles
      Verified by: E2E-RBAC-01 (employee sidebar — no admin items)
- [ ] Secondary text contrast improved (darker than before)
      Verified by: All screenshots (visual check)
- [ ] All 45+ existing E2E tests still pass (no functional regression)
      Verified by: E2E test run results (0 failures)

### E2E Test Specifications

No new E2E tests needed — this is a visual-only change. All existing E2E tests must continue passing. New screenshots will be captured to document the visual improvements.

```
E2E-VIS-01: Visual regression check — all pages render with new design
  Given: All existing E2E tests run with new design
  Snap: dashboard--desktop.png, time-entry--desktop.png, charge-codes--desktop.png, approvals--desktop.png, reports--desktop.png, budget--desktop.png (all pages)
  Then: All 45+ E2E tests pass
  Then: Screenshots show visible design improvements (Inter font, sentence case labels, shadows on cards)
```

### Quality Criteria
- Code review passes
- All E2E tests pass (0 regressions)
- Consistent use of design tokens — no hardcoded hex colors
- Shared components used (StatCard, EmptyState, PageHeader) — no duplicate patterns

### Documentation Criteria
- docs/architecture.md updated with design system notes
- All doc links resolve

### Runtime Criteria
- Frontend builds: `cd frontend && pnpm build`
- All pages load at http://localhost:3000
- All E2E tests pass: `cd frontend && npx playwright test --project=desktop`

## Validation Commands

- `cd frontend && pnpm build 2>&1 | tail -3` — Frontend builds without errors
- `cd frontend && npx playwright test --project=desktop --reporter=list 2>&1 | tail -20` — All E2E tests pass
- `cd backend && pnpm test 2>&1 | tail -5` — Backend unit tests pass (no regressions)
- `grep -q 'Inter' frontend/src/app/layout.tsx` — Inter font is imported
- `grep -c 'uppercase.*tracking' frontend/src/app/\(authenticated\)/page.tsx | xargs test 2 -ge` — Reduced ALL CAPS usage on dashboard
- `test -f frontend/src/components/shared/EmptyState.tsx` — EmptyState component created
- `test -f frontend/src/components/shared/StatCard.tsx` — StatCard component created
- `test -f frontend/src/components/shared/PageHeader.tsx` — PageHeader component created
- `grep -q 'shadow' frontend/src/app/globals.css` — Shadow tokens defined
- `test -f docs/test-results/summary.md` — Test summary exists
- `test -f docs/test-results/e2e/e2e-results.json` — E2E results exist
- `ls docs/test-results/screenshots/*--desktop.png 2>/dev/null | wc -l | xargs test 6 -le` — At least 6 screenshots
- `test -f docs/env-setup.md` — Env setup exists
- `test -f docs/architecture.md` — Architecture exists
- `test -f docs/troubleshooting.md` — Troubleshooting exists

## Healing Rules

- `pnpm build` → builder-foundation — Fix build errors from CSS/font changes
- `playwright test` → tester — Fix E2E tests broken by selector changes (update selectors, not implementation)
- `pnpm test` → tester — Fix unit tests broken by component changes
- `StatCard\|EmptyState\|PageHeader` → builder-components — Fix or create missing shared components
- `uppercase\|ALL CAPS` → builder-pages — Remove remaining ALL CAPS labels
- `shadow\|font` → builder-foundation — Fix CSS variable issues
- `sidebar\|RBAC` → builder-components — Fix sidebar role visibility
- `screenshots` → tester — Re-capture screenshots after fixes
- `broken link` → docs-writer — Fix documentation links
- `code review` → reviewer — Re-review after fixes

## Notes
- Inter font is free on Google Fonts and has excellent Thai script support (important for Thai user names)
- The color palette keeps teal as primary brand color — only adjusts supporting colors and contrast
- All existing E2E test selectors should still work since we're changing CSS/styling, not DOM structure or element IDs
- If any E2E test breaks due to changed text (e.g., a test looks for "HOURS THIS PERIOD" but we changed to "Hours this period"), the TEST should be updated to match the new text — the design change is correct
- shadcn/ui components can be updated in-place since they're in `src/components/ui/` (not node_modules)
- Sidebar RBAC fix from specs/e2e-workflow-all-roles.md should be included in the sidebar redesign task
