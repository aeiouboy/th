import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@Roles('admin', 'pmo', 'finance')
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
  @ApiQuery({ name: 'limit', required: false, description: 'Max employee results (default 100, max 500)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination (default 0)' })
  getUtilization(
    @Query('period') period: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.reportsService.getUtilizationReport(period, {
      limit: limit ? Math.min(parseInt(limit, 10) || 100, 500) : 100,
      offset: offset ? parseInt(offset, 10) || 0 : 0,
    });
  }

  @Get('chargeability')
  @ApiQuery({ name: 'team', required: false })
  @ApiQuery({ name: 'limit', required: false, description: 'Max member results (default 100, max 500)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination (default 0)' })
  getChargeability(
    @Query('team') team?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.reportsService.getChargeabilityReport(team, {
      limit: limit ? Math.min(parseInt(limit, 10) || 100, 500) : 100,
      offset: offset ? parseInt(offset, 10) || 0 : 0,
    });
  }

  @Get('financial-impact')
  @ApiQuery({ name: 'period', required: false, example: '2026-03' })
  @ApiQuery({ name: 'team', required: false })
  getFinancialImpact(
    @Query('period') period?: string,
    @Query('team') team?: string,
  ) {
    return this.reportsService.getFinancialImpact(period, team);
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

  @Get('by-program')
  @ApiQuery({ name: 'programId', required: true })
  @ApiQuery({ name: 'period', required: false, example: '2026-03' })
  getByProgram(
    @Query('programId') programId: string,
    @Query('period') period?: string,
  ) {
    return this.reportsService.getReportByProgram(programId, period);
  }

  @Get('by-cost-center')
  @ApiQuery({ name: 'costCenter', required: true })
  @ApiQuery({ name: 'period', required: false, example: '2026-03' })
  getByCostCenter(
    @Query('costCenter') costCenter: string,
    @Query('period') period?: string,
  ) {
    return this.reportsService.getReportByCostCenter(costCenter, period);
  }

  @Get('by-person')
  @ApiQuery({ name: 'userId', required: true })
  @ApiQuery({ name: 'periodFrom', required: false, example: '2026-01' })
  @ApiQuery({ name: 'periodTo', required: false, example: '2026-03' })
  getByPerson(
    @Query('userId') userId: string,
    @Query('periodFrom') periodFrom?: string,
    @Query('periodTo') periodTo?: string,
  ) {
    return this.reportsService.getReportByPerson(userId, periodFrom, periodTo);
  }
}
