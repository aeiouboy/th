import { Injectable, Inject } from '@nestjs/common';
import { sql, eq, and, gte, lte } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import { timesheetEntries, timesheets, chargeCodes } from '../database/schema';

export interface MonthlyChargeability {
  month: string;
  chargeability: number;
  billableHours: number;
  totalHours: number;
}

export interface ProgramHours {
  programName: string;
  programId: string;
  hours: number;
  percentage: number;
}

@Injectable()
export class DashboardService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async getChargeabilityYtd(userId: string) {
    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-01-01`;
    const today = new Date().toISOString().split('T')[0];

    // Query monthly hours grouped by month, split by billable/non-billable
    const rows = await this.db
      .select({
        month: sql<string>`to_char(${timesheetEntries.date}::date, 'YYYY-MM')`,
        isBillable: chargeCodes.isBillable,
        totalHours: sql<string>`coalesce(sum(${timesheetEntries.hours}), 0)`,
      })
      .from(timesheetEntries)
      .innerJoin(timesheets, eq(timesheetEntries.timesheetId, timesheets.id))
      .innerJoin(chargeCodes, eq(timesheetEntries.chargeCodeId, chargeCodes.id))
      .where(
        and(
          eq(timesheets.userId, userId),
          gte(timesheetEntries.date, yearStart),
          lte(timesheetEntries.date, today),
        ),
      )
      .groupBy(
        sql`to_char(${timesheetEntries.date}::date, 'YYYY-MM')`,
        chargeCodes.isBillable,
      )
      .orderBy(sql`to_char(${timesheetEntries.date}::date, 'YYYY-MM')`);

    // Aggregate by month
    const monthMap = new Map<string, { billable: number; total: number }>();
    for (const row of rows) {
      const key = row.month;
      if (!monthMap.has(key)) {
        monthMap.set(key, { billable: 0, total: 0 });
      }
      const entry = monthMap.get(key)!;
      const hours = Number(row.totalHours);
      entry.total += hours;
      if (row.isBillable) {
        entry.billable += hours;
      }
    }

    const months: MonthlyChargeability[] = [];
    let ytdBillable = 0;
    let ytdTotal = 0;

    // Fill all months from Jan to current month
    const currentMonth = new Date().getMonth(); // 0-indexed
    for (let m = 0; m <= currentMonth; m++) {
      const monthKey = `${currentYear}-${String(m + 1).padStart(2, '0')}`;
      const data = monthMap.get(monthKey) || { billable: 0, total: 0 };
      ytdBillable += data.billable;
      ytdTotal += data.total;
      months.push({
        month: monthKey,
        chargeability: data.total > 0 ? Math.round((data.billable / data.total) * 100) : 0,
        billableHours: Math.round(data.billable * 100) / 100,
        totalHours: Math.round(data.total * 100) / 100,
      });
    }

    const ytdChargeability = ytdTotal > 0 ? Math.round((ytdBillable / ytdTotal) * 100) : 0;

    return { months, ytdChargeability };
  }

  async getProgramDistribution(userId: string) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const today = now.toISOString().split('T')[0];
    const yearStart = `${currentYear}-01-01`;

    // Determine current period (week)
    const dayOfWeek = now.getDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const periodStart = new Date(now);
    periodStart.setDate(now.getDate() + mondayOffset);
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodStart.getDate() + 4); // Friday

    const periodStartStr = periodStart.toISOString().split('T')[0];
    const periodEndStr = periodEnd.toISOString().split('T')[0];

    // Helper to query program distribution for a date range
    const queryDistribution = async (start: string, end: string): Promise<ProgramHours[]> => {
      // Get hours grouped by charge code, then resolve to root program
      const rows = await this.db
        .select({
          chargeCodeId: timesheetEntries.chargeCodeId,
          path: chargeCodes.path,
          programName: chargeCodes.programName,
          ccName: chargeCodes.name,
          hours: sql<string>`coalesce(sum(${timesheetEntries.hours}), 0)`,
        })
        .from(timesheetEntries)
        .innerJoin(timesheets, eq(timesheetEntries.timesheetId, timesheets.id))
        .innerJoin(chargeCodes, eq(timesheetEntries.chargeCodeId, chargeCodes.id))
        .where(
          and(
            eq(timesheets.userId, userId),
            gte(timesheetEntries.date, start),
            lte(timesheetEntries.date, end),
          ),
        )
        .groupBy(
          timesheetEntries.chargeCodeId,
          chargeCodes.path,
          chargeCodes.programName,
          chargeCodes.name,
        );

      // Group by root program (first segment of path, or programName, or CC name)
      const programMap = new Map<string, { name: string; hours: number }>();
      for (const row of rows) {
        const hours = Number(row.hours);
        // Derive root program ID from path (e.g., "PRG-001/PRJ-001/ACT-001" -> "PRG-001")
        const rootId = row.path ? row.path.split('/')[0] : row.chargeCodeId;
        const name = row.programName || row.ccName || rootId;

        if (!programMap.has(rootId)) {
          programMap.set(rootId, { name, hours: 0 });
        }
        programMap.get(rootId)!.hours += hours;
      }

      const totalHours = Array.from(programMap.values()).reduce((s, p) => s + p.hours, 0);

      return Array.from(programMap.entries()).map(([id, data]) => ({
        programName: data.name,
        programId: id,
        hours: Math.round(data.hours * 100) / 100,
        percentage: totalHours > 0 ? Math.round((data.hours / totalHours) * 100) : 0,
      })).sort((a, b) => b.hours - a.hours);
    };

    const currentPeriod = await queryDistribution(periodStartStr, periodEndStr);
    const ytd = await queryDistribution(yearStart, today);

    return { currentPeriod, ytd };
  }
}
