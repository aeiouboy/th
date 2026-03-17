import { Module } from '@nestjs/common';
import { BudgetsModule } from '../budgets/budgets.module';
import { TimesheetsScheduler } from './timesheets.scheduler';
import { NotificationService } from './notification.service';
import { ReportsScheduler } from './reports.scheduler';
import { BudgetsScheduler } from './budgets.scheduler';

@Module({
  imports: [BudgetsModule],
  providers: [
    TimesheetsScheduler,
    NotificationService,
    ReportsScheduler,
    BudgetsScheduler,
  ],
})
export class SchedulersModule {}
