/**
 * Additional unit tests for CR-08, CR-09, CR-10, CR-11:
 * - getBudgetDetail — team/person breakdown (CR-08/09)
 * - cascadeAccess — permission checks (CR-11)
 * - requestAccess / reviewAccessRequest (CR-07)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ChargeCodesService } from './charge-codes.service';
import { DRIZZLE } from '../database/drizzle.provider';

describe('ChargeCodesService — CR-08/09/11 Features', () => {
  let service: ChargeCodesService;
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
        ChargeCodesService,
        { provide: DRIZZLE, useValue: db },
      ],
    }).compile();

    service = module.get<ChargeCodesService>(ChargeCodesService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── getBudgetDetail (CR-08/09) ──────────────────────────────────────────

  describe('getBudgetDetail', () => {
    it('should throw NotFoundException when charge code does not exist', async () => {
      db.select.mockReturnValueOnce(buildLimitChain([]));
      await expect(service.getBudgetDetail('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return budget structure with team and person breakdowns', async () => {
      const code = { id: 'PRG-001', name: 'Program Alpha', level: 'program', budgetAmount: '100000', parentId: null };
      const allCodes = [code];
      const allBudgets = [{ chargeCodeId: 'PRG-001', budgetAmount: '100000', actualSpent: '60000' }];
      const entries = [
        { chargeCodeId: 'PRG-001', userId: 'u1', totalHours: '80', totalCost: '40000' },
        { chargeCodeId: 'PRG-001', userId: 'u2', totalHours: '40', totalCost: '20000' },
      ];
      const profiles = [
        { id: 'u1', fullName: 'Alice', email: 'alice@test.com', department: 'Engineering' },
        { id: 'u2', fullName: 'Bob', email: 'bob@test.com', department: 'Engineering' },
      ];

      db.select
        .mockReturnValueOnce(buildLimitChain([code]))   // findByIdRaw
        .mockReturnValueOnce(buildAllChain(allCodes))   // select all charge codes
        .mockReturnValueOnce(buildAllChain(allBudgets)) // select all budgets
        .mockReturnValueOnce(buildGroupByChain(entries)) // entries with groupBy
        .mockReturnValueOnce(buildAllChain(profiles));   // all profiles

      const result = await service.getBudgetDetail('PRG-001');

      expect(result.budget).toBe(100000);
      expect(result.actual).toBe(60000);
      expect(result.variance).toBe(40000);
      expect(Array.isArray(result.teamBreakdown)).toBe(true);
      expect(Array.isArray(result.personBreakdown)).toBe(true);
      expect(result.personBreakdown).toHaveLength(2);
    });

    it('should calculate percentage correctly', async () => {
      const code = { id: 'PRG-001', name: 'Alpha', level: 'program', budgetAmount: '100000', parentId: null };
      const allBudgets = [{ chargeCodeId: 'PRG-001', budgetAmount: '100000', actualSpent: '75000' }];

      db.select
        .mockReturnValueOnce(buildLimitChain([code]))
        .mockReturnValueOnce(buildAllChain([code]))
        .mockReturnValueOnce(buildAllChain(allBudgets))
        .mockReturnValueOnce(buildGroupByChain([]))
        .mockReturnValueOnce(buildAllChain([]));

      const result = await service.getBudgetDetail('PRG-001');
      expect(result.percentage).toBe(75);
    });

    it('should group entries by department for team breakdown', async () => {
      const code = { id: 'PRG-001', name: 'Alpha', level: 'program', budgetAmount: '100000', parentId: null };
      const entries = [
        { chargeCodeId: 'PRG-001', userId: 'u1', totalHours: '80', totalCost: '40000' },
        { chargeCodeId: 'PRG-001', userId: 'u2', totalHours: '40', totalCost: '20000' },
      ];
      const profiles = [
        { id: 'u1', fullName: 'Alice', email: 'a@t.com', department: 'Engineering' },
        { id: 'u2', fullName: 'Bob', email: 'b@t.com', department: 'Marketing' },
      ];

      db.select
        .mockReturnValueOnce(buildLimitChain([code]))
        .mockReturnValueOnce(buildAllChain([code]))
        .mockReturnValueOnce(buildAllChain([]))
        .mockReturnValueOnce(buildGroupByChain(entries))
        .mockReturnValueOnce(buildAllChain(profiles));

      const result = await service.getBudgetDetail('PRG-001');

      expect(result.teamBreakdown).toHaveLength(2);
      const eng = result.teamBreakdown.find((t: any) => t.name === 'Engineering');
      expect(eng?.hours).toBe(80);
    });

    it('should sort team and person breakdowns by hours descending', async () => {
      const code = { id: 'PRG-001', name: 'Alpha', level: 'program', budgetAmount: '10000', parentId: null };
      const entries = [
        { chargeCodeId: 'PRG-001', userId: 'u1', totalHours: '10', totalCost: '5000' },
        { chargeCodeId: 'PRG-001', userId: 'u2', totalHours: '90', totalCost: '45000' },
      ];
      const profiles = [
        { id: 'u1', fullName: 'Low', email: 'l@t.com', department: 'Dept A' },
        { id: 'u2', fullName: 'High', email: 'h@t.com', department: 'Dept B' },
      ];

      db.select
        .mockReturnValueOnce(buildLimitChain([code]))
        .mockReturnValueOnce(buildAllChain([code]))
        .mockReturnValueOnce(buildAllChain([]))
        .mockReturnValueOnce(buildGroupByChain(entries))
        .mockReturnValueOnce(buildAllChain(profiles));

      const result = await service.getBudgetDetail('PRG-001');

      expect(result.personBreakdown[0].name).toBe('High');
    });

    it('should handle charge code with no budget record (shows zeros)', async () => {
      const code = { id: 'PRG-001', name: 'Alpha', level: 'program', budgetAmount: null, parentId: null };

      db.select
        .mockReturnValueOnce(buildLimitChain([code]))
        .mockReturnValueOnce(buildAllChain([code]))
        .mockReturnValueOnce(buildAllChain([]))   // no budget records
        .mockReturnValueOnce(buildGroupByChain([]))
        .mockReturnValueOnce(buildAllChain([]));

      const result = await service.getBudgetDetail('PRG-001');
      expect(result.budget).toBe(0);
      expect(result.actual).toBe(0);
      expect(result.percentage).toBe(0);
    });
  });

  // ─── cascadeAccess (CR-11) ───────────────────────────────────────────────

  describe('cascadeAccess', () => {
    it('should throw NotFoundException when charge code does not exist', async () => {
      db.select.mockReturnValueOnce(buildLimitChain([]));
      await expect(service.cascadeAccess('nonexistent', ['u1'], 'caller-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when caller is not owner/approver/admin', async () => {
      const code = { id: 'PRG-001', name: 'Alpha', ownerId: 'owner-1', approverId: null };
      const callerProfile = { role: 'employee' };

      db.select
        .mockReturnValueOnce(buildLimitChain([code]))
        .mockReturnValueOnce(buildLimitChain([callerProfile]));

      await expect(service.cascadeAccess('PRG-001', ['u1'], 'non-owner')).rejects.toThrow(ForbiddenException);
    });

    it('should succeed when caller is the owner', async () => {
      const code = { id: 'PRG-001', name: 'Alpha', ownerId: 'owner-1', approverId: null };
      // Descendants: one child
      const allCodes = [
        { id: 'PRG-001', parentId: null },
        { id: 'PRJ-001', parentId: 'PRG-001' },
      ];

      db.select
        .mockReturnValueOnce(buildLimitChain([code]))     // findByIdRaw
        .mockReturnValueOnce(buildAllChain(allCodes));     // findDescendantIds: all codes

      const insertChain = { values: jest.fn().mockReturnThis(), onConflictDoNothing: jest.fn().mockResolvedValue([]) };
      db.insert.mockReturnValueOnce(insertChain);

      const result = await service.cascadeAccess('PRG-001', ['u1'], 'owner-1');
      // PRG-001 + PRJ-001 = 2 codes, 1 user = 2 affected
      expect(result.affected).toBe(2);
    });

    it('should succeed when caller is admin (not owner)', async () => {
      const code = { id: 'PRG-001', name: 'Alpha', ownerId: 'owner-1', approverId: null };
      const adminProfile = { role: 'admin' };
      const allCodes = [{ id: 'PRG-001', parentId: null }];

      db.select
        .mockReturnValueOnce(buildLimitChain([code]))
        .mockReturnValueOnce(buildLimitChain([adminProfile]))  // admin profile check
        .mockReturnValueOnce(buildAllChain(allCodes));

      const insertChain = { values: jest.fn().mockReturnThis(), onConflictDoNothing: jest.fn().mockResolvedValue([]) };
      db.insert.mockReturnValueOnce(insertChain);

      const result = await service.cascadeAccess('PRG-001', ['u1'], 'admin-id');
      expect(result.affected).toBe(1);
    });

    it('should include all descendants in affected count', async () => {
      const code = { id: 'PRG-001', name: 'Alpha', ownerId: 'owner-1', approverId: null };
      const allCodes = [
        { id: 'PRG-001', parentId: null },
        { id: 'PRJ-001', parentId: 'PRG-001' },
        { id: 'ACT-001', parentId: 'PRJ-001' },
      ];

      db.select
        .mockReturnValueOnce(buildLimitChain([code]))
        .mockReturnValueOnce(buildAllChain(allCodes));

      const insertChain = { values: jest.fn().mockReturnThis(), onConflictDoNothing: jest.fn().mockResolvedValue([]) };
      db.insert.mockReturnValueOnce(insertChain);

      const result = await service.cascadeAccess('PRG-001', ['u1', 'u2'], 'owner-1');
      // 3 charge codes x 2 users = 6 affected
      expect(result.affected).toBe(6);
    });
  });

  // ─── requestAccess (CR-07) ───────────────────────────────────────────────

  describe('requestAccess', () => {
    it('should throw NotFoundException when charge code does not exist', async () => {
      db.select.mockReturnValueOnce(buildLimitChain([]));
      await expect(service.requestAccess('nonexistent', 'user-1', 'reason')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user already has access', async () => {
      const code = { id: 'PRG-001', name: 'Alpha' };
      const existingAccess = [{ chargeCodeId: 'PRG-001', userId: 'user-1' }];

      db.select
        .mockReturnValueOnce(buildLimitChain([code]))
        .mockReturnValueOnce(buildLimitChain(existingAccess));

      await expect(service.requestAccess('PRG-001', 'user-1', 'reason')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when pending request already exists', async () => {
      const code = { id: 'PRG-001', name: 'Alpha' };
      const pendingRequest = [{ id: 'req-1', status: 'pending' }];

      db.select
        .mockReturnValueOnce(buildLimitChain([code]))
        .mockReturnValueOnce(buildLimitChain([]))         // no existing access
        .mockReturnValueOnce(buildLimitChain(pendingRequest)); // pending request exists

      await expect(service.requestAccess('PRG-001', 'user-1', 'reason')).rejects.toThrow(BadRequestException);
    });

    it('should create and return new request when validation passes', async () => {
      const code = { id: 'PRG-001', name: 'Alpha' };
      const newRequest = { id: 'req-1', requesterId: 'user-1', chargeCodeId: 'PRG-001', status: 'pending', reason: 'Need for project' };

      db.select
        .mockReturnValueOnce(buildLimitChain([code]))
        .mockReturnValueOnce(buildLimitChain([]))   // no existing access
        .mockReturnValueOnce(buildLimitChain([]));  // no pending request

      db.insert.mockReturnValueOnce(buildInsertChain([newRequest]));

      const result = await service.requestAccess('PRG-001', 'user-1', 'Need for project');
      expect(result.id).toBe('req-1');
      expect(result.status).toBe('pending');
    });
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildLimitChain(resolveValue: any[]) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(resolveValue),
    orderBy: jest.fn().mockResolvedValue(resolveValue),
  };
  chain.where.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  return chain;
}

function buildAllChain(resolveValue: any[]) {
  return {
    from: jest.fn().mockReturnThis(),
    then: (resolve: any) => resolve(resolveValue),
    where: jest.fn().mockResolvedValue(resolveValue),
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

function buildInsertChain(resolveValue: any[]) {
  const chain: any = {
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue(resolveValue),
    onConflictDoNothing: jest.fn().mockResolvedValue(resolveValue),
  };
  return chain;
}
