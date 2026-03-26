import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
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
  @ApiQuery({ name: 'search', required: false, description: 'Filter by employee name, email, or department' })
  getPending(@CurrentUser() user: any, @Query('search') search?: string) {
    return this.approvalsService.getPending(user.id, search);
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
  @ApiQuery({ name: 'limit', required: false, description: 'Max results (default 100, max 500)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination (default 0)' })
  getHistory(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.approvalsService.getHistory(user.id, {
      limit: limit ? Math.min(parseInt(limit, 10) || 100, 500) : 100,
      offset: offset ? parseInt(offset, 10) || 0 : 0,
    });
  }

  @Get(':timesheet_id/detail')
  getTimesheetDetail(
    @Param('timesheet_id', ParseUUIDPipe) timesheetId: string,
  ) {
    return this.approvalsService.getTimesheetDetail(timesheetId);
  }
}
