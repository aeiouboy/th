import { Module } from '@nestjs/common';
import { TimesheetsModule } from '../timesheets/timesheets.module';
import { BudgetsModule } from '../budgets/budgets.module';
import { IntegrationsController } from './integrations.controller';
import { TeamsBotService } from './teams-bot.service';
import { IntegrationNotificationService } from './notification.service';
import { ProjectUploadService } from './project-upload.service';

@Module({
  imports: [TimesheetsModule, BudgetsModule],
  controllers: [IntegrationsController],
  providers: [
    TeamsBotService,
    IntegrationNotificationService,
    ProjectUploadService,
  ],
  exports: [IntegrationNotificationService],
})
export class IntegrationsModule {}
