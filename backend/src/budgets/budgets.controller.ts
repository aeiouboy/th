import { Controller, Get, Post, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BudgetsService } from './budgets.service';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Budgets')
@ApiBearerAuth()
@Roles('admin', 'pmo', 'finance')
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Get()
  findAll() {
    return this.budgetsService.findAll();
  }

  @Get('alerts')
  getAlerts() {
    return this.budgetsService.getAlerts();
  }

  @Get('chargeability-alerts')
  getChargeabilityAlerts() {
    return this.budgetsService.getChargeabilityAlerts();
  }

  @Get('summary')
  getSummary() {
    return this.budgetsService.getSummary();
  }

  @Post('recalculate')
  @Roles('admin')
  recalculate() {
    return this.budgetsService.recalculate();
  }

  @Get(':charge_code_id')
  getBudget(@Param('charge_code_id') chargeCodeId: string) {
    return this.budgetsService.getBudgetForChargeCode(chargeCodeId);
  }

  @Get(':charge_code_id/forecast')
  getForecast(@Param('charge_code_id') chargeCodeId: string) {
    return this.budgetsService.getForecast(chargeCodeId);
  }
}
