# Frontend Unit Test Results

**Date**: 2026-03-17
**Runner**: Vitest v4.1.0 + React Testing Library
**Total**: 274 tests | 274 passed | 0 failed
**Test Files**: 27 suites

## Test Suites

| Suite File | Tests | Status |
|---|---|---|
| `lib/api.test.ts` | 20 | PASS |
| `app/(authenticated)/page.test.tsx` | 7 | PASS |
| `app/login/page.test.tsx` | 8 | PASS |
| `components/approvals/ApprovalQueue.test.tsx` | 21 | PASS |
| `components/approvals/BulkApprovalBar.test.tsx` | 10 | PASS |
| `components/approvals/TimesheetReview.test.tsx` | 9 | PASS |
| `components/charge-codes/AccessManager.test.tsx` | 11 | PASS |
| `components/charge-codes/ChargeCodeForm.test.tsx` | 20 | PASS |
| `components/charge-codes/ChargeCodeTree.test.tsx` | 16 | PASS |
| `components/reports/ActivityPie.test.tsx` | 11 | PASS |
| `components/reports/AlertList.test.tsx` | 16 | PASS |
| `components/reports/BudgetChart.test.tsx` | 9 | PASS |
| `components/reports/ChargeabilityGauge.test.tsx` | 8 | PASS |
| `components/reports/UtilizationChart.test.tsx` | 8 | PASS |
| `components/timesheet/ChargeCodeSelector.test.tsx` | 11 | PASS |
| `components/timesheet/EntryCell.test.tsx` | 18 | PASS |
| `components/timesheet/TimesheetGrid.test.tsx` | 16 | PASS |
| `app/(authenticated)/approvals/page.test.tsx` | 6 | PASS |
| `app/(authenticated)/budget/page.test.tsx` | 4 | PASS |
| `app/(authenticated)/charge-codes/page.test.tsx` | 5 | PASS |
| `app/(authenticated)/profile/page.test.tsx` | 6 | PASS |
| `app/(authenticated)/reports/page.test.tsx` | 7 | PASS |
| `app/(authenticated)/settings/page.test.tsx` | 6 | PASS |
| `app/(authenticated)/time-entry/page.test.tsx` | 6 | PASS |
| `app/(authenticated)/admin/calendar/page.test.tsx` | 6 | PASS |
| `app/(authenticated)/admin/rates/page.test.tsx` | 4 | PASS |
| `app/(authenticated)/admin/users/page.test.tsx` | 5 | PASS |

## Test Details

### lib/api.test.ts

| Test | Status |
|---|---|
| api.ts — request function > successful requests > should resolve with parsed JSON on a 200 response | pass |
| api.ts — request function > successful requests > should send GET request without body | pass |
| api.ts — request function > successful requests > should send POST request with serialized JSON body | pass |
| api.ts — request function > successful requests > should send PUT request with serialized JSON body | pass |
| api.ts — request function > successful requests > should send DELETE request | pass |
| api.ts — request function > successful requests > should include Authorization Bearer header when session exists | pass |
| api.ts — request function > successful requests > should include Content-Type: application/json header | pass |
| api.ts — request function > 401 Unauthorized — session expired flow > should call toast.error with session expired message on 401 | pass |
| api.ts — request function > 401 Unauthorized — session expired flow > should redirect window.location.href to /login on 401 | pass |
| api.ts — request function > 401 Unauthorized — session expired flow > should throw an error with the response message on 401 | pass |
| api.ts — request function > non-401 errors — toast and re-throw > should call toast.error with the error message on 400 | pass |
| api.ts — request function > non-401 errors — toast and re-throw > should call toast.error with the error message on 403 | pass |
| api.ts — request function > non-401 errors — toast and re-throw > should call toast.error with the error message on 404 | pass |
| api.ts — request function > non-401 errors — toast and re-throw > should call toast.error with the error message on 500 | pass |
| api.ts — request function > non-401 errors — toast and re-throw > should NOT redirect to /login on non-401 errors | pass |
| api.ts — request function > non-401 errors — toast and re-throw > should throw error with message from response body | pass |
| api.ts — request function > error — malformed or unparseable response body > should fallback to "Request failed" when response body is not valid JSON | pass |
| api.ts — request function > error — malformed or unparseable response body > should fallback to "HTTP 503" when response body has no message field | pass |
| api.ts — request function > API URL construction > should prepend API_URL and /api/v1 to the path | pass |
| api.ts — session without token > should not include Authorization header when session is null | pass |

