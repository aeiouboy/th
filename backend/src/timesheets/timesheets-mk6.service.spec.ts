/**
 * Supplemental tests by MK VI — Test Writer
 * Fills remaining coverage gaps after existing 4 test files (66+ tests)
 *
 * New coverage:
 * - upsertEntries: manager_approved/cc_approved status blocking
 * - upsertEntries: multiple invalid charge codes listed in error message
 * - upsertEntries: all-LEAVE-001 input returns existing leave entries
 * - submit: approved/manager_approved/cc_approved statuses rejected
 * - submit: Teams webhook receives correct period value
 * - validateMinimumHours: overlapping vacations use max leave hours
 * - validateMinimumHours: holiday entries with <8h are tolerated
 * - validateMinimumHours: multi-entry sum < 8h includes details in error
 * - autoFillLeaveEntries: half_pm description suffix
 * - autoFillLeaveEntries: null holidayName fallback to "Public Holiday"
 * - autoFillLeaveEntries: Saturday holiday skipped (no entry created)
 * - copyFromPrevious: generates 0-hour entry grid (N codes × 5 weekdays)
 */
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { TimesheetsService } from './timesheets.service';
import { CalendarService } from '../calendar/calendar.service';
import { TeamsWebhookService } from '../integrations/teams-webhook.service';
import { DRIZZLE } from '../database/drizzle.provider';

