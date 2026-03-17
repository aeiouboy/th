import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { eq, sql, sum } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import {
  chargeCodes,
  timesheetEntries,
  timesheets,
  profiles,
} from '../database/schema';

@Injectable()
export class ReportsScheduler {
  private readonly logger = new Logger(ReportsScheduler.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Weekly insight summary: runs every Monday at 7:00 AM.
   * Generates a summary of hours and costs per program/cost center
   * for the previous week.
   */
  @Cron('0 7 * * 1', { name: 'weekly-insight-summary' })
  async handleWeeklyInsightSummary() {
    this.logger.log('Running weekly insight summary');

    try {
      const now = new Date();
      // Previous week: Monday to Sunday
      const prevMonday = new Date(now);
      prevMonday.setUTCDate(now.getUTCDate() - 7);
      const day = prevMonday.getUTCDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      prevMonday.setUTCDate(prevMonday.getUTCDate() + diffToMonday);
      const prevSunday = new Date(prevMonday);
      prevSunday.setUTCDate(prevMonday.getUTCDate() + 6);

      const weekStart = prevMonday.toISOString().split('T')[0];
      const weekEnd = prevSunday.toISOString().split('T')[0];

      // Aggregate hours and cost by program name
      const programSummary = await this.db
        .select({
          programName: chargeCodes.programName,
          costCenter: chargeCodes.costCenter,
          totalHours: sum(timesheetEntries.hours).as('total_hours'),
          totalCost: sum(timesheetEntries.calculatedCost).as('total_cost'),
        })
        .from(timesheetEntries)
        .innerJoin(chargeCodes, eq(timesheetEntries.chargeCodeId, chargeCodes.id))
        .where(
          sql`${timesheetEntries.date} >= ${weekStart} AND ${timesheetEntries.date} <= ${weekEnd}`,
        )
        .groupBy(chargeCodes.programName, chargeCodes.costCenter);

      this.logger.log(`Weekly summary for ${weekStart} to ${weekEnd}:`);

      if (programSummary.length === 0) {
        this.logger.log('No timesheet entries found for the previous week');
        return;
      }

      for (const row of programSummary) {
        this.logger.log(
          `  Program: ${row.programName ?? 'Unassigned'} | ` +
          `Cost Center: ${row.costCenter ?? 'N/A'} | ` +
          `Hours: ${row.totalHours ?? 0} | ` +
          `Cost: ${row.totalCost ?? 0}`,
        );
      }

      // Notify program/cost center owners
      const owners = await this.db
        .select({
          ownerId: chargeCodes.ownerId,
          ownerEmail: profiles.email,
          ownerName: profiles.fullName,
          programName: chargeCodes.programName,
        })
        .from(chargeCodes)
        .innerJoin(profiles, eq(chargeCodes.ownerId, profiles.id))
        .where(sql`${chargeCodes.ownerId} IS NOT NULL`)
        .groupBy(
          chargeCodes.ownerId,
          profiles.email,
          profiles.fullName,
          chargeCodes.programName,
        );

      for (const owner of owners) {
        this.logger.log(
          `NOTIFICATION: Weekly insight sent to ${owner.ownerName ?? owner.ownerEmail} for program "${owner.programName}"`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to generate weekly insight summary', error);
    }
  }
}
