import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, eq, inArray, lte } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import { timesheets, profiles } from '../database/schema';

@Injectable()
export class TimesheetsScheduler {
  private readonly logger = new Logger(TimesheetsScheduler.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Auto-cutoff: Lock timesheets on the 15th and last day of each month at midnight.
   * Runs at 00:05 on the 15th and last day of month.
   */
  @Cron('5 0 15 * *', { name: 'mid-month-cutoff' })
  async handleMidMonthCutoff() {
    await this.lockTimesheetsBefore(new Date());
  }

  @Cron('5 0 28-31 * *', { name: 'end-of-month-cutoff' })
  async handleEndOfMonthCutoff() {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    if (now.getDate() !== lastDay) {
      return; // Only run on the actual last day of the month
    }
    await this.lockTimesheetsBefore(now);
  }

  private async lockTimesheetsBefore(cutoffDate: Date) {
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    this.logger.log(`Running timesheet cutoff for periods ending before ${cutoffDateStr}`);

    try {
      // Lock all approved timesheets whose period has ended before the cutoff
      const result = await this.db
        .update(timesheets)
        .set({
          status: 'locked',
          lockedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            lte(timesheets.periodEnd, cutoffDateStr),
            inArray(timesheets.status, ['cc_approved', 'manager_approved']),
          ),
        )
        .returning({ id: timesheets.id });

      this.logger.log(`Locked ${result.length} approved timesheets`);

      // Also lock submitted timesheets that were not approved before cutoff
      const submittedResult = await this.db
        .update(timesheets)
        .set({
          status: 'locked',
          lockedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            lte(timesheets.periodEnd, cutoffDateStr),
            eq(timesheets.status, 'submitted'),
          ),
        )
        .returning({ id: timesheets.id });

      this.logger.log(`Force-locked ${submittedResult.length} submitted (unapproved) timesheets`);
    } catch (error) {
      this.logger.error('Failed to run timesheet cutoff', error);
    }
  }
}
