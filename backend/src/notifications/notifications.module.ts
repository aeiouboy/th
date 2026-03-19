import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { TeamsWebhookService } from './teams-webhook.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, TeamsWebhookService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
