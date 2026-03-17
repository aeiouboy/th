import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { DRIZZLE } from '../database/drizzle.provider';

describe('BudgetsService', () => {
  let service: BudgetsService;
  let db: any;

  beforeEach(async () => {
    db = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetsService,
        { provide: DRIZZLE, useValue: db },
      ],
    }).compile();

    service = module.get<BudgetsService>(BudgetsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getBudgetForChargeCode', () => {
    it('should throw NotFoundException when charge code does not exist', async () => {
      db.select.mockReturnValueOnce(buildLimitChain([]));
      await expect(service.getBudgetForChargeCode('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return budget with percentage when budget record exists', async () => {
      const cc = { id: 'PRG-001', name: 'Program', budgetAmount: '10000' };
      const budget = { chargeCodeId: 'PRG-001', budgetAmount: '10000', actualSpent: '8000' };

      db.select
        .mockReturnValueOnce(buildLimitChain([cc]))
        .mockReturnValueOnce(buildLimitChain([budget]));

      const result = await service.getBudgetForChargeCode('PRG-001');
      expect(result.budgetAmount).toBe(10000);
      expect(result.actualSpent).toBe(8000);
      expect(result.percentage).toBe(80);
    });

    it('should return 0 percentage when budget is 0', async () => {
      const cc = { id: 'PRG-001', name: 'Program', budgetAmount: '0' };
      const budget = { chargeCodeId: 'PRG-001', budgetAmount: '0', actualSpent: '0' };

      db.select
        .mockReturnValueOnce(buildLimitChain([cc]))
        .mockReturnValueOnce(buildLimitChain([budget]));

      const result = await service.getBudgetForChargeCode('PRG-001');
      expect(result.percentage).toBe(0);
    });
  });

  describe('getStatus (via getBudgetForChargeCode)', () => {
    it('should return under_budget status when usage is below 80%', async () => {
      const cc = { id: 'CC-1', name: 'CC', budgetAmount: null };
      const budget = { chargeCodeId: 'CC-1', budgetAmount: '1000', actualSpent: '500' };

      db.select
        .mockReturnValueOnce(buildLimitChain([cc]))
        .mockReturnValueOnce(buildLimitChain([budget]));

      const result = await service.getBudgetForChargeCode('CC-1');
      expect(result.status).toBe('under_budget');
    });

    it('should return warning status when usage is between 80-90%', async () => {
      const cc = { id: 'CC-1', name: 'CC', budgetAmount: null };
      const budget = { chargeCodeId: 'CC-1', budgetAmount: '1000', actualSpent: '850' };

      db.select
        .mockReturnValueOnce(buildLimitChain([cc]))
        .mockReturnValueOnce(buildLimitChain([budget]));

      const result = await service.getBudgetForChargeCode('CC-1');
      expect(result.status).toBe('warning');
    });

    it('should return critical status when usage is between 90-100%', async () => {
      const cc = { id: 'CC-1', name: 'CC', budgetAmount: null };
      const budget = { chargeCodeId: 'CC-1', budgetAmount: '1000', actualSpent: '950' };

      db.select
        .mockReturnValueOnce(buildLimitChain([cc]))
        .mockReturnValueOnce(buildLimitChain([budget]));

      const result = await service.getBudgetForChargeCode('CC-1');
      expect(result.status).toBe('critical');
    });

    it('should return overrun status when usage exceeds 100%', async () => {
      const cc = { id: 'CC-1', name: 'CC', budgetAmount: null };
      const budget = { chargeCodeId: 'CC-1', budgetAmount: '1000', actualSpent: '1100' };

      db.select
        .mockReturnValueOnce(buildLimitChain([cc]))
        .mockReturnValueOnce(buildLimitChain([budget]));

      const result = await service.getBudgetForChargeCode('CC-1');
      expect(result.status).toBe('overrun');
    });
  });

  describe('getForecast', () => {
    it('should throw NotFoundException when charge code does not exist', async () => {
      db.select.mockReturnValueOnce(buildLimitChain([]));
      await expect(service.getForecast('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return null forecast when charge code has no dates', async () => {
      const cc = { id: 'CC-1', name: 'CC', budgetAmount: '1000', validFrom: null, validTo: null };
      const budget = { budgetAmount: '1000', actualSpent: '500' };

      db.select
        .mockReturnValueOnce(buildLimitChain([cc]))
        .mockReturnValueOnce(buildLimitChain([budget]));

      const result = await service.getForecast('CC-1');
      expect(result.forecastAtCompletion).toBeNull();
      expect(result.burnRate).toBeNull();
    });

    it('should calculate forecast at completion when dates are present', async () => {
      const cc = {
        id: 'CC-1',
        name: 'CC',
        budgetAmount: '1000',
        validFrom: '2026-01-01',
        validTo: '2026-12-31',
      };
      const budget = { budgetAmount: '1000', actualSpent: '300' };

      db.select
        .mockReturnValueOnce(buildLimitChain([cc]))
        .mockReturnValueOnce(buildLimitChain([budget]));

      const result = await service.getForecast('CC-1');
      expect(result.forecastAtCompletion).toBeGreaterThan(0);
      expect(result.burnRate).toBeGreaterThan(0);
    });
  });

  describe('getAlerts', () => {
    it('should return empty array when no charge codes are over threshold', async () => {
      const rows = [{ chargeCodeId: 'CC-1', name: 'CC', budgetAmount: '1000', actualSpent: '500', forecastAtCompletion: null }];
      db.select.mockReturnValueOnce(buildJoinChain(rows));

      const result = await service.getAlerts();
      expect(result).toHaveLength(0);
    });

    it('should return yellow alert at 81% usage', async () => {
      const rows = [{ chargeCodeId: 'CC-1', name: 'CC', budgetAmount: '1000', actualSpent: '810', forecastAtCompletion: null }];
      db.select.mockReturnValueOnce(buildJoinChain(rows));

      // findRootCauseActivity
      db.select.mockReturnValueOnce(buildSelectWhereChain([])); // no children

      const result = await service.getAlerts();
      expect(result).toHaveLength(1);
      expect(result[0].severity).toBe('yellow');
    });

    it('should return orange alert at 91% usage', async () => {
      const rows = [{ chargeCodeId: 'CC-1', name: 'CC', budgetAmount: '1000', actualSpent: '910', forecastAtCompletion: null }];
      db.select.mockReturnValueOnce(buildJoinChain(rows));
      db.select.mockReturnValueOnce(buildSelectWhereChain([]));

      const result = await service.getAlerts();
      expect(result[0].severity).toBe('orange');
    });

    it('should return red alert at 101% usage', async () => {
      const rows = [{ chargeCodeId: 'CC-1', name: 'CC', budgetAmount: '1000', actualSpent: '1010', forecastAtCompletion: null }];
      db.select.mockReturnValueOnce(buildJoinChain(rows));
      db.select.mockReturnValueOnce(buildSelectWhereChain([]));

      const result = await service.getAlerts();
      expect(result[0].severity).toBe('red');
    });

    it('should sort alerts: red first, then orange, then yellow', async () => {
      const rows = [
        { chargeCodeId: 'CC-1', name: 'CC1', budgetAmount: '1000', actualSpent: '850', forecastAtCompletion: null },
        { chargeCodeId: 'CC-2', name: 'CC2', budgetAmount: '1000', actualSpent: '1010', forecastAtCompletion: null },
        { chargeCodeId: 'CC-3', name: 'CC3', budgetAmount: '1000', actualSpent: '920', forecastAtCompletion: null },
      ];
      db.select.mockReturnValueOnce(buildJoinChain(rows));

      // findRootCauseActivity for each
      db.select.mockReturnValueOnce(buildSelectWhereChain([]));
      db.select.mockReturnValueOnce(buildSelectWhereChain([]));
      db.select.mockReturnValueOnce(buildSelectWhereChain([]));

      const result = await service.getAlerts();
      expect(result[0].severity).toBe('red');
      expect(result[1].severity).toBe('orange');
      expect(result[2].severity).toBe('yellow');
    });
  });

  describe('getSummary', () => {
    it('should return zero summary when no budget records exist', async () => {
      db.select.mockReturnValueOnce(buildJoinChain([]));
      const result = await service.getSummary();
      expect(result.totalBudget).toBe(0);
      expect(result.totalActualSpent).toBe(0);
      expect(result.chargeCodesOverBudget).toBe(0);
    });

    it('should correctly count over-budget charge codes', async () => {
      const rows = [
        { budgetAmount: '1000', actualSpent: '1100', forecastAtCompletion: null }, // over
        { budgetAmount: '1000', actualSpent: '500', forecastAtCompletion: null },  // under
      ];
      db.select.mockReturnValueOnce(buildJoinChain(rows));

      const result = await service.getSummary();
      expect(result.chargeCodesOverBudget).toBe(1);
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

function buildJoinChain(resolveValue: any[]) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(resolveValue),
    innerJoin: jest.fn().mockReturnThis(),
  };
  chain.innerJoin.mockReturnValue({ ...chain, where: jest.fn().mockResolvedValue(resolveValue) });
  // Make it resolve when called without where
  chain.from.mockReturnValue({
    ...chain,
    innerJoin: jest.fn().mockResolvedValue(resolveValue),
  });
  // Override to resolve directly on innerJoin for simple joins
  const innerJoinResult = {
    where: jest.fn().mockResolvedValue(resolveValue),
    // allow direct await
    then: (resolve: any) => resolve(resolveValue),
  };
  chain.innerJoin.mockReturnValue(innerJoinResult);
  return chain;
}

function buildSelectWhereChain(resolveValue: any[]) {
  return {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(resolveValue),
    innerJoin: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockResolvedValue(resolveValue),
  };
}
