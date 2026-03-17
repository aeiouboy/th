# Backend Unit Test Results

**Date**: 2026-03-17
**Runner**: Jest + ts-jest + NestJS Testing
**Total**: 127 tests | 127 passed | 0 failed

## Test Suites

| Suite File | Tests | Status |
|---|---|---|
| `reports/reports.service.spec.ts` | 15 | PASS |
| `cost-rates/cost-rates.service.spec.ts` | 9 | PASS |
| `approvals/approvals.service.spec.ts` | 15 | PASS |
| `users/users.service.spec.ts` | 10 | PASS |
| `common/guards/supabase-auth.guard.spec.ts` | 11 | PASS |
| `calendar/calendar.service.spec.ts` | 18 | PASS |
| `budgets/budgets.service.spec.ts` | 17 | PASS |
| `timesheets/timesheets.service.spec.ts` | 18 | PASS |
| `charge-codes/charge-codes.service.spec.ts` | 14 | PASS |

## Test Details

### reports/reports.service.spec.ts

| Test | Status |
|---|---|
| ReportsService > getProjectCostReport > should return empty report when charge code does not exist | pass |
| ReportsService > getProjectCostReport > should return report with budget and actuals | pass |
| ReportsService > getProjectCostReport > should include child breakdown in report | pass |
| ReportsService > getChargeabilityReport > should return zero chargeability when no hours logged | pass |
| ReportsService > getChargeabilityReport > should calculate chargeability correctly (billable/total) | pass |
| ReportsService > getChargeabilityReport > should have 80% target chargeability | pass |
| ReportsService > getActivityDistribution > should return empty distribution when no entries exist | pass |
| ReportsService > getActivityDistribution > should calculate percentage for each category | pass |
| ReportsService > getActivityDistribution > should sort distribution by hours descending | pass |
| ReportsService > getUtilizationReport > should fallback to 22 working days when calendar has no data | pass |
| ReportsService > getUtilizationReport > should calculate utilization rate per employee | pass |
| ReportsService > getBudgetAlerts > should return formatted budget alerts with overrunAmount calculated | pass |
| ReportsService > getBudgetAlerts > should pass through severity values from budgets service (red, orange, yellow) | pass |
| ReportsService > getBudgetAlerts > should calculate overrunPercent as percentage over budget | pass |
| ReportsService > getBudgetAlerts > should return zero overrunAmount when actual is less than budget | pass |

### cost-rates/cost-rates.service.spec.ts

| Test | Status |
|---|---|
| CostRatesService > findAll > should return all cost rates ordered by jobGrade and effectiveFrom | pass |
| CostRatesService > findAll > should return empty array when no cost rates exist | pass |
| CostRatesService > create > should create a new cost rate and return it | pass |
| CostRatesService > create > should create cost rate with effectiveTo date when provided | pass |
| CostRatesService > update > should update an existing cost rate and return it | pass |
| CostRatesService > update > should throw NotFoundException when cost rate does not exist | pass |
| CostRatesService > update > should allow partial updates (only jobGrade) | pass |
| CostRatesService > remove > should delete a cost rate and return { deleted: true } | pass |
| CostRatesService > remove > should throw NotFoundException when cost rate does not exist | pass |

### approvals/approvals.service.spec.ts

| Test | Status |
|---|---|
| ApprovalsService > getPending > should return empty results when no pending approvals exist | pass |
| ApprovalsService > getPending > should return timesheets pending manager approval | pass |
| ApprovalsService > approve > should throw NotFoundException when timesheet does not exist | pass |
| ApprovalsService > approve > should throw BadRequestException when timesheet is in locked status | pass |
| ApprovalsService > approve > should throw ForbiddenException when approver is not the employee manager | pass |
| ApprovalsService > approve > should transition timesheet from submitted to manager_approved | pass |
| ApprovalsService > approve > should create an audit log entry when approving | pass |
| ApprovalsService > approve > should auto-lock when no CC approvers are needed | pass |
| ApprovalsService > approve > should throw ForbiddenException when CC approver does not own any charge code on the timesheet | pass |
| ApprovalsService > reject > should throw NotFoundException when timesheet does not exist | pass |
| ApprovalsService > reject > should throw BadRequestException when rejecting a locked timesheet | pass |
| ApprovalsService > reject > should reject a submitted timesheet and set status to rejected | pass |
| ApprovalsService > reject > should create audit log with reject action | pass |
| ApprovalsService > bulkApprove > should approve multiple timesheets and return results | pass |
| ApprovalsService > bulkApprove > should include error entry when individual approval fails | pass |

