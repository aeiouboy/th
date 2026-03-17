# Backend Unit Test Results

**Date**: 2026-03-17
**Framework**: Jest + NestJS Testing + ts-jest
**Total**: 127 tests | 9 suites | All passing

---

## timesheets.service.spec.ts — 18 tests PASS

| Test | Result |
|------|--------|
| getWeekBounds: normalize Wednesday to Monday start | PASS |
| getWeekBounds: return existing timesheet if already exists | PASS |
| findByPeriod: returns null when no timesheet exists | PASS |
| findByPeriod: returns timesheet when it exists | PASS |
| findById: throws NotFoundException when not found | PASS |
| findById: returns timesheet with entries | PASS |
| upsertEntries: throws NotFoundException when sheet not found | PASS |
| upsertEntries: throws ForbiddenException when status is submitted | PASS |
| upsertEntries: throws ForbiddenException when status is locked | PASS |
| upsertEntries: allows editing when status is draft | PASS |
| upsertEntries: allows editing when status is rejected | PASS |
| upsertEntries: validates charge codes are assigned to user | PASS |
| upsertEntries: filters out entries with 0 hours | PASS |
| submit: throws NotFoundException when not found | PASS |
| submit: throws BadRequestException when already submitted | PASS |
| submit: throws BadRequestException when locked | PASS |
| submit: transitions draft to submitted | PASS |
| submit: allows resubmitting rejected timesheet | PASS |

---

## charge-codes.service.spec.ts — 14 tests PASS

| Test | Result |
|------|--------|
| create: creates program with PRG- prefix | PASS |
| create: auto-generate sequential IDs PRG-002 after PRG-001 | PASS |
| create: creates project with PRJ- prefix under program | PASS |
| create: throws BadRequestException when program has parentId | PASS |
| create: throws BadRequestException when project has no parentId | PASS |
| create: throws BadRequestException when project parent is wrong level | PASS |
| create: builds materialized path from parent | PASS |
| findById: throws NotFoundException | PASS |
| findById: returns charge code with assigned users | PASS |
| findChildren: returns direct children | PASS |
| findChildren: returns empty for leaf nodes | PASS |
| updateAccess: throws NotFoundException | PASS |
| updateAccess: adds users | PASS |
| updateAccess: removes users | PASS |

---

## approvals.service.spec.ts — 15 tests PASS

| Test | Result |
|------|--------|
| getPending: returns empty when no approvals | PASS |
| getPending: returns manager-pending timesheets | PASS |
| approve: throws NotFoundException when not found | PASS |
| approve: throws BadRequestException for locked status | PASS |
| approve: throws ForbiddenException when not the manager | PASS |
| approve: transitions submitted to manager_approved | PASS |
| approve: creates audit log | PASS |
| approve: auto-locks when no CC approvers needed | PASS |
| approve: throws ForbiddenException for wrong CC approver | PASS |
| reject: throws NotFoundException | PASS |
| reject: throws BadRequestException for locked status | PASS |
| reject: transitions submitted to rejected | PASS |
| reject: creates audit log | PASS |
| bulkApprove: approves multiple timesheets | PASS |
| bulkApprove: includes error entry when individual fails | PASS |

---

## budgets.service.spec.ts — 17 tests PASS

| Test | Result |
|------|--------|
| getBudgetForChargeCode: throws NotFoundException | PASS |
| getBudgetForChargeCode: returns budget with percentage | PASS |
| getBudgetForChargeCode: returns 0 percentage when budget is 0 | PASS |
| getStatus: returns under_budget below 80% | PASS |
| getStatus: returns warning between 80-90% | PASS |
| getStatus: returns critical between 90-100% | PASS |
| getStatus: returns overrun above 100% | PASS |
| getForecast: throws NotFoundException | PASS |
| getForecast: returns null when no dates | PASS |
| getForecast: calculates forecast with dates | PASS |
| getAlerts: returns empty when no codes over threshold | PASS |
| getAlerts: returns yellow alert at 81% | PASS |
| getAlerts: returns orange alert at 91% | PASS |
| getAlerts: returns red alert at 101% | PASS |
| getAlerts: sorts red first then orange then yellow | PASS |
| getSummary: returns zero when no records | PASS |
| getSummary: counts over-budget codes | PASS |

