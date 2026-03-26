# Test Cases

> Generated: 2026-03-20 | Total: 612 | Pass: 535 | Fail: 77

## Backend > Approvals

| ID | Title | Priority | Status | File |
|----|-------|----------|--------|------|
| TC-211 | should return empty results when no pending approvals exist | Medium | pass | approvals.service.spec.ts |
| TC-212 | should return timesheets pending approval | Medium | pass | approvals.service.spec.ts |
| TC-213 | should throw NotFoundException when timesheet does not exist | Medium | pass | approvals.service.spec.ts |
| TC-214 | should throw BadRequestException when timesheet is in locked | Medium | pass | approvals.service.spec.ts |
| TC-215 | should throw ForbiddenException when approver is not the emp | Medium | pass | approvals.service.spec.ts |
| TC-216 | should transition timesheet from submitted to locked | Medium | fail | approvals.service.spec.ts |
| TC-217 | should create an audit log entry when approving | Medium | pass | approvals.service.spec.ts |
| TC-218 | should throw BadRequestException when timesheet is manager_a | Medium | pass | approvals.service.spec.ts |
| TC-219 | should throw NotFoundException when timesheet does not exist | Medium | pass | approvals.service.spec.ts |
| TC-220 | should throw BadRequestException when rejecting a locked tim | Medium | pass | approvals.service.spec.ts |
| TC-221 | should reject a submitted timesheet and set status to reject | Medium | pass | approvals.service.spec.ts |
| TC-222 | should create audit log with reject action | Medium | pass | approvals.service.spec.ts |
| TC-223 | should approve multiple timesheets and return results | Medium | pass | approvals.service.spec.ts |
| TC-224 | should include error entry when individual approval fails | Medium | pass | approvals.service.spec.ts |

## Backend > Auth

| ID | Title | Priority | Status | File |
|----|-------|----------|--------|------|
| TC-179 | should allow public routes without a token | Medium | pass | supabase-auth.guard.spec.ts |
| TC-180 | should throw UnauthorizedException when Authorization header | Medium | pass | supabase-auth.guard.spec.ts |
| TC-181 | should throw UnauthorizedException when Authorization header | Medium | pass | supabase-auth.guard.spec.ts |
| TC-182 | should throw UnauthorizedException when JWT verification fai | Medium | pass | supabase-auth.guard.spec.ts |
| TC-183 | should throw UnauthorizedException when user profile is not  | Medium | pass | supabase-auth.guard.spec.ts |
| TC-184 | should allow request and attach profile when JWT is valid | Medium | pass | supabase-auth.guard.spec.ts |
| TC-185 | should allow access when no roles are required | Medium | pass | supabase-auth.guard.spec.ts |
| TC-186 | should allow access when user has the required role | Medium | pass | supabase-auth.guard.spec.ts |
| TC-187 | should throw ForbiddenException when user does not have the  | Medium | pass | supabase-auth.guard.spec.ts |
| TC-188 | should throw ForbiddenException when no user is on the reque | Medium | pass | supabase-auth.guard.spec.ts |
| TC-189 | should allow access when user role matches one of multiple r | Medium | pass | supabase-auth.guard.spec.ts |

## Backend > Budgets

| ID | Title | Priority | Status | File |
|----|-------|----------|--------|------|
| TC-096 | should throw NotFoundException when charge code does not exi | Medium | pass | budgets.service.spec.ts |
| TC-097 | should return budget with percentage when budget record exis | Medium | pass | budgets.service.spec.ts |
| TC-098 | should return 0 percentage when budget is 0 | Medium | pass | budgets.service.spec.ts |
| TC-099 | should return under_budget status when usage is below 80% | Medium | pass | budgets.service.spec.ts |
| TC-100 | should return warning status when usage is between 80-90% | Medium | pass | budgets.service.spec.ts |
| TC-101 | should return critical status when usage is between 90-100% | Medium | pass | budgets.service.spec.ts |
| TC-102 | should return overrun status when usage exceeds 100% | Medium | pass | budgets.service.spec.ts |
| TC-103 | should throw NotFoundException when charge code does not exi | Medium | pass | budgets.service.spec.ts |
| TC-104 | should return null forecast when charge code has no dates | Medium | pass | budgets.service.spec.ts |
| TC-105 | should calculate forecast at completion when dates are prese | Medium | pass | budgets.service.spec.ts |
| TC-106 | should return empty array when no charge codes are over thre | Medium | pass | budgets.service.spec.ts |
| TC-107 | should return yellow alert at 81% usage | Medium | pass | budgets.service.spec.ts |
| TC-108 | should return orange alert at 91% usage | Medium | pass | budgets.service.spec.ts |
| TC-109 | should return red alert at 101% usage | Medium | pass | budgets.service.spec.ts |
| TC-110 | should sort alerts: red first, then orange, then yellow | Medium | pass | budgets.service.spec.ts |
| TC-111 | should return zero summary when no budget records exist | Medium | pass | budgets.service.spec.ts |
| TC-112 | should correctly count over-budget charge codes | Medium | pass | budgets.service.spec.ts |

## Backend > Calendar

