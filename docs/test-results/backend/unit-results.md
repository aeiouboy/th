# Backend Unit Test Results

- **Date**: 2026-03-26
- **Runner**: Jest
- **Total Tests**: 284
- **Passed**: 284
- **Failed**: 0
- **Skipped**: 0

## Test Suites

### cost-rates/cost-rates.service.spec.ts (PASS)
- Tests: 9 pass / 0 fail

  ✓ CostRatesService findAll should return all cost rates ordered by jobGrade and effectiveFrom
  ✓ CostRatesService findAll should return empty array when no cost rates exist
  ✓ CostRatesService create should create a new cost rate and return it
  ✓ CostRatesService create should create cost rate with effectiveTo date when provided
  ✓ CostRatesService update should update an existing cost rate and return it
  ✓ CostRatesService update should throw NotFoundException when cost rate does not exist
  ✓ CostRatesService update should allow partial updates (only jobGrade)
  ✓ CostRatesService remove should delete a cost rate and return { deleted: true }
  ✓ CostRatesService remove should throw NotFoundException when cost rate does not exist

### timesheets/timesheets-cr1.service.spec.ts (PASS)
- Tests: 12 pass / 0 fail

  ✓ TimesheetsService — CR-05/06/07 Features copyFromPrevious should throw NotFoundException when timesheet does not exist
  ✓ TimesheetsService — CR-05/06/07 Features copyFromPrevious should throw BadRequestException when timesheet is not draft
  ✓ TimesheetsService — CR-05/06/07 Features copyFromPrevious should throw BadRequestException when timesheet already has entries
  ✓ TimesheetsService — CR-05/06/07 Features copyFromPrevious should throw NotFoundException when no previous timesheet exists
  ✓ TimesheetsService — CR-05/06/07 Features copyFromPrevious should return empty entries message when previous timesheet has no entries
  ✓ TimesheetsService — CR-05/06/07 Features copyFromPrevious should copy charge codes from previous period and return success message
  ✓ TimesheetsService — CR-05/06/07 Features upsertEntries — vacation day blocking (CR-06) should silently drop entries on full-day vacation days
  ✓ TimesheetsService — CR-05/06/07 Features upsertEntries — vacation day blocking (CR-06) should allow entries on half-day vacation days (hours <= 4)
  ✓ TimesheetsService — CR-05/06/07 Features upsertEntries — vacation day blocking (CR-06) should not allow editing LEAVE-001 entries (system managed)
  ✓ TimesheetsService — CR-05/06/07 Features validateMinimumHours — half-day leave (CR-06) should allow 4h on half-day vacation day when combined with 4h work
  ✓ TimesheetsService — CR-05/06/07 Features validateMinimumHours — half-day leave (CR-06) should fail when half-day vacation day has only 2h work (requires 4h)
  ✓ TimesheetsService — CR-05/06/07 Features validateMinimumHours — half-day leave (CR-06) should skip full-day vacation days entirely (no hours required)

