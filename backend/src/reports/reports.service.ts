import { Injectable, Inject } from '@nestjs/common';
import { eq, sql, and, gte, lte, sum, count } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import {
  budgets,
  chargeCodes,
  timesheetEntries,
  timesheets,
  profiles,
  costRates,
  calendar,
} from '../database/schema';
import {
  ProjectCostReportDto,
  ProjectCostItemDto,
  UtilizationReportDto,
  EmployeeUtilizationDto,
  ChargeabilityReportDto,
  FinancialImpactDto,
  ActivityDistributionReportDto,
  BudgetAlertItemDto,
} from './dto/report-response.dto';
import { BudgetsService } from '../budgets/budgets.service';

@Injectable()
export class ReportsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly budgetsService: BudgetsService,
  ) {}

  async getProjectCostReport(chargeCodeId: string): Promise<ProjectCostReportDto> {
    // Get the target charge code
    const [cc] = await this.db
      .select()
      .from(chargeCodes)
      .where(eq(chargeCodes.id, chargeCodeId))
      .limit(1);

    if (!cc) {
      return {
        chargeCodeId,
        chargeCodeName: 'Unknown',
        totalBudget: 0,
        totalActualSpent: 0,
        variance: 0,
        percentUsed: 0,
        breakdown: [],
      };
    }

    // Get budget info
    const [budget] = await this.db
      .select()
      .from(budgets)
      .where(eq(budgets.chargeCodeId, chargeCodeId))
      .limit(1);

    const totalBudget = Number(budget?.budgetAmount ?? cc.budgetAmount ?? 0);
    const totalActualSpent = Number(budget?.actualSpent ?? 0);

    // Get children for breakdown
    const children = await this.db
      .select()
      .from(chargeCodes)
      .where(eq(chargeCodes.parentId, chargeCodeId));

    const breakdown: ProjectCostItemDto[] = [];
    for (const child of children) {
      const [childBudget] = await this.db
        .select()
        .from(budgets)
        .where(eq(budgets.chargeCodeId, child.id))
        .limit(1);

      const childBudgetAmt = Number(childBudget?.budgetAmount ?? child.budgetAmount ?? 0);
      const childActual = Number(childBudget?.actualSpent ?? 0);

      // Get grandchildren
      const grandchildren = await this.db
        .select()
        .from(chargeCodes)
        .where(eq(chargeCodes.parentId, child.id));

      const grandchildItems: ProjectCostItemDto[] = [];
      for (const gc of grandchildren) {
        const [gcBudget] = await this.db
          .select()
          .from(budgets)
          .where(eq(budgets.chargeCodeId, gc.id))
          .limit(1);

        const gcBudgetAmt = Number(gcBudget?.budgetAmount ?? gc.budgetAmount ?? 0);
        const gcActual = Number(gcBudget?.actualSpent ?? 0);

        grandchildItems.push({
          chargeCodeId: gc.id,
          chargeCodeName: gc.name,
          level: gc.level ?? 'task',
          budgetAmount: gcBudgetAmt,
          actualSpent: gcActual,
          variance: gcBudgetAmt - gcActual,
          percentUsed: gcBudgetAmt > 0 ? Math.round((gcActual / gcBudgetAmt) * 10000) / 100 : 0,
          children: [],
        });
      }

      breakdown.push({
        chargeCodeId: child.id,
        chargeCodeName: child.name,
        level: child.level ?? 'activity',
        budgetAmount: childBudgetAmt,
        actualSpent: childActual,
        variance: childBudgetAmt - childActual,
        percentUsed: childBudgetAmt > 0 ? Math.round((childActual / childBudgetAmt) * 10000) / 100 : 0,
        children: grandchildItems,
      });
    }

    return {
      chargeCodeId,
      chargeCodeName: cc.name,
      totalBudget,
      totalActualSpent,
      variance: totalBudget - totalActualSpent,
      percentUsed: totalBudget > 0 ? Math.round((totalActualSpent / totalBudget) * 10000) / 100 : 0,
      breakdown,
    };
  }

  async getUtilizationReport(period: string): Promise<UtilizationReportDto> {
    // period format: "2026-03"
    const [year, month] = period.split('-').map(Number);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Count working days from calendar
    const workingDaysResult = await this.db
      .select({ count: count() })
      .from(calendar)
      .where(
        and(
          gte(calendar.date, startDate),
          lte(calendar.date, endDate),
          eq(calendar.isWeekend, false),
          eq(calendar.isHoliday, false),
        ),
      );

    let workingDays = Number(workingDaysResult[0]?.count ?? 0);
    if (workingDays === 0) {
      // Fallback: estimate ~22 working days
      workingDays = 22;
    }

    const availableHoursPerPerson = workingDays * 8;

    // Get all employees with their logged hours for the period
    const employeeHours = await this.db
      .select({
        userId: timesheets.userId,
        totalHours: sum(timesheetEntries.hours).as('total_hours'),
      })
      .from(timesheetEntries)
      .innerJoin(timesheets, eq(timesheetEntries.timesheetId, timesheets.id))
      .where(
        and(
          gte(timesheetEntries.date, startDate),
          lte(timesheetEntries.date, endDate),
        ),
      )
      .groupBy(timesheets.userId);

    // Get all profiles
    const allProfiles = await this.db.select().from(profiles);
    const profileMap = new Map(allProfiles.map((p) => [p.id, p]));

    const employees: EmployeeUtilizationDto[] = [];
    const byDepartment: Record<string, { availableHours: number; loggedHours: number; rate: number }> = {};
    let totalLogged = 0;
    let totalAvailable = 0;

    // Include all employees, even those with 0 hours
    const employeeHoursMap = new Map(employeeHours.map((e) => [e.userId, Number(e.totalHours ?? 0)]));

    for (const profile of allProfiles) {
      const loggedHours = employeeHoursMap.get(profile.id) ?? 0;
      const rate = availableHoursPerPerson > 0
        ? Math.round((loggedHours / availableHoursPerPerson) * 10000) / 100
        : 0;

      employees.push({
        userId: profile.id,
        fullName: profile.fullName ?? profile.email,
        department: profile.department,
        availableHours: availableHoursPerPerson,
        loggedHours,
        utilizationRate: rate,
      });

      totalLogged += loggedHours;
      totalAvailable += availableHoursPerPerson;

      const dept = profile.department ?? 'Unassigned';
      if (!byDepartment[dept]) {
        byDepartment[dept] = { availableHours: 0, loggedHours: 0, rate: 0 };
      }
      byDepartment[dept].availableHours += availableHoursPerPerson;
      byDepartment[dept].loggedHours += loggedHours;
    }

    // Calculate department rates
    for (const dept of Object.keys(byDepartment)) {
      const d = byDepartment[dept];
      d.rate = d.availableHours > 0 ? Math.round((d.loggedHours / d.availableHours) * 10000) / 100 : 0;
    }

    return {
      period,
      workingDays,
      overallUtilization: totalAvailable > 0 ? Math.round((totalLogged / totalAvailable) * 10000) / 100 : 0,
      employees: employees.sort((a, b) => b.utilizationRate - a.utilizationRate),
      byDepartment,
    };
  }

  async getChargeabilityReport(team?: string): Promise<ChargeabilityReportDto> {
    const target = 80; // 80% target

    // Build the query - get hours per employee, split by billable
    let query = this.db
      .select({
        userId: timesheets.userId,
        isBillable: chargeCodes.isBillable,
        totalHours: sum(timesheetEntries.hours).as('total_hours'),
      })
      .from(timesheetEntries)
      .innerJoin(timesheets, eq(timesheetEntries.timesheetId, timesheets.id))
      .innerJoin(chargeCodes, eq(timesheetEntries.chargeCodeId, chargeCodes.id))
      .groupBy(timesheets.userId, chargeCodes.isBillable);

    const rows = await query;

    // Get profiles
    const allProfiles = await this.db.select().from(profiles);
    const profileMap = new Map(allProfiles.map((p) => [p.id, p]));

    // Aggregate per employee
    const employeeMap = new Map<string, { billable: number; total: number }>();
    for (const row of rows) {
      const profile = profileMap.get(row.userId);
      if (team && profile?.department !== team) continue;

      if (!employeeMap.has(row.userId)) {
        employeeMap.set(row.userId, { billable: 0, total: 0 });
      }
      const emp = employeeMap.get(row.userId)!;
      const hours = Number(row.totalHours ?? 0);
      emp.total += hours;
      if (row.isBillable) {
        emp.billable += hours;
      }
    }

    const members = Array.from(employeeMap.entries()).map(([userId, data]) => {
      const profile = profileMap.get(userId);
      return {
        userId,
        fullName: profile?.fullName ?? profile?.email ?? 'Unknown',
        billableHours: Math.round(data.billable * 100) / 100,
        totalHours: Math.round(data.total * 100) / 100,
        chargeabilityRate: data.total > 0 ? Math.round((data.billable / data.total) * 10000) / 100 : 0,
      };
    });

    const overallBillable = members.reduce((s, m) => s + m.billableHours, 0);
    const overallTotal = members.reduce((s, m) => s + m.totalHours, 0);

    return {
      target,
      overallBillableHours: Math.round(overallBillable * 100) / 100,
      overallTotalHours: Math.round(overallTotal * 100) / 100,
      overallChargeabilityRate: overallTotal > 0 ? Math.round((overallBillable / overallTotal) * 10000) / 100 : 0,
      members: members.sort((a, b) => b.chargeabilityRate - a.chargeabilityRate),
    };
  }

  async getFinancialImpact(): Promise<FinancialImpactDto> {
    const targetChargeability = 0.8;

    // Over-budget cost
    const budgetRows = await this.db
      .select({
        budgetAmount: budgets.budgetAmount,
        actualSpent: budgets.actualSpent,
      })
      .from(budgets)
      .innerJoin(chargeCodes, eq(budgets.chargeCodeId, chargeCodes.id));

    let overBudgetCost = 0;
    let overBudgetCount = 0;
    for (const row of budgetRows) {
      const b = Number(row.budgetAmount ?? 0);
      const a = Number(row.actualSpent ?? 0);
      if (b > 0 && a > b) {
        overBudgetCost += a - b;
        overBudgetCount++;
      }
    }

    // Chargeability data
    const chargeability = await this.getChargeabilityReport();
    const actualRate = chargeability.overallChargeabilityRate / 100;

    // Average cost rate
    const rateResult = await this.db
      .select({
        avgRate: sql<string>`AVG(${costRates.hourlyRate}::numeric)`,
      })
      .from(costRates);
    const avgCostRate = Number(rateResult[0]?.avgRate ?? 0);

    // Low chargeability cost
    const gapRate = Math.max(0, targetChargeability - actualRate);
    const lowChargeabilityCost = gapRate * chargeability.overallTotalHours * avgCostRate;

    return {
      overBudgetCost: Math.round(overBudgetCost * 100) / 100,
      overBudgetCount,
      lowChargeabilityCost: Math.round(lowChargeabilityCost * 100) / 100,
      netImpact: Math.round((overBudgetCost + lowChargeabilityCost) * 100) / 100,
      avgCostRate: Math.round(avgCostRate * 100) / 100,
      targetChargeability: targetChargeability * 100,
      actualChargeability: chargeability.overallChargeabilityRate,
    };
  }

  async getActivityDistribution(period: string): Promise<ActivityDistributionReportDto> {
    const [year, month] = period.split('-').map(Number);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const rows = await this.db
      .select({
        category: chargeCodes.activityCategory,
        totalHours: sum(timesheetEntries.hours).as('total_hours'),
      })
      .from(timesheetEntries)
      .innerJoin(chargeCodes, eq(timesheetEntries.chargeCodeId, chargeCodes.id))
      .where(
        and(
          gte(timesheetEntries.date, startDate),
          lte(timesheetEntries.date, endDate),
        ),
      )
      .groupBy(chargeCodes.activityCategory);

    const totalHours = rows.reduce((s, r) => s + Number(r.totalHours ?? 0), 0);

    const distribution = rows.map((r) => {
      const hours = Number(r.totalHours ?? 0);
      return {
        category: r.category ?? 'Uncategorized',
        hours: Math.round(hours * 100) / 100,
        percentage: totalHours > 0 ? Math.round((hours / totalHours) * 10000) / 100 : 0,
      };
    });

    distribution.sort((a, b) => b.hours - a.hours);

    return {
      period,
      totalHours: Math.round(totalHours * 100) / 100,
      distribution,
    };
  }

  async getBudgetAlerts(): Promise<BudgetAlertItemDto[]> {
    const alerts = await this.budgetsService.getAlerts();

    return alerts.map((a) => {
      const overrunAmount = Math.max(0, a.actual - a.budget);
      const overrunPercent = a.budget > 0 ? Math.round(((a.actual - a.budget) / a.budget) * 10000) / 100 : 0;

      return {
        chargeCodeId: a.chargeCodeId,
        name: a.name,
        budget: a.budget,
        actual: a.actual,
        forecast: a.forecast,
        severity: a.severity,
        overrunAmount: Math.round(overrunAmount * 100) / 100,
        overrunPercent,
        rootCauseActivity: a.rootCauseActivity,
      };
    });
  }
}
