import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { eq, sql, sum, inArray } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import {
  chargeCodes,
  timesheetEntries,
  timesheets,
  profiles,
} from '../database/schema';
import { NotificationsService } from '../notifications/notifications.service';
import { TeamsWebhookService } from '../integrations/teams-webhook.service';

@Injectable()
export class ReportsScheduler {
  private readonly logger = new Logger(ReportsScheduler.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly notificationsService: NotificationsService,
    private readonly teamsWebhook: TeamsWebhookService,
  ) {}

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

      // Send in-app notifications to PMO/Finance/Admin users
      const recipients = await this.db
        .select({
          id: profiles.id,
          email: profiles.email,
          fullName: profiles.fullName,
        })
        .from(profiles)
        .where(inArray(profiles.role, ['pmo', 'finance', 'admin']));

      const summaryLines = programSummary.map(
        (row) =>
          `- ${row.programName ?? 'Unassigned'} | Cost Center: ${row.costCenter ?? 'N/A'} | Hours: ${row.totalHours ?? 0} | Cost: ${row.totalCost ?? 0}`,
      );

      for (const recipient of recipients) {
        await this.notificationsService.create(
          'weekly_insights',
          recipient.id,
          `Weekly Insights (${weekStart} - ${weekEnd})`,
          `Weekly summary for ${weekStart} to ${weekEnd}:\n${summaryLines.join('\n')}`,
        );
        this.logger.log(
          `NOTIFICATION: Weekly insight sent to ${recipient.fullName ?? recipient.email}`,
        );
      }

      for (const owner of owners) {
        this.logger.log(
          `NOTIFICATION: Weekly insight sent to ${owner.ownerName ?? owner.ownerEmail} for program "${owner.programName}"`,
        );
      }

      // Send summary to Teams
      const totalHours = programSummary.reduce(
        (acc, r) => acc + parseFloat(String(r.totalHours ?? '0')),
        0,
      );
      const totalCost = programSummary.reduce(
        (acc, r) => acc + parseFloat(String(r.totalCost ?? '0')),
        0,
      );

      // Top 5 programs by hours
      const topPrograms = [...programSummary]
        .sort((a, b) => Number(b.totalHours ?? 0) - Number(a.totalHours ?? 0))
        .slice(0, 5);

      const facts = [
        { name: 'Period', value: `${weekStart} — ${weekEnd}` },
        { name: 'Total Hours', value: `${totalHours.toFixed(0)}h` },
        { name: 'Total Cost', value: `฿${totalCost.toLocaleString()}` },
        { name: '---', value: '**Top Programs**' },
        ...topPrograms.map((r) => ({
          name: String(r.programName ?? 'Unassigned'),
          value: `${Number(r.totalHours ?? 0).toFixed(0)}h`,
        })),
      ];

      if (programSummary.length > 5) {
        facts.push({ name: `+${programSummary.length - 5} more`, value: '' });
      }

      await this.teamsWebhook.sendCard(
        `📊 Weekly Insights (${weekStart})`,
        '',
        facts,
        '00c853',
      );
    } catch (error) {
      this.logger.error('Failed to generate weekly insight summary', error);
    }
  }
}
