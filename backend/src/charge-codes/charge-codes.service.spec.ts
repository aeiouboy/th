import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
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
      const code = { id: 'PRG-001', name: 'Program', level: 'program' };
      const users = [{ userId: 'u1', email: 'a@test.com', fullName: 'Alice' }];

      db.select
        .mockReturnValueOnce(buildLimitChain([code]))
        .mockReturnValueOnce(buildJoinSelectChain(users));

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
      db.select.mockReturnValueOnce(buildSelectWhereChain(children));

      const result = await service.findChildren('PRG-001');
      expect(result).toHaveLength(2);
    });

    it('should return empty array for leaf nodes', async () => {
      db.select.mockReturnValueOnce(buildSelectWhereChain([]));
      const result = await service.findChildren('TSK-001');
      expect(result).toHaveLength(0);
    });
  });

  describe('updateAccess', () => {
    it('should throw NotFoundException when charge code does not exist', async () => {
      db.select.mockReturnValueOnce(buildLimitChain([]));
      await expect(
        service.updateAccess('nonexistent', { addUserIds: ['u1'] })
      ).rejects.toThrow(NotFoundException);
    });

    it('should add users to a charge code', async () => {
      const code = { id: 'PRG-001', name: 'Program', level: 'program' };
      const codeWithUsers = { ...code, assignedUsers: [{ userId: 'u1', email: 'a@test.com', fullName: 'Alice' }] };

      db.select
        .mockReturnValueOnce(buildLimitChain([code]))  // findByIdRaw
        .mockReturnValueOnce(buildLimitChain([code]))  // findById -> findByIdRaw
        .mockReturnValueOnce(buildJoinSelectChain(codeWithUsers.assignedUsers)); // findById users

      const insertChain = { values: jest.fn().mockReturnThis(), onConflictDoNothing: jest.fn().mockResolvedValue([]) };
      db.insert.mockReturnValueOnce(insertChain);

      const result = await service.updateAccess('PRG-001', { addUserIds: ['u1'] });
      expect(result.assignedUsers).toHaveLength(1);
    });

    it('should remove users from a charge code', async () => {
      const code = { id: 'PRG-001', name: 'Program', level: 'program' };

      db.select
        .mockReturnValueOnce(buildLimitChain([code]))  // findByIdRaw
        .mockReturnValueOnce(buildLimitChain([code]))  // findById -> findByIdRaw
        .mockReturnValueOnce(buildJoinSelectChain([])); // findById users (now empty)

      const deleteChain = { from: jest.fn().mockReturnThis(), where: jest.fn().mockResolvedValue([]) };
      db.delete.mockReturnValueOnce(deleteChain);

      const result = await service.updateAccess('PRG-001', { removeUserIds: ['u1'] });
      expect(result.assignedUsers).toHaveLength(0);
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
