import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BudgetsService } from './budgets.service';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Budgets')
@ApiBearerAuth()
@Roles('admin', 'pmo', 'finance')
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Get()
  @ApiQuery({ name: 'chargeCodeIds', required: false, description: 'Comma-separated charge code IDs to filter' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based, default 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default 20, max 100)' })
  findAll(
    @Query('chargeCodeIds') chargeCodeIds?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const ids = chargeCodeIds
      ? chargeCodeIds.split(',').map((id) => id.trim()).filter(Boolean)
      : undefined;
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20', 10) || 20));
    return this.budgetsService.findAll(ids, pageNum, limitNum);
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

  @Get(':charge_code_id/team-breakdown')
  getTeamBreakdown(@Param('charge_code_id') chargeCodeId: string) {
    return this.budgetsService.getTeamBreakdown(chargeCodeId);
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
