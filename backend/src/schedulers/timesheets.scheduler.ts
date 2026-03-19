import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, eq, lte, inArray } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import { timesheets, profiles } from '../database/schema';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TimesheetsScheduler {
  private readonly logger = new Logger(TimesheetsScheduler.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly notificationsService: NotificationsService,
  ) {}

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
      // Lock submitted and approved timesheets whose period has ended
      const lockResult = await this.db
        .update(timesheets)
        .set({
          status: 'locked',
          lockedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            lte(timesheets.periodEnd, cutoffDateStr),
            inArray(timesheets.status, ['submitted', 'approved']),
          ),
        )
        .returning({ id: timesheets.id });

      this.logger.log(`Force-locked ${lockResult.length} submitted/approved timesheets`);

      // Notify users with draft/unsubmitted timesheets about the cutoff
      await this.sendCutoffWarnings(cutoffDate);
    } catch (error) {
      this.logger.error('Failed to run timesheet cutoff', error);
    }
  }

  private async sendCutoffWarnings(cutoffDate: Date) {
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    try {
      // Find all users who still have draft timesheets for the current period
      const allUsers = await this.db
        .select({ id: profiles.id, email: profiles.email, fullName: profiles.fullName })
        .from(profiles);

      const draftTimesheets = await this.db
        .select({ userId: timesheets.userId })
        .from(timesheets)
        .where(
          and(
            lte(timesheets.periodEnd, cutoffDateStr),
            eq(timesheets.status, 'draft'),
          ),
        );

      const draftUserIds = new Set(draftTimesheets.map((t) => t.userId));

      for (const user of allUsers) {
        if (draftUserIds.has(user.id)) {
          await this.notificationsService.create(
            'timesheet_reminder',
            user.id,
            'Timesheet Cutoff Warning',
            `Today is a cutoff date (${cutoffDateStr}). Your draft timesheet(s) will be auto-locked if not submitted. Please submit your timesheets now.`,
          );
          this.logger.log(
            `NOTIFICATION: Cutoff warning sent to ${user.fullName ?? user.email}`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to send cutoff warnings', error);
    }
  }
}