### integrations/teams-bot.service.spec.ts (PASS)
- Tests: 39 pass / 0 fail

  ✓ TeamsBotService parseTimeEntry should parse "Log 4h on PRJ-042 today"
  ✓ TeamsBotService parseTimeEntry should parse fractional hours "Log 2.5h on ACT-010 today"
  ✓ TeamsBotService parseTimeEntry should parse "Logged 2h code review ACT-010 yesterday"
  ✓ TeamsBotService parseTimeEntry should use yesterday date when "yesterday" keyword present
  ✓ TeamsBotService parseTimeEntry should use today date when no date keyword and no ISO date
  ✓ TeamsBotService parseTimeEntry should parse an explicit ISO date "Add 3.5h PRJ-042 2026-03-15 design work"
  ✓ TeamsBotService parseTimeEntry should extract description after charge code
  ✓ TeamsBotService parseTimeEntry should extract description before charge code (e.g. "Logged 2h code review ACT-010")
  ✓ TeamsBotService parseTimeEntry should return null when no hours pattern is found
  ✓ TeamsBotService parseTimeEntry should return null when hours is 0
  ✓ TeamsBotService parseTimeEntry should return null when hours exceed 24
  ✓ TeamsBotService parseTimeEntry should return null when no charge code pattern is found
  ✓ TeamsBotService parseTimeEntry should handle charge codes with underscores "PRJ_042"
  ✓ TeamsBotService parseTimeEntry should parse "Add 8h on TSK-001 2026-03-15"
  ✓ TeamsBotService getSuggestedPrompts should return a non-empty array of prompt strings
  ✓ TeamsBotService handleIncomingMessage — help/fallback should return help message when command is unrecognized
  ✓ TeamsBotService handleIncomingMessage — help/fallback should return help for empty string
  ✓ TeamsBotService handleIncomingMessage — log time command should log time successfully for a valid command
  ✓ TeamsBotService handleIncomingMessage — log time command should return error message when charge code is not found in DB
  ✓ TeamsBotService handleIncomingMessage — log time command should return parse error message for invalid format
  ✓ TeamsBotService handleIncomingMessage — log time command should preserve existing entries when adding a new one
  ✓ TeamsBotService handleIncomingMessage — log time command should return a message type response with suggestedActions after logging
  ✓ TeamsBotService handleIncomingMessage — budget status command should return budget card when charge code is found
  ✓ TeamsBotService handleIncomingMessage — budget status command should include forecast line when forecastAtCompletion is present
  ✓ TeamsBotService handleIncomingMessage — budget status command should return error message when no charge code is in the query
  ✓ TeamsBotService handleIncomingMessage — budget status command should return error when budgets service throws
  ✓ TeamsBotService handleIncomingMessage — budget status command should route "How is budget for PRJ-042?" to budget handler
  ✓ TeamsBotService handleIncomingMessage — show timesheet command should return "no timesheet" message when none exists for the week
  ✓ TeamsBotService handleIncomingMessage — show timesheet command should return a card with timesheet summary when timesheet exists
  ✓ TeamsBotService handleIncomingMessage — show timesheet command should handle timesheet with no entries gracefully
  ✓ TeamsBotService handleIncomingMessage — show timesheet command should route "my timesheet" to timesheet handler
  ✓ TeamsBotService handleIncomingMessage — hours today command should return no-hours message when no timesheet exists
  ✓ TeamsBotService handleIncomingMessage — hours today command should return no-hours message when timesheet exists but no entries for today
  ✓ TeamsBotService handleIncomingMessage — hours today command should return total hours logged today
  ✓ TeamsBotService handleIncomingMessage — hours today command should route "hours did i log" to hours today handler
  ✓ TeamsBotService handleIncomingMessage — charge codes command should return no-codes message when user has no assigned charge codes
  ✓ TeamsBotService handleIncomingMessage — charge codes command should return card with charge code list when user has codes
  ✓ TeamsBotService handleIncomingMessage — charge codes command should include suggestedActions in charge codes response
  ✓ TeamsBotService handleIncomingMessage — charge codes command should route "my charge codes" to charge codes handler

### users/users.service.spec.ts (PASS)
- Tests: 22 pass / 0 fail

  ✓ UsersService findAll should return all user profiles
  ✓ UsersService findAll should return empty array when no profiles exist
  ✓ UsersService findById should return the user when found
  ✓ UsersService findById should throw NotFoundException when user does not exist
  ✓ UsersService updateProfile should update and return the user profile
  ✓ UsersService updateProfile should throw NotFoundException when user to update does not exist
  ✓ UsersService updateRole should update user role successfully
  ✓ UsersService updateRole should throw NotFoundException when user does not exist
  ✓ UsersService updateJobGrade should update job grade successfully
  ✓ UsersService updateJobGrade should throw NotFoundException when user does not exist
  ✓ UsersService updateAvatar should update avatarUrl with a valid https URL
  ✓ UsersService updateAvatar should update avatarUrl with a valid http URL
  ✓ UsersService updateAvatar should throw BadRequestException when avatarUrl is not a valid URL
  ✓ UsersService updateAvatar should throw BadRequestException when avatarUrl uses non-http protocol
  ✓ UsersService updateAvatar should throw BadRequestException for empty avatarUrl
  ✓ UsersService updateAvatar should throw NotFoundException when user does not exist
  ✓ UsersService updateAvatar should update the correct user ID
  ✓ UsersService findAll pagination should default limit to 100 when not provided
  ✓ UsersService findAll pagination should cap limit at 500 when limit exceeds 500
  ✓ UsersService findAll pagination should use provided limit when within bounds
  ✓ UsersService findAll pagination should default offset to 0 when not provided
  ✓ UsersService findAll pagination should use provided offset

