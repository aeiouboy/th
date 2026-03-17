# Frontend Unit Test Results

**Date**: 2026-03-17
**Framework**: Vitest + React Testing Library
**Total**: 273 tests | 27 test files | All passing

---

## Components

### ApprovalQueue.test.tsx — 21 tests PASS

| Test | Category | Result |
|------|----------|--------|
| should show empty state when no items | rendering | PASS |
| should render table headers correctly | rendering | PASS |
| should render employee name in table row | rendering | PASS |
| should render employee department | rendering | PASS |
| should render hours | rendering | PASS |
| should show warning indicator for hours below 40 | rendering | PASS |
| should render submitted status badge as Pending | rendering | PASS |
| should render manager_approved status badge | rendering | PASS |
| should render multiple rows for multiple items | rendering | PASS |
| should render a select-all checkbox in the header | checkbox selection | PASS |
| should select all items when select-all checkbox is checked | checkbox selection | PASS |
| should deselect all when select-all is clicked again | checkbox selection | PASS |
| should allow individual row selection | checkbox selection | PASS |
| should show bulk approval bar when items are selected | bulk approval bar | PASS |
| should not show bulk approval bar when nothing is selected | bulk approval bar | PASS |
| should call api.post when approve button is clicked | approve action | PASS |
| should call onRefresh after approve | approve action | PASS |
| should open reject dialog when reject button is clicked | reject dialog | PASS |
| should not submit rejection without a comment | reject dialog | PASS |
| should show locked badge for locked status | status badges | PASS |
| should show Rejected badge for rejected status | status badges | PASS |

---

### BulkApprovalBar.test.tsx — 10 tests PASS

| Test | Category | Result |
|------|----------|--------|
| should not render anything | when count is 0 | PASS |
| should render the count | when count > 0 | PASS |
| should render Approve Selected button | when count > 0 | PASS |
| should render Reject Selected button | when count > 0 | PASS |
| should call onApprove when Approve Selected is clicked | when count > 0 | PASS |
| should call onReject when Reject Selected is clicked | when count > 0 | PASS |
| should disable buttons when loading is true | when count > 0 | PASS |
| should show singular "1 selected" for count of 1 | when count > 0 | PASS |
| should render check icon in approve button | when count > 0 | PASS |
| should render x icon in reject button | when count > 0 | PASS |

---

### TimesheetReview.test.tsx — 8 tests PASS

| Test | Category | Result |
|------|----------|--------|
| should show loading skeleton initially | loading state | PASS |
| should render charge code column header | success state | PASS |
| should render Total column header | success state | PASS |
| should render charge code names | success state | PASS |
| should render charge code IDs | success state | PASS |
| should render Daily Total row | success state | PASS |
| should render mock data when API fails | error/fallback state | PASS |
| should render empty state when no entries | empty state | PASS |

---

### AccessManager.test.tsx — 11 tests PASS

| Test | Category | Result |
|------|----------|--------|
| should render "Assigned Users" heading | rendering | PASS |
| should render the Add button | rendering | PASS |
| should render assigned user names | rendering | PASS |
| should render assigned user emails | rendering | PASS |
| should show empty state when no users assigned | rendering | PASS |
| should toggle add user panel when Add button is clicked | add user flow | PASS |
| should show available users in add panel (excludes already assigned) | add user flow | PASS |
| should call api.put when a user is added | add user flow | PASS |
| should call onUpdate after adding a user | add user flow | PASS |
| should render remove buttons for each assigned user | remove user | PASS |
| should call api.put with removeUserIds when remove is clicked | remove user | PASS |

---

### ChargeCodeForm.test.tsx — 20 tests PASS