### app/(authenticated)/page.test.tsx

| Test | Status |
|---|---|
| DashboardPage > should render status banner with week period | pass |
| DashboardPage > should render 4 metric cards | pass |
| DashboardPage > should render Recent Entries section | pass |
| DashboardPage > should render Alerts & Notifications section | pass |
| DashboardPage > should render quick action Log Time button | pass |
| DashboardPage > should render My Codes quick action | pass |
| DashboardPage > should render progress bar tracking area | pass |

### app/login/page.test.tsx

| Test | Status |
|---|---|
| LoginPage > should render the logo/branding | pass |
| LoginPage > should render email input | pass |
| LoginPage > should render password input | pass |
| LoginPage > should render Sign In button | pass |
| LoginPage > should render Microsoft SSO button | pass |
| LoginPage > should render Forgot password link | pass |
| LoginPage > should render "or" divider | pass |
| LoginPage > should render subtitle text | pass |

### components/approvals/ApprovalQueue.test.tsx

| Test | Status |
|---|---|
| ApprovalQueue > rendering > should show empty state when no items | pass |
| ApprovalQueue > rendering > should render table headers correctly | pass |
| ApprovalQueue > rendering > should render employee name in table row | pass |
| ApprovalQueue > rendering > should render employee department | pass |
| ApprovalQueue > rendering > should render hours | pass |
| ApprovalQueue > rendering > should show warning indicator for hours below 40 | pass |
| ApprovalQueue > rendering > should render submitted status badge as Pending | pass |
| ApprovalQueue > rendering > should render manager_approved status badge | pass |
| ApprovalQueue > rendering > should render multiple rows for multiple items | pass |
| ApprovalQueue > checkbox selection > should render a select-all checkbox in the header | pass |
| ApprovalQueue > checkbox selection > should select all items when select-all checkbox is checked | pass |
| ApprovalQueue > checkbox selection > should deselect all when select-all is clicked again | pass |
| ApprovalQueue > checkbox selection > should allow individual row selection | pass |
| ApprovalQueue > bulk approval bar > should show bulk approval bar when items are selected | pass |
| ApprovalQueue > bulk approval bar > should not show bulk approval bar when nothing is selected | pass |
| ApprovalQueue > approve action > should call api.post when approve button is clicked | pass |
| ApprovalQueue > approve action > should call onRefresh after approve | pass |
| ApprovalQueue > reject dialog > should open reject dialog when reject button is clicked | pass |
| ApprovalQueue > reject dialog > should not submit rejection without a comment | pass |
| ApprovalQueue > status badges > should show locked badge for locked status | pass |
| ApprovalQueue > status badges > should show Rejected badge for rejected status | pass |

### components/approvals/BulkApprovalBar.test.tsx

| Test | Status |
|---|---|
| BulkApprovalBar > when count is 0 > should not render anything | pass |
| BulkApprovalBar > when count > 0 > should render the count | pass |
| BulkApprovalBar > when count > 0 > should render Approve Selected button | pass |
| BulkApprovalBar > when count > 0 > should render Reject Selected button | pass |
| BulkApprovalBar > when count > 0 > should call onApprove when Approve Selected is clicked | pass |
| BulkApprovalBar > when count > 0 > should call onReject when Reject Selected is clicked | pass |
| BulkApprovalBar > when count > 0 > should disable buttons when loading is true | pass |
| BulkApprovalBar > when count > 0 > should show singular "1 selected" for count of 1 | pass |
| BulkApprovalBar > when count > 0 > should render check icon in approve button | pass |
| BulkApprovalBar > when count > 0 > should render x icon in reject button | pass |

### components/approvals/TimesheetReview.test.tsx