### common/guards/supabase-auth.guard.spec.ts (PASS)
- Tests: 11 pass / 0 fail

  ✓ SupabaseAuthGuard should allow public routes without a token
  ✓ SupabaseAuthGuard should throw UnauthorizedException when Authorization header is missing
  ✓ SupabaseAuthGuard should throw UnauthorizedException when Authorization header does not start with Bearer
  ✓ SupabaseAuthGuard should throw UnauthorizedException when JWT verification fails (invalid token)
  ✓ SupabaseAuthGuard should throw UnauthorizedException when user profile is not found in DB
  ✓ SupabaseAuthGuard should allow request and attach profile when JWT is valid
  ✓ RolesGuard should allow access when no roles are required
  ✓ RolesGuard should allow access when user has the required role
  ✓ RolesGuard should throw ForbiddenException when user does not have the required role
  ✓ RolesGuard should throw ForbiddenException when no user is on the request
  ✓ RolesGuard should allow access when user role matches one of multiple required roles

### approvals/approvals.service.spec.ts (PASS)
- Tests: 14 pass / 0 fail

  ✓ ApprovalsService getPending should return empty results when no pending approvals exist
  ✓ ApprovalsService getPending should return timesheets pending approval
  ✓ ApprovalsService approve should throw NotFoundException when timesheet does not exist
  ✓ ApprovalsService approve should throw BadRequestException when timesheet is in locked status
  ✓ ApprovalsService approve should throw ForbiddenException when approver is not the employee manager and not a CC approver
  ✓ ApprovalsService approve should transition timesheet from submitted to approved (period not yet ended)
  ✓ ApprovalsService approve should create an audit log entry when approving
  ✓ ApprovalsService approve should throw BadRequestException when timesheet is manager_approved (no longer valid)
  ✓ ApprovalsService reject should throw NotFoundException when timesheet does not exist
  ✓ ApprovalsService reject should throw BadRequestException when rejecting a locked timesheet
  ✓ ApprovalsService reject should reject a submitted timesheet and set status to rejected
  ✓ ApprovalsService reject should create audit log with reject action
  ✓ ApprovalsService bulkApprove should approve multiple timesheets and return results
  ✓ ApprovalsService bulkApprove should include error entry when individual approval fails

