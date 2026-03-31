import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { CreateVacationDto } from './dto/create-vacation.dto';

@ApiTags('Calendar')
@ApiBearerAuth()
@Controller()
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('calendar')
  getCalendar(
    @Query('year') year: string,
    @Query('country_code') countryCode?: string,
  ) {
    const y = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.calendarService.getCalendarByYear(y, countryCode);
  }

  @Get('calendar/working-days')
  getWorkingDays(
    @Query('start') start: string,
    @Query('end') end: string,
    @CurrentUser() user: any,
  ) {
    return this.calendarService.getWorkingDays(start, end, user.id);
  }

  @Post('calendar/holidays')
  @Roles('admin')
  createHoliday(@Body() dto: CreateHolidayDto) {
    return this.calendarService.createHoliday(
      dto.date,
      dto.holidayName,
      dto.countryCode,
    );
  }

  @Put('calendar/holidays/:id')
  @Roles('admin')
  updateHoliday(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHolidayDto,
  ) {
    return this.calendarService.updateHoliday(id, dto);
  }

  @Delete('calendar/holidays/:id')
  @Roles('admin')
  deleteHoliday(@Param('id', ParseIntPipe) id: number) {
    return this.calendarService.deleteHoliday(id);
  }

  @Post('calendar/populate-weekends')
  @Roles('admin')
  populateWeekends(@Body('year', ParseIntPipe) year: number) {
    return this.calendarService.populateWeekends(year);
  }

  @Get('vacations/me')
  getMyVacations(@CurrentUser() user: any) {
    return this.calendarService.getMyVacations(user.id);
  }

  @Post('vacations')
  createVacation(
    @CurrentUser() user: any,
    @Body() dto: CreateVacationDto,
  ) {
    return this.calendarService.createVacation(
      user.id,
      dto.startDate,
      dto.endDate,
      dto.leaveType,
    );
  }

  @Get('vacations/pending')
  @Roles('charge_manager', 'admin', 'pmo')
  getPendingVacations(@CurrentUser() user: any) {
    return this.calendarService.getPendingVacationsForManager(user.id);
  }

  @Post('vacations/:id/approve')
  @Roles('charge_manager', 'admin')
  approveVacation(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.calendarService.approveVacation(id, user.id);
  }

  @Post('vacations/:id/reject')
  @Roles('charge_manager', 'admin')
  rejectVacation(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.calendarService.rejectVacation(id, user.id);
  }
}
