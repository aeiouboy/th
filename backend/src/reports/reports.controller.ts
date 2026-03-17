import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('project-cost')
  @ApiQuery({ name: 'charge_code_id', required: true })
  getProjectCost(@Query('charge_code_id') chargeCodeId: string) {
    return this.reportsService.getProjectCostReport(chargeCodeId);
  }

  @Get('utilization')
  @ApiQuery({ name: 'period', required: true, example: '2026-03' })
  getUtilization(@Query('period') period: string) {
    return this.reportsService.getUtilizationReport(period);
  }

  @Get('chargeability')
  @ApiQuery({ name: 'team', required: false })
  getChargeability(@Query('team') team?: string) {
    return this.reportsService.getChargeabilityReport(team);
  }

  @Get('financial-impact')
  getFinancialImpact() {
    return this.reportsService.getFinancialImpact();
  }

  @Get('activity-distribution')
  @ApiQuery({ name: 'period', required: true, example: '2026-03' })
  getActivityDistribution(@Query('period') period: string) {
    return this.reportsService.getActivityDistribution(period);
  }

  @Get('budget-alerts')
  getBudgetAlerts() {
    return this.reportsService.getBudgetAlerts();
  }
}
