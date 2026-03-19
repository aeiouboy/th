import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ApprovalsService } from './approvals.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ApproveDto, RejectDto, BulkApproveDto } from './dto';

@ApiTags('Approvals')
@ApiBearerAuth()
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get('team-status')
  @Roles('admin', 'charge_manager')
  getTeamStatus(@CurrentUser() user: any) {
    return this.approvalsService.getTeamStatus(user.id, user.role);
  }

  @Get('pending')
  getPending(@CurrentUser() user: any) {
    return this.approvalsService.getPending(user.id);
  }

  @Post(':timesheet_id/approve')
  approve(
    @Param('timesheet_id', ParseUUIDPipe) timesheetId: string,
    @CurrentUser() user: any,
    @Body() dto: ApproveDto,
  ) {
    return this.approvalsService.approve(timesheetId, user.id, dto.comment);
  }

  @Post(':timesheet_id/reject')
  reject(
    @Param('timesheet_id', ParseUUIDPipe) timesheetId: string,
    @CurrentUser() user: any,
    @Body() dto: RejectDto,
  ) {
    return this.approvalsService.reject(timesheetId, user.id, dto.comment);
  }

  @Post('bulk-approve')
  bulkApprove(@CurrentUser() user: any, @Body() dto: BulkApproveDto) {
    return this.approvalsService.bulkApprove(dto.timesheet_ids, user.id);
  }

  @Get('history')
  getHistory(@CurrentUser() user: any) {
    return this.approvalsService.getHistory(user.id);
  }

  @Get(':timesheet_id/detail')
  getTimesheetDetail(
    @Param('timesheet_id', ParseUUIDPipe) timesheetId: string,
  ) {
    return this.approvalsService.getTimesheetDetail(timesheetId);
  }
}
