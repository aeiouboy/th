import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
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
  findAll(
    @Query('level') level?: string,
    @Query('status') status?: string,
    @Query('billable') billable?: string,
    @Query('search') search?: string,
  ) {
    return this.chargeCodesService.findAll({ level, status, billable, search });
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

  @Put(':id/access')
  @Roles('admin', 'charge_manager')
  updateAccess(@Param('id') id: string, @Body() dto: UpdateAccessDto, @CurrentUser() user: any) {
    return this.chargeCodesService.updateAccess(id, dto, user.id);
  }
}
