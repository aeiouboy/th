import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import { budgets, chargeCodes, profiles } from '../database/schema';
import { BudgetsService } from '../budgets/budgets.service';
import { TeamsWebhookService } from '../integrations/teams-webhook.service';

@Injectable()
export class BudgetsScheduler {
  private readonly logger = new Logger(BudgetsScheduler.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly budgetsService: BudgetsService,
    private readonly teamsWebhook: TeamsWebhookService,
  ) {}

  /**
   * Budget alert: runs every day at 8:00 AM.
   * Checks for charge codes exceeding budget thresholds and logs alerts.
   */
  @Cron('0 8 * * *', { name: 'daily-budget-alert' })
  async handleBudgetAlertCheck() {
    this.logger.log('Running daily budget alert check');

    try {
      // First, recalculate all budget actuals
      const { recalculated } = await this.budgetsService.recalculate();
      this.logger.log(`Recalculated budgets for ${recalculated} charge codes`);

      // Then check for alerts
      const alerts = await this.budgetsService.getAlerts();

      if (alerts.length === 0) {
        this.logger.log('No budget alerts found');
        return;
      }

      this.logger.warn(`Found ${alerts.length} budget alerts:`);

      for (const alert of alerts) {
        const percentage = alert.budget > 0
          ? Math.round((alert.actual / alert.budget) * 100)
          : 0;

        this.logger.warn(
          `  [${alert.severity.toUpperCase()}] ${alert.chargeCodeId} - ${alert.name}: ` +
          `${percentage}% used (${alert.actual.toFixed(2)} / ${alert.budget.toFixed(2)})` +
          (alert.forecast !== null ? ` | Forecast: ${alert.forecast.toFixed(2)}` : '') +
          (alert.rootCauseActivity ? ` | Root cause: ${alert.rootCauseActivity}` : ''),
        );

        // Notify charge code owner
        const [cc] = await this.db
          .select({
            ownerId: chargeCodes.ownerId,
            ownerEmail: profiles.email,
            ownerName: profiles.fullName,
          })
          .from(chargeCodes)
          .leftJoin(profiles, eq(chargeCodes.ownerId, profiles.id))
          .where(eq(chargeCodes.id, alert.chargeCodeId))
          .limit(1);

        if (cc?.ownerId) {
          this.logger.log(
            `NOTIFICATION: Budget alert (${alert.severity}) sent to ${cc.ownerName ?? cc.ownerEmail} ` +
            `for charge code ${alert.chargeCodeId}`,
          );
        }
      }

      // Send summary to Teams (top 5 most critical)
      const redCount = alerts.filter((a) => a.severity === 'red').length;
      const orangeCount = alerts.filter((a) => a.severity === 'orange').length;
      const yellowCount = alerts.filter((a) => a.severity === 'yellow').length;

      const topAlerts = alerts.slice(0, 5);
      const facts = [
        { name: 'Total Alerts', value: `🔴 ${redCount}  🟠 ${orangeCount}  🟡 ${yellowCount}` },
        { name: '---', value: '**Top Alerts**' },
        ...topAlerts.map((a) => {
          const pct = a.budget > 0 ? Math.round((a.actual / a.budget) * 100) : 0;
          const icon = a.severity === 'red' ? '🔴' : a.severity === 'orange' ? '🟠' : '🟡';
          return {
            name: `${icon} ${a.chargeCodeId}`,
            value: `${pct}% (฿${a.actual.toLocaleString()} / ฿${a.budget.toLocaleString()})`,
          };
        }),
      ];

      if (alerts.length > 5) {
        facts.push({ name: `+${alerts.length - 5} more`, value: 'View in system →' });
      }

      const color = redCount > 0 ? 'ff0000' : 'ff9800';

      await this.teamsWebhook.sendCard(
        `⚠️ Budget Alerts (${alerts.length})`,
        '',
        facts,
        color,
      );
    } catch (error) {
      this.logger.error('Failed to run budget alert check', error);
    }
  }
}
