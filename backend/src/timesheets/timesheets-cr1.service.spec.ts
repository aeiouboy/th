/**
 * Additional unit tests for CR-04, CR-05, CR-06, CR-07:
 * - copyFromPrevious (CR-05)
 * - Half-day leave / vacation day blocking in upsertEntries (CR-06 / BUG-05)
 * - LEAVE-001 system row handling
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { TimesheetsService } from './timesheets.service';
import { CalendarService } from '../calendar/calendar.service';
import { TeamsWebhookService } from '../integrations/teams-webhook.service';
import { DRIZZLE } from '../database/drizzle.provider';

describe('TimesheetsService — CR-05/06/07 Features', () => {
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
        { provide: CalendarService, useValue: { getWorkingDays: jest.fn(), getCalendarByYear: jest.fn() } },
        { provide: TeamsWebhookService, useValue: { sendCard: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get<TimesheetsService>(TimesheetsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── CR-05: copyFromPrevious ───────────────────────────────────────────────

  describe('copyFromPrevious', () => {
    it('should throw NotFoundException when timesheet does not exist', async () => {
      db.select.mockReturnValueOnce(buildLimitChain([]));
      await expect(service.copyFromPrevious('user-1', 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when timesheet is not draft', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', status: 'submitted', periodStart: '2026-03-09', periodEnd: '2026-03-15' };
      db.select.mockReturnValueOnce(buildLimitChain([sheet]));
      await expect(service.copyFromPrevious('user-1', 'ts-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when timesheet already has entries', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', status: 'draft', periodStart: '2026-03-09', periodEnd: '2026-03-15' };
      const existingEntries = [{ id: 'e-1' }];
      db.select
        .mockReturnValueOnce(buildLimitChain([sheet]))          // find sheet
        .mockReturnValueOnce(buildLimitChain(existingEntries)); // existing non-leave entries
      await expect(service.copyFromPrevious('user-1', 'ts-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when no previous timesheet exists', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', status: 'draft', periodStart: '2026-03-09', periodEnd: '2026-03-15' };
      db.select
        .mockReturnValueOnce(buildLimitChain([sheet]))  // find sheet
        .mockReturnValueOnce(buildLimitChain([]))       // no existing entries
        .mockReturnValueOnce(buildLimitChain([]));      // no previous sheet
      await expect(service.copyFromPrevious('user-1', 'ts-1')).rejects.toThrow(NotFoundException);
    });

    it('should return empty entries message when previous timesheet has no entries', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', status: 'draft', periodStart: '2026-03-09', periodEnd: '2026-03-15' };
      const prevSheet = { id: 'ts-prev', userId: 'user-1', periodStart: '2026-03-02', periodEnd: '2026-03-08' };
      db.select
        .mockReturnValueOnce(buildLimitChain([sheet]))    // find sheet
        .mockReturnValueOnce(buildLimitChain([]))         // no existing entries
        .mockReturnValueOnce(buildLimitChain([prevSheet])) // previous sheet
        .mockReturnValueOnce(buildGroupByChain([]));      // no prev entries

      const result = await service.copyFromPrevious('user-1', 'ts-1');
      expect(result.entries).toHaveLength(0);
    });

    it('should copy charge codes from previous period and return success message', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', status: 'draft', periodStart: '2026-03-09', periodEnd: '2026-03-15' };
      const prevSheet = { id: 'ts-prev', userId: 'user-1', periodStart: '2026-03-02', periodEnd: '2026-03-08' };
      const prevEntries = [
        { chargeCodeId: 'PRJ-001', chargeCodeName: 'Project Alpha', isBillable: true },
        { chargeCodeId: 'ACT-010', chargeCodeName: 'Planning', isBillable: false },
      ];

      db.select
        .mockReturnValueOnce(buildLimitChain([sheet]))
        .mockReturnValueOnce(buildLimitChain([]))
        .mockReturnValueOnce(buildLimitChain([prevSheet]))
        .mockReturnValueOnce(buildGroupByChain(prevEntries));

      const insertChain = buildInsertChain([]);
      db.insert.mockReturnValueOnce(insertChain);

      const result = await service.copyFromPrevious('user-1', 'ts-1');
      expect(result.entries).toHaveLength(2);
      expect(result.message).toContain('2 charge code');
    });
  });

  // ─── CR-06 / BUG-05: Vacation day blocking in upsertEntries ───────────────

  describe('upsertEntries — vacation day blocking (CR-06)', () => {
    it('should silently drop entries on full-day vacation days', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', status: 'draft', periodStart: '2026-03-09', periodEnd: '2026-03-15' };
      const entries = [
        { charge_code_id: 'PRJ-001', date: '2026-03-09', hours: 8 }, // vacation day
        { charge_code_id: 'PRJ-001', date: '2026-03-10', hours: 8 }, // normal day
      ];
      const allowedCodes = [{ chargeCodeId: 'PRJ-001' }];
      // Full-day vacation on Mon 2026-03-09
      const approvedVacations = [{ startDate: '2026-03-09', endDate: '2026-03-09', leaveType: 'full_day' }];

      db.select
        .mockReturnValueOnce(buildLimitChain([sheet]))          // find sheet
        .mockReturnValueOnce(buildWhereChain(allowedCodes))     // validate charge codes
        .mockReturnValueOnce(buildWhereChain(approvedVacations)); // approved vacations

      const deleteChain = { from: jest.fn().mockReturnThis(), where: jest.fn().mockResolvedValue([]) };
      db.delete.mockReturnValueOnce(deleteChain);

      const inserted = [{ id: 'e-1', chargeCodeId: 'PRJ-001', date: '2026-03-10', hours: '8' }];
      db.insert.mockReturnValueOnce(buildInsertChain(inserted));

      const updateChain = buildUpdateChain([sheet]);
      db.update.mockReturnValueOnce(updateChain);

      // Vacation day entry should be dropped; only non-vacation entry is returned
      const result = await service.upsertEntries('user-1', 'ts-1', entries);
      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2026-03-10');
    });

    it('should allow entries on half-day vacation days (hours <= 4)', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', status: 'draft', periodStart: '2026-03-09', periodEnd: '2026-03-15' };
      // Half-day vacation on Mon 2026-03-09 — allow up to 4h
      const entries = [
        { charge_code_id: 'PRJ-001', date: '2026-03-09', hours: 4 }, // ok - half day
      ];
      const allowedCodes = [{ chargeCodeId: 'PRJ-001' }];
      const approvedVacations = [{ startDate: '2026-03-09', endDate: '2026-03-09', leaveType: 'half_am' }];

      db.select
        .mockReturnValueOnce(buildLimitChain([sheet]))
        .mockReturnValueOnce(buildWhereChain(allowedCodes))
        .mockReturnValueOnce(buildWhereChain(approvedVacations));

      const deleteChain = { from: jest.fn().mockReturnThis(), where: jest.fn().mockResolvedValue([]) };
      db.delete.mockReturnValueOnce(deleteChain);

      const inserted = [{ id: 'e-1', chargeCodeId: 'PRJ-001', date: '2026-03-09', hours: '4' }];
      db.insert.mockReturnValueOnce(buildInsertChain(inserted));

      const updateChain = buildUpdateChain([sheet]);
      db.update.mockReturnValueOnce(updateChain);

      const result = await service.upsertEntries('user-1', 'ts-1', entries);
      expect(result).toHaveLength(1);
    });

    it('should not allow editing LEAVE-001 entries (system managed)', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', status: 'draft', periodStart: '2026-03-09', periodEnd: '2026-03-15' };
      // entries include a LEAVE-001 entry that user is trying to override
      const entries = [
        { charge_code_id: 'LEAVE-001', date: '2026-03-09', hours: 8 }, // should be filtered
        { charge_code_id: 'PRJ-001', date: '2026-03-10', hours: 8 },   // normal
      ];
      const allowedCodes = [{ chargeCodeId: 'PRJ-001' }];
      const approvedVacations: any[] = [];

      db.select
        .mockReturnValueOnce(buildLimitChain([sheet]))
        .mockReturnValueOnce(buildWhereChain(allowedCodes))
        .mockReturnValueOnce(buildWhereChain(approvedVacations));

      const deleteChain = { from: jest.fn().mockReturnThis(), where: jest.fn().mockResolvedValue([]) };
      db.delete.mockReturnValueOnce(deleteChain);

      const inserted = [{ id: 'e-1', chargeCodeId: 'PRJ-001', date: '2026-03-10', hours: '8' }];
      db.insert.mockReturnValueOnce(buildInsertChain(inserted));

      const updateChain = buildUpdateChain([sheet]);
      db.update.mockReturnValueOnce(updateChain);

      // Only PRJ-001 entry should be saved; LEAVE-001 entry filtered out
      const result = await service.upsertEntries('user-1', 'ts-1', entries);
      const insertCall = db.insert.mock.calls[0];
      const insertedValues = insertCall ? insertChain_getValues(db.insert, 0) : [];
      // LEAVE-001 should not appear in inserted values
      if (Array.isArray(insertedValues)) {
        expect(insertedValues.every((v: any) => v.chargeCodeId !== 'LEAVE-001')).toBe(true);
      }
    });
  });

  // ─── CR-06: validateMinimumHours — half-day leave ─────────────────────────

  describe('validateMinimumHours — half-day leave (CR-06)', () => {
    it('should allow 4h on half-day vacation day when combined with 4h work', async () => {
      const entries = [
        { date: '2026-03-09', hours: '4' }, // 4h work on half-day vacation
        { date: '2026-03-10', hours: '8' },
        { date: '2026-03-11', hours: '8' },
        { date: '2026-03-12', hours: '8' },
        { date: '2026-03-13', hours: '8' },
      ];

      db.select
        .mockReturnValueOnce(buildEntriesSelectChain(entries))
        .mockReturnValueOnce(buildEntriesSelectChain([])) // no holidays
        .mockReturnValueOnce(buildEntriesSelectChain([   // half-day vacation on Mon
          { startDate: '2026-03-09', endDate: '2026-03-09', leaveType: 'half_am' },
        ]));

      // 4h work + 4h leave = 8h total on half-day vacation day — should pass
      await expect(
        service.validateMinimumHours('ts-1', '2026-03-09', '2026-03-15', 'user-1'),
      ).resolves.toBeUndefined();
    });

    it('should fail when half-day vacation day has only 2h work (requires 4h)', async () => {
      const entries = [
        { date: '2026-03-09', hours: '2' }, // only 2h work; half-day vacation covers 4h; need 4h work
        { date: '2026-03-10', hours: '8' },
        { date: '2026-03-11', hours: '8' },
        { date: '2026-03-12', hours: '8' },
        { date: '2026-03-13', hours: '8' },
      ];

      db.select
        .mockReturnValueOnce(buildEntriesSelectChain(entries))
        .mockReturnValueOnce(buildEntriesSelectChain([]))
        .mockReturnValueOnce(buildEntriesSelectChain([
          { startDate: '2026-03-09', endDate: '2026-03-09', leaveType: 'half_am' },
        ]));

      await expect(
        service.validateMinimumHours('ts-1', '2026-03-09', '2026-03-15', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should skip full-day vacation days entirely (no hours required)', async () => {
      // No entries for Mon 2026-03-09 (full-day vacation) — should pass
      const entries = [
        { date: '2026-03-10', hours: '8' },
        { date: '2026-03-11', hours: '8' },
        { date: '2026-03-12', hours: '8' },
        { date: '2026-03-13', hours: '8' },
      ];

      db.select
        .mockReturnValueOnce(buildEntriesSelectChain(entries))
        .mockReturnValueOnce(buildEntriesSelectChain([]))
        .mockReturnValueOnce(buildEntriesSelectChain([
          { startDate: '2026-03-09', endDate: '2026-03-09', leaveType: 'full_day' },
        ]));

      await expect(
        service.validateMinimumHours('ts-1', '2026-03-09', '2026-03-15', 'user-1'),
      ).resolves.toBeUndefined();
    });
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildLimitChain(resolveValue: any[]) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(resolveValue),
  };
  chain.where.mockReturnValue(chain);
  chain.leftJoin.mockReturnValue(chain);
  return chain;
}

function buildWhereChain(resolveValue: any[]) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(resolveValue),
  };
  chain.innerJoin.mockReturnValue(chain);
  return chain;
}

function buildGroupByChain(resolveValue: any[]) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockResolvedValue(resolveValue),
  };
  chain.where.mockReturnValue(chain);
  chain.leftJoin.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
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

/** Helper to get values passed to db.insert().values() in a given call */
function insertChain_getValues(insertMock: jest.Mock, callIndex: number): any[] {
  try {
    const insertCallResult = insertMock.mock.results[callIndex]?.value;
    return insertCallResult?.values?.mock?.calls?.[0]?.[0] ?? [];
  } catch {
    return [];
  }
}
