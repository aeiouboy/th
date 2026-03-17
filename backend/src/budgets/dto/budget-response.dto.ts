import { ApiProperty } from '@nestjs/swagger';

export class BudgetResponseDto {
  @ApiProperty()
  chargeCodeId: string;

  @ApiProperty()
  chargeCodeName: string;

  @ApiProperty()
  budgetAmount: number;

  @ApiProperty()
  actualSpent: number;

  @ApiProperty()
  percentage: number;

  @ApiProperty({ nullable: true })
  forecastAtCompletion: number | null;

  @ApiProperty({ enum: ['under_budget', 'warning', 'critical', 'overrun'] })
  status: 'under_budget' | 'warning' | 'critical' | 'overrun';
}

export class BudgetAlertDto {
  @ApiProperty()
  chargeCodeId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  budget: number;

  @ApiProperty()
  actual: number;

  @ApiProperty({ nullable: true })
  forecast: number | null;

  @ApiProperty({ enum: ['yellow', 'orange', 'red'] })
  severity: 'yellow' | 'orange' | 'red';

  @ApiProperty({ nullable: true })
  rootCauseActivity: string | null;
}

export class ChargeabilityAlertDto {
  @ApiProperty()
  type: 'chargeability';

  @ApiProperty()
  employeeId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  billableHours: number;

  @ApiProperty()
  totalHours: number;

  @ApiProperty()
  chargeability: number;

  @ApiProperty()
  target: number;

  @ApiProperty({ enum: ['red', 'orange', 'yellow'] })
  severity: 'red' | 'orange' | 'yellow';

  @ApiProperty()
  costImpact: number;
}

export class BudgetSummaryDto {
  @ApiProperty()
  totalBudget: number;

  @ApiProperty()
  totalActualSpent: number;

  @ApiProperty()
  totalForecast: number;

  @ApiProperty()
  overallPercentage: number;

  @ApiProperty()
  chargeCodesOverBudget: number;

  @ApiProperty()
  chargeCodesAtRisk: number;

  @ApiProperty()
  totalChargeCodes: number;
}
