import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TimesheetsService } from './timesheets.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateTimesheetDto } from './dto/create-timesheet.dto';
import { UpsertEntriesDto } from './dto/upsert-entries.dto';

@ApiTags('Timesheets')
@ApiBearerAuth()
@Controller('timesheets')
export class TimesheetsController {
  constructor(private readonly timesheetsService: TimesheetsService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateTimesheetDto) {
    return this.timesheetsService.create(user.id, dto);
  }

  @Get()
  @ApiQuery({ name: 'period', required: false, example: '2026-03-16' })
  findByPeriod(@CurrentUser() user: any, @Query('period') period?: string) {
    const effectivePeriod = period || new Date().toISOString().split('T')[0];
    return this.timesheetsService.findByPeriod(user.id, effectivePeriod);
  }

  @Get('periods')
  getAvailablePeriods(@CurrentUser() user: any) {
    return this.timesheetsService.getAvailablePeriods(user.id);
  }

  @Get('charge-codes')
  getUserChargeCodes(@CurrentUser() user: any) {
    return this.timesheetsService.getUserChargeCodes(user.id);
  }

  @Get(':id')
  findById(@CurrentUser() user: any, @Param('id') id: string) {
    return this.timesheetsService.findById(user.id, id);
  }

  @Get(':id/entries')
  getEntries(@CurrentUser() user: any, @Param('id') id: string) {
    return this.timesheetsService.getEntries(user.id, id);
  }

  @Put(':id/entries')
  upsertEntries(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpsertEntriesDto,
  ) {
    return this.timesheetsService.upsertEntries(user.id, id, dto.entries);
  }

  @Post(':id/submit')
  submit(@CurrentUser() user: any, @Param('id') id: string) {
    return this.timesheetsService.submit(user.id, id);
  }

  @Post(':id/copy-from-previous')
  copyFromPrevious(@CurrentUser() user: any, @Param('id') id: string) {
    return this.timesheetsService.copyFromPrevious(user.id, id);
  }
}