### users/users.service.spec.ts

| Test | Status |
|---|---|
| UsersService > findAll > should return all user profiles | pass |
| UsersService > findAll > should return empty array when no profiles exist | pass |
| UsersService > findById > should return the user when found | pass |
| UsersService > findById > should throw NotFoundException when user does not exist | pass |
| UsersService > updateProfile > should update and return the user profile | pass |
| UsersService > updateProfile > should throw NotFoundException when user to update does not exist | pass |
| UsersService > updateRole > should update user role successfully | pass |
| UsersService > updateRole > should throw NotFoundException when user does not exist | pass |
| UsersService > updateJobGrade > should update job grade successfully | pass |
| UsersService > updateJobGrade > should throw NotFoundException when user does not exist | pass |

### common/guards/supabase-auth.guard.spec.ts

| Test | Status |
|---|---|
| SupabaseAuthGuard > should allow public routes without a token | pass |
| SupabaseAuthGuard > should throw UnauthorizedException when Authorization header is missing | pass |
| SupabaseAuthGuard > should throw UnauthorizedException when Authorization header does not start with Bearer | pass |
| SupabaseAuthGuard > should throw UnauthorizedException when JWT verification fails (invalid token) | pass |
| SupabaseAuthGuard > should throw UnauthorizedException when user profile is not found in DB | pass |
| SupabaseAuthGuard > should allow request and attach profile when JWT is valid | pass |
| RolesGuard > should allow access when no roles are required | pass |
| RolesGuard > should allow access when user has the required role | pass |
| RolesGuard > should throw ForbiddenException when user does not have the required role | pass |
| RolesGuard > should throw ForbiddenException when no user is on the request | pass |
| RolesGuard > should allow access when user role matches one of multiple required roles | pass |

### calendar/calendar.service.spec.ts

| Test | Status |
|---|---|
| CalendarService > populateWeekends > should insert weekend entries for a given year | pass |
| CalendarService > populateWeekends > should only insert weekend dates (count matches expected weekends for 2026) | pass |
| CalendarService > createHoliday > should create a new holiday entry when date does not exist | pass |
| CalendarService > createHoliday > should update existing entry to be a holiday when date already exists | pass |
| CalendarService > updateHoliday > should throw NotFoundException when holiday does not exist | pass |
| CalendarService > updateHoliday > should throw NotFoundException when entry exists but is not a holiday | pass |
| CalendarService > updateHoliday > should update holiday name successfully | pass |
| CalendarService > deleteHoliday > should throw NotFoundException when holiday does not exist | pass |
| CalendarService > deleteHoliday > should clear holiday fields (not delete) when entry is also a weekend | pass |
| CalendarService > deleteHoliday > should delete the entry entirely when it is only a holiday | pass |
| CalendarService > getWorkingDays > should count working days excluding weekends and holidays | pass |
| CalendarService > getWorkingDays > should subtract vacation days when userId is provided | pass |
| CalendarService > createVacation > should throw BadRequestException when end date is before start date | pass |
| CalendarService > createVacation > should create a vacation request successfully | pass |
| CalendarService > approveVacation > should throw NotFoundException when vacation does not exist | pass |
| CalendarService > approveVacation > should throw BadRequestException when vacation is not pending | pass |
| CalendarService > approveVacation > should throw ForbiddenException when approver is not the manager | pass |
| CalendarService > approveVacation > should approve a pending vacation successfully | pass |

### budgets/budgets.service.spec.ts

