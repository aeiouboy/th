import { ApiProperty } from '@nestjs/swagger';

export class ProjectCostItemDto {
  @ApiProperty()
  chargeCodeId: string;

  @ApiProperty()
  chargeCodeName: string;

  @ApiProperty()
  level: string;

  @ApiProperty()
  budgetAmount: number;

  @ApiProperty()
  actualSpent: number;

  @ApiProperty()
  variance: number;

  @ApiProperty()
  percentUsed: number;

  @ApiProperty({ type: [ProjectCostItemDto] })
  children: ProjectCostItemDto[];
}

export class ProjectCostReportDto {
  @ApiProperty()
  chargeCodeId: string;

  @ApiProperty()
  chargeCodeName: string;

  @ApiProperty()
  totalBudget: number;

  @ApiProperty()
  totalActualSpent: number;

  @ApiProperty()
  variance: number;

  @ApiProperty()
  percentUsed: number;

  @ApiProperty({ type: [ProjectCostItemDto] })
  breakdown: ProjectCostItemDto[];
}

export class EmployeeUtilizationDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty({ nullable: true })
  department: string | null;

  @ApiProperty()
  availableHours: number;

  @ApiProperty()
  loggedHours: number;

  @ApiProperty()
  utilizationRate: number;
}

export class UtilizationReportDto {
  @ApiProperty()
  period: string;

  @ApiProperty()
  workingDays: number;

  @ApiProperty()
  overallUtilization: number;

  @ApiProperty()
  totalEmployees: number;

  @ApiProperty({ type: [EmployeeUtilizationDto] })
  employees: EmployeeUtilizationDto[];

  @ApiProperty()
  byDepartment: Record<string, { availableHours: number; loggedHours: number; rate: number }>;
}

export class TeamChargeabilityDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  billableHours: number;

  @ApiProperty()
  totalHours: number;

  @ApiProperty()
  chargeabilityRate: number;
}

export class ChargeabilityReportDto {
  @ApiProperty()
  target: number;

  @ApiProperty()
  overallBillableHours: number;

  @ApiProperty()
  overallTotalHours: number;

  @ApiProperty()
  overallChargeabilityRate: number;

  @ApiProperty()
  totalMembers: number;

  @ApiProperty({ type: [TeamChargeabilityDto] })
  members: TeamChargeabilityDto[];
}

export class TeamFinancialDto {
  @ApiProperty()
  department: string;

  @ApiProperty()
  totalHours: number;

  @ApiProperty()
  billableHours: number;

  @ApiProperty()
  chargeability: number;

  @ApiProperty()
  totalCost: number;

  @ApiProperty()
  billableRevenue: number;

  @ApiProperty()
  margin: number;

  @ApiProperty()
  marginPercent: number;
}

export class ChargeCodeFinancialDto {
  @ApiProperty()
  chargeCodeId: string;

  @ApiProperty()
  chargeCodeName: string;

  @ApiProperty()
  budget: number;

  @ApiProperty()
  actual: number;

  @ApiProperty()
  variance: number;

  @ApiProperty()
  forecastOverrun: number;
}

export class FinancialImpactDto {
  @ApiProperty()
  overBudgetCost: number;

  @ApiProperty()
  overBudgetCount: number;

  @ApiProperty()
  lowChargeabilityCost: number;

  @ApiProperty()
  netImpact: number;

  @ApiProperty()
  avgCostRate: number;

  @ApiProperty()
  targetChargeability: number;

  @ApiProperty()
  actualChargeability: number;

  @ApiProperty({ type: [TeamFinancialDto] })
  byTeam: TeamFinancialDto[];

  @ApiProperty({ type: [ChargeCodeFinancialDto] })
  byChargeCode: ChargeCodeFinancialDto[];
}

export class ActivityDistributionItemDto {
  @ApiProperty()
  category: string;

  @ApiProperty()
  hours: number;

  @ApiProperty()
  percentage: number;
}

export class ActivityDistributionReportDto {
  @ApiProperty()
  period: string;

  @ApiProperty()
  totalHours: number;

  @ApiProperty({ type: [ActivityDistributionItemDto] })
  distribution: ActivityDistributionItemDto[];
}

export class BudgetAlertItemDto {
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

  @ApiProperty({ enum: ['red', 'orange', 'yellow', 'green'] })
  severity: string;

  @ApiProperty()
  overrunAmount: number;

  @ApiProperty()
  overrunPercent: number;

  @ApiProperty({ nullable: true })
  rootCauseActivity: string | null;
}
