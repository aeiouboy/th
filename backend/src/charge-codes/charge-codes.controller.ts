import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBody, ApiQuery } from '@nestjs/swagger';
import { ChargeCodesService } from './charge-codes.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateChargeCodeDto } from './dto/create-charge-code.dto';
import { UpdateChargeCodeDto } from './dto/update-charge-code.dto';
import { UpdateAccessDto } from './dto/update-access.dto';

@ApiTags('Charge Codes')
@ApiBearerAuth()
@Controller('charge-codes')
export class ChargeCodesController {
  constructor(private readonly chargeCodesService: ChargeCodesService) {}

  @Get()
  @ApiQuery({ name: 'limit', required: false, description: 'Max results (default 100)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination (default 0)' })
  findAll(
    @Query('level') level?: string,
    @Query('status') status?: string,
    @Query('billable') billable?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.chargeCodesService.findAll({
      level,
      status,
      billable,
      search,
      limit: limit ? Math.min(parseInt(limit, 10) || 100, 500) : 100,
      offset: offset ? parseInt(offset, 10) || 0 : 0,
    });
  }

  @Get('my')
  findMy(@CurrentUser() user: any) {
    return this.chargeCodesService.findMyChargeCodes(user.id);
  }

  @Get('tree')
  getTree() {
    return this.chargeCodesService.getTree();
  }

  @Post()
  @Roles('admin', 'charge_manager')
  create(@Body() dto: CreateChargeCodeDto) {
    return this.chargeCodesService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.chargeCodesService.findById(id);
  }

  @Put(':id')
  @Roles('admin', 'charge_manager')
  update(@Param('id') id: string, @Body() dto: UpdateChargeCodeDto) {
    return this.chargeCodesService.update(id, dto);
  }

  @Get(':id/children')
  findChildren(@Param('id') id: string) {
    return this.chargeCodesService.findChildren(id);
  }

  @Get(':id/budget-detail')
  getBudgetDetail(@Param('id') id: string) {
    return this.chargeCodesService.getBudgetDetail(id);
  }

  @Put(':id/access')
  @Roles('admin', 'charge_manager')
  updateAccess(@Param('id') id: string, @Body() dto: UpdateAccessDto, @CurrentUser() user: any) {
    return this.chargeCodesService.updateAccess(id, dto, user.id);
  }

  @Post(':id/cascade-access')
  @Roles('admin', 'charge_manager')
  @ApiBody({ schema: { type: 'object', properties: { userIds: { type: 'array', items: { type: 'string' } } } } })
  cascadeAccess(
    @Param('id') id: string,
    @Body('userIds') userIds: string[],
    @CurrentUser() user: any,
  ) {
    return this.chargeCodesService.cascadeAccess(id, userIds, user.id);
  }

  @Post(':id/request-access')
  @ApiBody({ schema: { type: 'object', properties: { reason: { type: 'string' } } } })
  requestAccess(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    return this.chargeCodesService.requestAccess(id, user.id, reason);
  }

  @Get('access-requests/list')
  @Roles('admin', 'charge_manager')
  getAccessRequests(@CurrentUser() user: any) {
    return this.chargeCodesService.getAccessRequests(user.id, user.role);
  }

  @Patch('access-requests/:requestId')
  @Roles('admin', 'charge_manager')
  reviewAccessRequest(
    @Param('requestId') requestId: string,
    @Body('status') status: 'approved' | 'rejected',
    @CurrentUser() user: any,
  ) {
    return this.chargeCodesService.reviewAccessRequest(requestId, status, user.id);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.chargeCodesService.remove(id);
  }
}
