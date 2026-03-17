import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import { timesheets, profiles } from '../database/schema';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Daily reminder at 9:00 AM: check for users with incomplete timesheets
   * for the current week and log notifications.
   */
  @Cron('0 9 * * 1-5', { name: 'daily-timesheet-reminder' })
  async handleDailyReminder() {
    this.logger.log('Running daily timesheet reminder check');

    try {
      const now = new Date();
      const day = now.getUTCDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setUTCDate(now.getUTCDate() + diffToMonday);
      const weekStart = monday.toISOString().split('T')[0];

      // Find all users
      const allUsers = await this.db
        .select({ id: profiles.id, email: profiles.email, fullName: profiles.fullName })
        .from(profiles);

      // Find users who have a draft or no timesheet for this week
      const existingTimesheets = await this.db
        .select({
          userId: timesheets.userId,
          status: timesheets.status,
        })
        .from(timesheets)
        .where(eq(timesheets.periodStart, weekStart));

      const submittedUsers = new Set(
        existingTimesheets
          .filter((t) => t.status !== 'draft' && t.status !== 'rejected')
          .map((t) => t.userId),
      );

      const incompleteUsers = allUsers.filter(
        (u) => !submittedUsers.has(u.id),
      );

      if (incompleteUsers.length > 0) {
        this.logger.log(
          `Found ${incompleteUsers.length} users with incomplete timesheets for week starting ${weekStart}`,
        );

        for (const user of incompleteUsers) {
          this.logger.log(
            `NOTIFICATION: Reminder to ${user.fullName ?? user.email} — timesheet for week ${weekStart} is incomplete`,
          );
          // In production, this would send an email or push notification
        }
      } else {
        this.logger.log('All users have submitted timesheets for the current week');
      }
    } catch (error) {
      this.logger.error('Failed to run daily reminder', error);
    }
  }
}
