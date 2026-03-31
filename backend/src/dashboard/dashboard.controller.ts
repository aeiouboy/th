import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('chargeability-ytd')
  getChargeabilityYtd(@CurrentUser() user: { id: string }) {
    return this.dashboardService.getChargeabilityYtd(user.id);
  }

  @Get('program-distribution')
  getProgramDistribution(@CurrentUser() user: { id: string }) {
    return this.dashboardService.getProgramDistribution(user.id);
  }
}
