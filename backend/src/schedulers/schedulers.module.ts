import { Module } from '@nestjs/common';
import { BudgetsModule } from '../budgets/budgets.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { TimesheetsScheduler } from './timesheets.scheduler';
import { NotificationService } from './notification.service';
import { ReportsScheduler } from './reports.scheduler';
import { BudgetsScheduler } from './budgets.scheduler';

@Module({
  imports: [BudgetsModule, NotificationsModule, IntegrationsModule],
  providers: [
    TimesheetsScheduler,
    NotificationService,
    ReportsScheduler,
    BudgetsScheduler,
  ],
})
export class SchedulersModule {}