| Test | Status |
|---|---|
| TimesheetReview > loading state > should show loading skeleton initially | pass |
| TimesheetReview > success state > should render charge code column header | pass |
| TimesheetReview > success state > should render Total column header | pass |
| TimesheetReview > success state > should render charge code names | pass |
| TimesheetReview > success state > should render charge code IDs | pass |
| TimesheetReview > success state > should render Daily Total row | pass |
| TimesheetReview > error/fallback state > should render error message when API fails | pass |
| TimesheetReview > error/fallback state > should render retry button when API fails | pass |
| TimesheetReview > empty state > should render empty state when no entries | pass |

### components/charge-codes/AccessManager.test.tsx

| Test | Status |
|---|---|
| AccessManager > rendering > should render "Assigned Users" heading | pass |
| AccessManager > rendering > should render the Add button | pass |
| AccessManager > rendering > should render assigned user names | pass |
| AccessManager > rendering > should render assigned user emails | pass |
| AccessManager > rendering > should show empty state when no users assigned | pass |
| AccessManager > add user flow > should toggle add user panel when Add button is clicked | pass |
| AccessManager > add user flow > should show available users in add panel (excludes already assigned) | pass |
| AccessManager > add user flow > should call api.put when a user is added | pass |
| AccessManager > add user flow > should call onUpdate after adding a user | pass |
| AccessManager > remove user > should render remove buttons for each assigned user | pass |
| AccessManager > remove user > should call api.put with removeUserIds when remove is clicked | pass |

### components/charge-codes/ChargeCodeForm.test.tsx

| Test | Status |
|---|---|
| ChargeCodeForm > create mode (no editData) > should render "Create Charge Code" title | pass |
| ChargeCodeForm > create mode (no editData) > should render Name field | pass |
| ChargeCodeForm > create mode (no editData) > should render Level dropdown in create mode | pass |
| ChargeCodeForm > create mode (no editData) > should render Program Name field | pass |
| ChargeCodeForm > create mode (no editData) > should render Cost Center field | pass |
| ChargeCodeForm > create mode (no editData) > should render Budget field | pass |
| ChargeCodeForm > create mode (no editData) > should render Valid From and Valid To date fields | pass |
| ChargeCodeForm > create mode (no editData) > should render Billable checkbox checked by default | pass |
| ChargeCodeForm > create mode (no editData) > should render Cancel and Create buttons | pass |
| ChargeCodeForm > create mode (no editData) > should call onOpenChange(false) when Cancel is clicked | pass |
| ChargeCodeForm > create mode (no editData) > should call api.post when form is submitted | pass |
| ChargeCodeForm > create mode (no editData) > should call onSuccess after successful create | pass |
| ChargeCodeForm > edit mode (with editData) > should render "Edit Charge Code" title | pass |
| ChargeCodeForm > edit mode (with editData) > should populate Name field with existing value | pass |
| ChargeCodeForm > edit mode (with editData) > should not render Level dropdown in edit mode | pass |
| ChargeCodeForm > edit mode (with editData) > should render Update button instead of Create | pass |
| ChargeCodeForm > edit mode (with editData) > should uncheck Billable checkbox when editData.isBillable is false | pass |
| ChargeCodeForm > edit mode (with editData) > should call api.put when form is submitted in edit mode | pass |
| ChargeCodeForm > error handling > should display error message when api.post fails | pass |
| ChargeCodeForm > closed state > should not render dialog when open is false | pass |

### components/charge-codes/ChargeCodeTree.test.tsx

| Test | Status |
|---|---|
| ChargeCodeTree > rendering > should show empty state when tree is empty | pass |
| ChargeCodeTree > rendering > should render top-level program nodes | pass |
| ChargeCodeTree > rendering > should render PRG level badges for programs | pass |
| ChargeCodeTree > rendering > should render correct level badges for each level | pass |
| ChargeCodeTree > rendering > should display budget amount when provided | pass |
| ChargeCodeTree > rendering > should not display budget amount when not provided | pass |
| ChargeCodeTree > expand/collapse > should expand top-level nodes by default (depth < 1) | pass |
| ChargeCodeTree > expand/collapse > should show expand icon for nodes with children | pass |
| ChargeCodeTree > expand/collapse > should show collapse icon for collapsed nodes with children | pass |
| ChargeCodeTree > expand/collapse > should expand a collapsed node when chevron is clicked | pass |
| ChargeCodeTree > expand/collapse > should collapse an expanded node when chevron is clicked | pass |
| ChargeCodeTree > selection > should call onSelect with the node id when a node is clicked | pass |
| ChargeCodeTree > selection > should visually highlight the selected node | pass |
| ChargeCodeTree > selection > should not highlight unselected nodes | pass |
| ChargeCodeTree > hierarchy > should render project nodes nested under program | pass |
| ChargeCodeTree > hierarchy > should render nodes with increasing indentation for depth | pass |

