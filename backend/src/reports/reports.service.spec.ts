import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { BudgetsService } from '../budgets/budgets.service';
import { DRIZZLE } from '../database/drizzle.provider';

const mockBudgetsService = {
  getAlerts: jest.fn(),
};

describe('ReportsService', () => {
  let service: ReportsService;
  let db: any;

  beforeEach(async () => {
    db = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: DRIZZLE, useValue: db },
        { provide: BudgetsService, useValue: mockBudgetsService },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getProjectCostReport', () => {
    it('should return empty report when charge code does not exist', async () => {
      db.select.mockReturnValueOnce(buildLimitChain([]));
      const result = await service.getProjectCostReport('nonexistent');
      expect(result.chargeCodeId).toBe('nonexistent');
      expect(result.totalBudget).toBe(0);
      expect(result.breakdown).toHaveLength(0);
    });

    it('should return report with budget and actuals', async () => {
      const cc = { id: 'PRG-001', name: 'Program Alpha', budgetAmount: '10000', level: 'program' };
      const budget = { budgetAmount: '10000', actualSpent: '7000' };

      db.select
        .mockReturnValueOnce(buildLimitChain([cc]))    // find CC
        .mockReturnValueOnce(buildLimitChain([budget])) // budget
        .mockReturnValueOnce(buildWhereChain([]));       // children

      const result = await service.getProjectCostReport('PRG-001');
      expect(result.totalBudget).toBe(10000);
      expect(result.totalActualSpent).toBe(7000);
      expect(result.variance).toBe(3000);
      expect(result.percentUsed).toBe(70);
    });

    it('should include child breakdown in report', async () => {
      const cc = { id: 'PRG-001', name: 'Program Alpha', budgetAmount: '10000', level: 'program' };
      const budget = { budgetAmount: '10000', actualSpent: '7000' };
      const children = [{ id: 'PRJ-001', name: 'Project 1', parentId: 'PRG-001', level: 'project', budgetAmount: '5000' }];
      const childBudget = { budgetAmount: '5000', actualSpent: '3000' };

      db.select
        .mockReturnValueOnce(buildLimitChain([cc]))
        .mockReturnValueOnce(buildLimitChain([budget]))
        .mockReturnValueOnce(buildWhereChain(children))      // children
        .mockReturnValueOnce(buildLimitChain([childBudget]))  // child budget
        .mockReturnValueOnce(buildWhereChain([]));             // grandchildren

      const result = await service.getProjectCostReport('PRG-001');
      expect(result.breakdown).toHaveLength(1);
      expect(result.breakdown[0].chargeCodeId).toBe('PRJ-001');
    });
  });

  describe('getChargeabilityReport', () => {
    it('should return zero chargeability when no hours logged', async () => {
      db.select
        .mockReturnValueOnce(buildGroupByChain([])) // hours query
        .mockReturnValueOnce(buildAllChain([]));     // profiles

      const result = await service.getChargeabilityReport();
      expect(result.overallBillableHours).toBe(0);
      expect(result.overallTotalHours).toBe(0);
      expect(result.overallChargeabilityRate).toBe(0);
    });

    it('should calculate chargeability correctly (billable/total)', async () => {
      const hoursRows = [
        { userId: 'u1', isBillable: true, totalHours: '80' },
        { userId: 'u1', isBillable: false, totalHours: '20' },
      ];
      const profiles = [{ id: 'u1', fullName: 'Alice', email: 'alice@test.com', department: 'Eng' }];

      db.select
        .mockReturnValueOnce(buildGroupByChain(hoursRows))
        .mockReturnValueOnce(buildAllChain(profiles));

      const result = await service.getChargeabilityReport();
      expect(result.overallBillableHours).toBe(80);
      expect(result.overallTotalHours).toBe(100);
      expect(result.overallChargeabilityRate).toBe(80);
    });

    it('should have 80% target chargeability', async () => {
      db.select
        .mockReturnValueOnce(buildGroupByChain([]))
        .mockReturnValueOnce(buildAllChain([]));

      const result = await service.getChargeabilityReport();
      expect(result.target).toBe(80);
    });
  });

  describe('getActivityDistribution', () => {
    it('should return empty distribution when no entries exist', async () => {
      db.select.mockReturnValueOnce(buildGroupByChain([]));
      const result = await service.getActivityDistribution('2026-03');
      expect(result.totalHours).toBe(0);
      expect(result.distribution).toHaveLength(0);
    });

    it('should calculate percentage for each category', async () => {
      const rows = [
        { category: 'Development', totalHours: '60' },
        { category: 'Meetings', totalHours: '20' },
        { category: 'Admin', totalHours: '20' },
      ];
      db.select.mockReturnValueOnce(buildGroupByChain(rows));

      const result = await service.getActivityDistribution('2026-03');
      expect(result.totalHours).toBe(100);
      const dev = result.distribution.find((d) => d.category === 'Development');
      expect(dev?.percentage).toBe(60);
    });

    it('should sort distribution by hours descending', async () => {
      const rows = [
        { category: 'Admin', totalHours: '10' },
        { category: 'Development', totalHours: '80' },
        { category: 'Meetings', totalHours: '30' },
      ];
      db.select.mockReturnValueOnce(buildGroupByChain(rows));

      const result = await service.getActivityDistribution('2026-03');
      expect(result.distribution[0].category).toBe('Development');
    });
  });

  describe('getUtilizationReport', () => {
    it('should fallback to 22 working days when calendar has no data', async () => {
      db.select
        .mockReturnValueOnce(buildCountChain([{ count: 0 }]))  // calendar count
        .mockReturnValueOnce(buildGroupByChain([]))              // employee hours
        .mockReturnValueOnce(buildAllChain([]));                 // profiles

      const result = await service.getUtilizationReport('2026-03');
      expect(result.workingDays).toBe(22);
    });

    it('should calculate utilization rate per employee', async () => {
      const profiles = [{ id: 'u1', fullName: 'Alice', email: 'a@test.com', department: 'Eng' }];
      const empHours = [{ userId: 'u1', totalHours: '88' }];

      db.select
        .mockReturnValueOnce(buildCountChain([{ count: 22 }]))
        .mockReturnValueOnce(buildGroupByChain(empHours))
        .mockReturnValueOnce(buildAllChain(profiles));

      const result = await service.getUtilizationReport('2026-03');
      expect(result.employees).toHaveLength(1);
      expect(result.employees[0].utilizationRate).toBe(50); // 88 / 176 = 50%
    });
  });

  describe('getBudgetAlerts', () => {
    it('should return formatted budget alerts with overrunAmount calculated', async () => {
      const rawAlerts = [
        { chargeCodeId: 'CC-1', name: 'CC 1', budget: 1000, actual: 1100, forecast: null, severity: 'red', rootCauseActivity: null },
      ];
      mockBudgetsService.getAlerts.mockResolvedValueOnce(rawAlerts);

      const result = await service.getBudgetAlerts();
      expect(result).toHaveLength(1);
      expect(result[0].severity).toBe('red');
      expect(result[0].overrunAmount).toBe(100);
    });

    it('should pass through severity values from budgets service (red, orange, yellow)', async () => {
      const rawAlerts = [
        { chargeCodeId: 'CC-1', name: 'CC 1', budget: 1000, actual: 1100, forecast: null, severity: 'red', rootCauseActivity: null },
        { chargeCodeId: 'CC-2', name: 'CC 2', budget: 1000, actual: 950, forecast: null, severity: 'orange', rootCauseActivity: null },
      ];
      mockBudgetsService.getAlerts.mockResolvedValueOnce(rawAlerts);

      const result = await service.getBudgetAlerts();
      expect(result[0].severity).toBe('red');
      expect(result[1].severity).toBe('orange');
    });

    it('should calculate overrunPercent as percentage over budget', async () => {
      const rawAlerts = [
        { chargeCodeId: 'CC-1', name: 'CC 1', budget: 1000, actual: 1100, forecast: null, severity: 'red', rootCauseActivity: null },
      ];
      mockBudgetsService.getAlerts.mockResolvedValueOnce(rawAlerts);

      const result = await service.getBudgetAlerts();
      expect(result[0].overrunPercent).toBe(10);
    });

    it('should return zero overrunAmount when actual is less than budget', async () => {
      const rawAlerts = [
        { chargeCodeId: 'CC-1', name: 'CC 1', budget: 1000, actual: 850, forecast: null, severity: 'yellow', rootCauseActivity: null },
      ];
      mockBudgetsService.getAlerts.mockResolvedValueOnce(rawAlerts);

      const result = await service.getBudgetAlerts();
      expect(result[0].overrunAmount).toBe(0);
    });
  });
});

// Helpers
function buildLimitChain(resolveValue: any[]) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(resolveValue),
  };
  chain.where.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  return chain;
}

function buildWhereChain(resolveValue: any[]) {
  return {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(resolveValue),
    innerJoin: jest.fn().mockReturnThis(),
  };
}

function buildGroupByChain(resolveValue: any[]) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockResolvedValue(resolveValue),
  };
  chain.where.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  return chain;
}

function buildAllChain(resolveValue: any[]) {
  return {
    from: jest.fn().mockReturnThis(),
    // Direct resolution (select().from() -> promise)
    then: (resolve: any) => resolve(resolveValue),
    where: jest.fn().mockResolvedValue(resolveValue),
  };
}

function buildCountChain(resolveValue: any[]) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(resolveValue),
    innerJoin: jest.fn().mockReturnThis(),
  };
  chain.where.mockReturnValue({ ...chain, where: jest.fn().mockResolvedValue(resolveValue) });
  return chain;
}
