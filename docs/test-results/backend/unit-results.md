# Backend Unit Test Results

**Date**: 2026-03-17
**Framework**: Jest + ts-jest + NestJS Testing
**Total**: 217 tests | 217 passed | 0 failed

## Summary by Suite

| Suite File | Total | Pass | Fail |
|---|---|---|---|
| `users.service.spec.ts` | 10 | 10 | 0 |
| `budgets.service.spec.ts` | 17 | 17 | 0 |
| `reports.service.spec.ts` | 15 | 15 | 0 |
| `cost-rates.service.spec.ts` | 9 | 9 | 0 |
| `approvals.service.spec.ts` | 15 | 15 | 0 |
| `supabase-auth.guard.spec.ts` | 11 | 11 | 0 |
| `timesheets.service.spec.ts` | 21 | 21 | 0 |
| `calendar.service.spec.ts` | 18 | 18 | 0 |
| `charge-codes.service.spec.ts` | 14 | 14 | 0 |
| `settings.service.spec.ts` | 6 | 6 | 0 |

## All Tests

| Suite | Test | Status |
|---|---|---|
| `` | UsersService findAll should return all user profiles | pass |
| `` | UsersService findAll should return empty array when no profiles exist | pass |
| `` | UsersService findById should return the user when found | pass |
| `` | UsersService findById should throw NotFoundException when user does not exist | pass |
| `` | UsersService updateProfile should update and return the user profile | pass |
| `` | UsersService updateProfile should throw NotFoundException when user to update do | pass |
| `` | UsersService updateRole should update user role successfully | pass |
| `` | UsersService updateRole should throw NotFoundException when user does not exist | pass |
| `` | UsersService updateJobGrade should update job grade successfully | pass |
| `` | UsersService updateJobGrade should throw NotFoundException when user does not ex | pass |
| `` | BudgetsService getBudgetForChargeCode should throw NotFoundException when charge | pass |
| `` | BudgetsService getBudgetForChargeCode should return budget with percentage when  | pass |
| `` | BudgetsService getBudgetForChargeCode should return 0 percentage when budget is  | pass |
| `` | BudgetsService getStatus (via getBudgetForChargeCode) should return under_budget | pass |
| `` | BudgetsService getStatus (via getBudgetForChargeCode) should return warning stat | pass |
| `` | BudgetsService getStatus (via getBudgetForChargeCode) should return critical sta | pass |
| `` | BudgetsService getStatus (via getBudgetForChargeCode) should return overrun stat | pass |
| `` | BudgetsService getForecast should throw NotFoundException when charge code does  | pass |
| `` | BudgetsService getForecast should return null forecast when charge code has no d | pass |
| `` | BudgetsService getForecast should calculate forecast at completion when dates ar | pass |
| `` | BudgetsService getAlerts should return empty array when no charge codes are over | pass |
| `` | BudgetsService getAlerts should return yellow alert at 81% usage | pass |
| `` | BudgetsService getAlerts should return orange alert at 91% usage | pass |
| `` | BudgetsService getAlerts should return red alert at 101% usage | pass |
| `` | BudgetsService getAlerts should sort alerts: red first, then orange, then yellow | pass |
| `` | BudgetsService getSummary should return zero summary when no budget records exis | pass |
| `` | BudgetsService getSummary should correctly count over-budget charge codes | pass |
| `` | ReportsService getProjectCostReport should return empty report when charge code  | pass |
| `` | ReportsService getProjectCostReport should return report with budget and actuals | pass |
| `` | ReportsService getProjectCostReport should include child breakdown in report | pass |
| `` | ReportsService getChargeabilityReport should return zero chargeability when no h | pass |
| `` | ReportsService getChargeabilityReport should calculate chargeability correctly ( | pass |
| `` | ReportsService getChargeabilityReport should have 80% target chargeability | pass |
| `` | ReportsService getActivityDistribution should return empty distribution when no  | pass |
| `` | ReportsService getActivityDistribution should calculate percentage for each cate | pass |
| `` | ReportsService getActivityDistribution should sort distribution by hours descend | pass |
| `` | ReportsService getUtilizationReport should fallback to 22 working days when cale | pass |
| `` | ReportsService getUtilizationReport should calculate utilization rate per employ | pass |
| `` | ReportsService getBudgetAlerts should return formatted budget alerts with overru | pass |
| `` | ReportsService getBudgetAlerts should pass through severity values from budgets  | pass |
| `` | ReportsService getBudgetAlerts should calculate overrunPercent as percentage ove | pass |
| `` | ReportsService getBudgetAlerts should return zero overrunAmount when actual is l | pass |
| `` | CostRatesService findAll should return all cost rates ordered by jobGrade and ef | pass |
| `` | CostRatesService findAll should return empty array when no cost rates exist | pass |
| `` | CostRatesService create should create a new cost rate and return it | pass |
| `` | CostRatesService create should create cost rate with effectiveTo date when provi | pass |
| `` | CostRatesService update should update an existing cost rate and return it | pass |
| `` | CostRatesService update should throw NotFoundException when cost rate does not e | pass |
| `` | CostRatesService update should allow partial updates (only jobGrade) | pass |
| `` | CostRatesService remove should delete a cost rate and return { deleted: true } | pass |
| `` | CostRatesService remove should throw NotFoundException when cost rate does not e | pass |
| `` | ApprovalsService getPending should return empty results when no pending approval | pass |
| `` | ApprovalsService getPending should return timesheets pending manager approval | pass |
| `` | ApprovalsService approve should throw NotFoundException when timesheet does not  | pass |
| `` | ApprovalsService approve should throw BadRequestException when timesheet is in l | pass |
| `` | ApprovalsService approve should throw ForbiddenException when approver is not th | pass |
| `` | ApprovalsService approve should transition timesheet from submitted to manager_a | pass |
| `` | ApprovalsService approve should create an audit log entry when approving | pass |
| `` | ApprovalsService approve should auto-lock when no CC approvers are needed | pass |
| `` | ApprovalsService approve should throw ForbiddenException when CC approver does n | pass |
| `` | ApprovalsService reject should throw NotFoundException when timesheet does not e | pass |
| `` | ApprovalsService reject should throw BadRequestException when rejecting a locked | pass |
| `` | ApprovalsService reject should reject a submitted timesheet and set status to re | pass |
| `` | ApprovalsService reject should create audit log with reject action | pass |
| `` | ApprovalsService bulkApprove should approve multiple timesheets and return resul | pass |
| `` | ApprovalsService bulkApprove should include error entry when individual approval | pass |
| `` | SupabaseAuthGuard should allow public routes without a token | pass |
| `` | SupabaseAuthGuard should throw UnauthorizedException when Authorization header i | pass |
| `` | SupabaseAuthGuard should throw UnauthorizedException when Authorization header d | pass |
| `` | SupabaseAuthGuard should throw UnauthorizedException when JWT verification fails | pass |
| `` | SupabaseAuthGuard should throw UnauthorizedException when user profile is not fo | pass |
| `` | SupabaseAuthGuard should allow request and attach profile when JWT is valid | pass |
| `` | RolesGuard should allow access when no roles are required | pass |
| `` | RolesGuard should allow access when user has the required role | pass |
| `` | RolesGuard should throw ForbiddenException when user does not have the required  | pass |
| `` | RolesGuard should throw ForbiddenException when no user is on the request | pass |
| `` | RolesGuard should allow access when user role matches one of multiple required r | pass |
| `timesheets.service.spec.ts` | TimesheetsService getAvailablePeriods should return an empty array when user has no timesheets | pass |
| `timesheets.service.spec.ts` | TimesheetsService getAvailablePeriods should return periodStart values in descending order | pass |
| `timesheets.service.spec.ts` | TimesheetsService getAvailablePeriods should return a single period when user has one timesheet | pass |
| `timesheets.service.spec.ts` | TimesheetsService getWeekBounds (via create) should normalize a Wednesday to its | pass |
| `timesheets.service.spec.ts` | TimesheetsService getWeekBounds (via create) should return existing timesheet if | pass |
| `timesheets.service.spec.ts` | TimesheetsService findByPeriod should return null when no timesheet exists for t | pass |
| `` | TimesheetsService findByPeriod should return the timesheet when it exists | pass |
| `` | TimesheetsService findById should throw NotFoundException when timesheet does no | pass |
| `` | TimesheetsService findById should return timesheet with entries when it exists | pass |
| `` | TimesheetsService upsertEntries should throw NotFoundException when timesheet do | pass |
| `` | TimesheetsService upsertEntries should throw ForbiddenException when timesheet s | pass |
| `` | TimesheetsService upsertEntries should throw ForbiddenException when timesheet s | pass |
| `` | TimesheetsService upsertEntries should allow editing when status is draft | pass |
| `` | TimesheetsService upsertEntries should allow editing when status is rejected | pass |
| `` | TimesheetsService upsertEntries should validate that charge codes are assigned t | pass |
| `` | TimesheetsService upsertEntries should filter out entries with 0 hours | pass |
| `` | TimesheetsService submit should throw NotFoundException when timesheet does not  | pass |
| `` | TimesheetsService submit should throw BadRequestException when status is already | pass |
| `` | TimesheetsService submit should throw BadRequestException when status is locked | pass |
| `` | TimesheetsService submit should transition draft timesheet to submitted | pass |
| `` | TimesheetsService submit should allow resubmitting a rejected timesheet | pass |
| `` | CalendarService populateWeekends should insert weekend entries for a given year | pass |
| `` | CalendarService populateWeekends should only insert weekend dates (count matches | pass |
| `` | CalendarService createHoliday should create a new holiday entry when date does n | pass |
| `` | CalendarService createHoliday should update existing entry to be a holiday when  | pass |
| `` | CalendarService updateHoliday should throw NotFoundException when holiday does n | pass |
| `` | CalendarService updateHoliday should throw NotFoundException when entry exists b | pass |
| `` | CalendarService updateHoliday should update holiday name successfully | pass |
| `` | CalendarService deleteHoliday should throw NotFoundException when holiday does n | pass |
| `` | CalendarService deleteHoliday should clear holiday fields (not delete) when entr | pass |
| `` | CalendarService deleteHoliday should delete the entry entirely when it is only a | pass |
| `` | CalendarService getWorkingDays should count working days excluding weekends and  | pass |
| `` | CalendarService getWorkingDays should subtract vacation days when userId is prov | pass |
| `` | CalendarService createVacation should throw BadRequestException when end date is | pass |
| `` | CalendarService createVacation should create a vacation request successfully | pass |
| `` | CalendarService approveVacation should throw NotFoundException when vacation doe | pass |
| `` | CalendarService approveVacation should throw BadRequestException when vacation i | pass |
| `` | CalendarService approveVacation should throw ForbiddenException when approver is | pass |
| `` | CalendarService approveVacation should approve a pending vacation successfully | pass |
| `` | ChargeCodesService create should create a program-level charge code with auto-ge | pass |
| `` | ChargeCodesService create should auto-generate sequential IDs (PRG-002 after PRG | pass |
| `` | ChargeCodesService create should create a project with PRJ- prefix under a progr | pass |
| `` | ChargeCodesService create should throw BadRequestException when program has a pa | pass |
| `` | ChargeCodesService create should throw BadRequestException when project has no p | pass |
| `` | ChargeCodesService create should throw BadRequestException when project parent i | pass |
| `` | ChargeCodesService create should build materialized path from parent | pass |
| `` | ChargeCodesService findById should throw NotFoundException when charge code does | pass |
| `` | ChargeCodesService findById should return charge code with assigned users | pass |
| `` | ChargeCodesService findChildren should return direct children of a charge code | pass |
| `` | ChargeCodesService findChildren should return empty array for leaf nodes | pass |
| `` | ChargeCodesService updateAccess should throw NotFoundException when charge code  | pass |
| `` | ChargeCodesService updateAccess should add users to a charge code | pass |
| `` | ChargeCodesService updateAccess should remove users from a charge code | pass |
