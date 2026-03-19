import { Module } from '@nestjs/common';
import { TimesheetsController } from './timesheets.controller';
import { TimesheetsService } from './timesheets.service';
import { CalendarModule } from '../calendar/calendar.module';
import { TeamsWebhookService } from '../integrations/teams-webhook.service';

@Module({
  imports: [CalendarModule],
  controllers: [TimesheetsController],
  providers: [TimesheetsService, TeamsWebhookService],
  exports: [TimesheetsService],
})
export class TimesheetsModule {}