### timesheets/timesheets.service.spec.ts (PASS)
- Tests: 29 pass / 0 fail

  ✓ TimesheetsService getAvailablePeriods should return an empty array when user has no timesheets
  ✓ TimesheetsService getAvailablePeriods should return periodStart values in descending order
  ✓ TimesheetsService getAvailablePeriods should return a single period when user has one timesheet
  ✓ TimesheetsService getWeekBounds (via create) should normalize a Wednesday to its Monday start
  ✓ TimesheetsService getWeekBounds (via create) should return existing timesheet if one already exists for that week
  ✓ TimesheetsService findByPeriod should return null when no timesheet exists for the period
  ✓ TimesheetsService findByPeriod should return the timesheet when it exists
  ✓ TimesheetsService findById should throw NotFoundException when timesheet does not exist
  ✓ TimesheetsService findById should return timesheet with entries when it exists
  ✓ TimesheetsService upsertEntries should throw NotFoundException when timesheet does not exist
  ✓ TimesheetsService upsertEntries should throw ForbiddenException when timesheet status is locked
  ✓ TimesheetsService upsertEntries should allow editing when status is draft
  ✓ TimesheetsService upsertEntries should allow editing when status is rejected
  ✓ TimesheetsService upsertEntries should validate that charge codes are assigned to the user
  ✓ TimesheetsService upsertEntries should filter out entries with 0 hours
  ✓ TimesheetsService submit should throw NotFoundException when timesheet does not exist
  ✓ TimesheetsService submit should throw BadRequestException when status is locked
  ✓ TimesheetsService submit should throw BadRequestException when status is locked
  ✓ TimesheetsService submit should transition draft timesheet to submitted when min hours met
  ✓ TimesheetsService submit should allow resubmitting a rejected timesheet
  ✓ TimesheetsService submit should throw BadRequestException when weekday has less than 8 hours
  ✓ TimesheetsService validateMinimumHours should pass when all weekdays have 8+ hours
  ✓ TimesheetsService validateMinimumHours should throw when a weekday has less than 8 hours
  ✓ TimesheetsService validateMinimumHours should exclude holidays from validation
  ✓ TimesheetsService validateMinimumHours should exclude weekends from validation even without calendar entries
  ✓ TimesheetsService validateMinimumHours should pass when exactly 8 hours logged on weekday
  ✓ TimesheetsService validateMinimumHours should report all short days not just the first one
  ✓ TimesheetsService validateMinimumHours should pass when no entries at all (days without entries are allowed)
  ✓ TimesheetsService validateMinimumHours should skip approved vacation days during validation

### charge-codes/charge-codes-cr1.service.spec.ts (PASS)
- Tests: 15 pass / 0 fail

  ✓ ChargeCodesService — CR-08/09/11 Features getBudgetDetail should throw NotFoundException when charge code does not exist
  ✓ ChargeCodesService — CR-08/09/11 Features getBudgetDetail should return budget structure with team and person breakdowns
  ✓ ChargeCodesService — CR-08/09/11 Features getBudgetDetail should calculate percentage correctly
  ✓ ChargeCodesService — CR-08/09/11 Features getBudgetDetail should group entries by department for team breakdown
  ✓ ChargeCodesService — CR-08/09/11 Features getBudgetDetail should sort team and person breakdowns by hours descending
  ✓ ChargeCodesService — CR-08/09/11 Features getBudgetDetail should handle charge code with no budget record (shows zeros)
  ✓ ChargeCodesService — CR-08/09/11 Features cascadeAccess should throw NotFoundException when charge code does not exist
  ✓ ChargeCodesService — CR-08/09/11 Features cascadeAccess should throw ForbiddenException when caller is not owner/approver/admin
  ✓ ChargeCodesService — CR-08/09/11 Features cascadeAccess should succeed when caller is the owner
  ✓ ChargeCodesService — CR-08/09/11 Features cascadeAccess should succeed when caller is admin (not owner)
  ✓ ChargeCodesService — CR-08/09/11 Features cascadeAccess should include all descendants in affected count
  ✓ ChargeCodesService — CR-08/09/11 Features requestAccess should throw NotFoundException when charge code does not exist
  ✓ ChargeCodesService — CR-08/09/11 Features requestAccess should throw BadRequestException when user already has access
  ✓ ChargeCodesService — CR-08/09/11 Features requestAccess should throw BadRequestException when pending request already exists
  ✓ ChargeCodesService — CR-08/09/11 Features requestAccess should create and return new request when validation passes

### reports/reports.service.spec.ts (PASS)
- Tests: 15 pass / 0 fail

  ✓ ReportsService getProjectCostReport should return empty report when charge code does not exist
  ✓ ReportsService getProjectCostReport should return report with budget and actuals
  ✓ ReportsService getProjectCostReport should include child breakdown in report
  ✓ ReportsService getChargeabilityReport should return zero chargeability when no hours logged
  ✓ ReportsService getChargeabilityReport should calculate chargeability correctly (billable/total)
  ✓ ReportsService getChargeabilityReport should have 80% target chargeability
  ✓ ReportsService getActivityDistribution should return empty distribution when no entries exist
  ✓ ReportsService getActivityDistribution should calculate percentage for each category
  ✓ ReportsService getActivityDistribution should sort distribution by hours descending
  ✓ ReportsService getUtilizationReport should fallback to 22 working days when calendar has no data
  ✓ ReportsService getUtilizationReport should calculate utilization rate per employee
  ✓ ReportsService getBudgetAlerts should return formatted budget alerts with overrunAmount calculated
  ✓ ReportsService getBudgetAlerts should pass through severity values from budgets service (red, orange, yellow)
  ✓ ReportsService getBudgetAlerts should calculate overrunPercent as percentage over budget
  ✓ ReportsService getBudgetAlerts should return zero overrunAmount when actual is less than budget

