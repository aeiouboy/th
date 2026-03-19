import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import { timesheets, profiles } from '../database/schema';
import { NotificationsService } from '../notifications/notifications.service';
import { TeamsWebhookService } from '../integrations/teams-webhook.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly notificationsService: NotificationsService,
    private readonly teamsWebhook: TeamsWebhookService,
  ) {}

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
          await this.notificationsService.create(
            'timesheet_reminder',
            user.id,
            'Timesheet Reminder',
            `Your timesheet for the week of ${weekStart} is incomplete. Please submit it as soon as possible.`,
          );
          this.logger.log(
            `NOTIFICATION: Reminder to ${user.fullName ?? user.email} — timesheet for week ${weekStart} is incomplete`,
          );
        }
        // Send summary to Teams
        await this.teamsWebhook.sendCard(
          'Timesheet Reminder',
          `**${incompleteUsers.length}** user(s) have incomplete timesheets for week starting ${weekStart}.`,
          [
            { name: 'Week', value: weekStart },
            { name: 'Incomplete', value: `${incompleteUsers.length} user(s)` },
            { name: 'Total Users', value: `${allUsers.length}` },
          ],
          'ff9800', // orange warning
        );
      } else {
        this.logger.log('All users have submitted timesheets for the current week');
      }
    } catch (error) {
      this.logger.error('Failed to run daily reminder', error);
    }
  }
}