| Test | Category | Result |
|------|----------|--------|
| should render "Create Charge Code" title | create mode | PASS |
| should render Name field | create mode | PASS |
| should render Level dropdown in create mode | create mode | PASS |
| should render Program Name field | create mode | PASS |
| should render Cost Center field | create mode | PASS |
| should render Budget field | create mode | PASS |
| should render Valid From and Valid To date fields | create mode | PASS |
| should render Billable checkbox checked by default | create mode | PASS |
| should render Cancel and Create buttons | create mode | PASS |
| should call onOpenChange(false) when Cancel is clicked | create mode | PASS |
| should call api.post when form is submitted | create mode | PASS |
| should call onSuccess after successful create | create mode | PASS |
| should render "Edit Charge Code" title | edit mode | PASS |
| should populate Name field with existing value | edit mode | PASS |
| should not render Level dropdown in edit mode | edit mode | PASS |
| should render Update button instead of Create | edit mode | PASS |
| should uncheck Billable checkbox when editData.isBillable is false | edit mode | PASS |
| should call api.put when form is submitted in edit mode | edit mode | PASS |
| should display error message when api.post fails | error handling | PASS |
| should not render dialog when open is false | closed state | PASS |

---

### ChargeCodeTree.test.tsx — 16 tests PASS

| Test | Category | Result |
|------|----------|--------|
| should show empty state when tree is empty | rendering | PASS |
| should render top-level program nodes | rendering | PASS |
| should render PRG level badges for programs | rendering | PASS |
| should render correct level badges for each level | rendering | PASS |
| should display budget amount when provided | rendering | PASS |
| should not display budget amount when not provided | rendering | PASS |
| should expand top-level nodes by default (depth < 1) | expand/collapse | PASS |
| should show expand icon for nodes with children | expand/collapse | PASS |
| should show collapse icon for collapsed nodes with children | expand/collapse | PASS |
| should expand a collapsed node when chevron is clicked | expand/collapse | PASS |
| should collapse an expanded node when chevron is clicked | expand/collapse | PASS |
| should call onSelect with the node id when a node is clicked | selection | PASS |
| should visually highlight the selected node | selection | PASS |
| should not highlight unselected nodes | selection | PASS |
| should render project nodes nested under program | hierarchy | PASS |
| should render nodes with increasing indentation for depth | hierarchy | PASS |

---

### ChargeCodeSelector.test.tsx — 11 tests PASS

| Test | Category | Result |
|------|----------|--------|
| should render the select trigger with placeholder | when there are unused codes | PASS |
| should render select items for each unused code | when there are unused codes | PASS |
| should not render items for already-used codes | when there are unused codes | PASS |
| should display charge code IDs in items | when there are unused codes | PASS |
| should display charge code names in items | when there are unused codes | PASS |
| should render Billable badge for billable codes | when there are unused codes | PASS |
| should render Non-billable badge for non-billable codes | when there are unused codes | PASS |
| should call onSelect with code when selection is made | when there are unused codes | PASS |
| should render a message when all codes are in use | when all codes are used | PASS |
| should not render the select trigger when all codes are used | when all codes are used | PASS |
| should render all-in-use message when available codes is empty | when no codes available | PASS |

---

### EntryCell.test.tsx — 18 tests PASS

| Test | Category | Result |
|------|----------|--------|
| should render disabled cell with dash when value is 0 | disabled state (weekend/holiday) | PASS |
| should render disabled cell with formatted value when value > 0 | disabled state (weekend/holiday) | PASS |
| should not render an interactive button when disabled | disabled state (weekend/holiday) | PASS |
| should render empty string when value is 0 | empty state (not editing) | PASS |
| should render formatted value when value > 0 | empty state (not editing) | PASS |
| should switch to input mode when button is clicked | focus/editing behavior | PASS |
| should populate input with current value on focus when value > 0 | focus/editing behavior | PASS |
| should show empty input on focus when value is 0 | focus/editing behavior | PASS |
| should call onChange with parsed value on blur | focus/editing behavior | PASS |
| should call onChange with 0 on blur when input is invalid | focus/editing behavior | PASS |
| should cap value at 24 when entered value exceeds 24 | focus/editing behavior | PASS |
| should call onChange with 0 when negative value entered | focus/editing behavior | PASS |
| should call onNavigate with "right" when Tab is pressed | keyboard navigation | PASS |
| should call onNavigate with "down" when Enter is pressed | keyboard navigation | PASS |
| should exit editing mode on Escape | keyboard navigation | PASS |
| should apply billable class when isBillable is true and value > 0 | billable styling | PASS |
| should show note icon on hover when value > 0 | note icon | PASS |
| should not show note icon on hover when value is 0 | note icon | PASS |

