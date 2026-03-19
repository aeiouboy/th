import { Module } from '@nestjs/common';
import { TimesheetsModule } from '../timesheets/timesheets.module';
import { BudgetsModule } from '../budgets/budgets.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { IntegrationsController } from './integrations.controller';
import { TeamsBotService } from './teams-bot.service';
import { IntegrationNotificationService } from './notification.service';
import { ProjectUploadService } from './project-upload.service';
import { TeamsWebhookService } from './teams-webhook.service';

@Module({
  imports: [TimesheetsModule, BudgetsModule, NotificationsModule],
  controllers: [IntegrationsController],
  providers: [
    TeamsBotService,
    IntegrationNotificationService,
    ProjectUploadService,
    TeamsWebhookService,
  ],
  exports: [IntegrationNotificationService, TeamsWebhookService],
})
export class IntegrationsModule {}