### dashboard/dashboard.service.spec.ts (PASS)
- Tests: 12 pass / 0 fail

  ✓ DashboardService getChargeabilityYtd should return empty months array and 0 ytdChargeability when no entries
  ✓ DashboardService getChargeabilityYtd should calculate ytdChargeability as billable / total hours * 100
  ✓ DashboardService getChargeabilityYtd should return 0 chargeability for months with no hours
  ✓ DashboardService getChargeabilityYtd should fill all months from Jan to current month
  ✓ DashboardService getChargeabilityYtd should round chargeability to nearest integer
  ✓ DashboardService getChargeabilityYtd should aggregate billable and non-billable hours by month
  ✓ DashboardService getProgramDistribution should return empty arrays when no entries
  ✓ DashboardService getProgramDistribution should group entries by root program from path
  ✓ DashboardService getProgramDistribution should calculate percentage from total hours
  ✓ DashboardService getProgramDistribution should sort programs by hours descending
  ✓ DashboardService getProgramDistribution should use ccName as fallback when programName is null
  ✓ DashboardService getProgramDistribution should return both currentPeriod and ytd data independently

### integrations/notification.service.spec.ts (PASS)
- Tests: 34 pass / 0 fail

  ✓ IntegrationNotificationService getNotifications / clearNotifications should return empty array initially
  ✓ IntegrationNotificationService getNotifications / clearNotifications should clear notifications
  ✓ IntegrationNotificationService sendTimesheetReminders should send reminders to users who have logged fewer hours than expected
  ✓ IntegrationNotificationService sendTimesheetReminders should not send reminder to users with no hours shortfall
  ✓ IntegrationNotificationService sendTimesheetReminders should skip users whose timesheet is already submitted or approved
  ✓ IntegrationNotificationService sendTimesheetReminders should still send reminder to users with rejected timesheets
  ✓ IntegrationNotificationService sendTimesheetReminders should return empty array when all users are on track
  ✓ IntegrationNotificationService sendTimesheetReminders should return empty array when no users exist
  ✓ IntegrationNotificationService sendTimesheetReminders should compute expected hours correctly: daysPassed * 8
  ✓ IntegrationNotificationService sendTimesheetReminders should include notifications in getNotifications() after sending
  ✓ IntegrationNotificationService sendApprovalReminders should send reminder to manager with pending timesheets
  ✓ IntegrationNotificationService sendApprovalReminders should send separate notifications to different managers
  ✓ IntegrationNotificationService sendApprovalReminders should skip timesheets with no managerId
  ✓ IntegrationNotificationService sendApprovalReminders should return empty array when no timesheets are pending
  ✓ IntegrationNotificationService sendApprovalReminders should skip manager if their profile is not found in DB
  ✓ IntegrationNotificationService sendApprovalReminders should include pending count in subject line
  ✓ IntegrationNotificationService sendManagerSummary should send weekly summary to manager
  ✓ IntegrationNotificationService sendManagerSummary should correctly count completed, pending and not-submitted
  ✓ IntegrationNotificationService sendManagerSummary should handle all reports completed
  ✓ IntegrationNotificationService sendManagerSummary should handle all reports not submitted
  ✓ IntegrationNotificationService sendManagerSummary should skip manager when they have no direct reports
  ✓ IntegrationNotificationService sendManagerSummary should return empty array when no managers exist
  ✓ IntegrationNotificationService sendManagerSummary should include employee names and statuses in the detail section
  ✓ IntegrationNotificationService sendWeeklyInsights should send weekly insights to pmo, finance and admin users
  ✓ IntegrationNotificationService sendWeeklyInsights should calculate chargeability rate correctly
  ✓ IntegrationNotificationService sendWeeklyInsights should report 0% chargeability when total hours is 0
  ✓ IntegrationNotificationService sendWeeklyInsights should list budget overruns when actualSpent > budgetAmount
  ✓ IntegrationNotificationService sendWeeklyInsights should report 0 overruns when all budgets are under limit
  ✓ IntegrationNotificationService sendWeeklyInsights should return empty array when no recipients found
  ✓ IntegrationNotificationService sendWeeklyInsights should include total and billable hours in the body
  ✓ IntegrationNotificationService sendWeeklyInsights should include the week date range in the subject
  ✓ IntegrationNotificationService sendAllNotifications should return counts for all four notification types
  ✓ IntegrationNotificationService notification ID sequencing should generate sequential IDs starting at notif-1
  ✓ IntegrationNotificationService notification ID sequencing should increment notification IDs across calls