| Test | Status |
|---|---|
| BudgetsService > getBudgetForChargeCode > should throw NotFoundException when charge code does not exist | pass |
| BudgetsService > getBudgetForChargeCode > should return budget with percentage when budget record exists | pass |
| BudgetsService > getBudgetForChargeCode > should return 0 percentage when budget is 0 | pass |
| BudgetsService > getStatus (via getBudgetForChargeCode) > should return under_budget status when usage is below 80% | pass |
| BudgetsService > getStatus (via getBudgetForChargeCode) > should return warning status when usage is between 80-90% | pass |
| BudgetsService > getStatus (via getBudgetForChargeCode) > should return critical status when usage is between 90-100% | pass |
| BudgetsService > getStatus (via getBudgetForChargeCode) > should return overrun status when usage exceeds 100% | pass |
| BudgetsService > getForecast > should throw NotFoundException when charge code does not exist | pass |
| BudgetsService > getForecast > should return null forecast when charge code has no dates | pass |
| BudgetsService > getForecast > should calculate forecast at completion when dates are present | pass |
| BudgetsService > getAlerts > should return empty array when no charge codes are over threshold | pass |
| BudgetsService > getAlerts > should return yellow alert at 81% usage | pass |
| BudgetsService > getAlerts > should return orange alert at 91% usage | pass |
| BudgetsService > getAlerts > should return red alert at 101% usage | pass |
| BudgetsService > getAlerts > should sort alerts: red first, then orange, then yellow | pass |
| BudgetsService > getSummary > should return zero summary when no budget records exist | pass |
| BudgetsService > getSummary > should correctly count over-budget charge codes | pass |

### timesheets/timesheets.service.spec.ts

| Test | Status |
|---|---|
| TimesheetsService > getWeekBounds (via create) > should normalize a Wednesday to its Monday start | pass |
| TimesheetsService > getWeekBounds (via create) > should return existing timesheet if one already exists for that week | pass |
| TimesheetsService > findByPeriod > should return null when no timesheet exists for the period | pass |
| TimesheetsService > findByPeriod > should return the timesheet when it exists | pass |
| TimesheetsService > findById > should throw NotFoundException when timesheet does not exist | pass |
| TimesheetsService > findById > should return timesheet with entries when it exists | pass |
| TimesheetsService > upsertEntries > should throw NotFoundException when timesheet does not exist | pass |
| TimesheetsService > upsertEntries > should throw ForbiddenException when timesheet status is submitted | pass |
| TimesheetsService > upsertEntries > should throw ForbiddenException when timesheet status is locked | pass |
| TimesheetsService > upsertEntries > should allow editing when status is draft | pass |
| TimesheetsService > upsertEntries > should allow editing when status is rejected | pass |
| TimesheetsService > upsertEntries > should validate that charge codes are assigned to the user | pass |
| TimesheetsService > upsertEntries > should filter out entries with 0 hours | pass |
| TimesheetsService > submit > should throw NotFoundException when timesheet does not exist | pass |
| TimesheetsService > submit > should throw BadRequestException when status is already submitted | pass |
| TimesheetsService > submit > should throw BadRequestException when status is locked | pass |
| TimesheetsService > submit > should transition draft timesheet to submitted | pass |
| TimesheetsService > submit > should allow resubmitting a rejected timesheet | pass |

### charge-codes/charge-codes.service.spec.ts

| Test | Status |
|---|---|
| ChargeCodesService > create > should create a program-level charge code with auto-generated PRG- prefix | pass |
| ChargeCodesService > create > should auto-generate sequential IDs (PRG-002 after PRG-001) | pass |
| ChargeCodesService > create > should create a project with PRJ- prefix under a program parent | pass |
| ChargeCodesService > create > should throw BadRequestException when program has a parentId | pass |
| ChargeCodesService > create > should throw BadRequestException when project has no parentId | pass |
| ChargeCodesService > create > should throw BadRequestException when project parent is not a program | pass |
| ChargeCodesService > create > should build materialized path from parent | pass |
| ChargeCodesService > findById > should throw NotFoundException when charge code does not exist | pass |
| ChargeCodesService > findById > should return charge code with assigned users | pass |
| ChargeCodesService > findChildren > should return direct children of a charge code | pass |
| ChargeCodesService > findChildren > should return empty array for leaf nodes | pass |
| ChargeCodesService > updateAccess > should throw NotFoundException when charge code does not exist | pass |
| ChargeCodesService > updateAccess > should add users to a charge code | pass |
| ChargeCodesService > updateAccess > should remove users from a charge code | pass |

