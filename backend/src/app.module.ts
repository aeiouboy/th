import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { ChargeCodesModule } from './charge-codes/charge-codes.module';
import { TimesheetsModule } from './timesheets/timesheets.module';
import { BudgetsModule } from './budgets/budgets.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { CalendarModule } from './calendar/calendar.module';
import { SchedulersModule } from './schedulers/schedulers.module';
import { ReportsModule } from './reports/reports.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { CostRatesModule } from './cost-rates/cost-rates.module';
import { SettingsModule } from './settings/settings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CompanySettingsModule } from './company-settings/company-settings.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AiModule } from './ai/ai.module';
import { SupabaseAuthGuard } from './common/guards/supabase-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    UsersModule,
    ChargeCodesModule,
    TimesheetsModule,
    BudgetsModule,
    ApprovalsModule,
    CalendarModule,
    SchedulersModule,
    ReportsModule,
    IntegrationsModule,
    CostRatesModule,
    SettingsModule,
    NotificationsModule,
    CompanySettingsModule,
    DashboardModule,
    AiModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: SupabaseAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