### budgets/budgets.service.spec.ts (PASS)
- Tests: 17 pass / 0 fail

  ✓ BudgetsService getBudgetForChargeCode should throw NotFoundException when charge code does not exist
  ✓ BudgetsService getBudgetForChargeCode should return budget with percentage when budget record exists
  ✓ BudgetsService getBudgetForChargeCode should return 0 percentage when budget is 0
  ✓ BudgetsService getStatus (via getBudgetForChargeCode) should return under_budget status when usage is below 80%
  ✓ BudgetsService getStatus (via getBudgetForChargeCode) should return warning status when usage is between 80-90%
  ✓ BudgetsService getStatus (via getBudgetForChargeCode) should return critical status when usage is between 90-100%
  ✓ BudgetsService getStatus (via getBudgetForChargeCode) should return overrun status when usage exceeds 100%
  ✓ BudgetsService getForecast should throw NotFoundException when charge code does not exist
  ✓ BudgetsService getForecast should return null forecast when charge code has no dates
  ✓ BudgetsService getForecast should calculate forecast at completion when dates are present
  ✓ BudgetsService getAlerts should return empty array when no charge codes are over threshold
  ✓ BudgetsService getAlerts should return yellow alert at 81% usage
  ✓ BudgetsService getAlerts should return orange alert at 91% usage
  ✓ BudgetsService getAlerts should return red alert at 101% usage
  ✓ BudgetsService getAlerts should sort alerts: red first, then orange, then yellow
  ✓ BudgetsService getSummary should return zero summary when no budget records exist
  ✓ BudgetsService getSummary should correctly count over-budget charge codes

### settings/settings.service.spec.ts (PASS)
- Tests: 6 pass / 0 fail

  ✓ SettingsService getAll should return all settings as a key-value record
  ✓ SettingsService getAll should return empty record when no settings exist
  ✓ SettingsService get should return value for an existing key
  ✓ SettingsService get should return THB as default when default_currency key is not found
  ✓ SettingsService get should return empty string for unknown keys not found
  ✓ SettingsService set should upsert a setting and return key-value

### notifications/notifications.service.spec.ts (PASS)
- Tests: 14 pass / 0 fail

  ✓ NotificationsService create UNIT-NOTIF-01: should insert a notification and return it
  ✓ NotificationsService create UNIT-NOTIF-01b: should return the inserted notification object with correct fields
  ✓ NotificationsService findByUser UNIT-NOTIF-02: should return notifications filtered by recipientId, ordered by createdAt DESC
  ✓ NotificationsService findByUser UNIT-NOTIF-03: findByUser with unreadOnly=true filters to isRead=false only
  ✓ NotificationsService findByUser UNIT-NOTIF-02b: should respect limit and offset options
  ✓ NotificationsService findByUser UNIT-NOTIF-02c: should return empty array when user has no notifications
  ✓ NotificationsService getUnreadCount UNIT-NOTIF-04: should return correct unread count
  ✓ NotificationsService getUnreadCount UNIT-NOTIF-04b: should return count 0 when no unread notifications
  ✓ NotificationsService getUnreadCount UNIT-NOTIF-04c: should return 0 when result is empty (no rows)
  ✓ NotificationsService markAsRead UNIT-NOTIF-05: should update isRead and readAt when notification exists and belongs to user
  ✓ NotificationsService markAsRead UNIT-NOTIF-05b: should throw NotFoundException when notification does not exist
  ✓ NotificationsService markAsRead UNIT-NOTIF-05c: should throw ForbiddenException when notification belongs to another user
  ✓ NotificationsService markAllAsRead UNIT-NOTIF-06: should bulk update all unread notifications for user
  ✓ NotificationsService markAllAsRead UNIT-NOTIF-06b: should return success:true even when no notifications exist