describe('TimesheetsService — MK VI Supplemental', () => {
  let service: TimesheetsService;
  let db: any;
  let teamsWebhook: { sendCard: jest.Mock };

  beforeEach(async () => {
    db = {
      select: jest.fn(),
      selectDistinct: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    teamsWebhook = { sendCard: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimesheetsService,
        { provide: DRIZZLE, useValue: db },
        { provide: CalendarService, useValue: { getWorkingDays: jest.fn(), getCalendarByYear: jest.fn() } },
        { provide: TeamsWebhookService, useValue: teamsWebhook },
      ],
    }).compile();

    service = module.get<TimesheetsService>(TimesheetsService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  // ─── upsertEntries — forbidden statuses ────────────────────────────────────

  describe('upsertEntries — manager_approved and cc_approved are forbidden', () => {
    it('should throw ForbiddenException when status is manager_approved', async () => {
      db.select.mockReturnValueOnce(buildLimitChain([
        { id: 'ts-1', userId: 'user-1', status: 'manager_approved' },
      ]));

      await expect(
        service.upsertEntries('user-1', 'ts-1', []),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when status is cc_approved', async () => {
      db.select.mockReturnValueOnce(buildLimitChain([
        { id: 'ts-1', userId: 'user-1', status: 'cc_approved' },
      ]));

      await expect(
        service.upsertEntries('user-1', 'ts-1', []),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── upsertEntries — multiple invalid charge codes ─────────────────────────

  describe('upsertEntries — multiple invalid charge codes in error', () => {
    it('should list all invalid charge codes in the error message', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', status: 'draft', periodStart: '2026-03-09', periodEnd: '2026-03-15' };
      const entries = [
        { charge_code_id: 'BAD-001', date: '2026-03-09', hours: 4 },
        { charge_code_id: 'BAD-002', date: '2026-03-10', hours: 4 },
        { charge_code_id: 'OK-001', date: '2026-03-11', hours: 8 },
      ];

      db.select
        .mockReturnValueOnce(buildLimitChain([sheet]))
        .mockReturnValueOnce(buildWhereChain([{ chargeCodeId: 'OK-001' }])); // only OK-001 allowed

      try {
        await service.upsertEntries('user-1', 'ts-1', entries);
        fail('Should have thrown BadRequestException');
      } catch (e: any) {
        expect(e).toBeInstanceOf(BadRequestException);
        const msg = e.getResponse()?.message ?? e.message;
        expect(msg).toContain('BAD-001');
        expect(msg).toContain('BAD-002');
        expect(msg).not.toContain('OK-001');
      }
    });
  });

  // ─── upsertEntries — all LEAVE-001 input ───────────────────────────────────

  describe('upsertEntries — all entries are LEAVE-001 (system-managed)', () => {
    it('should return existing leave entries when user only submits LEAVE-001 entries', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', status: 'draft', periodStart: '2026-03-09', periodEnd: '2026-03-15' };
      const entries = [
        { charge_code_id: 'LEAVE-001', date: '2026-03-09', hours: 8 },
        { charge_code_id: 'LEAVE-001', date: '2026-03-10', hours: 4 },
      ];

      db.select
        .mockReturnValueOnce(buildLimitChain([sheet]))
        .mockReturnValueOnce(buildWhereChain([])); // no vacations

      db.delete.mockReturnValueOnce({ where: jest.fn().mockResolvedValue([]) });

      // After filtering LEAVE-001, entries empty → returns existing leave entries
      const existingLeave = [
        { id: 'e-leave-1', chargeCodeId: 'LEAVE-001', date: '2026-03-09', hours: '8' },
      ];
      db.select.mockReturnValueOnce(buildEntriesWhereChain(existingLeave));

      const result = await service.upsertEntries('user-1', 'ts-1', entries);
      expect(result).toEqual(existingLeave);
      expect(db.insert).not.toHaveBeenCalled();
    });
  });

  // ─── submit — rejected statuses ────────────────────────────────────────────

  describe('submit — non-submittable statuses', () => {
    const nonSubmittableStatuses = ['approved', 'manager_approved', 'cc_approved', 'locked'];

    it.each(nonSubmittableStatuses)(
      'should throw BadRequestException when status is %s',
      async (status) => {
        db.select.mockReturnValueOnce(buildLimitChain([
          { id: 'ts-1', userId: 'user-1', status },
        ]));

        await expect(service.submit('user-1', 'ts-1')).rejects.toThrow(BadRequestException);
      },
    );

    it('should include current status in error message', async () => {
      db.select.mockReturnValueOnce(buildLimitChain([
        { id: 'ts-1', userId: 'user-1', status: 'approved' },
      ]));

      try {
        await service.submit('user-1', 'ts-1');
        fail('Should have thrown');
      } catch (e: any) {
        expect(e.message).toContain('approved');
      }
    });
  });

  // ─── submit — Teams webhook period value ───────────────────────────────────

  describe('submit — Teams webhook receives correct period', () => {
    it('should pass period start and end as a fact to sendCard', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-14T10:00:00Z'));

      const sheet = { id: 'ts-1', userId: 'user-1', status: 'draft', periodStart: '2026-03-09', periodEnd: '2026-03-15' };
      const updated = { ...sheet, status: 'submitted' };

      jest.spyOn(service as any, 'autoFillLeaveEntries').mockResolvedValueOnce(undefined);
      jest.spyOn(service, 'validateMinimumHours').mockResolvedValueOnce(undefined);

      db.select.mockReturnValueOnce(buildLimitChain([sheet]));
      db.update.mockReturnValueOnce(buildUpdateChain([updated]));

      await service.submit('user-1', 'ts-1');

      expect(teamsWebhook.sendCard).toHaveBeenCalledWith(
        'Timesheet Submitted',
        expect.any(String),
        expect.arrayContaining([
          { name: 'Period', value: '2026-03-09 - 2026-03-15' },
        ]),
        '2196f3',
      );
    });
  });

  // ─── validateMinimumHours — overlapping vacations ──────────────────────────

  describe('validateMinimumHours — overlapping vacation requests use max hours', () => {
    it('should treat day as full-day vacation when half and full overlap', async () => {
      // Mon has both a half-day (4h) and full-day (8h) vacation → max is 8h → skip entirely
      const entries = [
        // No entry for Mon (covered by full-day vacation)
        { date: '2026-03-10', hours: '8' },
        { date: '2026-03-11', hours: '8' },
        { date: '2026-03-12', hours: '8' },
        { date: '2026-03-13', hours: '8' },
      ];

      db.select.mockReturnValueOnce(buildEntriesWhereChain(entries));
      db.select.mockReturnValueOnce(buildEntriesWhereChain([])); // no holidays
      db.select.mockReturnValueOnce(buildEntriesWhereChain([
        { startDate: '2026-03-09', endDate: '2026-03-09', leaveType: 'half_am' },
        { startDate: '2026-03-09', endDate: '2026-03-09', leaveType: 'full_day' },
      ]));

      await expect(
        service.validateMinimumHours('ts-1', '2026-03-09', '2026-03-15', 'user-1'),
      ).resolves.toBeUndefined();
    });

    it('should require only 4h work when two half-day vacations overlap (max stays 4h)', async () => {
      // Mon has two half-day vacations → max(4,4) = 4h leave → require 8-4=4h work
      const entries = [
        { date: '2026-03-09', hours: '4' }, // 4h work — just enough
        { date: '2026-03-10', hours: '8' },
        { date: '2026-03-11', hours: '8' },
        { date: '2026-03-12', hours: '8' },
        { date: '2026-03-13', hours: '8' },
      ];

      db.select.mockReturnValueOnce(buildEntriesWhereChain(entries));
      db.select.mockReturnValueOnce(buildEntriesWhereChain([]));
      db.select.mockReturnValueOnce(buildEntriesWhereChain([
        { startDate: '2026-03-09', endDate: '2026-03-09', leaveType: 'half_am' },
        { startDate: '2026-03-09', endDate: '2026-03-09', leaveType: 'half_pm' },
      ]));

      await expect(
        service.validateMinimumHours('ts-1', '2026-03-09', '2026-03-15', 'user-1'),
      ).resolves.toBeUndefined();
    });
  });

  // ─── validateMinimumHours — holiday entries tolerated ──────────────────────

  describe('validateMinimumHours — holiday with partial hours', () => {
    it('should tolerate entries with less than 8h on holidays', async () => {
      const entries = [
        { date: '2026-03-09', hours: '8' },
        { date: '2026-03-10', hours: '8' },
        { date: '2026-03-11', hours: '3' }, // Wed holiday — 3h should be fine
        { date: '2026-03-12', hours: '8' },
        { date: '2026-03-13', hours: '8' },
      ];

      db.select.mockReturnValueOnce(buildEntriesWhereChain(entries));
      db.select.mockReturnValueOnce(buildEntriesWhereChain([{ date: '2026-03-11' }])); // Wed is holiday
      db.select.mockReturnValueOnce(buildEntriesWhereChain([]));

      await expect(
        service.validateMinimumHours('ts-1', '2026-03-09', '2026-03-15', 'user-1'),
      ).resolves.toBeUndefined();
    });
  });

  // ─── validateMinimumHours — error details ──────────────────────────────────

  describe('validateMinimumHours — error details format', () => {
    it('should include date, logged hours, and required hours in error details', async () => {
      const entries = [
        { date: '2026-03-09', hours: '3' },
        { date: '2026-03-09', hours: '4' }, // sum = 7 < 8
        { date: '2026-03-10', hours: '8' },
        { date: '2026-03-11', hours: '8' },
        { date: '2026-03-12', hours: '8' },
        { date: '2026-03-13', hours: '8' },
      ];

      db.select.mockReturnValueOnce(buildEntriesWhereChain(entries));
      db.select.mockReturnValueOnce(buildEntriesWhereChain([]));
      db.select.mockReturnValueOnce(buildEntriesWhereChain([]));

      try {
        await service.validateMinimumHours('ts-1', '2026-03-09', '2026-03-15', 'user-1');
        fail('Should have thrown');
      } catch (e: any) {
        const response = e.getResponse();
        expect(response.message).toBe('Minimum 8 hours required on weekdays');
        expect(response.details).toEqual(
          expect.arrayContaining([
            { date: '2026-03-09', logged: 7, required: 8 },
          ]),
        );
      }
    });
  });

  // ─── autoFillLeaveEntries — half_pm description ────────────────────────────

  describe('autoFillLeaveEntries — half_pm suffix (via create)', () => {
    it('should create leave entry with "(PM)" suffix for half_pm leave type', async () => {
      const sheet = { id: 'ts-pm', userId: 'user-1', periodStart: '2026-03-09', periodEnd: '2026-03-15', status: 'draft' };

      db.select.mockReturnValueOnce(buildLimitChain([]));
      db.insert.mockReturnValueOnce(buildInsertChain([sheet]));

      // half_pm vacation on Monday
      db.select.mockReturnValueOnce(buildWhereChain([
        { startDate: '2026-03-09', endDate: '2026-03-09', leaveType: 'half_pm' },
      ]));
      db.select.mockReturnValueOnce(buildWhereChain([])); // no holidays
      db.delete.mockReturnValueOnce({ where: jest.fn().mockResolvedValue([]) });

      const insertValues: any[] = [];
      db.insert.mockReturnValueOnce({
        values: jest.fn().mockImplementation((vals: any) => {
          insertValues.push(...vals);
          return Promise.resolve();
        }),
      });

      await service.create('user-1', { period_start: '2026-03-09', period_end: '2026-03-15' });

      expect(insertValues).toHaveLength(1);
      expect(insertValues[0]).toEqual(expect.objectContaining({
        chargeCodeId: 'LEAVE-001',
        hours: '4',
        description: 'Annual Leave (PM)',
      }));
    });
  });

  // ─── autoFillLeaveEntries — null holidayName fallback ──────────────────────

  describe('autoFillLeaveEntries — null holidayName fallback (via create)', () => {
    it('should use "Public Holiday" when holidayName is null', async () => {
      const sheet = { id: 'ts-hol', userId: 'user-1', periodStart: '2026-03-09', periodEnd: '2026-03-15', status: 'draft' };

      db.select.mockReturnValueOnce(buildLimitChain([]));
      db.insert.mockReturnValueOnce(buildInsertChain([sheet]));

      db.select.mockReturnValueOnce(buildWhereChain([])); // no vacations
      db.select.mockReturnValueOnce(buildWhereChain([
        { date: '2026-03-11', holidayName: null },
      ]));
      db.delete.mockReturnValueOnce({ where: jest.fn().mockResolvedValue([]) });

      const insertValues: any[] = [];
      db.insert.mockReturnValueOnce({
        values: jest.fn().mockImplementation((vals: any) => {
          insertValues.push(...vals);
          return Promise.resolve();
        }),
      });

      await service.create('user-1', { period_start: '2026-03-09', period_end: '2026-03-15' });

      const holEntry = insertValues.find((v: any) => v.date === '2026-03-11');
      expect(holEntry).toBeDefined();
      expect(holEntry.description).toBe('Public Holiday');
      expect(holEntry.hours).toBe('8');
    });
  });

  // ─── autoFillLeaveEntries — weekend holiday skipped ────────────────────────

  describe('autoFillLeaveEntries — holiday on weekend skipped (via create)', () => {
    it('should not create leave entry for holiday falling on Saturday', async () => {
      const sheet = { id: 'ts-sat', userId: 'user-1', periodStart: '2026-03-09', periodEnd: '2026-03-15', status: 'draft' };

      db.select.mockReturnValueOnce(buildLimitChain([]));
      db.insert.mockReturnValueOnce(buildInsertChain([sheet]));

      db.select.mockReturnValueOnce(buildWhereChain([])); // no vacations
      // Holiday on Saturday 2026-03-14
      db.select.mockReturnValueOnce(buildWhereChain([
        { date: '2026-03-14', holidayName: 'Saturday Holiday' },
      ]));
      db.delete.mockReturnValueOnce({ where: jest.fn().mockResolvedValue([]) });

      await service.create('user-1', { period_start: '2026-03-09', period_end: '2026-03-15' });

      // Only 1 insert call: the timesheet. No leave entries inserted.
      expect(db.insert).toHaveBeenCalledTimes(1);
    });

    it('should not create leave entry for holiday falling on Sunday', async () => {
      const sheet = { id: 'ts-sun', userId: 'user-1', periodStart: '2026-03-09', periodEnd: '2026-03-15', status: 'draft' };

      db.select.mockReturnValueOnce(buildLimitChain([]));
      db.insert.mockReturnValueOnce(buildInsertChain([sheet]));

      db.select.mockReturnValueOnce(buildWhereChain([]));
      db.select.mockReturnValueOnce(buildWhereChain([
        { date: '2026-03-15', holidayName: 'Sunday Holiday' },
      ]));
      db.delete.mockReturnValueOnce({ where: jest.fn().mockResolvedValue([]) });

      await service.create('user-1', { period_start: '2026-03-09', period_end: '2026-03-15' });

      expect(db.insert).toHaveBeenCalledTimes(1);
    });
  });

  // ─── copyFromPrevious — 0-hour grid structure ──────────────────────────────

  describe('copyFromPrevious — 0-hour entry grid', () => {
    it('should create N×5 entries (N charge codes × 5 weekdays) with hours=0', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', status: 'draft', periodStart: '2026-03-09', periodEnd: '2026-03-15' };
      const prevSheet = { id: 'ts-prev', userId: 'user-1', periodStart: '2026-03-02', periodEnd: '2026-03-08' };
      const prevEntries = [
        { chargeCodeId: 'PRJ-001', chargeCodeName: 'Alpha', isBillable: true },
        { chargeCodeId: 'PRJ-002', chargeCodeName: 'Beta', isBillable: true },
        { chargeCodeId: 'ACT-010', chargeCodeName: 'Admin', isBillable: false },
      ];

      db.select
        .mockReturnValueOnce(buildLimitChain([sheet]))
        .mockReturnValueOnce(buildLimitChain([]))            // no existing entries
        .mockReturnValueOnce(buildLimitChain([prevSheet]))
        .mockReturnValueOnce(buildGroupByChain(prevEntries));

      const insertChain = buildInsertChain([]);
      db.insert.mockReturnValueOnce(insertChain);

      const result = await service.copyFromPrevious('user-1', 'ts-1');

      expect(result.entries).toHaveLength(3);
      expect(result.message).toContain('3 charge code');

      // Verify the values passed to insert
      const insertedValues = insertChain.values.mock.calls[0][0];
      // 3 codes × 5 weekdays = 15 entries
      expect(insertedValues).toHaveLength(15);

      // All entries should have hours: '0'
      for (const v of insertedValues) {
        expect(v.hours).toBe('0');
        expect(v.timesheetId).toBe('ts-1');
      }

      // Verify all 5 weekday dates are present
      const dates = [...new Set(insertedValues.map((v: any) => v.date))];
      expect(dates).toHaveLength(5);
      expect(dates).toContain('2026-03-09'); // Mon
      expect(dates).toContain('2026-03-10'); // Tue
      expect(dates).toContain('2026-03-11'); // Wed
      expect(dates).toContain('2026-03-12'); // Thu
      expect(dates).toContain('2026-03-13'); // Fri

      // Verify all 3 charge codes are present
      const codes = [...new Set(insertedValues.map((v: any) => v.chargeCodeId))];
      expect(codes).toHaveLength(3);
      expect(codes).toEqual(expect.arrayContaining(['PRJ-001', 'PRJ-002', 'ACT-010']));
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
    leftJoin: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(resolveValue),
  };
  chain.innerJoin.mockReturnValue(chain);
  chain.leftJoin.mockReturnValue(chain);
  return chain;
}

function buildEntriesWhereChain(resolveValue: any[]) {
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