---

### TimesheetGrid.test.tsx — 16 tests PASS

| Test | Category | Result |
|------|----------|--------|
| should render the charge code column header | rendering | PASS |
| should render day headers (Mon through Sun) | rendering | PASS |
| should render charge code names in rows | rendering | PASS |
| should render charge code IDs | rendering | PASS |
| should show empty state message when no rows | rendering | PASS |
| should render billable badge for billable charge codes | rendering | PASS |
| should render non-billable badge for non-billable charge codes | rendering | PASS |
| should display Daily Total label in footer | daily totals | PASS |
| should calculate correct daily total for Monday (8 + 4 = 12) | daily totals | PASS |
| should display Required row | daily totals | PASS |
| should display Variance row | daily totals | PASS |
| should show negative variance for days under 8 hours | variance indicators | PASS |
| should show checkmark for days meeting target hours | variance indicators | PASS |
| should display Total column header | row totals | PASS |
| should show remove button when onRemoveRow is provided and not disabled | remove row button | PASS |
| should not show remove button when disabled | remove row button | PASS |

---

### ActivityPie.test.tsx — 11 tests PASS

| Test | Category | Result |
|------|----------|--------|
| should render ResponsiveContainer | with data | PASS |
| should render PieChart | with data | PASS |
| should render Pie with correct item count | with data | PASS |
| should render Pie with hours dataKey | with data | PASS |
| should render Pie with category nameKey | with data | PASS |
| should render as donut (innerRadius > 0) | with data | PASS |
| should render Cell components for each item | with data | PASS |
| should render Legend | with data | PASS |
| should render Tooltip | with data | PASS |
| should render empty state message | with empty data | PASS |
| should not render pie chart when data is empty | with empty data | PASS |

---

### AlertList.test.tsx — 16 tests PASS

| Test | Category | Result |
|------|----------|--------|
| should render Severity column header | rendering | PASS |
| should render Charge Code column header | rendering | PASS |
| should render Budget column header | rendering | PASS |
| should render Actual column header | rendering | PASS |
| should render Overrun column header | rendering | PASS |
| should render all alert names | rendering | PASS |
| should render charge code IDs | rendering | PASS |
| should render formatted budget amounts | rendering | PASS |
| should render severity indicators for all alerts | rendering | PASS |
| should sort by severity by default (red first) | sorting | PASS |
| should sort by overrun when Overrun header is clicked | sorting | PASS |
| should sort by severity when Severity header is clicked | sorting | PASS |
| should show root cause when row is clicked and rootCauseActivity exists | expand row | PASS |
| should collapse expanded row when clicked again | expand row | PASS |
| should not show expanded row for alert with no rootCauseActivity | expand row | PASS |
| should render empty state message when no alerts | empty state | PASS |

---

### BudgetChart.test.tsx — 9 tests PASS

| Test | Category | Result |
|------|----------|--------|
| should render ResponsiveContainer | with data | PASS |
| should render BarChart with data | with data | PASS |
| should render Actual bar | with data | PASS |
| should render Budget bar | with data | PASS |
| should render Legend | with data | PASS |
| should render Tooltip | with data | PASS |
| should render CartesianGrid | with data | PASS |
| should render empty state message when no data | with empty data | PASS |
| should not render bar chart when data is empty | with empty data | PASS |

---

### ChargeabilityGauge.test.tsx — 8 tests PASS

| Test | Category | Result |
|------|----------|--------|
| should render ResponsiveContainer | with data | PASS |
| should render BarChart | with data | PASS |
| should render a reference line for the target | with data | PASS |
| should render target label on reference line | with data | PASS |
| should render rate bar | with data | PASS |
| should render empty state message | with empty data | PASS |
| should not render bar chart when data is empty | with empty data | PASS |
| should render Cell components for each member | color coding | PASS |

---

### UtilizationChart.test.tsx — 8 tests PASS

