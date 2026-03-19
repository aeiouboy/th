import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { TimesheetsService } from './timesheets.service';
import { CalendarService } from '../calendar/calendar.service';
import { TeamsWebhookService } from '../integrations/teams-webhook.service';
import { DRIZZLE } from '../database/drizzle.provider';

const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockCalendarService = {
  getWorkingDays: jest.fn(),
  getCalendarByYear: jest.fn(),
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
        { provide: CalendarService, useValue: mockCalendarService },
        { provide: TeamsWebhookService, useValue: { sendCard: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get<TimesheetsService>(TimesheetsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAvailablePeriods', () => {
    it('should return an empty array when user has no timesheets', async () => {
      db.selectDistinct = jest.fn().mockReturnValue(buildSelectDistinctChain([]));
      const result = await service.getAvailablePeriods('user-1');
      expect(result).toEqual([]);
    });

    it('should return periodStart values in descending order', async () => {
      const rows = [
        { periodStart: '2026-03-09' },
        { periodStart: '2026-02-23' },
        { periodStart: '2026-02-16' },
      ];
      db.selectDistinct = jest.fn().mockReturnValue(buildSelectDistinctChain(rows));
      const result = await service.getAvailablePeriods('user-1');
      expect(result).toEqual(['2026-03-09', '2026-02-23', '2026-02-16']);
    });

    it('should return a single period when user has one timesheet', async () => {
      const rows = [{ periodStart: '2026-03-09' }];
      db.selectDistinct = jest.fn().mockReturnValue(buildSelectDistinctChain(rows));
      const result = await service.getAvailablePeriods('user-1');
      expect(result).toHaveLength(1);
      expect(result[0]).toBe('2026-03-09');
    });
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

    it('should transition draft timesheet to submitted when min hours met', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', status: 'draft', periodStart: '2026-03-09', periodEnd: '2026-03-15' };
      const updated = { ...sheet, status: 'submitted' };

      // Mock validateMinimumHours to pass (spy and resolve)
      jest.spyOn(service, 'validateMinimumHours').mockResolvedValueOnce(undefined);

      db.select.mockReturnValueOnce(buildSelectChain([sheet]));
      db.update.mockReturnValueOnce(buildUpdateChain([updated]));

      const result = await service.submit('user-1', 'ts-1');
      expect(result.status).toBe('submitted');
    });

    it('should allow resubmitting a rejected timesheet', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', status: 'rejected', periodStart: '2026-03-09', periodEnd: '2026-03-15' };
      const updated = { ...sheet, status: 'submitted' };

      jest.spyOn(service, 'validateMinimumHours').mockResolvedValueOnce(undefined);

      db.select.mockReturnValueOnce(buildSelectChain([sheet]));
      db.update.mockReturnValueOnce(buildUpdateChain([updated]));

      const result = await service.submit('user-1', 'ts-1');
      expect(result.status).toBe('submitted');
    });

    it('should throw BadRequestException when weekday has less than 8 hours', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', status: 'draft', periodStart: '2026-03-09', periodEnd: '2026-03-15' };

      jest.spyOn(service, 'validateMinimumHours').mockRejectedValueOnce(
        new BadRequestException({
          message: 'Minimum 8 hours required on weekdays',
          details: [{ date: '2026-03-09', logged: 4, required: 8 }],
        }),
      );

      db.select.mockReturnValueOnce(buildSelectChain([sheet]));

      await expect(service.submit('user-1', 'ts-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateMinimumHours', () => {
    // Week of 2026-03-09 (Mon) to 2026-03-15 (Sun)
    // Weekdays: Mon 09, Tue 10, Wed 11, Thu 12, Fri 13
    // Weekend: Sat 14, Sun 15

    it('should pass when all weekdays have 8+ hours', async () => {
      // Entries: 8 hours each weekday
      const entries = [
        { date: '2026-03-09', hours: '8' },
        { date: '2026-03-10', hours: '8' },
        { date: '2026-03-11', hours: '8' },
        { date: '2026-03-12', hours: '8' },
        { date: '2026-03-13', hours: '8' },
      ];

      // First select call: entries for this timesheet
      db.select.mockReturnValueOnce(buildEntriesSelectChain(entries));
      // Second select call: non-working days from calendar (none - pure weekdays)
      db.select.mockReturnValueOnce(buildEntriesSelectChain([]));
      // Third select call: approved vacations (none)
      db.select.mockReturnValueOnce(buildEntriesSelectChain([]));

      await expect(
        service.validateMinimumHours('ts-1', '2026-03-09', '2026-03-15', 'user-1'),
      ).resolves.toBeUndefined();
    });

    it('should throw when a weekday has less than 8 hours', async () => {
      const entries = [
        { date: '2026-03-09', hours: '8' },
        { date: '2026-03-10', hours: '4' }, // Short day!
        { date: '2026-03-11', hours: '8' },
        { date: '2026-03-12', hours: '8' },
        { date: '2026-03-13', hours: '8' },
      ];

      db.select.mockReturnValueOnce(buildEntriesSelectChain(entries));
      db.select.mockReturnValueOnce(buildEntriesSelectChain([]));
      db.select.mockReturnValueOnce(buildEntriesSelectChain([]));

      await expect(
        service.validateMinimumHours('ts-1', '2026-03-09', '2026-03-15', 'user-1'),
      ).rejects.toThrow(BadRequestException);

      try {
        db.select.mockReturnValueOnce(buildEntriesSelectChain(entries));
        db.select.mockReturnValueOnce(buildEntriesSelectChain([]));
        db.select.mockReturnValueOnce(buildEntriesSelectChain([]));
        await service.validateMinimumHours('ts-1', '2026-03-09', '2026-03-15', 'user-1');
      } catch (e: any) {
        const response = e.getResponse();
        expect(response.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ date: '2026-03-10', logged: 4, required: 8 }),
          ]),
        );
      }
    });

    it('should exclude holidays from validation', async () => {
      // Only log hours on 4 days (Wed 11 is holiday)
      const entries = [
        { date: '2026-03-09', hours: '8' },
        { date: '2026-03-10', hours: '8' },
        // No entry for 2026-03-11 (holiday)
        { date: '2026-03-12', hours: '8' },
        { date: '2026-03-13', hours: '8' },
      ];

      db.select.mockReturnValueOnce(buildEntriesSelectChain(entries));
      // Calendar returns Wed as a holiday
      db.select.mockReturnValueOnce(buildEntriesSelectChain([
        { date: '2026-03-11' },
        { date: '2026-03-14' }, // Saturday
        { date: '2026-03-15' }, // Sunday
      ]));
      // No vacations
      db.select.mockReturnValueOnce(buildEntriesSelectChain([]));

      await expect(
        service.validateMinimumHours('ts-1', '2026-03-09', '2026-03-15', 'user-1'),
      ).resolves.toBeUndefined();
    });

    it('should exclude weekends from validation even without calendar entries', async () => {
      // Only log hours on weekdays
      const entries = [
        { date: '2026-03-09', hours: '8' },
        { date: '2026-03-10', hours: '8' },
        { date: '2026-03-11', hours: '8' },
        { date: '2026-03-12', hours: '8' },
        { date: '2026-03-13', hours: '8' },
        // No entries for Sat/Sun - should still pass
      ];

      db.select.mockReturnValueOnce(buildEntriesSelectChain(entries));
      db.select.mockReturnValueOnce(buildEntriesSelectChain([])); // No calendar entries
      db.select.mockReturnValueOnce(buildEntriesSelectChain([])); // No vacations

      await expect(
        service.validateMinimumHours('ts-1', '2026-03-09', '2026-03-15', 'user-1'),
      ).resolves.toBeUndefined();
    });

    it('should pass when exactly 8 hours logged on weekday', async () => {
      const entries = [
        { date: '2026-03-09', hours: '4' },
        { date: '2026-03-09', hours: '4' }, // Two entries summing to exactly 8
        { date: '2026-03-10', hours: '8' },
        { date: '2026-03-11', hours: '8' },
        { date: '2026-03-12', hours: '8' },
        { date: '2026-03-13', hours: '8' },
      ];

      db.select.mockReturnValueOnce(buildEntriesSelectChain(entries));
      db.select.mockReturnValueOnce(buildEntriesSelectChain([]));
      db.select.mockReturnValueOnce(buildEntriesSelectChain([]));

      await expect(
        service.validateMinimumHours('ts-1', '2026-03-09', '2026-03-15', 'user-1'),
      ).resolves.toBeUndefined();
    });

    it('should report all short days not just the first one', async () => {
      const entries = [
        { date: '2026-03-09', hours: '4' },
        { date: '2026-03-10', hours: '6' },
        { date: '2026-03-11', hours: '8' },
        { date: '2026-03-12', hours: '3' },
        { date: '2026-03-13', hours: '8' },
      ];

      db.select.mockReturnValueOnce(buildEntriesSelectChain(entries));
      db.select.mockReturnValueOnce(buildEntriesSelectChain([]));
      db.select.mockReturnValueOnce(buildEntriesSelectChain([]));

      try {
        await service.validateMinimumHours('ts-1', '2026-03-09', '2026-03-15', 'user-1');
        fail('Should have thrown');
      } catch (e: any) {
        const response = e.getResponse();
        expect(response.details).toHaveLength(3); // Mon, Tue, Thu
        expect(response.details.map((d: any) => d.date)).toEqual([
          '2026-03-09', '2026-03-10', '2026-03-12',
        ]);
      }
    });

    it('should pass when no entries at all (days without entries are allowed)', async () => {
      // No entries at all — the service only validates days that HAVE entries
      db.select.mockReturnValueOnce(buildEntriesSelectChain([]));
      db.select.mockReturnValueOnce(buildEntriesSelectChain([]));
      db.select.mockReturnValueOnce(buildEntriesSelectChain([]));

      await expect(
        service.validateMinimumHours('ts-1', '2026-03-09', '2026-03-15', 'user-1'),
      ).resolves.toBeUndefined();
    });

    it('should skip approved vacation days during validation', async () => {
      // Only log hours on 3 days (Tue and Thu are vacation)
      const entries = [
        { date: '2026-03-09', hours: '8' },
        // No entry for 2026-03-10 (vacation)
        { date: '2026-03-11', hours: '8' },
        // No entry for 2026-03-12 (vacation)
        { date: '2026-03-13', hours: '8' },
      ];

      db.select.mockReturnValueOnce(buildEntriesSelectChain(entries));
      db.select.mockReturnValueOnce(buildEntriesSelectChain([])); // No holidays
      // Approved vacations covering Tue and Thu
      db.select.mockReturnValueOnce(buildEntriesSelectChain([
        { startDate: '2026-03-10', endDate: '2026-03-10' },
        { startDate: '2026-03-12', endDate: '2026-03-12' },
      ]));

      await expect(
        service.validateMinimumHours('ts-1', '2026-03-09', '2026-03-15', 'user-1'),
      ).resolves.toBeUndefined();
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

function buildSelectDistinctChain(resolveValue: any[]) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockResolvedValue(resolveValue),
  };
  chain.where.mockReturnValue(chain);
  return chain;
}
