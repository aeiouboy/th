import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ChargeCodesService } from './charge-codes.service';
import { DRIZZLE } from '../database/drizzle.provider';

describe('ChargeCodesService', () => {
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

  describe('create', () => {
    it('should create a program-level charge code with auto-generated PRG- prefix', async () => {
      // generateId: no existing codes -> 001
      db.select
        .mockReturnValueOnce(buildSelectChain([])) // generateId query
        .mockReturnValueOnce(buildLimitChain([{ id: 'PRG-001', path: 'PRG-001', level: 'program' }])) // findByIdRaw after insert (for path)
      ;

      const newCode = { id: 'PRG-001', name: 'Alpha Program', level: 'program', parentId: null, path: 'PRG-001' };
      db.insert.mockReturnValueOnce(buildInsertChain([newCode]));

      const result = await service.create({
        name: 'Alpha Program',
        level: 'program' as any,
        isBillable: true,
      });

      expect(result.id).toBe('PRG-001');
    });

    it('should auto-generate sequential IDs (PRG-002 after PRG-001)', async () => {
      db.select.mockReturnValueOnce(buildSelectChain([{ id: 'PRG-001' }]));

      const newCode = { id: 'PRG-002', name: 'Beta', level: 'program', parentId: null, path: 'PRG-002' };
      db.insert.mockReturnValueOnce(buildInsertChain([newCode]));

      const result = await service.create({
        name: 'Beta',
        level: 'program' as any,
        isBillable: true,
      });

      expect(result.id).toBe('PRG-002');
    });

    it('should create a project with PRJ- prefix under a program parent', async () => {
      const parent = { id: 'PRG-001', name: 'Program', level: 'program', path: 'PRG-001', parentId: null };

      db.select
        .mockReturnValueOnce(buildLimitChain([parent]))  // findByIdRaw for parent validation
        .mockReturnValueOnce(buildSelectChain([]))        // generateId for PRJ
        .mockReturnValueOnce(buildLimitChain([parent]));  // buildPath -> findByIdRaw

      const newCode = { id: 'PRJ-001', name: 'Project Alpha', level: 'project', parentId: 'PRG-001', path: 'PRG-001/PRJ-001' };
      db.insert.mockReturnValueOnce(buildInsertChain([newCode]));

      const result = await service.create({
        name: 'Project Alpha',
        level: 'project' as any,
        parentId: 'PRG-001',
        isBillable: true,
      });

      expect(result.id).toBe('PRJ-001');
      expect(result.path).toBe('PRG-001/PRJ-001');
    });

    it('should throw BadRequestException when program has a parentId', async () => {
      await expect(
        service.create({ name: 'X', level: 'program' as any, parentId: 'PRG-001' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when project has no parentId', async () => {
      await expect(
        service.create({ name: 'X', level: 'project' as any })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when project parent is not a program', async () => {
      // Parent is an 'activity' level, but project requires 'program' as parent
      const wrongParent = { id: 'ACT-001', name: 'Activity', level: 'activity', path: 'PRG-001/PRJ-001/ACT-001', parentId: 'PRJ-001' };

      // findByIdRaw for parent
      db.select.mockReturnValueOnce(buildLimitChain([wrongParent]));

      await expect(
        service.create({ name: 'Bad Project', level: 'project' as any, parentId: 'ACT-001' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should build materialized path from parent', async () => {
      const parent = { id: 'PRG-001', name: 'Program', level: 'program', path: 'PRG-001', parentId: null };

      db.select
        .mockReturnValueOnce(buildLimitChain([parent]))  // validate parent
        .mockReturnValueOnce(buildSelectChain([]))        // generateId
        .mockReturnValueOnce(buildLimitChain([parent]));  // buildPath

      const newCode = { id: 'PRJ-001', name: 'Project', level: 'project', parentId: 'PRG-001', path: 'PRG-001/PRJ-001' };
      db.insert.mockReturnValueOnce(buildInsertChain([newCode]));

      const result = await service.create({
        name: 'Project',
        level: 'project' as any,
        parentId: 'PRG-001',
      });

      expect(result.path).toContain('PRG-001');
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException when charge code does not exist', async () => {
      db.select.mockReturnValueOnce(buildLimitChain([]));
      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return charge code with assigned users', async () => {
      const code = { id: 'PRG-001', name: 'Program', level: 'program', ownerId: null, approverId: null };
      const users = [{ userId: 'u1', email: 'a@test.com', fullName: 'Alice' }];

      db.select
        .mockReturnValueOnce(buildLimitChain([code]))
        .mockReturnValueOnce(buildJoinSelectChain(users))
        .mockReturnValueOnce(buildLimitChain([{ actualSpent: '0', forecastAtCompletion: null }])); // budget

      const result = await service.findById('PRG-001');
      expect(result.id).toBe('PRG-001');
      expect(result.assignedUsers).toHaveLength(1);
    });
  });

  describe('findChildren', () => {
    it('should return direct children of a charge code', async () => {
      const children = [
        { id: 'PRJ-001', name: 'Project 1', parentId: 'PRG-001', level: 'project' },
        { id: 'PRJ-002', name: 'Project 2', parentId: 'PRG-001', level: 'project' },
      ];
      db.select.mockReturnValueOnce(buildSelectWhereLimitChain(children));

      const result = await service.findChildren('PRG-001');
      expect(result).toHaveLength(2);
    });

    it('should return empty array for leaf nodes', async () => {
      db.select.mockReturnValueOnce(buildSelectWhereLimitChain([]));
      const result = await service.findChildren('TSK-001');
      expect(result).toHaveLength(0);
    });
  });

  describe('updateAccess', () => {
    it('should throw NotFoundException when charge code does not exist', async () => {
      db.select.mockReturnValueOnce(buildLimitChain([]));
      await expect(
        service.updateAccess('nonexistent', { addUserIds: ['u1'] }, 'owner-1')
      ).rejects.toThrow(NotFoundException);
    });

    it('should add users to a charge code and cascade to descendants', async () => {
      const code = { id: 'PRG-001', name: 'Program', level: 'program', ownerId: 'owner-1', approverId: null };
      const codeWithUsers = { ...code, assignedUsers: [{ userId: 'u1', email: 'a@test.com', fullName: 'Alice' }] };
      // findDescendantIds loads ALL charge codes in one full-table query (new implementation)
      const allCodes = [
        { id: 'PRG-001', parentId: null },
        { id: 'PRJ-001', parentId: 'PRG-001' },
      ];

      db.select
        .mockReturnValueOnce(buildLimitChain([code]))   // findByIdRaw (auth check)
        .mockReturnValueOnce(buildFromChain(allCodes))  // findDescendantIds (full table)
        .mockReturnValueOnce(buildLimitChain([code]))   // findById -> findByIdRaw
        .mockReturnValueOnce(buildJoinSelectChain(codeWithUsers.assignedUsers)) // findById -> users
        .mockReturnValueOnce(buildLimitChain([{ actualSpent: '0', forecastAtCompletion: null }])) // findById -> budget
        .mockReturnValueOnce(buildLimitChain([{ fullName: 'Owner' }])); // findById -> ownerName

      const insertChain = { values: jest.fn().mockReturnThis(), onConflictDoNothing: jest.fn().mockResolvedValue([]) };
      db.insert.mockReturnValueOnce(insertChain);

      const result = await service.updateAccess('PRG-001', { addUserIds: ['u1'] }, 'owner-1');
      expect(result.assignedUsers).toHaveLength(1);
      // Verify insert was called with values for both PRG-001 and PRJ-001
      expect(insertChain.values).toHaveBeenCalledWith([
        { chargeCodeId: 'PRG-001', userId: 'u1' },
        { chargeCodeId: 'PRJ-001', userId: 'u1' },
      ]);
    });

    it('should remove users from a charge code and cascade to descendants', async () => {
      const code = { id: 'PRG-001', name: 'Program', level: 'program', ownerId: 'owner-1', approverId: null };

      db.select
        .mockReturnValueOnce(buildLimitChain([code]))   // findByIdRaw (auth check)
        .mockReturnValueOnce(buildFromChain([{ id: 'PRG-001', parentId: null }]))  // findDescendantIds (full table, no children)
        .mockReturnValueOnce(buildLimitChain([code]))   // findById -> findByIdRaw
        .mockReturnValueOnce(buildJoinSelectChain([])) // findById -> users (now empty)
        .mockReturnValueOnce(buildLimitChain([{ actualSpent: '0', forecastAtCompletion: null }])) // findById -> budget
        .mockReturnValueOnce(buildLimitChain([{ fullName: 'Owner' }])); // findById -> ownerName

      const deleteChain = { where: jest.fn().mockResolvedValue([]) };
      db.delete.mockReturnValueOnce(deleteChain);

      const result = await service.updateAccess('PRG-001', { removeUserIds: ['u1'] }, 'owner-1');
      expect(result.assignedUsers).toHaveLength(0);
    });

    it('UNIT-CC-AUTH-01: should throw ForbiddenException when caller is a non-owner charge_manager', async () => {
      const code = { id: 'PRG-001', name: 'Program', level: 'program', ownerId: 'owner-1', approverId: null };
      const callerProfile = { role: 'charge_manager' };

      db.select
        .mockReturnValueOnce(buildLimitChain([code]))          // findByIdRaw
        .mockReturnValueOnce(buildLimitChain([callerProfile])); // caller profile lookup

      await expect(
        service.updateAccess('PRG-001', { addUserIds: ['u1'] }, 'non-owner-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('UNIT-CC-AUTH-02: should succeed when caller is admin (regardless of ownership)', async () => {
      const code = { id: 'PRG-001', name: 'Program', level: 'program', ownerId: 'owner-1', approverId: null };
      const adminProfile = { role: 'admin' };
      const codeWithUsers = { ...code, assignedUsers: [{ userId: 'u1', email: 'a@test.com', fullName: 'Alice' }] };

      db.select
        .mockReturnValueOnce(buildLimitChain([code]))           // findByIdRaw
        .mockReturnValueOnce(buildLimitChain([adminProfile]))   // caller profile lookup (not owner)
        .mockReturnValueOnce(buildFromChain([{ id: 'PRG-001', parentId: null }]))  // findDescendantIds
        .mockReturnValueOnce(buildLimitChain([code]))           // findById -> findByIdRaw
        .mockReturnValueOnce(buildJoinSelectChain(codeWithUsers.assignedUsers)) // findById -> users
        .mockReturnValueOnce(buildLimitChain([{ actualSpent: '0', forecastAtCompletion: null }])) // findById -> budget
        .mockReturnValueOnce(buildLimitChain([{ fullName: 'Owner' }])); // findById -> ownerName

      const insertChain = { values: jest.fn().mockReturnThis(), onConflictDoNothing: jest.fn().mockResolvedValue([]) };
      db.insert.mockReturnValueOnce(insertChain);

      const result = await service.updateAccess('PRG-001', { addUserIds: ['u1'] }, 'admin-id');
      expect(result.assignedUsers).toHaveLength(1);
    });

    it('UNIT-CC-AUTH-03: should succeed when caller is the charge code owner', async () => {
      const code = { id: 'PRG-001', name: 'Program', level: 'program', ownerId: 'owner-1', approverId: null };
      const codeWithUsers = { ...code, assignedUsers: [{ userId: 'u1', email: 'a@test.com', fullName: 'Alice' }] };

      // owner-1 matches code.ownerId → profile lookup is skipped
      db.select
        .mockReturnValueOnce(buildLimitChain([code]))           // findByIdRaw
        .mockReturnValueOnce(buildFromChain([{ id: 'PRG-001', parentId: null }]))  // findDescendantIds
        .mockReturnValueOnce(buildLimitChain([code]))           // findById -> findByIdRaw
        .mockReturnValueOnce(buildJoinSelectChain(codeWithUsers.assignedUsers)) // findById -> users
        .mockReturnValueOnce(buildLimitChain([{ actualSpent: '0', forecastAtCompletion: null }])) // findById -> budget
        .mockReturnValueOnce(buildLimitChain([{ fullName: 'Owner' }])); // findById -> ownerName

      const insertChain = { values: jest.fn().mockReturnThis(), onConflictDoNothing: jest.fn().mockResolvedValue([]) };
      db.insert.mockReturnValueOnce(insertChain);

      const result = await service.updateAccess('PRG-001', { addUserIds: ['u1'] }, 'owner-1');
      expect(result.assignedUsers).toHaveLength(1);
    });
  });

  describe('findAll', () => {
    it('should add ilike condition when search filter is provided', async () => {
      const chain = buildFindAllChain([]);
      db.select.mockReturnValueOnce(chain);

      await service.findAll({ search: 'Alpha' });

      expect(chain.where).toHaveBeenCalled();
    });

    it('should escape special characters in search filter (%, _, \\)', async () => {
      const chain = buildFindAllChain([]);
      db.select.mockReturnValueOnce(chain);

      await service.findAll({ search: '100%_test\\' });

      // The where clause should have been called (with escaped chars)
      expect(chain.where).toHaveBeenCalled();
    });

    it('should add active status condition when status=active', async () => {
      const chain = buildFindAllChain([]);
      db.select.mockReturnValueOnce(chain);

      await service.findAll({ status: 'active' });

      expect(chain.where).toHaveBeenCalled();
    });

    it('should add expired status condition when status=expired', async () => {
      const chain = buildFindAllChain([]);
      db.select.mockReturnValueOnce(chain);

      await service.findAll({ status: 'expired' });

      expect(chain.where).toHaveBeenCalled();
    });

    it('should not add where clause when no filters are provided', async () => {
      const chain = buildFindAllChain([]);
      db.select.mockReturnValueOnce(chain);

      await service.findAll({});

      // where should NOT have been called when no conditions exist
      expect(chain.where).not.toHaveBeenCalled();
    });

    it('should combine search and status filters together', async () => {
      const chain = buildFindAllChain([]);
      db.select.mockReturnValueOnce(chain);

      await service.findAll({ search: 'test', status: 'active' });

      // where should be called once with combined conditions
      expect(chain.where).toHaveBeenCalledTimes(1);
    });
  });

  describe('getBudgetDetail - aggregateFromTree logic', () => {
    it('should aggregate budget and actual from children when parent budget is 0', async () => {
      const parentCode = { id: 'PRG-001', name: 'Program', level: 'program', parentId: null, path: 'PRG-001', budgetAmount: '0', ownerId: null, approverId: null };
      const childCode = { id: 'PRJ-001', name: 'Project', level: 'project', parentId: 'PRG-001', path: 'PRG-001/PRJ-001', budgetAmount: '50000', ownerId: null, approverId: null };

      const parentBudget = { chargeCodeId: 'PRG-001', budgetAmount: '0', actualSpent: '0', forecastAtCompletion: null };
      const childBudget = { chargeCodeId: 'PRJ-001', budgetAmount: '50000', actualSpent: '20000', forecastAtCompletion: null };

      db.select
        .mockReturnValueOnce(buildLimitChain([parentCode]))  // findByIdRaw
        .mockReturnValueOnce(buildFromChain([parentCode, childCode]))  // allCodes
        .mockReturnValueOnce(buildFromChain([parentBudget, childBudget]))  // allBudgets
        .mockReturnValueOnce(buildGroupByChain([]))  // entries (no timesheet entries)
        .mockReturnValueOnce(buildFromChain([]));  // allProfiles

      const result = await service.getBudgetDetail('PRG-001');

      // Parent budget is 0, so it should aggregate from children
      expect(result.budget).toBe(50000);
      expect(result.actual).toBe(20000);
      expect(result.variance).toBe(30000);
    });

    it('should use own budget when parent budget is > 0', async () => {
      const parentCode = { id: 'PRG-001', name: 'Program', level: 'program', parentId: null, path: 'PRG-001', budgetAmount: '100000', ownerId: null, approverId: null };
      const childCode = { id: 'PRJ-001', name: 'Project', level: 'project', parentId: 'PRG-001', path: 'PRG-001/PRJ-001', budgetAmount: '50000', ownerId: null, approverId: null };

      const parentBudget = { chargeCodeId: 'PRG-001', budgetAmount: '100000', actualSpent: '30000', forecastAtCompletion: null };
      const childBudget = { chargeCodeId: 'PRJ-001', budgetAmount: '50000', actualSpent: '20000', forecastAtCompletion: null };

      db.select
        .mockReturnValueOnce(buildLimitChain([parentCode]))  // findByIdRaw
        .mockReturnValueOnce(buildFromChain([parentCode, childCode]))  // allCodes
        .mockReturnValueOnce(buildFromChain([parentBudget, childBudget]))  // allBudgets
        .mockReturnValueOnce(buildGroupByChain([]))  // entries
        .mockReturnValueOnce(buildFromChain([]));  // allProfiles

      const result = await service.getBudgetDetail('PRG-001');

      // Parent has its own budget > 0, should use it
      expect(result.budget).toBe(100000);
    });
  });
});

// Helpers
function buildSelectChain(resolveValue: any[]) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(resolveValue),
    limit: jest.fn().mockResolvedValue(resolveValue),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockResolvedValue(resolveValue),
  };
  return chain;
}

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
  return chain;
}

function buildSelectWhereChain(resolveValue: any[]) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(resolveValue),
    innerJoin: jest.fn().mockReturnThis(),
  };
  return chain;
}

function buildSelectWhereLimitChain(resolveValue: any[]) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(resolveValue),
  };
  return chain;
}

function buildJoinSelectChain(resolveValue: any[]) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(resolveValue),
    innerJoin: jest.fn().mockReturnThis(),
  };
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

// For queries with .from().innerJoin().groupBy() — e.g., getBudgetDetail entries query
function buildGroupByChain(resolveValue: any[]) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockResolvedValue(resolveValue),
  };
  chain.innerJoin.mockReturnValue(chain);
  return chain;
}

// For findAll's $dynamic() query chain — where/limit/offset are optional
function buildFindAllChain(resolveValue: any[]) {
  const chain: any = {
    $dynamic: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    then: (resolve: (value: any[]) => void) => resolve(resolveValue),
  };
  return chain;
}

// For queries that resolve after .from() with no .where() — uses thenable pattern
function buildFromChain(resolveValue: any[]) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(resolveValue),
    then: (resolve: (value: any[]) => void) => resolve(resolveValue),
  };
  chain.where.mockReturnValue(chain);
  return chain;
}
