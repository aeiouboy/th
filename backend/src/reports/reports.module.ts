import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { BudgetsModule } from '../budgets/budgets.module';
import { CompanySettingsModule } from '../company-settings/company-settings.module';

@Module({
  imports: [BudgetsModule, CompanySettingsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