### calendar/calendar.service.spec.ts (PASS)
- Tests: 18 pass / 0 fail

  ✓ CalendarService populateWeekends should insert weekend entries for a given year
  ✓ CalendarService populateWeekends should only insert weekend dates (count matches expected weekends for 2026)
  ✓ CalendarService createHoliday should create a new holiday entry when date does not exist
  ✓ CalendarService createHoliday should update existing entry to be a holiday when date already exists
  ✓ CalendarService updateHoliday should throw NotFoundException when holiday does not exist
  ✓ CalendarService updateHoliday should throw NotFoundException when entry exists but is not a holiday
  ✓ CalendarService updateHoliday should update holiday name successfully
  ✓ CalendarService deleteHoliday should throw NotFoundException when holiday does not exist
  ✓ CalendarService deleteHoliday should clear holiday fields (not delete) when entry is also a weekend
  ✓ CalendarService deleteHoliday should delete the entry entirely when it is only a holiday
  ✓ CalendarService getWorkingDays should count working days excluding weekends and holidays
  ✓ CalendarService getWorkingDays should subtract vacation days when userId is provided
  ✓ CalendarService createVacation should throw BadRequestException when end date is before start date
  ✓ CalendarService createVacation should create a vacation request successfully
  ✓ CalendarService approveVacation should throw NotFoundException when vacation does not exist
  ✓ CalendarService approveVacation should throw BadRequestException when vacation is not pending
  ✓ CalendarService approveVacation should throw ForbiddenException when approver is not the manager
  ✓ CalendarService approveVacation should approve a pending vacation successfully

### charge-codes/charge-codes.service.spec.ts (PASS)
- Tests: 17 pass / 0 fail

  ✓ ChargeCodesService create should create a program-level charge code with auto-generated PRG- prefix
  ✓ ChargeCodesService create should auto-generate sequential IDs (PRG-002 after PRG-001)
  ✓ ChargeCodesService create should create a project with PRJ- prefix under a program parent
  ✓ ChargeCodesService create should throw BadRequestException when program has a parentId
  ✓ ChargeCodesService create should throw BadRequestException when project has no parentId
  ✓ ChargeCodesService create should throw BadRequestException when project parent is not a program
  ✓ ChargeCodesService create should build materialized path from parent
  ✓ ChargeCodesService findById should throw NotFoundException when charge code does not exist
  ✓ ChargeCodesService findById should return charge code with assigned users
  ✓ ChargeCodesService findChildren should return direct children of a charge code
  ✓ ChargeCodesService findChildren should return empty array for leaf nodes
  ✓ ChargeCodesService updateAccess should throw NotFoundException when charge code does not exist
  ✓ ChargeCodesService updateAccess should add users to a charge code and cascade to descendants
  ✓ ChargeCodesService updateAccess should remove users from a charge code and cascade to descendants
  ✓ ChargeCodesService updateAccess UNIT-CC-AUTH-01: should throw ForbiddenException when caller is a non-owner charge_manager
  ✓ ChargeCodesService updateAccess UNIT-CC-AUTH-02: should succeed when caller is admin (regardless of ownership)
  ✓ ChargeCodesService updateAccess UNIT-CC-AUTH-03: should succeed when caller is the charge code owner
