import { Injectable, Inject } from '@nestjs/common';
import { eq, sql, and, gte, lte, sum, count, inArray } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import {
  budgets,
  chargeCodes,
  timesheetEntries,
  timesheets,
  profiles,
  costRates,
  calendar,
  vacationRequests,
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
import { CompanySettingsService } from '../company-settings/company-settings.service';
import { companySettings } from '../database/schema';

@Injectable()
export class ReportsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly budgetsService: BudgetsService,
    private readonly companySettingsService: CompanySettingsService,
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

  async getUtilizationReport(period: string, pagination?: { limit?: number; offset?: number }): Promise<UtilizationReportDto> {
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

    const sortedEmployees = employees.sort((a, b) => b.utilizationRate - a.utilizationRate);
    const pLimit = Math.min(pagination?.limit ?? 100, 500);
    const pOffset = pagination?.offset ?? 0;

    return {
      period,
      workingDays,
      overallUtilization: totalAvailable > 0 ? Math.round((totalLogged / totalAvailable) * 10000) / 100 : 0,
      totalEmployees: sortedEmployees.length,
      employees: sortedEmployees.slice(pOffset, pOffset + pLimit),
      byDepartment,
    };
  }

  async getChargeabilityReport(team?: string, pagination?: { limit?: number; offset?: number }): Promise<ChargeabilityReportDto> {
    const target = 80; // 80% target

    // Build the query - get hours per employee per charge code, split by billable
    const query = this.db
      .select({
        userId: timesheets.userId,
        chargeCodeId: timesheetEntries.chargeCodeId,
        isBillable: chargeCodes.isBillable,
        totalHours: sum(timesheetEntries.hours).as('total_hours'),
      })
      .from(timesheetEntries)
      .innerJoin(timesheets, eq(timesheetEntries.timesheetId, timesheets.id))
      .innerJoin(chargeCodes, eq(timesheetEntries.chargeCodeId, chargeCodes.id))
      .groupBy(timesheets.userId, timesheetEntries.chargeCodeId, chargeCodes.isBillable);

    const rows = await query;

    // Build charge code -> root program map for filtering
    const allChargeCodes = await this.db.select().from(chargeCodes);
    const ccMap = new Map(allChargeCodes.map((cc) => [cc.id, cc]));
    const getRootId = (chargeCodeId: string): string => {
      const cc = ccMap.get(chargeCodeId);
      if (!cc) return chargeCodeId;
      return cc.path ? cc.path.split('/')[0] : cc.id;
    };

    // Get profiles
    const allProfiles = await this.db.select().from(profiles);
    const profileMap = new Map(allProfiles.map((p) => [p.id, p]));

    // Aggregate per employee (filter by charge code root program if team is set)
    const employeeMap = new Map<string, { billable: number; total: number }>();
    for (const row of rows) {
      // Filter by root program ID
      if (team && team !== 'all') {
        const rootId = getRootId(row.chargeCodeId);
        if (rootId !== team) continue;
      }

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

    const cLimit = Math.min(pagination?.limit ?? 100, 500);
    const cOffset = pagination?.offset ?? 0;
    const sortedMembers = members.sort((a, b) => b.chargeabilityRate - a.chargeabilityRate);

    return {
      target,
      overallBillableHours: Math.round(overallBillable * 100) / 100,
      overallTotalHours: Math.round(overallTotal * 100) / 100,
      overallChargeabilityRate: overallTotal > 0 ? Math.round((overallBillable / overallTotal) * 10000) / 100 : 0,
      totalMembers: sortedMembers.length,
      members: sortedMembers.slice(cOffset, cOffset + cLimit),
    };
  }

  async getFinancialImpact(period?: string, team?: string): Promise<FinancialImpactDto> {
    const targetChargeability = 0.8;

    // Over-budget cost - optionally filtered by charge codes with matching period
    const budgetQuery = this.db
      .select({
        chargeCodeId: budgets.chargeCodeId,
        chargeCodeName: chargeCodes.name,
        budgetAmount: budgets.budgetAmount,
        actualSpent: budgets.actualSpent,
        forecastAtCompletion: budgets.forecastAtCompletion,
      })
      .from(budgets)
      .innerJoin(chargeCodes, eq(budgets.chargeCodeId, chargeCodes.id));

    const budgetRows = await budgetQuery;

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

    // Chargeability data (optionally filtered by team)
    const chargeability = await this.getChargeabilityReport(team);
    const actualRate = chargeability.overallChargeabilityRate / 100;

    // Get all profiles for team grouping
    const allProfiles = await this.db.select().from(profiles);
    const profileMap = new Map(allProfiles.map((p) => [p.id, p]));

    // Build date range filter for period
    let dateConditions: any[] = [];
    if (period) {
      const [year, month] = period.split('-').map(Number);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      dateConditions = [
        gte(timesheetEntries.date, startDate),
        lte(timesheetEntries.date, endDate),
      ];
    }

    // Average cost rate
    const rateResult = await this.db
      .select({
        avgRate: sql<string>`AVG(${costRates.hourlyRate}::numeric)`,
      })
      .from(costRates);
    const avgCostRate = Number(rateResult[0]?.avgRate ?? 0);

    // Company-level billing rate (from company_settings)
    const [billingSetting] = await this.db
      .select()
      .from(companySettings)
      .where(eq(companySettings.key, 'billing_rate_per_day'));
    const billingRatePerHour = Number(billingSetting?.value ?? 0) / 8;

    // Low chargeability cost
    const gapRate = Math.max(0, targetChargeability - actualRate);
    const lowChargeabilityCost = gapRate * chargeability.overallTotalHours * avgCostRate;

    // byTeam: group by charge code's root program (top-level parent)
    const teamEntryConditions = dateConditions.length > 0
      ? and(...dateConditions)
      : undefined;

    // Build a map of charge code ID -> root program name
    // Root program = first segment of the `path` column (e.g., "PRG-001/PRJ-001/ACT-001" → "PRG-001")
    const allChargeCodes = await this.db.select().from(chargeCodes);
    const ccMap = new Map(allChargeCodes.map((cc) => [cc.id, cc]));
    const getRootProgram = (chargeCodeId: string): { id: string; name: string } => {
      const cc = ccMap.get(chargeCodeId);
      if (!cc) return { id: chargeCodeId, name: chargeCodeId };
      const rootId = cc.path ? cc.path.split('/')[0] : cc.id;
      const root = ccMap.get(rootId);
      return { id: rootId, name: root?.name ?? rootId };
    };

    const teamRows = await this.db
      .select({
        chargeCodeId: timesheetEntries.chargeCodeId,
        userId: timesheets.userId,
        isBillable: chargeCodes.isBillable,
        totalHours: sum(timesheetEntries.hours).as('total_hours'),
        totalCost: sum(timesheetEntries.calculatedCost).as('total_cost'),
      })
      .from(timesheetEntries)
      .innerJoin(timesheets, eq(timesheetEntries.timesheetId, timesheets.id))
      .innerJoin(chargeCodes, eq(timesheetEntries.chargeCodeId, chargeCodes.id))
      .where(teamEntryConditions)
      .groupBy(timesheetEntries.chargeCodeId, timesheets.userId, chargeCodes.isBillable);

    // Build a map of root program -> total budget (sum of all child charge code budgets)
    const programBudgetMap = new Map<string, number>();
    for (const cc of allChargeCodes) {
      const budget = Number(cc.budgetAmount ?? 0);
      if (budget <= 0) continue;
      const root = getRootProgram(cc.id);
      programBudgetMap.set(root.id, (programBudgetMap.get(root.id) ?? 0) + budget);
    }

    // Aggregate by root program
    const programMap = new Map<string, {
      name: string;
      totalBudget: number;
      totalHours: number;
      billableHours: number;
      totalCost: number;
      billableRevenue: number;
    }>();

    // Build a map of user -> cost rate (pre-load all rates to avoid N+1)
    const allRates = await this.db.select().from(costRates);
    const rateByGrade = new Map<string, number>();
    for (const rate of allRates) {
      if (!rateByGrade.has(rate.jobGrade)) {
        rateByGrade.set(rate.jobGrade, Number(rate.hourlyRate));
      }
    }
    const userRates = new Map<string, number>();
    for (const profile of allProfiles) {
      if (!profile.jobGrade) continue;
      const hourlyRate = rateByGrade.get(profile.jobGrade);
      if (hourlyRate !== undefined) {
        userRates.set(profile.id, hourlyRate);
      }
    }

    for (const row of teamRows) {
      const root = getRootProgram(row.chargeCodeId);
      if (team && team !== 'all' && root.id !== team) continue;

      if (!programMap.has(root.id)) {
        programMap.set(root.id, { name: root.name, totalBudget: programBudgetMap.get(root.id) ?? 0, totalHours: 0, billableHours: 0, totalCost: 0, billableRevenue: 0 });
      }
      const d = programMap.get(root.id)!;
      const hours = Number(row.totalHours ?? 0);
      const cost = Number(row.totalCost ?? 0);
      d.totalHours += hours;
      d.totalCost += cost;
      if (row.isBillable) {
        d.billableHours += hours;
        d.billableRevenue += hours * billingRatePerHour;
      }
    }

    const byTeam = Array.from(programMap.entries()).map(([id, d]) => ({
      department: d.name,
      totalBudget: Math.round(d.totalBudget * 100) / 100,
      totalHours: Math.round(d.totalHours * 100) / 100,
      billableHours: Math.round(d.billableHours * 100) / 100,
      chargeability: d.totalHours > 0 ? Math.round((d.billableHours / d.totalHours) * 10000) / 100 : 0,
      totalCost: Math.round(d.totalCost * 100) / 100,
      billableRevenue: Math.round(d.billableRevenue * 100) / 100,
      margin: Math.round((d.billableRevenue - d.totalCost) * 100) / 100,
      marginPercent: d.billableRevenue > 0
        ? Math.round(((d.billableRevenue - d.totalCost) / d.billableRevenue) * 10000) / 100
        : 0,
    }));

    // byChargeCode: charge codes with budget vs actual vs forecast
    const byChargeCode = budgetRows.map((row) => {
      const budgetAmt = Number(row.budgetAmount ?? 0);
      const actual = Number(row.actualSpent ?? 0);
      const forecast = row.forecastAtCompletion ? Number(row.forecastAtCompletion) : null;
      return {
        chargeCodeId: row.chargeCodeId,
        chargeCodeName: row.chargeCodeName,
        budget: budgetAmt,
        actual,
        variance: budgetAmt - actual,
        forecastOverrun: forecast !== null ? Math.max(0, forecast - budgetAmt) : 0,
      };
    });

    return {
      overBudgetCost: Math.round(overBudgetCost * 100) / 100,
      overBudgetCount,
      lowChargeabilityCost: Math.round(lowChargeabilityCost * 100) / 100,
      netImpact: Math.round((overBudgetCost + lowChargeabilityCost) * 100) / 100,
      avgCostRate: Math.round(avgCostRate * 100) / 100,
      targetChargeability: targetChargeability * 100,
      actualChargeability: chargeability.overallChargeabilityRate,
      byTeam,
      byChargeCode,
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

  async getReportByProgram(programId: string, period?: string) {
    // Get the program charge code and its subtree
    const allCodes = await this.db.select().from(chargeCodes);
    const ccMap = new Map(allCodes.map((cc) => [cc.id, cc]));

    const program = ccMap.get(programId);
    if (!program) {
      return { program: null, budgetVsActual: { budget: 0, actual: 0, variance: 0 }, taskDistribution: [], teamDistribution: [] };
    }

    // Find all descendants
    const subtreeIds = new Set<string>([programId]);
    const collectDescendants = (parentId: string) => {
      for (const cc of allCodes) {
        if (cc.parentId === parentId && !subtreeIds.has(cc.id)) {
          subtreeIds.add(cc.id);
          collectDescendants(cc.id);
        }
      }
    };
    collectDescendants(programId);

    // Budget from the budgets table
    const allBudgets = await this.db.select().from(budgets);
    let totalBudget = 0;
    let totalActual = 0;
    for (const b of allBudgets) {
      if (subtreeIds.has(b.chargeCodeId)) {
        totalBudget += Number(b.budgetAmount ?? 0);
        totalActual += Number(b.actualSpent ?? 0);
      }
    }
    // Fallback: use charge code budgetAmount if no budgets table entry
    if (totalBudget === 0) {
      for (const id of subtreeIds) {
        const cc = ccMap.get(id);
        if (cc) totalBudget += Number(cc.budgetAmount ?? 0);
      }
    }

    // Build date conditions
    const dateConditions: any[] = [];
    if (period) {
      const [year, month] = period.split('-').map(Number);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      dateConditions.push(gte(timesheetEntries.date, startDate));
      dateConditions.push(lte(timesheetEntries.date, endDate));
    }

    // Get timesheet entries for subtree
    const subtreeArray = Array.from(subtreeIds);
    const entryRows = await this.db
      .select({
        chargeCodeId: timesheetEntries.chargeCodeId,
        userId: timesheets.userId,
        totalHours: sum(timesheetEntries.hours).as('total_hours'),
        totalCost: sum(timesheetEntries.calculatedCost).as('total_cost'),
      })
      .from(timesheetEntries)
      .innerJoin(timesheets, eq(timesheetEntries.timesheetId, timesheets.id))
      .where(
        dateConditions.length > 0
          ? and(inArray(timesheetEntries.chargeCodeId, subtreeArray), ...dateConditions)
          : inArray(timesheetEntries.chargeCodeId, subtreeArray),
      )
      .groupBy(timesheetEntries.chargeCodeId, timesheets.userId);

    // Task distribution
    const taskMap = new Map<string, { name: string; hours: number; cost: number }>();
    for (const row of entryRows) {
      const cc = ccMap.get(row.chargeCodeId);
      const name = cc?.name ?? row.chargeCodeId;
      if (!taskMap.has(row.chargeCodeId)) taskMap.set(row.chargeCodeId, { name, hours: 0, cost: 0 });
      const t = taskMap.get(row.chargeCodeId)!;
      t.hours += Number(row.totalHours ?? 0);
      t.cost += Number(row.totalCost ?? 0);
    }
    const totalHours = Array.from(taskMap.values()).reduce((s, t) => s + t.hours, 0);
    const taskDistribution = Array.from(taskMap.entries()).map(([id, t]) => ({
      taskName: t.name,
      hours: Math.round(t.hours * 100) / 100,
      cost: Math.round(t.cost * 100) / 100,
      percentage: totalHours > 0 ? Math.round((t.hours / totalHours) * 10000) / 100 : 0,
    })).sort((a, b) => b.hours - a.hours);

    // Team distribution
    const allProfiles = await this.db.select().from(profiles);
    const profileMap = new Map(allProfiles.map((p) => [p.id, p]));
    const teamMap = new Map<string, { hours: number; cost: number }>();
    for (const row of entryRows) {
      const profile = profileMap.get(row.userId);
      const team = profile?.department ?? 'Unassigned';
      if (!teamMap.has(team)) teamMap.set(team, { hours: 0, cost: 0 });
      const t = teamMap.get(team)!;
      t.hours += Number(row.totalHours ?? 0);
      t.cost += Number(row.totalCost ?? 0);
    }
    const teamDistribution = Array.from(teamMap.entries()).map(([team, t]) => ({
      team,
      hours: Math.round(t.hours * 100) / 100,
      cost: Math.round(t.cost * 100) / 100,
      percentage: totalHours > 0 ? Math.round((t.hours / totalHours) * 10000) / 100 : 0,
    })).sort((a, b) => b.hours - a.hours);

    return {
      program: { id: program.id, name: program.name },
      budgetVsActual: {
        budget: Math.round(totalBudget * 100) / 100,
        actual: Math.round(totalActual * 100) / 100,
        variance: Math.round((totalBudget - totalActual) * 100) / 100,
      },
      taskDistribution,
      teamDistribution,
    };
  }

  async getReportByCostCenter(costCenter: string, period?: string) {
    // Get profiles in this cost center (department)
    const allProfiles = await this.db.select().from(profiles);
    const centerProfiles = allProfiles.filter((p) => p.department === costCenter);
    const centerUserIds = centerProfiles.map((p) => p.id);

    if (centerUserIds.length === 0) {
      return {
        costCenter,
        chargeability: 0,
        chargeDistribution: [],
        teamMembers: [],
      };
    }

    // Build date conditions
    const dateConditions: any[] = [];
    if (period) {
      const [year, month] = period.split('-').map(Number);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      dateConditions.push(gte(timesheetEntries.date, startDate));
      dateConditions.push(lte(timesheetEntries.date, endDate));
    }

    // Get timesheet entries for these users
    const entryRows = await this.db
      .select({
        userId: timesheets.userId,
        chargeCodeId: timesheetEntries.chargeCodeId,
        isBillable: chargeCodes.isBillable,
        totalHours: sum(timesheetEntries.hours).as('total_hours'),
      })
      .from(timesheetEntries)
      .innerJoin(timesheets, eq(timesheetEntries.timesheetId, timesheets.id))
      .innerJoin(chargeCodes, eq(timesheetEntries.chargeCodeId, chargeCodes.id))
      .where(
        dateConditions.length > 0
          ? and(inArray(timesheets.userId, centerUserIds), ...dateConditions)
          : inArray(timesheets.userId, centerUserIds),
      )
      .groupBy(timesheets.userId, timesheetEntries.chargeCodeId, chargeCodes.isBillable);

    // Get root program for each charge code
    const allCodes = await this.db.select().from(chargeCodes);
    const ccMap = new Map(allCodes.map((cc) => [cc.id, cc]));
    const getRootProgram = (chargeCodeId: string): string => {
      const cc = ccMap.get(chargeCodeId);
      if (!cc) return chargeCodeId;
      const rootId = cc.path ? cc.path.split('/')[0] : cc.id;
      return ccMap.get(rootId)?.name ?? rootId;
    };

    // Charge distribution by program
    const programMap = new Map<string, { chargeableHours: number; nonChargeableHours: number }>();
    const memberMap = new Map<string, { billableHours: number; totalHours: number }>();

    let totalBillable = 0;
    let totalAll = 0;

    for (const row of entryRows) {
      const hours = Number(row.totalHours ?? 0);
      const programName = getRootProgram(row.chargeCodeId);

      if (!programMap.has(programName)) programMap.set(programName, { chargeableHours: 0, nonChargeableHours: 0 });
      const p = programMap.get(programName)!;
      if (row.isBillable) {
        p.chargeableHours += hours;
        totalBillable += hours;
      } else {
        p.nonChargeableHours += hours;
      }
      totalAll += hours;

      if (!memberMap.has(row.userId)) memberMap.set(row.userId, { billableHours: 0, totalHours: 0 });
      const m = memberMap.get(row.userId)!;
      m.totalHours += hours;
      if (row.isBillable) m.billableHours += hours;
    }

    const profileMap = new Map(allProfiles.map((p) => [p.id, p]));

    return {
      costCenter,
      chargeability: totalAll > 0 ? Math.round((totalBillable / totalAll) * 10000) / 100 : 0,
      chargeDistribution: Array.from(programMap.entries()).map(([programName, d]) => ({
        programName,
        chargeableHours: Math.round(d.chargeableHours * 100) / 100,
        nonChargeableHours: Math.round(d.nonChargeableHours * 100) / 100,
      })).sort((a, b) => (b.chargeableHours + b.nonChargeableHours) - (a.chargeableHours + a.nonChargeableHours)),
      teamMembers: Array.from(memberMap.entries()).map(([userId, m]) => {
        const profile = profileMap.get(userId);
        return {
          name: profile?.fullName ?? profile?.email ?? 'Unknown',
          billableHours: Math.round(m.billableHours * 100) / 100,
          totalHours: Math.round(m.totalHours * 100) / 100,
          chargeability: m.totalHours > 0 ? Math.round((m.billableHours / m.totalHours) * 10000) / 100 : 0,
        };
      }).sort((a, b) => b.chargeability - a.chargeability),
    };
  }

  async getReportByPerson(userId: string, periodFrom?: string, periodTo?: string) {
    const allProfiles = await this.db.select().from(profiles);
    const profile = allProfiles.find((p) => p.id === userId);
    if (!profile) {
      return { person: null, history: [], projectSummary: [], vacationDays: 0, totalHours: 0 };
    }

    // Build date conditions
    const dateConditions: any[] = [];
    if (periodFrom) {
      const [year, month] = periodFrom.split('-').map(Number);
      dateConditions.push(gte(timesheetEntries.date, `${year}-${String(month).padStart(2, '0')}-01`));
    }
    if (periodTo) {
      const [year, month] = periodTo.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      dateConditions.push(lte(timesheetEntries.date, `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`));
    }

    // Get entries for this user
    const entryRows = await this.db
      .select({
        chargeCodeId: timesheetEntries.chargeCodeId,
        date: timesheetEntries.date,
        totalHours: sum(timesheetEntries.hours).as('total_hours'),
        totalCost: sum(timesheetEntries.calculatedCost).as('total_cost'),
      })
      .from(timesheetEntries)
      .innerJoin(timesheets, eq(timesheetEntries.timesheetId, timesheets.id))
      .where(
        dateConditions.length > 0
          ? and(eq(timesheets.userId, userId), ...dateConditions)
          : eq(timesheets.userId, userId),
      )
      .groupBy(timesheetEntries.chargeCodeId, timesheetEntries.date);

    const allCodes = await this.db.select().from(chargeCodes);
    const ccMap = new Map(allCodes.map((cc) => [cc.id, cc]));
    const getRootProgram = (chargeCodeId: string): { id: string; name: string } => {
      const cc = ccMap.get(chargeCodeId);
      if (!cc) return { id: chargeCodeId, name: chargeCodeId };
      const rootId = cc.path ? cc.path.split('/')[0] : cc.id;
      const root = ccMap.get(rootId);
      return { id: rootId, name: root?.name ?? rootId };
    };

    // History: group by month then by program
    const monthMap = new Map<string, Map<string, number>>();
    const projectTotals = new Map<string, { name: string; hours: number; cost: number }>();
    let totalHours = 0;

    for (const row of entryRows) {
      const hours = Number(row.totalHours ?? 0);
      const cost = Number(row.totalCost ?? 0);
      const month = row.date.substring(0, 7); // YYYY-MM
      const program = getRootProgram(row.chargeCodeId);

      if (!monthMap.has(month)) monthMap.set(month, new Map());
      const monthPrograms = monthMap.get(month)!;
      monthPrograms.set(program.name, (monthPrograms.get(program.name) ?? 0) + hours);

      if (!projectTotals.has(program.id)) projectTotals.set(program.id, { name: program.name, hours: 0, cost: 0 });
      const p = projectTotals.get(program.id)!;
      p.hours += hours;
      p.cost += cost;
      totalHours += hours;
    }

    const history = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, programs]) => ({
        month,
        programs: Array.from(programs.entries()).map(([name, hours]) => ({
          name,
          hours: Math.round(hours * 100) / 100,
        })),
      }));

    const projectSummary = Array.from(projectTotals.entries()).map(([id, p]) => ({
      name: p.name,
      hoursYtd: Math.round(p.hours * 100) / 100,
      costYtd: Math.round(p.cost * 100) / 100,
      percentage: totalHours > 0 ? Math.round((p.hours / totalHours) * 10000) / 100 : 0,
    })).sort((a, b) => b.hoursYtd - a.hoursYtd);

    // Vacation days count
    const vacationDateConditions: any[] = [eq(vacationRequests.userId, userId), eq(vacationRequests.status, 'approved' as any)];
    if (periodFrom) {
      const [year, month] = periodFrom.split('-').map(Number);
      vacationDateConditions.push(gte(vacationRequests.startDate, `${year}-${String(month).padStart(2, '0')}-01`));
    }
    if (periodTo) {
      const [year, month] = periodTo.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      vacationDateConditions.push(lte(vacationRequests.endDate, `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`));
    }
    const vacations = await this.db.select().from(vacationRequests).where(and(...vacationDateConditions));

    let vacationDays = 0;
    for (const v of vacations) {
      const start = new Date(v.startDate + 'T00:00:00');
      const end = new Date(v.endDate + 'T00:00:00');
      const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (v.leaveType === 'half_am' || v.leaveType === 'half_pm') {
        vacationDays += diff * 0.5;
      } else {
        vacationDays += diff;
      }
    }

    return {
      person: { id: profile.id, name: profile.fullName ?? profile.email, department: profile.department },
      history,
      projectSummary,
      vacationDays,
      totalHours: Math.round(totalHours * 100) / 100,
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