### components/reports/ActivityPie.test.tsx

| Test | Status |
|---|---|
| ActivityPie > with data > should render ResponsiveContainer | pass |
| ActivityPie > with data > should render PieChart | pass |
| ActivityPie > with data > should render Pie with correct item count | pass |
| ActivityPie > with data > should render Pie with hours dataKey | pass |
| ActivityPie > with data > should render Pie with category nameKey | pass |
| ActivityPie > with data > should render as donut (innerRadius > 0) | pass |
| ActivityPie > with data > should render Cell components for each item | pass |
| ActivityPie > with data > should render Legend | pass |
| ActivityPie > with data > should render Tooltip | pass |
| ActivityPie > with empty data > should render empty state message | pass |
| ActivityPie > with empty data > should not render pie chart when data is empty | pass |

### components/reports/AlertList.test.tsx

| Test | Status |
|---|---|
| AlertList > rendering > should render Severity column header | pass |
| AlertList > rendering > should render Charge Code column header | pass |
| AlertList > rendering > should render Budget column header | pass |
| AlertList > rendering > should render Actual column header | pass |
| AlertList > rendering > should render Overrun column header | pass |
| AlertList > rendering > should render all alert names | pass |
| AlertList > rendering > should render charge code IDs | pass |
| AlertList > rendering > should render formatted budget amounts | pass |
| AlertList > rendering > should render severity indicators for all alerts | pass |
| AlertList > sorting > should sort by severity by default (red first) | pass |
| AlertList > sorting > should sort by overrun when Overrun header is clicked | pass |
| AlertList > sorting > should sort by severity when Severity header is clicked | pass |
| AlertList > expand row > should show root cause when row is clicked and rootCauseActivity exists | pass |
| AlertList > expand row > should collapse expanded row when clicked again | pass |
| AlertList > expand row > should not show expanded row for alert with no rootCauseActivity | pass |
| AlertList > empty state > should render empty state message when no alerts | pass |

### components/reports/BudgetChart.test.tsx

| Test | Status |
|---|---|
| BudgetChart > with data > should render ResponsiveContainer | pass |
| BudgetChart > with data > should render BarChart with data | pass |
| BudgetChart > with data > should render Actual bar | pass |
| BudgetChart > with data > should render Budget bar | pass |
| BudgetChart > with data > should render Legend | pass |
| BudgetChart > with data > should render Tooltip | pass |
| BudgetChart > with data > should render CartesianGrid | pass |
| BudgetChart > with empty data > should render empty state message when no data | pass |
| BudgetChart > with empty data > should not render bar chart when data is empty | pass |

### components/reports/ChargeabilityGauge.test.tsx

| Test | Status |
|---|---|
| ChargeabilityGauge > with data > should render ResponsiveContainer | pass |
| ChargeabilityGauge > with data > should render BarChart | pass |
| ChargeabilityGauge > with data > should render a reference line for the target | pass |
| ChargeabilityGauge > with data > should render target label on reference line | pass |
| ChargeabilityGauge > with data > should render rate bar | pass |
| ChargeabilityGauge > with empty data > should render empty state message | pass |
| ChargeabilityGauge > with empty data > should not render bar chart when data is empty | pass |
| ChargeabilityGauge > color coding > should render Cell components for each member | pass |

### components/reports/UtilizationChart.test.tsx

| Test | Status |
|---|---|
| UtilizationChart > with data > should render ResponsiveContainer | pass |
| UtilizationChart > with data > should render BarChart with correct item count | pass |
| UtilizationChart > with data > should render rate bar with Utilization name | pass |
| UtilizationChart > with data > should render XAxis with department dataKey | pass |
| UtilizationChart > with data > should render Cell components for color coding | pass |
| UtilizationChart > with data > should render Tooltip | pass |
| UtilizationChart > with empty data > should render empty state message | pass |
| UtilizationChart > with empty data > should not render bar chart when data is empty | pass |