| Test | Category | Result |
|------|----------|--------|
| should render ResponsiveContainer | with data | PASS |
| should render BarChart with correct item count | with data | PASS |
| should render rate bar with Utilization name | with data | PASS |
| should render XAxis with department dataKey | with data | PASS |
| should render Cell components for color coding | with data | PASS |
| should render Tooltip | with data | PASS |
| should render empty state message | with empty data | PASS |
| should not render bar chart when data is empty | with empty data | PASS |

---

## Pages

### login.test.tsx — 8 tests PASS

| Test | Result |
|------|--------|
| should render the logo/branding | PASS |
| should render email input | PASS |
| should render password input | PASS |
| should render Sign In button | PASS |
| should render Microsoft SSO button | PASS |
| should render Forgot password link | PASS |
| should render "or" divider | PASS |
| should render subtitle text | PASS |

---

### dashboard.test.tsx — 7 tests PASS

| Test | Result |
|------|--------|
| should render status banner with week period | PASS |
| should render 4 metric cards | PASS |
| should render Recent Entries section | PASS |
| should render Alerts & Notifications section | PASS |
| should render quick action Log Time button | PASS |
| should render My Codes quick action | PASS |
| should render progress bar tracking area | PASS |

---

### time-entry.test.tsx — 6 tests PASS

| Test | Result |
|------|--------|
| should render period navigator with prev/next controls | PASS |
| should render timesheet grid component | PASS |
| should render actions bar with Save Draft button | PASS |
| should render Submit button | PASS |
| should render Add Charge Code button | PASS |
| should render the page title | PASS |

---

### approvals.test.tsx — 6 tests PASS

| Test | Result |
|------|--------|
| should render the page title | PASS |
| should render Manager/CC Owner tab toggle | PASS |
| should render CC Owner tab | PASS |
| should render filter bar with period dropdown | PASS |
| should render approval queue component | PASS |
| should render search input | PASS |

---

### charge-codes.test.tsx — 5 tests PASS

| Test | Result |
|------|--------|
| should render toolbar with search input | PASS |
| should render Create New Code button | PASS |
| should render charge code tree panel | PASS |
| should render detail panel on right side | PASS |
| should render the page heading | PASS |

---

### reports.test.tsx — 7 tests PASS

| Test | Result |
|------|--------|
| should render the page title | PASS |
| should render filter bar | PASS |
| should render KPI cards | PASS |
| should render Budget Chart component | PASS |
| should render Chargeability Gauge component | PASS |
| should render Activity Pie component | PASS |
| should render Alert List component | PASS |

---

### budget.test.tsx — 4 tests PASS

| Test | Result |
|------|--------|
| should render the page title | PASS |
| should render overview cards | PASS |
| should render budget metrics | PASS |
| should render budget table or list | PASS |

---

### profile.test.tsx — 6 tests PASS

| Test | Result |
|------|--------|
| should render user info section | PASS |
| should render email field | PASS |
| should render role badge or field | PASS |
| should render edit profile button or form | PASS |
| should render password change section | PASS |
| should render department field | PASS |

---

### settings.test.tsx — 6 tests PASS

| Test | Result |
|------|--------|
| should render the page title | PASS |
| should render theme toggle section | PASS |
| should render Light and Dark theme options | PASS |
| should render notification preferences section | PASS |
| should render email notification toggle | PASS |
| should render timezone settings | PASS |

---

### admin-calendar.test.tsx — 6 tests PASS

| Test | Result |
|------|--------|
| should render the page title | PASS |
| should render year navigation | PASS |
| should render prev/next navigation buttons | PASS |
| should render month names in calendar grid | PASS |
| should render holiday list section | PASS |
| should render Add Holiday button | PASS |

---

### admin-rates.test.tsx — 4 tests PASS

| Test | Result |
|------|--------|
| should render the page title | PASS |
| should render Add Rate button | PASS |
| should render rate table column headers | PASS |
| should render effective date columns | PASS |

---

### admin-users.test.tsx — 5 tests PASS

| Test | Result |
|------|--------|
| should render the page title | PASS |
| should render Add User button | PASS |
| should render search input | PASS |
| should render user table with column headers | PASS |
| should render mock user data in table | PASS |
