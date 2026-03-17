import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { TimesheetsService } from './timesheets.service';
import { DRIZZLE } from '../database/drizzle.provider';

const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

// Helper to build a chainable mock
function chainMock(returnValue: any) {
  const chain: any = {};
  const methods = ['from', 'where', 'limit', 'returning', 'leftJoin', 'innerJoin', 'values', 'set'];
  methods.forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  // Terminal call resolves to returnValue
  chain.limit = jest.fn().mockResolvedValue(returnValue);
  chain.returning = jest.fn().mockResolvedValue(returnValue);
  return chain;
}

describe('TimesheetsService', () => {
  let service: TimesheetsService;
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
        TimesheetsService,
        { provide: DRIZZLE, useValue: db },
      ],
    }).compile();

    service = module.get<TimesheetsService>(TimesheetsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWeekBounds (via create)', () => {
    it('should normalize a Wednesday to its Monday start', async () => {
      const sheet = {
        id: 'ts-1',
        userId: 'user-1',
        periodStart: '2026-03-09',
        periodEnd: '2026-03-15',
        status: 'draft',
      };

      // No existing -> insert new
      const selectChain = buildSelectChain([]);
      db.select.mockReturnValueOnce(selectChain);

      const insertChain = buildInsertChain([sheet]);
      db.insert.mockReturnValueOnce(insertChain);

      const result = await service.create('user-1', { period_start: '2026-03-11', period_end: '2026-03-17' });
      expect(result.periodStart).toBe('2026-03-09');
    });

    it('should return existing timesheet if one already exists for that week', async () => {
      const existing = { id: 'ts-existing', userId: 'user-1', periodStart: '2026-03-09', status: 'draft' };
      db.select.mockReturnValueOnce(buildSelectChain([existing]));

      const result = await service.create('user-1', { period_start: '2026-03-09', period_end: '2026-03-15' });
      expect(result).toEqual(existing);
      expect(db.insert).not.toHaveBeenCalled();
    });
  });

  describe('findByPeriod', () => {
    it('should return null when no timesheet exists for the period', async () => {
      db.select.mockReturnValueOnce(buildSelectChain([]));
      const result = await service.findByPeriod('user-1', '2026-03-09');
      expect(result).toBeNull();
    });

    it('should return the timesheet when it exists', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', periodStart: '2026-03-09' };
      db.select.mockReturnValueOnce(buildSelectChain([sheet]));
      const result = await service.findByPeriod('user-1', '2026-03-09');
      expect(result).toEqual(sheet);
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException when timesheet does not exist', async () => {
      db.select.mockReturnValueOnce(buildSelectChain([]));
      await expect(service.findById('user-1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return timesheet with entries when it exists', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', periodStart: '2026-03-09', status: 'draft' };
      const entries = [{ id: 'e-1', timesheetId: 'ts-1', chargeCodeId: 'CC-001', date: '2026-03-09', hours: '8' }];

      // First select for sheet, second for entries
      db.select
        .mockReturnValueOnce(buildSelectChain([sheet]))
        .mockReturnValueOnce(buildEntriesSelectChain(entries));

      const result = await service.findById('user-1', 'ts-1');
      expect(result.id).toBe('ts-1');
      expect(result.entries).toEqual(entries);
    });
  });

  describe('upsertEntries', () => {
    it('should throw NotFoundException when timesheet does not exist', async () => {
      db.select.mockReturnValueOnce(buildSelectChain([]));
      await expect(
        service.upsertEntries('user-1', 'bad-id', [])
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when timesheet status is submitted', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', status: 'submitted' };
      db.select.mockReturnValueOnce(buildSelectChain([sheet]));

      await expect(
        service.upsertEntries('user-1', 'ts-1', [])
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when timesheet status is locked', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', status: 'locked' };
      db.select.mockReturnValueOnce(buildSelectChain([sheet]));

      await expect(
        service.upsertEntries('user-1', 'ts-1', [])
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow editing when status is draft', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', status: 'draft' };
      db.select.mockReturnValueOnce(buildSelectChain([sheet]));

      const deleteChain = { from: jest.fn().mockReturnThis(), where: jest.fn().mockResolvedValue([]) };
      db.delete.mockReturnValueOnce(deleteChain);

      const updateChain = buildUpdateChain([sheet]);
      db.update.mockReturnValueOnce(updateChain);

      const result = await service.upsertEntries('user-1', 'ts-1', []);
      expect(result).toEqual([]);
    });

    it('should allow editing when status is rejected', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', status: 'rejected' };
      db.select.mockReturnValueOnce(buildSelectChain([sheet]));

      const deleteChain = { from: jest.fn().mockReturnThis(), where: jest.fn().mockResolvedValue([]) };
      db.delete.mockReturnValueOnce(deleteChain);

      const updateChain = buildUpdateChain([sheet]);
      db.update.mockReturnValueOnce(updateChain);

      const result = await service.upsertEntries('user-1', 'ts-1', []);
      expect(result).toEqual([]);
    });

    it('should validate that charge codes are assigned to the user', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', status: 'draft' };
      const entries = [{ charge_code_id: 'CC-NOT-MINE', date: '2026-03-09', hours: 8 }];

      db.select
        .mockReturnValueOnce(buildSelectChain([sheet]))
        .mockReturnValueOnce(buildWhereArrayChain([])); // no allowed codes

      await expect(
        service.upsertEntries('user-1', 'ts-1', entries)
      ).rejects.toThrow(BadRequestException);
    });

    it('should filter out entries with 0 hours', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', status: 'draft' };
      const entries = [
        { charge_code_id: 'CC-001', date: '2026-03-09', hours: 0 },
        { charge_code_id: 'CC-001', date: '2026-03-10', hours: 8 },
      ];
      const allowedCodes = [{ chargeCodeId: 'CC-001' }];

      db.select
        .mockReturnValueOnce(buildSelectChain([sheet]))
        .mockReturnValueOnce(buildWhereArrayChain(allowedCodes));

      const deleteChain = { from: jest.fn().mockReturnThis(), where: jest.fn().mockResolvedValue([]) };
      db.delete.mockReturnValueOnce(deleteChain);

      const inserted = [{ id: 'e-1', timesheetId: 'ts-1', chargeCodeId: 'CC-001', date: '2026-03-10', hours: '8' }];
      const insertChain = buildInsertChain(inserted);
      db.insert.mockReturnValueOnce(insertChain);

      const updateChain = buildUpdateChain([sheet]);
      db.update.mockReturnValueOnce(updateChain);

      const result = await service.upsertEntries('user-1', 'ts-1', entries);
      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2026-03-10');
    });
  });

  describe('submit', () => {
    it('should throw NotFoundException when timesheet does not exist', async () => {
      db.select.mockReturnValueOnce(buildSelectChain([]));
      await expect(service.submit('user-1', 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when status is already submitted', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', status: 'submitted' };
      db.select.mockReturnValueOnce(buildSelectChain([sheet]));

      await expect(service.submit('user-1', 'ts-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when status is locked', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', status: 'locked' };
      db.select.mockReturnValueOnce(buildSelectChain([sheet]));

      await expect(service.submit('user-1', 'ts-1')).rejects.toThrow(BadRequestException);
    });

    it('should transition draft timesheet to submitted', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', status: 'draft' };
      const updated = { ...sheet, status: 'submitted' };

      db.select.mockReturnValueOnce(buildSelectChain([sheet]));
      db.update.mockReturnValueOnce(buildUpdateChain([updated]));

      const result = await service.submit('user-1', 'ts-1');
      expect(result.status).toBe('submitted');
    });

    it('should allow resubmitting a rejected timesheet', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', status: 'rejected' };
      const updated = { ...sheet, status: 'submitted' };

      db.select.mockReturnValueOnce(buildSelectChain([sheet]));
      db.update.mockReturnValueOnce(buildUpdateChain([updated]));

      const result = await service.submit('user-1', 'ts-1');
      expect(result.status).toBe('submitted');
    });
  });
});

// Helpers to build chainable mock objects

// For queries where the terminal call is .where() resolving an array directly
function buildWhereArrayChain(resolveValue: any[]) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(resolveValue),
  };
  chain.innerJoin.mockReturnValue(chain);
  return chain;
}

function buildSelectChain(resolveValue: any[]) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(resolveValue),
  };
  // Make terminal calls work both as promise and chain
  chain.where.mockReturnValue({ ...chain });
  return chain;
}

function buildEntriesSelectChain(resolveValue: any[]) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(resolveValue),
    leftJoin: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockResolvedValue(resolveValue),
    limit: jest.fn().mockResolvedValue(resolveValue),
  };
  chain.leftJoin.mockReturnValue(chain);
  return chain;
}

function buildInsertChain(resolveValue: any[]) {
  const chain: any = {
    into: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue(resolveValue),
    onConflictDoNothing: jest.fn().mockResolvedValue(resolveValue),
  };
  return chain;
}

function buildUpdateChain(resolveValue: any[]) {
  const chain: any = {
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue(resolveValue),
  };
  chain.where.mockReturnValue(chain);
  return chain;
}