### components/timesheet/ChargeCodeSelector.test.tsx

| Test | Status |
|---|---|
| ChargeCodeSelector > when there are unused codes > should render the select trigger with placeholder | pass |
| ChargeCodeSelector > when there are unused codes > should render select items for each unused code | pass |
| ChargeCodeSelector > when there are unused codes > should not render items for already-used codes | pass |
| ChargeCodeSelector > when there are unused codes > should display charge code IDs in items | pass |
| ChargeCodeSelector > when there are unused codes > should display charge code names in items | pass |
| ChargeCodeSelector > when there are unused codes > should render Billable badge for billable codes | pass |
| ChargeCodeSelector > when there are unused codes > should render Non-billable badge for non-billable codes | pass |
| ChargeCodeSelector > when there are unused codes > should call onSelect with code when selection is made | pass |
| ChargeCodeSelector > when all codes are used > should render a message when all codes are in use | pass |
| ChargeCodeSelector > when all codes are used > should not render the select trigger when all codes are used | pass |
| ChargeCodeSelector > when no codes available > should render all-in-use message when available codes is empty | pass |

### components/timesheet/EntryCell.test.tsx

| Test | Status |
|---|---|
| EntryCell > disabled state (weekend/holiday) > should render disabled cell with dash when value is 0 | pass |
| EntryCell > disabled state (weekend/holiday) > should render disabled cell with formatted value when value > 0 | pass |
| EntryCell > disabled state (weekend/holiday) > should not render an interactive button when disabled | pass |
| EntryCell > empty state (not editing) > should render empty string when value is 0 | pass |
| EntryCell > empty state (not editing) > should render formatted value when value > 0 | pass |
| EntryCell > focus/editing behavior > should switch to input mode when button is clicked | pass |
| EntryCell > focus/editing behavior > should populate input with current value on focus when value > 0 | pass |
| EntryCell > focus/editing behavior > should show empty input on focus when value is 0 | pass |
| EntryCell > focus/editing behavior > should call onChange with parsed value on blur | pass |
| EntryCell > focus/editing behavior > should call onChange with 0 on blur when input is invalid | pass |
| EntryCell > focus/editing behavior > should cap value at 24 when entered value exceeds 24 | pass |
| EntryCell > focus/editing behavior > should call onChange with 0 when negative value entered | pass |
| EntryCell > keyboard navigation > should call onNavigate with "right" when Tab is pressed | pass |
| EntryCell > keyboard navigation > should call onNavigate with "down" when Enter is pressed | pass |
| EntryCell > keyboard navigation > should exit editing mode on Escape | pass |
| EntryCell > billable styling > should apply billable class when isBillable is true and value > 0 | pass |
| EntryCell > note icon > should show note icon on hover when value > 0 | pass |
| EntryCell > note icon > should not show note icon on hover when value is 0 | pass |

### components/timesheet/TimesheetGrid.test.tsx

| Test | Status |
|---|---|
| TimesheetGrid > rendering > should render the charge code column header | pass |
| TimesheetGrid > rendering > should render day headers (Mon through Sun) | pass |
| TimesheetGrid > rendering > should render charge code names in rows | pass |
| TimesheetGrid > rendering > should render charge code IDs | pass |
| TimesheetGrid > rendering > should show empty state message when no rows | pass |
| TimesheetGrid > rendering > should render billable badge for billable charge codes | pass |
| TimesheetGrid > rendering > should render non-billable badge for non-billable charge codes | pass |
| TimesheetGrid > daily totals > should display Daily Total label in footer | pass |
| TimesheetGrid > daily totals > should calculate correct daily total for Monday (8 + 4 = 12) | pass |
| TimesheetGrid > daily totals > should display Required row | pass |
| TimesheetGrid > daily totals > should display Variance row | pass |
| TimesheetGrid > variance indicators > should show negative variance for days under 8 hours | pass |
| TimesheetGrid > variance indicators > should show checkmark for days meeting target hours | pass |
| TimesheetGrid > row totals > should display Total column header | pass |
| TimesheetGrid > remove row button > should show remove button when onRemoveRow is provided and not disabled | pass |
| TimesheetGrid > remove row button > should not show remove button when disabled | pass |