---

## calendar.service.spec.ts — 18 tests PASS

| Test | Result |
|------|--------|
| populateWeekends: inserts entries for year | PASS |
| populateWeekends: only inserts weekend dates | PASS |
| createHoliday: creates new entry | PASS |
| createHoliday: updates existing entry | PASS |
| updateHoliday: throws NotFoundException when not found | PASS |
| updateHoliday: throws NotFoundException when not a holiday | PASS |
| updateHoliday: updates name | PASS |
| deleteHoliday: throws NotFoundException | PASS |
| deleteHoliday: clears fields when also a weekend | PASS |
| deleteHoliday: deletes entry when only a holiday | PASS |
| getWorkingDays: excludes weekends and holidays | PASS |
| getWorkingDays: subtracts vacation days | PASS |
| createVacation: throws BadRequestException for bad dates | PASS |
| createVacation: creates request | PASS |
| approveVacation: throws NotFoundException | PASS |
| approveVacation: throws BadRequestException when not pending | PASS |
| approveVacation: throws ForbiddenException when not manager | PASS |
| approveVacation: approves pending request | PASS |

---

## reports.service.spec.ts — 15 tests PASS

| Test | Result |
|------|--------|
| getProjectCostReport: returns empty when CC not found | PASS |
| getProjectCostReport: returns budget and actuals | PASS |
| getProjectCostReport: includes child breakdown | PASS |
| getChargeabilityReport: returns zero with no hours | PASS |
| getChargeabilityReport: calculates billable/total | PASS |
| getChargeabilityReport: has 80% target | PASS |
| getActivityDistribution: returns empty | PASS |
| getActivityDistribution: calculates percentages | PASS |
| getActivityDistribution: sorts by hours desc | PASS |
| getUtilizationReport: fallback to 22 working days | PASS |
| getUtilizationReport: calculates utilization per employee | PASS |
| getBudgetAlerts: returns formatted alerts with overrunAmount | PASS |
| getBudgetAlerts: passes through severity values (red/orange/yellow) | PASS |
| getBudgetAlerts: calculates overrunPercent | PASS |
| getBudgetAlerts: returns zero overrunAmount when under budget | PASS |

---

## supabase-auth.guard.spec.ts — 11 tests PASS

| Test | Result |
|------|--------|
| SupabaseAuthGuard: allows public routes | PASS |
| SupabaseAuthGuard: throws 401 with missing auth header | PASS |
| SupabaseAuthGuard: throws 401 for non-Bearer header | PASS |
| SupabaseAuthGuard: throws 401 for invalid JWT (JWKS error) | PASS |
| SupabaseAuthGuard: throws 401 when user profile not found | PASS |
| SupabaseAuthGuard: allows request with valid JWT and attaches profile | PASS |
| RolesGuard: allows when no roles required | PASS |
| RolesGuard: allows when user has required role | PASS |
| RolesGuard: throws ForbiddenException for wrong role | PASS |
| RolesGuard: throws ForbiddenException with no user | PASS |
| RolesGuard: allows matching one of multiple roles | PASS |

---

## users.service.spec.ts — 10 tests PASS (NEW)

| Test | Result |
|------|--------|
| findAll: returns all user profiles | PASS |
| findAll: returns empty array when no profiles | PASS |
| findById: returns user when found | PASS |
| findById: throws NotFoundException when not found | PASS |
| updateProfile: updates and returns profile | PASS |
| updateProfile: throws NotFoundException when not found | PASS |
| updateRole: updates role successfully | PASS |
| updateRole: throws NotFoundException when not found | PASS |
| updateJobGrade: updates job grade successfully | PASS |
| updateJobGrade: throws NotFoundException when not found | PASS |

---

## cost-rates.service.spec.ts — 9 tests PASS (NEW)

| Test | Result |
|------|--------|
| findAll: returns all cost rates ordered | PASS |
| findAll: returns empty array when none exist | PASS |
| create: creates new cost rate | PASS |
| create: creates cost rate with effectiveTo date | PASS |
| update: updates cost rate | PASS |
| update: throws NotFoundException when not found | PASS |
| update: allows partial updates | PASS |
| remove: deletes and returns { deleted: true } | PASS |
| remove: throws NotFoundException when not found | PASS |