| ID | Title | Priority | Status | File |
|----|-------|----------|--------|------|
| TC-225 | should insert weekend entries for a given year | Medium | pass | calendar.service.spec.ts |
| TC-226 | should only insert weekend dates (count matches expected wee | Medium | pass | calendar.service.spec.ts |
| TC-227 | should create a new holiday entry when date does not exist | Medium | pass | calendar.service.spec.ts |
| TC-228 | should update existing entry to be a holiday when date alrea | Medium | pass | calendar.service.spec.ts |
| TC-229 | should throw NotFoundException when holiday does not exist | Medium | pass | calendar.service.spec.ts |
| TC-230 | should throw NotFoundException when entry exists but is not  | Medium | pass | calendar.service.spec.ts |
| TC-231 | should update holiday name successfully | Medium | pass | calendar.service.spec.ts |
| TC-232 | should throw NotFoundException when holiday does not exist | Medium | pass | calendar.service.spec.ts |
| TC-233 | should clear holiday fields (not delete) when entry is also  | Medium | pass | calendar.service.spec.ts |
| TC-234 | should delete the entry entirely when it is only a holiday | Medium | pass | calendar.service.spec.ts |
| TC-235 | should count working days excluding weekends and holidays | Medium | pass | calendar.service.spec.ts |
| TC-236 | should subtract vacation days when userId is provided | Medium | pass | calendar.service.spec.ts |
| TC-237 | should throw BadRequestException when end date is before sta | Medium | pass | calendar.service.spec.ts |
| TC-238 | should create a vacation request successfully | Medium | pass | calendar.service.spec.ts |
| TC-239 | should throw NotFoundException when vacation does not exist | Medium | pass | calendar.service.spec.ts |
| TC-240 | should throw BadRequestException when vacation is not pendin | Medium | pass | calendar.service.spec.ts |
| TC-241 | should throw ForbiddenException when approver is not the man | Medium | pass | calendar.service.spec.ts |
| TC-242 | should approve a pending vacation successfully | Medium | pass | calendar.service.spec.ts |

## Backend > Charge Codes

| ID | Title | Priority | Status | File |
|----|-------|----------|--------|------|
| TC-049 | should create a program-level charge code with auto-generate | Medium | pass | charge-codes.service.spec.ts |
| TC-050 | should auto-generate sequential IDs (PRG-002 after PRG-001) | Medium | pass | charge-codes.service.spec.ts |
| TC-051 | should create a project with PRJ- prefix under a program par | Medium | pass | charge-codes.service.spec.ts |
| TC-052 | should throw BadRequestException when program has a parentId | Medium | pass | charge-codes.service.spec.ts |
| TC-053 | should throw BadRequestException when project has no parentI | Medium | pass | charge-codes.service.spec.ts |
| TC-054 | should throw BadRequestException when project parent is not  | Medium | pass | charge-codes.service.spec.ts |
| TC-055 | should build materialized path from parent | Medium | pass | charge-codes.service.spec.ts |
| TC-056 | should throw NotFoundException when charge code does not exi | Medium | pass | charge-codes.service.spec.ts |
| TC-057 | should return charge code with assigned users | Medium | pass | charge-codes.service.spec.ts |
| TC-058 | should return direct children of a charge code | Medium | pass | charge-codes.service.spec.ts |
| TC-059 | should return empty array for leaf nodes | Medium | pass | charge-codes.service.spec.ts |
| TC-060 | should throw NotFoundException when charge code does not exi | Medium | pass | charge-codes.service.spec.ts |
| TC-061 | should add users to a charge code and cascade to descendants | Medium | fail | charge-codes.service.spec.ts |
| TC-062 | should remove users from a charge code and cascade to descen | Medium | fail | charge-codes.service.spec.ts |
| TC-063 | UNIT-CC-AUTH-01: should throw ForbiddenException when caller | Medium | pass | charge-codes.service.spec.ts |
| TC-064 | UNIT-CC-AUTH-02: should succeed when caller is admin (regard | Medium | fail | charge-codes.service.spec.ts |
| TC-065 | UNIT-CC-AUTH-03: should succeed when caller is the charge co | Medium | fail | charge-codes.service.spec.ts |

## Backend > Charge Codes CR1

| ID | Title | Priority | Status | File |
|----|-------|----------|--------|------|
| TC-113 | should throw NotFoundException when charge code does not exi | Medium | pass | charge-codes-cr1.service.spec.ts |
| TC-114 | should return budget structure with team and person breakdow | Medium | pass | charge-codes-cr1.service.spec.ts |
| TC-115 | should calculate percentage correctly | Medium | pass | charge-codes-cr1.service.spec.ts |
| TC-116 | should group entries by department for team breakdown | Medium | pass | charge-codes-cr1.service.spec.ts |
| TC-117 | should sort team and person breakdowns by hours descending | Medium | pass | charge-codes-cr1.service.spec.ts |
| TC-118 | should handle charge code with no budget record (shows zeros | Medium | pass | charge-codes-cr1.service.spec.ts |
| TC-119 | should throw NotFoundException when charge code does not exi | Medium | pass | charge-codes-cr1.service.spec.ts |
| TC-120 | should throw ForbiddenException when caller is not owner/app | Medium | pass | charge-codes-cr1.service.spec.ts |
| TC-121 | should succeed when caller is the owner | Medium | pass | charge-codes-cr1.service.spec.ts |
| TC-122 | should succeed when caller is admin (not owner) | Medium | pass | charge-codes-cr1.service.spec.ts |
| TC-123 | should include all descendants in affected count | Medium | pass | charge-codes-cr1.service.spec.ts |
| TC-124 | should throw NotFoundException when charge code does not exi | Medium | pass | charge-codes-cr1.service.spec.ts |
| TC-125 | should throw BadRequestException when user already has acces | Medium | pass | charge-codes-cr1.service.spec.ts |
| TC-126 | should throw BadRequestException when pending request alread | Medium | pass | charge-codes-cr1.service.spec.ts |
| TC-127 | should create and return new request when validation passes | Medium | pass | charge-codes-cr1.service.spec.ts |

## Backend > Cost Rates

| ID | Title | Priority | Status | File |
|----|-------|----------|--------|------|
| TC-202 | should return all cost rates ordered by jobGrade and effecti | Medium | pass | cost-rates.service.spec.ts |
| TC-203 | should return empty array when no cost rates exist | Medium | pass | cost-rates.service.spec.ts |
| TC-204 | should create a new cost rate and return it | Medium | pass | cost-rates.service.spec.ts |
| TC-205 | should create cost rate with effectiveTo date when provided | Medium | pass | cost-rates.service.spec.ts |
| TC-206 | should update an existing cost rate and return it | Medium | pass | cost-rates.service.spec.ts |
| TC-207 | should throw NotFoundException when cost rate does not exist | Medium | pass | cost-rates.service.spec.ts |
| TC-208 | should allow partial updates (only jobGrade) | Medium | pass | cost-rates.service.spec.ts |
| TC-209 | should delete a cost rate and return { deleted: true } | Medium | pass | cost-rates.service.spec.ts |
| TC-210 | should throw NotFoundException when cost rate does not exist | Medium | pass | cost-rates.service.spec.ts |

## Backend > Dashboard

| ID | Title | Priority | Status | File |
|----|-------|----------|--------|------|
| TC-190 | should return empty months array and 0 ytdChargeability when | Medium | pass | dashboard.service.spec.ts |
| TC-191 | should calculate ytdChargeability as billable / total hours  | Medium | pass | dashboard.service.spec.ts |
| TC-192 | should return 0 chargeability for months with no hours | Medium | pass | dashboard.service.spec.ts |
| TC-193 | should fill all months from Jan to current month | Medium | pass | dashboard.service.spec.ts |
| TC-194 | should round chargeability to nearest integer | Medium | pass | dashboard.service.spec.ts |
| TC-195 | should aggregate billable and non-billable hours by month | Medium | pass | dashboard.service.spec.ts |
| TC-196 | should return empty arrays when no entries | Medium | pass | dashboard.service.spec.ts |
| TC-197 | should group entries by root program from path | Medium | pass | dashboard.service.spec.ts |
| TC-198 | should calculate percentage from total hours | Medium | pass | dashboard.service.spec.ts |
| TC-199 | should sort programs by hours descending | Medium | pass | dashboard.service.spec.ts |
| TC-200 | should use ccName as fallback when programName is null | Medium | pass | dashboard.service.spec.ts |
| TC-201 | should return both currentPeriod and ytd data independently | Medium | pass | dashboard.service.spec.ts |

## Backend > Notifications

| ID | Title | Priority | Status | File |
|----|-------|----------|--------|------|
| TC-001 | UNIT-NOTIF-01: should insert a notification and return it | Medium | pass | notifications.service.spec.ts |
| TC-002 | UNIT-NOTIF-01b: should return the inserted notification obje | Medium | pass | notifications.service.spec.ts |
| TC-003 | UNIT-NOTIF-02: should return notifications filtered by recip | Medium | pass | notifications.service.spec.ts |
| TC-004 | UNIT-NOTIF-03: findByUser with unreadOnly=true filters to is | Medium | pass | notifications.service.spec.ts |
| TC-005 | UNIT-NOTIF-02b: should respect limit and offset options | Medium | pass | notifications.service.spec.ts |
| TC-006 | UNIT-NOTIF-02c: should return empty array when user has no n | Medium | pass | notifications.service.spec.ts |
| TC-007 | UNIT-NOTIF-04: should return correct unread count | Medium | pass | notifications.service.spec.ts |
| TC-008 | UNIT-NOTIF-04b: should return count 0 when no unread notific | Medium | pass | notifications.service.spec.ts |
| TC-009 | UNIT-NOTIF-04c: should return 0 when result is empty (no row | Medium | pass | notifications.service.spec.ts |
| TC-010 | UNIT-NOTIF-05: should update isRead and readAt when notifica | Medium | pass | notifications.service.spec.ts |
| TC-011 | UNIT-NOTIF-05b: should throw NotFoundException when notifica | Medium | pass | notifications.service.spec.ts |
| TC-012 | UNIT-NOTIF-05c: should throw ForbiddenException when notific | Medium | pass | notifications.service.spec.ts |
| TC-013 | UNIT-NOTIF-06: should bulk update all unread notifications f | Medium | pass | notifications.service.spec.ts |
| TC-014 | UNIT-NOTIF-06b: should return success:true even when no noti | Medium | pass | notifications.service.spec.ts |
| TC-015 | should return empty array initially | Medium | pass | notification.service.spec.ts |
| TC-016 | should clear notifications | Medium | pass | notification.service.spec.ts |
| TC-017 | should send reminders to users who have logged fewer hours t | Medium | pass | notification.service.spec.ts |
| TC-018 | should not send reminder to users with no hours shortfall | Medium | pass | notification.service.spec.ts |
| TC-019 | should skip users whose timesheet is already submitted or ap | Medium | pass | notification.service.spec.ts |
| TC-020 | should still send reminder to users with rejected timesheets | Medium | pass | notification.service.spec.ts |
| TC-021 | should return empty array when all users are on track | Medium | pass | notification.service.spec.ts |
| TC-022 | should return empty array when no users exist | Medium | pass | notification.service.spec.ts |
| TC-023 | should compute expected hours correctly: daysPassed * 8 | Medium | pass | notification.service.spec.ts |
| TC-024 | should include notifications in getNotifications() after sen | Medium | pass | notification.service.spec.ts |
| TC-025 | should send reminder to manager with pending timesheets | Medium | pass | notification.service.spec.ts |
| TC-026 | should send separate notifications to different managers | Medium | pass | notification.service.spec.ts |
| TC-027 | should skip timesheets with no managerId | Medium | pass | notification.service.spec.ts |
| TC-028 | should return empty array when no timesheets are pending | Medium | pass | notification.service.spec.ts |
| TC-029 | should skip manager if their profile is not found in DB | Medium | pass | notification.service.spec.ts |
| TC-030 | should include pending count in subject line | Medium | pass | notification.service.spec.ts |
| TC-031 | should send weekly summary to manager | Medium | pass | notification.service.spec.ts |
| TC-032 | should correctly count completed, pending and not-submitted | Medium | pass | notification.service.spec.ts |
| TC-033 | should handle all reports completed | Medium | pass | notification.service.spec.ts |
| TC-034 | should handle all reports not submitted | Medium | pass | notification.service.spec.ts |
| TC-035 | should skip manager when they have no direct reports | Medium | pass | notification.service.spec.ts |
| TC-036 | should return empty array when no managers exist | Medium | pass | notification.service.spec.ts |
| TC-037 | should include employee names and statuses in the detail sec | Medium | pass | notification.service.spec.ts |
| TC-038 | should send weekly insights to pmo, finance and admin users | Medium | pass | notification.service.spec.ts |
| TC-039 | should calculate chargeability rate correctly | Medium | pass | notification.service.spec.ts |
| TC-040 | should report 0% chargeability when total hours is 0 | Medium | pass | notification.service.spec.ts |
| TC-041 | should list budget overruns when actualSpent > budgetAmount | Medium | pass | notification.service.spec.ts |
| TC-042 | should report 0 overruns when all budgets are under limit | Medium | pass | notification.service.spec.ts |
| TC-043 | should return empty array when no recipients found | Medium | pass | notification.service.spec.ts |
| TC-044 | should include total and billable hours in the body | Medium | pass | notification.service.spec.ts |
| TC-045 | should include the week date range in the subject | Medium | pass | notification.service.spec.ts |
| TC-046 | should return counts for all four notification types | Medium | pass | notification.service.spec.ts |
| TC-047 | should generate sequential IDs starting at notif-1 | Medium | pass | notification.service.spec.ts |
| TC-048 | should increment notification IDs across calls | Medium | pass | notification.service.spec.ts |

## Backend > Reports

| ID | Title | Priority | Status | File |
|----|-------|----------|--------|------|
| TC-259 | should return empty report when charge code does not exist | Medium | fail | reports.service.spec.ts |
| TC-260 | should return report with budget and actuals | Medium | fail | reports.service.spec.ts |
| TC-261 | should include child breakdown in report | Medium | fail | reports.service.spec.ts |
| TC-262 | should return zero chargeability when no hours logged | Medium | fail | reports.service.spec.ts |
| TC-263 | should calculate chargeability correctly (billable/total) | Medium | fail | reports.service.spec.ts |
| TC-264 | should have 80% target chargeability | Medium | fail | reports.service.spec.ts |
| TC-265 | should return empty distribution when no entries exist | Medium | fail | reports.service.spec.ts |
| TC-266 | should calculate percentage for each category | Medium | fail | reports.service.spec.ts |
| TC-267 | should sort distribution by hours descending | Medium | fail | reports.service.spec.ts |
| TC-268 | should fallback to 22 working days when calendar has no data | Medium | fail | reports.service.spec.ts |
| TC-269 | should calculate utilization rate per employee | Medium | fail | reports.service.spec.ts |
| TC-270 | should return formatted budget alerts with overrunAmount cal | Medium | fail | reports.service.spec.ts |
| TC-271 | should pass through severity values from budgets service (re | Medium | fail | reports.service.spec.ts |
| TC-272 | should calculate overrunPercent as percentage over budget | Medium | fail | reports.service.spec.ts |
| TC-273 | should return zero overrunAmount when actual is less than bu | Medium | fail | reports.service.spec.ts |

## Backend > Settings

| ID | Title | Priority | Status | File |
|----|-------|----------|--------|------|
| TC-243 | should return all settings as a key-value record | Medium | pass | settings.service.spec.ts |
| TC-244 | should return empty record when no settings exist | Medium | pass | settings.service.spec.ts |
| TC-245 | should return value for an existing key | Medium | pass | settings.service.spec.ts |
| TC-246 | should return THB as default when default_currency key is no | Medium | pass | settings.service.spec.ts |
| TC-247 | should return empty string for unknown keys not found | Medium | pass | settings.service.spec.ts |
| TC-248 | should upsert a setting and return key-value | Medium | pass | settings.service.spec.ts |

## Backend > Teams Bot

| ID | Title | Priority | Status | File |
|----|-------|----------|--------|------|
| TC-140 | should parse "Log 4h on PRJ-042 today" | Medium | pass | teams-bot.service.spec.ts |
| TC-141 | should parse fractional hours "Log 2.5h on ACT-010 today" | Medium | pass | teams-bot.service.spec.ts |
| TC-142 | should parse "Logged 2h code review ACT-010 yesterday" | Medium | pass | teams-bot.service.spec.ts |
| TC-143 | should use yesterday date when "yesterday" keyword present | Medium | pass | teams-bot.service.spec.ts |
| TC-144 | should use today date when no date keyword and no ISO date | Medium | pass | teams-bot.service.spec.ts |
| TC-145 | should parse an explicit ISO date "Add 3.5h PRJ-042 2026-03- | Medium | pass | teams-bot.service.spec.ts |
| TC-146 | should extract description after charge code | Medium | pass | teams-bot.service.spec.ts |
| TC-147 | should extract description before charge code (e.g. "Logged  | Medium | pass | teams-bot.service.spec.ts |
| TC-148 | should return null when no hours pattern is found | Medium | pass | teams-bot.service.spec.ts |
| TC-149 | should return null when hours is 0 | Medium | pass | teams-bot.service.spec.ts |
| TC-150 | should return null when hours exceed 24 | Medium | pass | teams-bot.service.spec.ts |
| TC-151 | should return null when no charge code pattern is found | Medium | pass | teams-bot.service.spec.ts |
| TC-152 | should handle charge codes with underscores "PRJ_042" | Medium | pass | teams-bot.service.spec.ts |
| TC-153 | should parse "Add 8h on TSK-001 2026-03-15" | Medium | pass | teams-bot.service.spec.ts |
| TC-154 | should return a non-empty array of prompt strings | Medium | pass | teams-bot.service.spec.ts |
| TC-155 | should return help message when command is unrecognized | Medium | pass | teams-bot.service.spec.ts |
| TC-156 | should return help for empty string | Medium | pass | teams-bot.service.spec.ts |
| TC-157 | should log time successfully for a valid command | Medium | fail | teams-bot.service.spec.ts |
| TC-158 | should return error message when charge code is not found in | Medium | pass | teams-bot.service.spec.ts |
| TC-159 | should return parse error message for invalid format | Medium | pass | teams-bot.service.spec.ts |
| TC-160 | should preserve existing entries when adding a new one | Medium | fail | teams-bot.service.spec.ts |
| TC-161 | should return a message type response with suggestedActions  | Medium | fail | teams-bot.service.spec.ts |
| TC-162 | should return budget card when charge code is found | Medium | pass | teams-bot.service.spec.ts |
| TC-163 | should include forecast line when forecastAtCompletion is pr | Medium | pass | teams-bot.service.spec.ts |
| TC-164 | should return error message when no charge code is in the qu | Medium | pass | teams-bot.service.spec.ts |
| TC-165 | should return error when budgets service throws | Medium | pass | teams-bot.service.spec.ts |
| TC-166 | should route "How is budget for PRJ-042?" to budget handler | Medium | pass | teams-bot.service.spec.ts |
| TC-167 | should return "no timesheet" message when none exists for th | Medium | pass | teams-bot.service.spec.ts |
| TC-168 | should return a card with timesheet summary when timesheet e | Medium | pass | teams-bot.service.spec.ts |
| TC-169 | should handle timesheet with no entries gracefully | Medium | pass | teams-bot.service.spec.ts |
| TC-170 | should route "my timesheet" to timesheet handler | Medium | pass | teams-bot.service.spec.ts |
| TC-171 | should return no-hours message when no timesheet exists | Medium | pass | teams-bot.service.spec.ts |
| TC-172 | should return no-hours message when timesheet exists but no  | Medium | pass | teams-bot.service.spec.ts |
| TC-173 | should return total hours logged today | Medium | pass | teams-bot.service.spec.ts |
| TC-174 | should route "hours did i log" to hours today handler | Medium | pass | teams-bot.service.spec.ts |
| TC-175 | should return no-codes message when user has no assigned cha | Medium | pass | teams-bot.service.spec.ts |
| TC-176 | should return card with charge code list when user has codes | Medium | pass | teams-bot.service.spec.ts |
| TC-177 | should include suggestedActions in charge codes response | Medium | pass | teams-bot.service.spec.ts |
| TC-178 | should route "my charge codes" to charge codes handler | Medium | pass | teams-bot.service.spec.ts |

## Backend > Timesheets

| ID | Title | Priority | Status | File |
|----|-------|----------|--------|------|
| TC-066 | should return an empty array when user has no timesheets | Medium | pass | timesheets.service.spec.ts |
| TC-067 | should return periodStart values in descending order | Medium | pass | timesheets.service.spec.ts |
| TC-068 | should return a single period when user has one timesheet | Medium | pass | timesheets.service.spec.ts |
| TC-069 | should normalize a Wednesday to its Monday start | Medium | fail | timesheets.service.spec.ts |
| TC-070 | should return existing timesheet if one already exists for t | Medium | pass | timesheets.service.spec.ts |
| TC-071 | should return null when no timesheet exists for the period | Medium | pass | timesheets.service.spec.ts |
| TC-072 | should return the timesheet when it exists | Medium | pass | timesheets.service.spec.ts |
| TC-073 | should throw NotFoundException when timesheet does not exist | Medium | pass | timesheets.service.spec.ts |
| TC-074 | should return timesheet with entries when it exists | Medium | pass | timesheets.service.spec.ts |
| TC-075 | should throw NotFoundException when timesheet does not exist | Medium | pass | timesheets.service.spec.ts |
| TC-076 | should throw ForbiddenException when timesheet status is sub | Medium | fail | timesheets.service.spec.ts |
| TC-077 | should throw ForbiddenException when timesheet status is loc | Medium | pass | timesheets.service.spec.ts |
| TC-078 | should allow editing when status is draft | Medium | fail | timesheets.service.spec.ts |
| TC-079 | should allow editing when status is rejected | Medium | fail | timesheets.service.spec.ts |
| TC-080 | should validate that charge codes are assigned to the user | Medium | pass | timesheets.service.spec.ts |
| TC-081 | should filter out entries with 0 hours | Medium | fail | timesheets.service.spec.ts |
| TC-082 | should throw NotFoundException when timesheet does not exist | Medium | pass | timesheets.service.spec.ts |
| TC-083 | should throw BadRequestException when status is already subm | Medium | fail | timesheets.service.spec.ts |
| TC-084 | should throw BadRequestException when status is locked | Medium | pass | timesheets.service.spec.ts |
| TC-085 | should transition draft timesheet to submitted when min hour | Medium | fail | timesheets.service.spec.ts |
| TC-086 | should allow resubmitting a rejected timesheet | Medium | fail | timesheets.service.spec.ts |
| TC-087 | should throw BadRequestException when weekday has less than  | Medium | fail | timesheets.service.spec.ts |
| TC-088 | should pass when all weekdays have 8+ hours | Medium | pass | timesheets.service.spec.ts |
| TC-089 | should throw when a weekday has less than 8 hours | Medium | pass | timesheets.service.spec.ts |
| TC-090 | should exclude holidays from validation | Medium | pass | timesheets.service.spec.ts |
| TC-091 | should exclude weekends from validation even without calenda | Medium | pass | timesheets.service.spec.ts |
| TC-092 | should pass when exactly 8 hours logged on weekday | Medium | pass | timesheets.service.spec.ts |
| TC-093 | should report all short days not just the first one | Medium | pass | timesheets.service.spec.ts |
| TC-094 | should pass when no entries at all (days without entries are | Medium | pass | timesheets.service.spec.ts |
| TC-095 | should skip approved vacation days during validation | Medium | pass | timesheets.service.spec.ts |

## Backend > Timesheets CR1

| ID | Title | Priority | Status | File |
|----|-------|----------|--------|------|
| TC-128 | should throw NotFoundException when timesheet does not exist | Medium | pass | timesheets-cr1.service.spec.ts |
| TC-129 | should throw BadRequestException when timesheet is not draft | Medium | pass | timesheets-cr1.service.spec.ts |
| TC-130 | should throw BadRequestException when timesheet already has  | Medium | pass | timesheets-cr1.service.spec.ts |
| TC-131 | should throw NotFoundException when no previous timesheet ex | Medium | pass | timesheets-cr1.service.spec.ts |
| TC-132 | should return empty entries message when previous timesheet  | Medium | pass | timesheets-cr1.service.spec.ts |
| TC-133 | should copy charge codes from previous period and return suc | Medium | pass | timesheets-cr1.service.spec.ts |
| TC-134 | should silently drop entries on full-day vacation days | Medium | pass | timesheets-cr1.service.spec.ts |
| TC-135 | should allow entries on half-day vacation days (hours <= 4) | Medium | pass | timesheets-cr1.service.spec.ts |
| TC-136 | should not allow editing LEAVE-001 entries (system managed) | Medium | pass | timesheets-cr1.service.spec.ts |
| TC-137 | should allow 4h on half-day vacation day when combined with  | Medium | pass | timesheets-cr1.service.spec.ts |
| TC-138 | should fail when half-day vacation day has only 2h work (req | Medium | pass | timesheets-cr1.service.spec.ts |
| TC-139 | should skip full-day vacation days entirely (no hours requir | Medium | pass | timesheets-cr1.service.spec.ts |

## Backend > Users

| ID | Title | Priority | Status | File |
|----|-------|----------|--------|------|
| TC-249 | should return all user profiles | Medium | pass | users.service.spec.ts |
| TC-250 | should return empty array when no profiles exist | Medium | pass | users.service.spec.ts |
| TC-251 | should return the user when found | Medium | pass | users.service.spec.ts |
| TC-252 | should throw NotFoundException when user does not exist | Medium | pass | users.service.spec.ts |
| TC-253 | should update and return the user profile | Medium | pass | users.service.spec.ts |
| TC-254 | should throw NotFoundException when user to update does not  | Medium | pass | users.service.spec.ts |
| TC-255 | should update user role successfully | Medium | pass | users.service.spec.ts |
| TC-256 | should throw NotFoundException when user does not exist | Medium | pass | users.service.spec.ts |
| TC-257 | should update job grade successfully | Medium | pass | users.service.spec.ts |
| TC-258 | should throw NotFoundException when user does not exist | Medium | pass | users.service.spec.ts |

## Frontend > API Client

| ID | Title | Priority | Status | File |
|----|-------|----------|--------|------|
| TC-274 | should resolve with parsed JSON on a 200 response | Medium | pass | api.test.ts |
| TC-275 | should send GET request without body | Medium | pass | api.test.ts |
| TC-276 | should send POST request with serialized JSON body | Medium | pass | api.test.ts |
| TC-277 | should send PUT request with serialized JSON body | Medium | pass | api.test.ts |
| TC-278 | should send DELETE request | Medium | pass | api.test.ts |
| TC-279 | should include Authorization Bearer header when session exis | Medium | pass | api.test.ts |
| TC-280 | should include Content-Type: application/json header | Medium | pass | api.test.ts |
| TC-281 | should call toast.error with session expired message on 401 | Medium | pass | api.test.ts |
| TC-282 | should redirect window.location.href to /login on 401 | Medium | pass | api.test.ts |
| TC-283 | should throw an error with the response message on 401 | Medium | pass | api.test.ts |
| TC-284 | should call toast.error with the error message on 400 | Medium | pass | api.test.ts |
| TC-285 | should call toast.error with the error message on 403 | Medium | pass | api.test.ts |
| TC-286 | should call toast.error with the error message on 404 | Medium | pass | api.test.ts |
| TC-287 | should call toast.error with the error message on 500 | Medium | pass | api.test.ts |
| TC-288 | should NOT redirect to /login on non-401 errors | Medium | pass | api.test.ts |
| TC-289 | should throw error with message from response body | Medium | pass | api.test.ts |
| TC-290 | should fallback to "Request failed" when response body is no | Medium | pass | api.test.ts |
| TC-291 | should fallback to "HTTP 503" when response body has no mess | Medium | pass | api.test.ts |
| TC-292 | should prepend API_URL and /api/v1 to the path | Medium | pass | api.test.ts |
| TC-293 | should not include Authorization header when session is null | Medium | pass | api.test.ts |

## Frontend > Approvals

| ID | Title | Priority | Status | File |
|----|-------|----------|--------|------|
| TC-301 | should show empty state when no items | Medium | pass | ApprovalQueue.test.tsx |
| TC-302 | should render table headers correctly | Medium | pass | ApprovalQueue.test.tsx |
| TC-303 | should render employee name in table row | Medium | pass | ApprovalQueue.test.tsx |
| TC-304 | should render employee department | Medium | pass | ApprovalQueue.test.tsx |
| TC-305 | should render hours | Medium | pass | ApprovalQueue.test.tsx |
| TC-306 | should show warning indicator for hours below 40 | Medium | pass | ApprovalQueue.test.tsx |
| TC-307 | should render submitted status badge as Pending | Medium | pass | ApprovalQueue.test.tsx |
| TC-308 | should render manager_approved status badge | Medium | fail | ApprovalQueue.test.tsx |
| TC-309 | should render multiple rows for multiple items | Medium | pass | ApprovalQueue.test.tsx |
| TC-310 | should render a select-all checkbox in the header | Medium | pass | ApprovalQueue.test.tsx |
| TC-311 | should select all items when select-all checkbox is checked | Medium | pass | ApprovalQueue.test.tsx |
| TC-312 | should deselect all when select-all is clicked again | Medium | pass | ApprovalQueue.test.tsx |
| TC-313 | should allow individual row selection | Medium | pass | ApprovalQueue.test.tsx |
| TC-314 | should show bulk approval bar when items are selected | Medium | pass | ApprovalQueue.test.tsx |
| TC-315 | should not show bulk approval bar when nothing is selected | Medium | pass | ApprovalQueue.test.tsx |
| TC-316 | should call api.post when approve button is clicked | Medium | pass | ApprovalQueue.test.tsx |
| TC-317 | should call onRefresh after approve | Medium | pass | ApprovalQueue.test.tsx |
| TC-318 | should open reject dialog when reject button is clicked | Medium | pass | ApprovalQueue.test.tsx |
| TC-319 | should not submit rejection without a comment | Medium | pass | ApprovalQueue.test.tsx |
| TC-320 | should show locked badge for locked status | Medium | pass | ApprovalQueue.test.tsx |
| TC-321 | should show Rejected badge for rejected status | Medium | pass | ApprovalQueue.test.tsx |
| TC-322 | should not render anything | Medium | pass | BulkApprovalBar.test.tsx |
| TC-323 | should render the count | Medium | pass | BulkApprovalBar.test.tsx |
| TC-324 | should render Approve Selected button | Medium | pass | BulkApprovalBar.test.tsx |
| TC-325 | should render Reject Selected button | Medium | pass | BulkApprovalBar.test.tsx |
| TC-326 | should call onApprove when Approve Selected is clicked | Medium | pass | BulkApprovalBar.test.tsx |
| TC-327 | should call onReject when Reject Selected is clicked | Medium | pass | BulkApprovalBar.test.tsx |
| TC-328 | should disable buttons when loading is true | Medium | pass | BulkApprovalBar.test.tsx |
| TC-329 | should show singular "1 selected" for count of 1 | Medium | pass | BulkApprovalBar.test.tsx |
| TC-330 | should render check icon in approve button | Medium | pass | BulkApprovalBar.test.tsx |
| TC-331 | should render x icon in reject button | Medium | pass | BulkApprovalBar.test.tsx |
| TC-332 | should show loading skeleton initially | Medium | pass | TimesheetReview.test.tsx |
| TC-333 | should render charge code column header | Medium | pass | TimesheetReview.test.tsx |
| TC-334 | should render Total column header | Medium | pass | TimesheetReview.test.tsx |
| TC-335 | should render charge code names | Medium | pass | TimesheetReview.test.tsx |
| TC-336 | should render charge code IDs | Medium | pass | TimesheetReview.test.tsx |
| TC-337 | should render Daily Total row | Medium | pass | TimesheetReview.test.tsx |
| TC-338 | should render error message when API fails | Medium | pass | TimesheetReview.test.tsx |
| TC-339 | should render retry button when API fails | Medium | pass | TimesheetReview.test.tsx |
| TC-340 | should render empty state when no entries | Medium | pass | TimesheetReview.test.tsx |
| TC-558 | should render the page title | Medium | fail | page.test.tsx |
| TC-559 | should render Manager/CC Owner tab toggle | Medium | fail | page.test.tsx |
| TC-560 | should render CC Owner tab | Medium | fail | page.test.tsx |
| TC-561 | should render filter bar with period dropdown | Medium | fail | page.test.tsx |
| TC-562 | should render approval queue component | Medium | fail | page.test.tsx |
| TC-563 | should render search input | Medium | fail | page.test.tsx |

## Frontend > Budget

| ID | Title | Priority | Status | File |
|----|-------|----------|--------|------|
| TC-564 | should render the page title | Medium | pass | page.test.tsx |
| TC-565 | should render overview cards | Medium | pass | page.test.tsx |
| TC-566 | should render budget metrics | Medium | pass | page.test.tsx |
| TC-567 | should render budget table or empty state | Medium | pass | page.test.tsx |

## Frontend > Charge Codes

| ID | Title | Priority | Status | File |
|----|-------|----------|--------|------|
| TC-341 | should render "Assigned Users" heading | Medium | pass | AccessManager.test.tsx |
| TC-342 | should render the Add button | Medium | pass | AccessManager.test.tsx |
| TC-343 | should render assigned user names | Medium | pass | AccessManager.test.tsx |
| TC-344 | should render assigned user emails | Medium | pass | AccessManager.test.tsx |
| TC-345 | should show empty state when no users assigned | Medium | pass | AccessManager.test.tsx |
| TC-346 | should toggle add user panel when Add button is clicked | Medium | fail | AccessManager.test.tsx |
| TC-347 | should show available users in add panel (excludes already a | Medium | fail | AccessManager.test.tsx |
| TC-348 | should call api.put when a user is added | Medium | fail | AccessManager.test.tsx |
| TC-349 | should call onUpdate after adding a user | Medium | fail | AccessManager.test.tsx |
| TC-350 | should render remove buttons for each assigned user | Medium | pass | AccessManager.test.tsx |
| TC-351 | should call api.put with removeUserIds when remove is clicke | Medium | pass | AccessManager.test.tsx |
| TC-352 | should render "Create Charge Code" title | Medium | fail | ChargeCodeForm.test.tsx |
| TC-353 | should render Name field | Medium | fail | ChargeCodeForm.test.tsx |
| TC-354 | should render Level dropdown in create mode | Medium | fail | ChargeCodeForm.test.tsx |
| TC-355 | should render Program Name field | Medium | fail | ChargeCodeForm.test.tsx |
| TC-356 | should render Cost Center field | Medium | fail | ChargeCodeForm.test.tsx |
| TC-357 | should render Budget field | Medium | fail | ChargeCodeForm.test.tsx |
| TC-358 | should render Valid From and Valid To date fields | Medium | fail | ChargeCodeForm.test.tsx |
| TC-359 | should render Billable checkbox checked by default | Medium | fail | ChargeCodeForm.test.tsx |
| TC-360 | should render Cancel and Create buttons | Medium | fail | ChargeCodeForm.test.tsx |
| TC-361 | should call onOpenChange(false) when Cancel is clicked | Medium | fail | ChargeCodeForm.test.tsx |
| TC-362 | should call api.post when form is submitted | Medium | fail | ChargeCodeForm.test.tsx |
| TC-363 | should call onSuccess after successful create | Medium | fail | ChargeCodeForm.test.tsx |
| TC-364 | should render "Edit Charge Code" title | Medium | fail | ChargeCodeForm.test.tsx |
| TC-365 | should populate Name field with existing value | Medium | fail | ChargeCodeForm.test.tsx |
| TC-366 | should not render Level dropdown in edit mode | Medium | fail | ChargeCodeForm.test.tsx |
| TC-367 | should render Update button instead of Create | Medium | fail | ChargeCodeForm.test.tsx |
| TC-368 | should uncheck Billable checkbox when editData.isBillable is | Medium | fail | ChargeCodeForm.test.tsx |
| TC-369 | should call api.put when form is submitted in edit mode | Medium | fail | ChargeCodeForm.test.tsx |
| TC-370 | should display error message when api.post fails | Medium | fail | ChargeCodeForm.test.tsx |
| TC-371 | should not render dialog when open is false | Medium | pass | ChargeCodeForm.test.tsx |
| TC-372 | should show empty state when tree is empty | Medium | pass | ChargeCodeTree.test.tsx |
| TC-373 | should render top-level program nodes | Medium | pass | ChargeCodeTree.test.tsx |
| TC-374 | should render PRG level badges for programs | Medium | pass | ChargeCodeTree.test.tsx |
| TC-375 | should render correct level badges for each level | Medium | pass | ChargeCodeTree.test.tsx |
| TC-376 | should display budget amount when provided | Medium | pass | ChargeCodeTree.test.tsx |
| TC-377 | should not display budget amount when not provided | Medium | pass | ChargeCodeTree.test.tsx |
| TC-378 | should start top-level nodes collapsed by default | Medium | pass | ChargeCodeTree.test.tsx |
| TC-379 | should show chevron-right icon for collapsed nodes with chil | Medium | pass | ChargeCodeTree.test.tsx |
| TC-380 | should expand a collapsed node when chevron is clicked | Medium | pass | ChargeCodeTree.test.tsx |
| TC-381 | should collapse an expanded node when chevron is clicked aga | Medium | pass | ChargeCodeTree.test.tsx |
| TC-382 | should call onSelect with the node id when a node is clicked | Medium | pass | ChargeCodeTree.test.tsx |
| TC-383 | should visually highlight the selected node | Medium | pass | ChargeCodeTree.test.tsx |
| TC-384 | should not highlight unselected nodes | Medium | pass | ChargeCodeTree.test.tsx |
| TC-385 | should render project nodes nested under program after expan | Medium | pass | ChargeCodeTree.test.tsx |
| TC-386 | should render nodes with increasing indentation for depth | Medium | fail | ChargeCodeTree.test.tsx |
| TC-575 | should render toolbar with search input | Medium | pass | page.test.tsx |
| TC-576 | should render Create New Code button | Medium | fail | page.test.tsx |
| TC-577 | should render charge code tree panel | Medium | pass | page.test.tsx |
| TC-578 | should render detail panel on right side | Medium | pass | page.test.tsx |
| TC-579 | should render the page heading | Medium | pass | page.test.tsx |

## Frontend > Components

| ID | Title | Priority | Status | File |
|----|-------|----------|--------|------|
| TC-491 | should render the select trigger with placeholder | Medium | pass | ChargeCodeSelector.test.tsx |
| TC-492 | should render select items for each unused code | Medium | pass | ChargeCodeSelector.test.tsx |
| TC-493 | should not render items for already-used codes | Medium | pass | ChargeCodeSelector.test.tsx |
| TC-494 | should display charge code IDs in items | Medium | pass | ChargeCodeSelector.test.tsx |
| TC-495 | should display charge code names in items | Medium | pass | ChargeCodeSelector.test.tsx |
| TC-496 | should render Billable badge for billable codes | Medium | pass | ChargeCodeSelector.test.tsx |
| TC-497 | should render Non-billable badge for non-billable codes | Medium | pass | ChargeCodeSelector.test.tsx |
| TC-498 | should call onSelect with code when selection is made | Medium | pass | ChargeCodeSelector.test.tsx |
| TC-499 | should render a message when all codes are in use | Medium | pass | ChargeCodeSelector.test.tsx |
| TC-500 | should not render the select trigger when all codes are used | Medium | pass | ChargeCodeSelector.test.tsx |
| TC-501 | should render all-in-use message when available codes is emp | Medium | pass | ChargeCodeSelector.test.tsx |
| TC-502 | should render disabled cell with dash when value is 0 | Medium | pass | EntryCell.test.tsx |
| TC-503 | should render disabled cell with formatted value when value  | Medium | pass | EntryCell.test.tsx |
| TC-504 | should not render an interactive button when disabled | Medium | pass | EntryCell.test.tsx |
| TC-505 | should render empty string when value is 0 | Medium | pass | EntryCell.test.tsx |
| TC-506 | should render formatted value when value > 0 | Medium | pass | EntryCell.test.tsx |
| TC-507 | should switch to input mode when button is clicked | Medium | pass | EntryCell.test.tsx |
| TC-508 | should populate input with current value on focus when value | Medium | pass | EntryCell.test.tsx |
| TC-509 | should show empty input on focus when value is 0 | Medium | pass | EntryCell.test.tsx |
| TC-510 | should call onChange with parsed value on blur | Medium | pass | EntryCell.test.tsx |
| TC-511 | should call onChange with 0 on blur when input is invalid | Medium | pass | EntryCell.test.tsx |
| TC-512 | should cap value at 24 when entered value exceeds 24 | Medium | pass | EntryCell.test.tsx |
| TC-513 | should call onChange with 0 when negative value entered | Medium | pass | EntryCell.test.tsx |
| TC-514 | should call onNavigate with "right" when Tab is pressed | Medium | pass | EntryCell.test.tsx |
| TC-515 | should call onNavigate with "down" when Enter is pressed | Medium | pass | EntryCell.test.tsx |
| TC-516 | should exit editing mode on Escape | Medium | pass | EntryCell.test.tsx |
| TC-517 | should apply billable class when isBillable is true and valu | Medium | pass | EntryCell.test.tsx |
| TC-518 | should show note icon on hover when value > 0 | Medium | pass | EntryCell.test.tsx |
| TC-519 | should not show note icon on hover when value is 0 | Medium | pass | EntryCell.test.tsx |
| TC-520 | should render dialog with correct title containing charge co | Medium | pass | EntryNoteDialog.test.tsx |
| TC-521 | should render Save Note button | Medium | pass | EntryNoteDialog.test.tsx |
| TC-522 | should render Cancel button | Medium | pass | EntryNoteDialog.test.tsx |
| TC-523 | should call onSave with textarea value when Save Note is cli | Medium | pass | EntryNoteDialog.test.tsx |
| TC-524 | should call onOpenChange(false) when Cancel is clicked | Medium | pass | EntryNoteDialog.test.tsx |
| TC-525 | should pre-populate textarea with existing description | Medium | pass | EntryNoteDialog.test.tsx |
| TC-526 | should not render dialog content when open is false | Medium | pass | EntryNoteDialog.test.tsx |
| TC-527 | should render the charge code column header | Medium | pass | TimesheetGrid.test.tsx |
| TC-528 | should render day headers (Mon through Sun) | Medium | pass | TimesheetGrid.test.tsx |
| TC-529 | should render charge code names in rows | Medium | pass | TimesheetGrid.test.tsx |
| TC-530 | should render charge code IDs | Medium | pass | TimesheetGrid.test.tsx |
| TC-531 | should show empty state message when no rows | Medium | pass | TimesheetGrid.test.tsx |
| TC-532 | should render billable badge for billable charge codes | Medium | pass | TimesheetGrid.test.tsx |
| TC-533 | should render non-billable badge for non-billable charge cod | Medium | pass | TimesheetGrid.test.tsx |
| TC-534 | should display Daily Total label in footer | Medium | pass | TimesheetGrid.test.tsx |
| TC-535 | should calculate correct daily total for Monday (8 + 4 = 12) | Medium | pass | TimesheetGrid.test.tsx |
| TC-536 | should display Required row | Medium | pass | TimesheetGrid.test.tsx |
| TC-537 | should display Variance row | Medium | pass | TimesheetGrid.test.tsx |
| TC-538 | should show negative variance for days under 8 hours | Medium | pass | TimesheetGrid.test.tsx |
| TC-539 | should show checkmark for days meeting target hours | Medium | pass | TimesheetGrid.test.tsx |
| TC-540 | should display Total column header | Medium | pass | TimesheetGrid.test.tsx |
| TC-541 | should show remove button when onRemoveRow is provided and n | Medium | pass | TimesheetGrid.test.tsx |
| TC-542 | should not show remove button when disabled | Medium | pass | TimesheetGrid.test.tsx |

## Frontend > Dashboard

| ID | Title | Priority | Status | File |
|----|-------|----------|--------|------|
| TC-387 | should render the "Chargeability Trend" heading | Medium | pass | ChargeabilityTrend.test.tsx |
| TC-388 | should render loading skeleton while data is loading | Medium | pass | ChargeabilityTrend.test.tsx |
| TC-389 | should render "No data available yet" when months array is e | Medium | pass | ChargeabilityTrend.test.tsx |
| TC-390 | should render chart when data is available | Medium | pass | ChargeabilityTrend.test.tsx |
| TC-391 | should display YTD chargeability percentage when data is ava | Medium | pass | ChargeabilityTrend.test.tsx |
| TC-392 | should render "Program Distribution" heading | Medium | pass | ProgramDistribution.test.tsx |
| TC-393 | should render loading skeleton while data is loading | Medium | pass | ProgramDistribution.test.tsx |
| TC-394 | should render "No data available yet" when no entries for cu | Medium | pass | ProgramDistribution.test.tsx |
| TC-395 | should render pie chart when data is available | Medium | pass | ProgramDistribution.test.tsx |
| TC-396 | should show program names in legend | Medium | pass | ProgramDistribution.test.tsx |
| TC-397 | should show "Current Period" and "YTD" toggle buttons | Medium | pass | ProgramDistribution.test.tsx |
| TC-398 | should switch to YTD view when YTD button is clicked | Medium | pass | ProgramDistribution.test.tsx |
| TC-399 | should display hours and percentage for each program | Medium | pass | ProgramDistribution.test.tsx |

## Frontend > Layout

| ID | Title | Priority | Status | File |
|----|-------|----------|--------|------|
| TC-408 | should render the bell button with aria-label | Medium | pass | NotificationBell.test.tsx |
| TC-409 | should render the bell icon SVG | Medium | pass | NotificationBell.test.tsx |
| TC-410 | should show badge with total count of budget + chargeability | Medium | fail | NotificationBell.test.tsx |
| TC-411 | should show badge with count equal to budget alerts only whe | Medium | fail | NotificationBell.test.tsx |
| TC-412 | should not render badge when both alert arrays are empty | Medium | fail | NotificationBell.test.tsx |
| TC-413 | should open popover when bell button is clicked | Medium | pass | NotificationBell.test.tsx |
| TC-414 | should close popover when bell button is clicked again | Medium | pass | NotificationBell.test.tsx |
| TC-415 | should show alert names inside popover after opening | Medium | fail | NotificationBell.test.tsx |
| TC-416 | should show severity dot elements for alerts | Medium | fail | NotificationBell.test.tsx |
| TC-417 | should show "No notifications" message when popover opens wi | Medium | fail | NotificationBell.test.tsx |
| TC-418 | should limit displayed alerts to top 5 sorted by severity | Medium | fail | NotificationBell.test.tsx |
| TC-419 | should render "View alerts" link when alerts exist | Medium | fail | NotificationBell.test.tsx |
| TC-420 | should NOT render "View alerts" button when no alerts exist | Medium | fail | NotificationBell.test.tsx |
| TC-421 | should call router.push("/reports") when "View alerts" is cl | Medium | fail | NotificationBell.test.tsx |

## Frontend > Pages

| ID | Title | Priority | Status | File |
|----|-------|----------|--------|------|
| TC-294 | should render status banner with week period | Medium | pass | page.test.tsx |
| TC-295 | should render 4 metric cards | Medium | pass | page.test.tsx |
| TC-296 | should render Recent Entries section | Medium | pass | page.test.tsx |
| TC-297 | should render Alerts & Notifications section | Medium | pass | page.test.tsx |
| TC-298 | should render quick action Log Time button | Medium | fail | page.test.tsx |
| TC-299 | should render My Codes quick action | Medium | pass | page.test.tsx |
| TC-300 | should render progress bar tracking area | Medium | pass | page.test.tsx |
| TC-400 | should render the logo/branding | Medium | pass | page.test.tsx |
| TC-401 | should render email input | Medium | pass | page.test.tsx |
| TC-402 | should render password input | Medium | pass | page.test.tsx |
| TC-403 | should render Sign In button | Medium | pass | page.test.tsx |
| TC-404 | should render Microsoft SSO button | Medium | pass | page.test.tsx |
| TC-405 | should render Forgot password link | Medium | pass | page.test.tsx |
| TC-406 | should render "or" divider | Medium | pass | page.test.tsx |
| TC-407 | should render subtitle text | Medium | pass | page.test.tsx |
| TC-580 | should render user info section | Medium | pass | page.test.tsx |
| TC-581 | should render email field | Medium | pass | page.test.tsx |
| TC-582 | should render role badge or field | Medium | pass | page.test.tsx |
| TC-583 | should render edit profile button or form | Medium | pass | page.test.tsx |
| TC-584 | should render password change section | Medium | pass | page.test.tsx |
| TC-585 | should render department field | Medium | pass | page.test.tsx |
| TC-586 | should render the page title | Medium | pass | page.test.tsx |
| TC-587 | should render theme toggle section | Medium | pass | page.test.tsx |
| TC-588 | should render Light and Dark theme options | Medium | pass | page.test.tsx |
| TC-589 | should render notification preferences section | Medium | pass | page.test.tsx |
| TC-590 | should render email notification toggle | Medium | pass | page.test.tsx |
| TC-591 | should render timezone settings | Medium | pass | page.test.tsx |
| TC-598 | should render the page title | Medium | pass | page.test.tsx |
| TC-599 | should render year navigation | Medium | pass | page.test.tsx |
| TC-600 | should render prev/next navigation buttons | Medium | pass | page.test.tsx |
| TC-601 | should render month names in calendar grid | Medium | pass | page.test.tsx |
| TC-602 | should render holiday list section | Medium | pass | page.test.tsx |
| TC-603 | should render Add Holiday button | Medium | pass | page.test.tsx |
| TC-604 | should render the page title | Medium | pass | page.test.tsx |
| TC-605 | should render Add Rate button | Medium | pass | page.test.tsx |
| TC-606 | should render rate table column headers | Medium | pass | page.test.tsx |
| TC-607 | should render Add Rate button or empty state | Medium | pass | page.test.tsx |
| TC-608 | should render the page title | Medium | pass | page.test.tsx |
| TC-609 | should render user management card | Medium | pass | page.test.tsx |
| TC-610 | should render search input | Medium | pass | page.test.tsx |
| TC-611 | should render user table with column headers | Medium | pass | page.test.tsx |
| TC-612 | should render mock user data in table | Medium | pass | page.test.tsx |

## Frontend > Reports

| ID | Title | Priority | Status | File |
|----|-------|----------|--------|------|
| TC-422 | should render ResponsiveContainer | Medium | pass | ActivityPie.test.tsx |
| TC-423 | should render PieChart | Medium | pass | ActivityPie.test.tsx |
| TC-424 | should render Pie with correct item count | Medium | pass | ActivityPie.test.tsx |
| TC-425 | should render Pie with hours dataKey | Medium | pass | ActivityPie.test.tsx |
| TC-426 | should render Pie with category nameKey | Medium | pass | ActivityPie.test.tsx |
| TC-427 | should render as donut (innerRadius > 0) | Medium | pass | ActivityPie.test.tsx |
| TC-428 | should render Cell components for each item | Medium | pass | ActivityPie.test.tsx |
| TC-429 | should render Legend | Medium | pass | ActivityPie.test.tsx |
| TC-430 | should render Tooltip | Medium | pass | ActivityPie.test.tsx |
| TC-431 | should render empty state message | Medium | pass | ActivityPie.test.tsx |
| TC-432 | should not render pie chart when data is empty | Medium | pass | ActivityPie.test.tsx |
| TC-433 | should render Severity column header | Medium | pass | AlertList.test.tsx |
| TC-434 | should render Charge Code column header | Medium | pass | AlertList.test.tsx |
| TC-435 | should render Budget column header | Medium | pass | AlertList.test.tsx |
| TC-436 | should render Actual column header | Medium | pass | AlertList.test.tsx |
| TC-437 | should render Overrun column header | Medium | pass | AlertList.test.tsx |
| TC-438 | should render all alert names | Medium | pass | AlertList.test.tsx |
| TC-439 | should render charge code IDs | Medium | pass | AlertList.test.tsx |
| TC-440 | should render formatted budget amounts | Medium | pass | AlertList.test.tsx |
| TC-441 | should render severity indicators for all alerts | Medium | pass | AlertList.test.tsx |
| TC-442 | should sort by severity by default (red first) | Medium | pass | AlertList.test.tsx |
| TC-443 | should sort by overrun when Overrun header is clicked | Medium | pass | AlertList.test.tsx |
| TC-444 | should sort by severity when Severity header is clicked | Medium | pass | AlertList.test.tsx |
| TC-445 | should show root cause when row is clicked and rootCauseActi | Medium | pass | AlertList.test.tsx |
| TC-446 | should collapse expanded row when clicked again | Medium | pass | AlertList.test.tsx |
| TC-447 | should not show expanded row for alert with no rootCauseActi | Medium | pass | AlertList.test.tsx |
| TC-448 | should render empty state message when no alerts | Medium | pass | AlertList.test.tsx |
| TC-449 | should render ResponsiveContainer | Medium | pass | BudgetChart.test.tsx |
| TC-450 | should render BarChart with data | Medium | pass | BudgetChart.test.tsx |
| TC-451 | should render Actual bar | Medium | pass | BudgetChart.test.tsx |
| TC-452 | should render Budget bar | Medium | pass | BudgetChart.test.tsx |
| TC-453 | should render Legend | Medium | pass | BudgetChart.test.tsx |
| TC-454 | should render Tooltip | Medium | pass | BudgetChart.test.tsx |
| TC-455 | should render CartesianGrid | Medium | pass | BudgetChart.test.tsx |
| TC-456 | should render empty state message when no data | Medium | pass | BudgetChart.test.tsx |
| TC-457 | should not render bar chart when data is empty | Medium | pass | BudgetChart.test.tsx |
| TC-458 | should render ResponsiveContainer | Medium | pass | ChargeabilityGauge.test.tsx |
| TC-459 | should render BarChart | Medium | pass | ChargeabilityGauge.test.tsx |
| TC-460 | should render a reference line for the target | Medium | pass | ChargeabilityGauge.test.tsx |
| TC-461 | should render target label on reference line | Medium | pass | ChargeabilityGauge.test.tsx |
| TC-462 | should render rate bar | Medium | pass | ChargeabilityGauge.test.tsx |
| TC-463 | should render empty state message | Medium | pass | ChargeabilityGauge.test.tsx |
| TC-464 | should not render bar chart when data is empty | Medium | pass | ChargeabilityGauge.test.tsx |
| TC-465 | should render Cell components for each member | Medium | pass | ChargeabilityGauge.test.tsx |
| TC-466 | should render stat cards with correct labels | Medium | pass | FinancialPL.test.tsx |
| TC-467 | should render stat card values | Medium | pass | FinancialPL.test.tsx |
| TC-468 | should render team P/L table headers | Medium | fail | FinancialPL.test.tsx |
| TC-469 | should render team names in the table | Medium | pass | FinancialPL.test.tsx |
| TC-470 | should render chargeability percentages | Medium | pass | FinancialPL.test.tsx |
| TC-471 | should render subtext with chargeability comparison | Medium | pass | FinancialPL.test.tsx |
| TC-472 | should pass period and team as query params | Medium | pass | FinancialPL.test.tsx |
| TC-473 | should not pass team param when team is "all" | Medium | pass | FinancialPL.test.tsx |
| TC-474 | should show total row when multiple teams exist | Medium | pass | FinancialPL.test.tsx |
| TC-475 | should not render team table when byTeam is empty | Medium | pass | FinancialPL.test.tsx |
| TC-476 | should render "P/L Summary" tab trigger | Medium | pass | FinancialPL.test.tsx |
| TC-477 | should render "Alerts" tab trigger | Medium | pass | FinancialPL.test.tsx |
| TC-478 | should show stat cards when default tab (P/L Summary) is act | Medium | pass | FinancialPL.test.tsx |
| TC-479 | should show Alerts heading when Alerts tab is clicked | Medium | pass | FinancialPL.test.tsx |
| TC-480 | should show alert name in AlertList when Alerts tab is activ | Medium | pass | FinancialPL.test.tsx |
| TC-481 | should show count in Alerts tab label when budget alerts are | Medium | pass | FinancialPL.test.tsx |
| TC-482 | should show "Alerts" without count when no alerts are provid | Medium | pass | FinancialPL.test.tsx |
| TC-483 | should render ResponsiveContainer | Medium | pass | UtilizationChart.test.tsx |
| TC-484 | should render BarChart with correct item count | Medium | pass | UtilizationChart.test.tsx |
| TC-485 | should render rate bar with Utilization name | Medium | pass | UtilizationChart.test.tsx |
| TC-486 | should render XAxis with department dataKey | Medium | pass | UtilizationChart.test.tsx |
| TC-487 | should render Cell components for color coding | Medium | pass | UtilizationChart.test.tsx |
| TC-488 | should render Tooltip | Medium | pass | UtilizationChart.test.tsx |
| TC-489 | should render empty state message | Medium | pass | UtilizationChart.test.tsx |
| TC-490 | should not render bar chart when data is empty | Medium | pass | UtilizationChart.test.tsx |
| TC-568 | should render the page title | Medium | pass | page.test.tsx |
| TC-569 | should render filter bar | Medium | pass | page.test.tsx |
| TC-570 | should render KPI cards | Medium | pass | page.test.tsx |
| TC-571 | should render Budget Chart component | Medium | pass | page.test.tsx |
| TC-572 | should render Chargeability Gauge component | Medium | pass | page.test.tsx |
| TC-573 | should render Activity Pie component | Medium | pass | page.test.tsx |
| TC-574 | should render FinancialPL section with tabs | Medium | pass | page.test.tsx |

## Frontend > Time Entry

| ID | Title | Priority | Status | File |
|----|-------|----------|--------|------|
| TC-543 | should render the select dropdown | Medium | pass | PeriodSelector.test.tsx |
| TC-544 | should render select trigger with correct width | Medium | pass | PeriodSelector.test.tsx |
| TC-545 | should render 104 week options | Medium | pass | PeriodSelector.test.tsx |
| TC-546 | should pass current week start value to select | Medium | fail | PeriodSelector.test.tsx |
| TC-547 | should include "Week" in option labels | Medium | pass | PeriodSelector.test.tsx |
| TC-548 | should include year in option labels | Medium | pass | PeriodSelector.test.tsx |
| TC-549 | should list weeks in descending order (most recent first) | Medium | pass | PeriodSelector.test.tsx |
| TC-550 | should render the "+ Request New CC" trigger button | Medium | pass | RequestChargeCode.test.tsx |
| TC-551 | should open dialog when trigger button is clicked | Medium | pass | RequestChargeCode.test.tsx |
| TC-552 | should show "Request Charge Code Access" title when dialog o | Medium | pass | RequestChargeCode.test.tsx |
| TC-553 | should render search input in dialog | Medium | pass | RequestChargeCode.test.tsx |
| TC-554 | should show charge code results when query returns data | Medium | pass | RequestChargeCode.test.tsx |
| TC-555 | should show "Billable" badge for billable charge codes | Medium | pass | RequestChargeCode.test.tsx |
| TC-556 | should show "Non-billable" badge for non-billable charge cod | Medium | pass | RequestChargeCode.test.tsx |
| TC-557 | should show "Send Request" button disabled when reason is em | Medium | pass | RequestChargeCode.test.tsx |
| TC-592 | should render period navigator with prev/next controls | Medium | pass | page.test.tsx |
| TC-593 | should render timesheet grid component | Medium | pass | page.test.tsx |
| TC-594 | should render actions bar with Save Draft button | Medium | pass | page.test.tsx |
| TC-595 | should render Submit button | Medium | pass | page.test.tsx |
| TC-596 | should render Add Charge Code button | Medium | pass | page.test.tsx |
| TC-597 | should render the page title | Medium | pass | page.test.tsx |

## E2E > Time Entry > Copy Period

| ID | Title | Priority | Preconditions | Steps | Expected Result | Test Data | File | Status |
|----|-------|----------|---------------|-------|-----------------|-----------|------|--------|
| TC-613 | E2E-CR05-01: Copy from Last Period loads previous charge codes | High | Employee logged in (wichai), previous week has entries | 1. Navigate to /time-entry 2. Click 'Copy from last period' 3. Observe rows loaded | Grid shows rows from previous period OR copy button available; API accepts copy request | Role: employee (wichai) | frontend/e2e/cr1-remaining.spec.ts | pass |

## E2E > Charge Codes > Access Request

| ID | Title | Priority | Preconditions | Steps | Expected Result | Test Data | File | Status |
|----|-------|----------|---------------|-------|-----------------|-----------|------|--------|
| TC-614 | E2E-CR07-01: Employee can request charge code access | High | Employee logged in (nattaya), active programs exist | 1. Navigate to /charge-codes 2. Click 'Request Access' 3. Search for program 4. Select it 5. Submit | Request dialog closes OR success toast; POST /charge-code-requests returns 200 or 401 | Role: employee (nattaya) | frontend/e2e/cr1-remaining.spec.ts | pass |
| TC-615 | E2E-CR07-02: Employee cannot approve their own charge code request (NEGATIVE) | High | Employee (nattaya) has a pending request, logged in as nattaya | 1. Navigate to /charge-codes 2. Locate pending request 3. Attempt to approve own request | No approve button visible OR action returns error; API returns 200 or 401 | Role: employee (nattaya) | frontend/e2e/cr1-remaining.spec.ts | pass |

## E2E > Budget > Drill-Down

| ID | Title | Priority | Preconditions | Steps | Expected Result | Test Data | File | Status |
|----|-------|----------|---------------|-------|-----------------|-----------|------|--------|
| TC-616 | E2E-CR08-01: Budget drill-down shows child charge codes | High | Admin logged in (tachongrak), programs with children exist | 1. Navigate to /budget 2. Click program row to expand 3. Verify children appear | Child charge codes visible with budget figures; API GET /charge-codes/budget-detail returns 200 or 401 | Role: admin (tachongrak) | frontend/e2e/cr1-remaining.spec.ts | pass |

## E2E > Approvals > Search

| ID | Title | Priority | Preconditions | Steps | Expected Result | Test Data | File | Status |
|----|-------|----------|---------------|-------|-----------------|-----------|------|--------|
| TC-617 | E2E-CR12-01: Approvals search filters by employee name or charge code | High | Charge manager logged in (wichai), pending timesheets exist | 1. Navigate to /approvals 2. Type employee name in search 3. Observe filtered results | List filters to matching employees OR search input visible; API GET /approvals/pending returns 200 or 401 | Role: charge_manager (wichai) | frontend/e2e/cr1-remaining.spec.ts | pass |

## E2E > Budget > Filter

| ID | Title | Priority | Preconditions | Steps | Expected Result | Test Data | File | Status |
|----|-------|----------|---------------|-------|-----------------|-----------|------|--------|
| TC-618 | E2E-CR16-01: Multi-select budget filter shows only selected programs | High | Admin logged in (tachongrak), multiple programs exist | 1. Navigate to /budget 2. Open program filter 3. Select specific programs 4. Verify list filters | Budget list shows only selected programs OR multi-select control visible; GET /budgets/summary returns 200 or 401 | Role: admin (tachongrak) | frontend/e2e/cr1-remaining.spec.ts | pass |

## E2E > Time Entry > Vacation Blocking

| ID | Title | Priority | Preconditions | Steps | Expected Result | Test Data | File | Status |
|----|-------|----------|---------------|-------|-----------------|-----------|------|--------|
| TC-619 | E2E-BUG05-01: Vacation day blocks non-vacation hour input | High | Employee logged in (nattaya), has approved vacation on a specific date | 1. Navigate to /time-entry 2. Navigate to week containing vacation day 3. Attempt to enter hours on vacation date | Input blocked/disabled for vacation day; API GET /calendar/vacations returns 200 or 401 | Role: employee (nattaya) | frontend/e2e/cr1-remaining.spec.ts | pass |

## E2E > Data Integrity

| ID | Title | Priority | Preconditions | Steps | Expected Result | Test Data | File | Status |
|----|-------|----------|---------------|-------|-----------------|-----------|------|--------|
| TC-620 | E2E-BUG04-01: No test data pollution in database | Medium | Admin logged in (tachongrak), DB is accessible | 1. Call GET /charge-codes/tree 2. Check for Test-Program-* entries 3. Call GET /cost-rates 4. Check for L-TEST-* entries | No test data entries; API returns 200 or 401; cleanup confirmed | Role: admin (tachongrak) | frontend/e2e/cr1-remaining.spec.ts | pass |