### app/(authenticated)/approvals/page.test.tsx

| Test | Status |
|---|---|
| ApprovalsPage > should render the page title | pass |
| ApprovalsPage > should render Manager/CC Owner tab toggle | pass |
| ApprovalsPage > should render CC Owner tab | pass |
| ApprovalsPage > should render filter bar with period dropdown | pass |
| ApprovalsPage > should render approval queue component | pass |
| ApprovalsPage > should render search input | pass |

### app/(authenticated)/budget/page.test.tsx

| Test | Status |
|---|---|
| BudgetPage > should render the page title | pass |
| BudgetPage > should render overview cards | pass |
| BudgetPage > should render budget metrics | pass |
| BudgetPage > should render budget table or empty state | pass |

### app/(authenticated)/charge-codes/page.test.tsx

| Test | Status |
|---|---|
| ChargeCodesPage > should render toolbar with search input | pass |
| ChargeCodesPage > should render Create New Code button | pass |
| ChargeCodesPage > should render charge code tree panel | pass |
| ChargeCodesPage > should render detail panel on right side | pass |
| ChargeCodesPage > should render the page heading | pass |

### app/(authenticated)/profile/page.test.tsx

| Test | Status |
|---|---|
| ProfilePage > should render user info section | pass |
| ProfilePage > should render email field | pass |
| ProfilePage > should render role badge or field | pass |
| ProfilePage > should render edit profile button or form | pass |
| ProfilePage > should render password change section | pass |
| ProfilePage > should render department field | pass |

### app/(authenticated)/reports/page.test.tsx

| Test | Status |
|---|---|
| ReportsPage > should render the page title | pass |
| ReportsPage > should render filter bar | pass |
| ReportsPage > should render KPI cards | pass |
| ReportsPage > should render Budget Chart component | pass |
| ReportsPage > should render Chargeability Gauge component | pass |
| ReportsPage > should render Activity Pie component | pass |
| ReportsPage > should render Alert List component | pass |

### app/(authenticated)/settings/page.test.tsx

| Test | Status |
|---|---|
| SettingsPage > should render the page title | pass |
| SettingsPage > should render theme toggle section | pass |
| SettingsPage > should render Light and Dark theme options | pass |
| SettingsPage > should render notification preferences section | pass |
| SettingsPage > should render email notification toggle | pass |
| SettingsPage > should render timezone settings | pass |

### app/(authenticated)/time-entry/page.test.tsx

| Test | Status |
|---|---|
| TimeEntryPage > should render period navigator with prev/next controls | pass |
| TimeEntryPage > should render timesheet grid component | pass |
| TimeEntryPage > should render actions bar with Save Draft button | pass |
| TimeEntryPage > should render Submit button | pass |
| TimeEntryPage > should render Add Charge Code button | pass |
| TimeEntryPage > should render the page title | pass |

### app/(authenticated)/admin/calendar/page.test.tsx

| Test | Status |
|---|---|
| AdminCalendarPage > should render the page title | pass |
| AdminCalendarPage > should render year navigation | pass |
| AdminCalendarPage > should render prev/next navigation buttons | pass |
| AdminCalendarPage > should render month names in calendar grid | pass |
| AdminCalendarPage > should render holiday list section | pass |
| AdminCalendarPage > should render Add Holiday button | pass |

### app/(authenticated)/admin/rates/page.test.tsx

| Test | Status |
|---|---|
| AdminRatesPage > should render the page title | pass |
| AdminRatesPage > should render Add Rate button | pass |
| AdminRatesPage > should render rate table column headers | pass |
| AdminRatesPage > should render Add Rate button or empty state | pass |

### app/(authenticated)/admin/users/page.test.tsx

| Test | Status |
|---|---|
| AdminUsersPage > should render the page title | pass |
| AdminUsersPage > should render user management card | pass |
| AdminUsersPage > should render search input | pass |
| AdminUsersPage > should render user table with column headers | pass |
| AdminUsersPage > should render mock user data in table | pass |

