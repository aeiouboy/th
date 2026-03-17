import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, sql, and, lte, or, isNull, sum } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import {
  budgets,
  chargeCodes,
  timesheetEntries,
  costRates,
  profiles,
  timesheets,
} from '../database/schema';
import {
  BudgetResponseDto,
  BudgetAlertDto,
  BudgetSummaryDto,
  ChargeabilityAlertDto,
} from './dto/budget-response.dto';

@Injectable()
export class BudgetsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async getBudgetForChargeCode(
    chargeCodeId: string,
  ): Promise<BudgetResponseDto> {
    const [cc] = await this.db
      .select()
      .from(chargeCodes)
      .where(eq(chargeCodes.id, chargeCodeId))
      .limit(1);

    if (!cc) throw new NotFoundException('Charge code not found');

    const [budget] = await this.db
      .select()
      .from(budgets)
      .where(eq(budgets.chargeCodeId, chargeCodeId))
      .limit(1);

    const budgetAmount = Number(budget?.budgetAmount ?? cc.budgetAmount ?? 0);
    const actualSpent = Number(budget?.actualSpent ?? 0);
    const percentage = budgetAmount > 0 ? (actualSpent / budgetAmount) * 100 : 0;
    const forecastAtCompletion = budget?.forecastAtCompletion
      ? Number(budget.forecastAtCompletion)
      : null;

    return {
      chargeCodeId,
      chargeCodeName: cc.name,
      budgetAmount,
      actualSpent,
      percentage: Math.round(percentage * 100) / 100,
      forecastAtCompletion,
      status: this.getStatus(actualSpent, budgetAmount),
    };
  }

  async getForecast(chargeCodeId: string) {
    const [cc] = await this.db
      .select()
      .from(chargeCodes)
      .where(eq(chargeCodes.id, chargeCodeId))
      .limit(1);

    if (!cc) throw new NotFoundException('Charge code not found');

    const [budget] = await this.db
      .select()
      .from(budgets)
      .where(eq(budgets.chargeCodeId, chargeCodeId))
      .limit(1);

    const budgetAmount = Number(budget?.budgetAmount ?? cc.budgetAmount ?? 0);
    const actualSpent = Number(budget?.actualSpent ?? 0);

    const validFrom = cc.validFrom ? new Date(cc.validFrom) : null;
    const validTo = cc.validTo ? new Date(cc.validTo) : null;
    const now = new Date();

    let forecastAtCompletion: number | null = null;
    let burnRate: number | null = null;
    let remainingDays: number | null = null;
    let elapsedDays: number | null = null;

    if (validFrom && validTo) {
      const totalDays = Math.max(
        1,
        (validTo.getTime() - validFrom.getTime()) / (1000 * 60 * 60 * 24),
      );
      elapsedDays = Math.max(
        1,
        (Math.min(now.getTime(), validTo.getTime()) - validFrom.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      remainingDays = Math.max(
        0,
        (validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      burnRate = actualSpent / elapsedDays;
      forecastAtCompletion = actualSpent + burnRate * remainingDays;
    }

    return {
      chargeCodeId,
      chargeCodeName: cc.name,
      budgetAmount,
      actualSpent,
      forecastAtCompletion:
        forecastAtCompletion !== null
          ? Math.round(forecastAtCompletion * 100) / 100
          : null,
      burnRate: burnRate !== null ? Math.round(burnRate * 100) / 100 : null,
      elapsedDays: elapsedDays !== null ? Math.round(elapsedDays) : null,
      remainingDays: remainingDays !== null ? Math.round(remainingDays) : null,
      status: this.getStatus(actualSpent, budgetAmount),
      forecastStatus:
        forecastAtCompletion !== null
          ? this.getStatus(forecastAtCompletion, budgetAmount)
          : null,
    };
  }

  async getAlerts(): Promise<BudgetAlertDto[]> {
    const rows = await this.db
      .select({
        chargeCodeId: budgets.chargeCodeId,
        name: chargeCodes.name,
        budgetAmount: budgets.budgetAmount,
        actualSpent: budgets.actualSpent,
        forecastAtCompletion: budgets.forecastAtCompletion,
      })
      .from(budgets)
      .innerJoin(chargeCodes, eq(budgets.chargeCodeId, chargeCodes.id));

    const alerts: BudgetAlertDto[] = [];

    for (const row of rows) {
      const budget = Number(row.budgetAmount ?? 0);
      const actual = Number(row.actualSpent ?? 0);
      const forecast = row.forecastAtCompletion
        ? Number(row.forecastAtCompletion)
        : null;

      if (budget <= 0) continue;

      const ratio = actual / budget;
      let severity: 'yellow' | 'orange' | 'red' | null = null;

      if (ratio > 1) {
        severity = 'red';
      } else if (ratio > 0.9) {
        severity = 'orange';
      } else if (ratio > 0.8) {
        severity = 'yellow';
      } else if (forecast !== null && forecast > budget) {
        severity = 'yellow';
      }

      if (!severity) continue;

      const rootCause = await this.findRootCauseActivity(row.chargeCodeId);

      alerts.push({
        chargeCodeId: row.chargeCodeId,
        name: row.name,
        budget,
        actual,
        forecast,
        severity,
        rootCauseActivity: rootCause,
      });
    }

    // Sort: red first, then orange, then yellow
    const severityOrder = { red: 0, orange: 1, yellow: 2 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return alerts;
  }

  async getSummary(): Promise<BudgetSummaryDto> {
    const rows = await this.db
      .select({
        budgetAmount: budgets.budgetAmount,
        actualSpent: budgets.actualSpent,
        forecastAtCompletion: budgets.forecastAtCompletion,
      })
      .from(budgets)
      .innerJoin(chargeCodes, eq(budgets.chargeCodeId, chargeCodes.id));

    let totalBudget = 0;
    let totalActualSpent = 0;
    let totalForecast = 0;
    let overBudget = 0;
    let atRisk = 0;

    for (const row of rows) {
      const b = Number(row.budgetAmount ?? 0);
      const a = Number(row.actualSpent ?? 0);
      const f = Number(row.forecastAtCompletion ?? 0);

      totalBudget += b;
      totalActualSpent += a;
      totalForecast += f;

      if (b > 0) {
        if (a > b) overBudget++;
        else if (a > b * 0.8 || f > b) atRisk++;
      }
    }

    return {
      totalBudget: Math.round(totalBudget * 100) / 100,
      totalActualSpent: Math.round(totalActualSpent * 100) / 100,
      totalForecast: Math.round(totalForecast * 100) / 100,
      overallPercentage:
        totalBudget > 0
          ? Math.round((totalActualSpent / totalBudget) * 10000) / 100
          : 0,
      chargeCodesOverBudget: overBudget,
      chargeCodesAtRisk: atRisk,
      totalChargeCodes: rows.length,
    };
  }

  async recalculate(): Promise<{ recalculated: number }> {
    // Step 1: Recalculate calculated_cost for each timesheet entry
    // For each entry, look up the user's job_grade and the matching cost rate
    const entries = await this.db
      .select({
        entryId: timesheetEntries.id,
        hours: timesheetEntries.hours,
        date: timesheetEntries.date,
        chargeCodeId: timesheetEntries.chargeCodeId,
        userId: timesheets.userId,
      })
      .from(timesheetEntries)
      .innerJoin(timesheets, eq(timesheetEntries.timesheetId, timesheets.id));

    for (const entry of entries) {
      const [profile] = await this.db
        .select({ jobGrade: profiles.jobGrade })
        .from(profiles)
        .where(eq(profiles.id, entry.userId))
        .limit(1);

      if (!profile?.jobGrade) continue;

      const [rate] = await this.db
        .select({ hourlyRate: costRates.hourlyRate })
        .from(costRates)
        .where(
          and(
            eq(costRates.jobGrade, profile.jobGrade),
            lte(costRates.effectiveFrom, entry.date),
            or(
              isNull(costRates.effectiveTo),
              sql`${costRates.effectiveTo} >= ${entry.date}`,
            ),
          ),
        )
        .limit(1);

      if (!rate) continue;

      const calculatedCost = (
        Number(entry.hours) * Number(rate.hourlyRate)
      ).toFixed(2);

      await this.db
        .update(timesheetEntries)
        .set({ calculatedCost })
        .where(eq(timesheetEntries.id, entry.entryId));
    }

    // Step 2: Aggregate actuals per charge code (leaf level)
    const aggregated = await this.db
      .select({
        chargeCodeId: timesheetEntries.chargeCodeId,
        totalCost: sum(timesheetEntries.calculatedCost).as('total_cost'),
      })
      .from(timesheetEntries)
      .groupBy(timesheetEntries.chargeCodeId);

    const costMap = new Map<string, number>();
    for (const row of aggregated) {
      costMap.set(row.chargeCodeId, Number(row.totalCost ?? 0));
    }

    // Step 3: Roll up costs through charge code hierarchy
    const allChargeCodes = await this.db
      .select({
        id: chargeCodes.id,
        parentId: chargeCodes.parentId,
        validFrom: chargeCodes.validFrom,
        validTo: chargeCodes.validTo,
      })
      .from(chargeCodes);

    // Build a map of children
    const childrenMap = new Map<string, string[]>();
    for (const cc of allChargeCodes) {
      if (cc.parentId) {
        const children = childrenMap.get(cc.parentId) ?? [];
        children.push(cc.id);
        childrenMap.set(cc.parentId, children);
      }
    }

    // Recursive roll-up: sum direct cost + all children costs
    const resolvedCosts = new Map<string, number>();
    const resolveCost = (id: string): number => {
      if (resolvedCosts.has(id)) return resolvedCosts.get(id)!;
      let total = costMap.get(id) ?? 0;
      const children = childrenMap.get(id) ?? [];
      for (const childId of children) {
        total += resolveCost(childId);
      }
      resolvedCosts.set(id, total);
      return total;
    };

    for (const cc of allChargeCodes) {
      resolveCost(cc.id);
    }

    // Step 4: Upsert budgets with actual_spent and forecast
    const ccMap = new Map(allChargeCodes.map((cc) => [cc.id, cc]));
    let recalculated = 0;

    for (const [chargeCodeId, actualSpent] of resolvedCosts) {
      const cc = ccMap.get(chargeCodeId);
      let forecastAtCompletion: string | null = null;

      if (cc?.validFrom && cc?.validTo) {
        const validFrom = new Date(cc.validFrom);
        const validTo = new Date(cc.validTo);
        const now = new Date();
        const elapsedDays = Math.max(
          1,
          (Math.min(now.getTime(), validTo.getTime()) - validFrom.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        const remainingDays = Math.max(
          0,
          (validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        const burnRate = actualSpent / elapsedDays;
        forecastAtCompletion = (actualSpent + burnRate * remainingDays).toFixed(
          2,
        );
      }

      // Upsert: insert or update
      const [existing] = await this.db
        .select()
        .from(budgets)
        .where(eq(budgets.chargeCodeId, chargeCodeId))
        .limit(1);

      if (existing) {
        await this.db
          .update(budgets)
          .set({
            actualSpent: actualSpent.toFixed(2),
            forecastAtCompletion,
            lastUpdated: new Date(),
          })
          .where(eq(budgets.chargeCodeId, chargeCodeId));
      } else {
        await this.db.insert(budgets).values({
          chargeCodeId,
          budgetAmount: '0',
          actualSpent: actualSpent.toFixed(2),
          forecastAtCompletion,
          lastUpdated: new Date(),
        });
      }

      recalculated++;
    }

    return { recalculated };
  }

  async getChargeabilityAlerts(): Promise<ChargeabilityAlertDto[]> {
    const target = 80;

    // Query hours per employee, split by billable
    const rows = await this.db
      .select({
        userId: timesheets.userId,
        isBillable: chargeCodes.isBillable,
        totalHours: sum(timesheetEntries.hours).as('total_hours'),
      })
      .from(timesheetEntries)
      .innerJoin(timesheets, eq(timesheetEntries.timesheetId, timesheets.id))
      .innerJoin(chargeCodes, eq(timesheetEntries.chargeCodeId, chargeCodes.id))
      .groupBy(timesheets.userId, chargeCodes.isBillable);

    // Aggregate per employee
    const employeeMap = new Map<string, { billable: number; total: number }>();
    for (const row of rows) {
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

    // Get profiles for names
    const allProfiles = await this.db.select().from(profiles);
    const profileMap = new Map(allProfiles.map((p) => [p.id, p]));

    // Average cost rate for cost impact calculation
    const rateResult = await this.db
      .select({
        avgRate: sql<string>`AVG(${costRates.hourlyRate}::numeric)`,
      })
      .from(costRates);
    const avgCostRate = Number(rateResult[0]?.avgRate ?? 0);

    const alerts: ChargeabilityAlertDto[] = [];

    for (const [userId, data] of employeeMap) {
      if (data.total === 0) continue;

      const chargeability = (data.billable / data.total) * 100;
      if (chargeability >= target) continue;

      let severity: 'red' | 'orange' | 'yellow';
      if (chargeability < 60) {
        severity = 'red';
      } else if (chargeability < 70) {
        severity = 'orange';
      } else {
        severity = 'yellow';
      }

      const gapHours = (target / 100) * data.total - data.billable;
      const costImpact = Math.round(gapHours * avgCostRate * 100) / 100;

      const profile = profileMap.get(userId);

      alerts.push({
        type: 'chargeability',
        employeeId: userId,
        name: profile?.fullName ?? profile?.email ?? 'Unknown',
        billableHours: Math.round(data.billable * 100) / 100,
        totalHours: Math.round(data.total * 100) / 100,
        chargeability: Math.round(chargeability * 100) / 100,
        target,
        severity,
        costImpact,
      });
    }

    // Sort: red first, then orange, then yellow
    const severityOrder = { red: 0, orange: 1, yellow: 2 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return alerts;
  }

  private getStatus(
    actual: number,
    budget: number,
  ): 'under_budget' | 'warning' | 'critical' | 'overrun' {
    if (budget <= 0) return 'under_budget';
    const ratio = actual / budget;
    if (ratio > 1) return 'overrun';
    if (ratio > 0.9) return 'critical';
    if (ratio > 0.8) return 'warning';
    return 'under_budget';
  }

  private async findRootCauseActivity(
    chargeCodeId: string,
  ): Promise<string | null> {
    // Find children of this charge code and identify which one contributes most cost
    const children = await this.db
      .select({
        id: chargeCodes.id,
        name: chargeCodes.name,
      })
      .from(chargeCodes)
      .where(eq(chargeCodes.parentId, chargeCodeId));

    if (children.length === 0) return null;

    let maxCost = 0;
    let rootCause: string | null = null;

    for (const child of children) {
      const [result] = await this.db
        .select({
          totalCost: sum(timesheetEntries.calculatedCost).as('total_cost'),
        })
        .from(timesheetEntries)
        .where(eq(timesheetEntries.chargeCodeId, child.id));

      const cost = Number(result?.totalCost ?? 0);
      if (cost > maxCost) {
        maxCost = cost;
        rootCause = `${child.id} - ${child.name}`;
      }
    }

    return rootCause;
  }
}
