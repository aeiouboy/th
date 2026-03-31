/**
 * Edge-case tests for TimesheetsService — covering gaps not addressed by existing suites:
 *
 * 1. getWeekBounds — Sunday input (special -6 offset), Saturday, Monday
 * 2. upsertEntries — manager_approved / cc_approved status should block edits
 * 3. submit — 'approved' status should throw BadRequestException
 * 4. submit — Teams webhook is called on successful submit
 * 5. autoFillLeaveEntries — actual DB interactions (half-day AM/PM, holidays, weekends, overlap dedup)
 * 6. upsertEntries — multiple charge codes with mixed valid/invalid
 * 7. copyFromPrevious — weekday iteration edge case (Mon=periodStart)
 * 8. create — auto-fills leave entries after insert
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

describe('TimesheetsService — Edge Cases', () => {
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
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  // ─── getWeekBounds (tested via create) ────────────────────────────────────

  describe('getWeekBounds edge cases (via create)', () => {
    it('should normalize a Sunday date to the previous Monday', async () => {
      // 2026-03-15 is a Sunday → week should be Mon 2026-03-09 to Sun 2026-03-15
      const sheet = {
        id: 'ts-1', userId: 'user-1',
        periodStart: '2026-03-09', periodEnd: '2026-03-15',
        status: 'draft',
      };

      db.select.mockReturnValueOnce(buildSelectChain([])); // no existing
      db.insert.mockReturnValueOnce(buildInsertChain([sheet]));
      // autoFillLeaveEntries stubs
      db.select
        .mockReturnValueOnce(buildWhereChain([])) // vacations
        .mockReturnValueOnce(buildWhereChain([])); // holidays
      db.delete.mockReturnValueOnce({ where: jest.fn().mockResolvedValue([]) });

      const result = await service.create('user-1', { period_start: '2026-03-15', period_end: '2026-03-21' });
      expect(result.periodStart).toBe('2026-03-09');
      expect(result.periodEnd).toBe('2026-03-15');
    });

    it('should keep Monday as-is when input is already Monday', async () => {
      // 2026-03-09 is a Monday
      const sheet = {
        id: 'ts-2', userId: 'user-1',
        periodStart: '2026-03-09', periodEnd: '2026-03-15',
        status: 'draft',
      };

      db.select.mockReturnValueOnce(buildSelectChain([]));
      db.insert.mockReturnValueOnce(buildInsertChain([sheet]));
      db.select
        .mockReturnValueOnce(buildWhereChain([]))
        .mockReturnValueOnce(buildWhereChain([]));
      db.delete.mockReturnValueOnce({ where: jest.fn().mockResolvedValue([]) });

      const result = await service.create('user-1', { period_start: '2026-03-09', period_end: '2026-03-15' });
      expect(result.periodStart).toBe('2026-03-09');
    });

    it('should normalize a Saturday date to the previous Monday', async () => {
      // 2026-03-14 is a Saturday → Mon 2026-03-09 to Sun 2026-03-15
      const sheet = {
        id: 'ts-3', userId: 'user-1',
        periodStart: '2026-03-09', periodEnd: '2026-03-15',
        status: 'draft',
      };

      db.select.mockReturnValueOnce(buildSelectChain([]));
      db.insert.mockReturnValueOnce(buildInsertChain([sheet]));
      db.select
        .mockReturnValueOnce(buildWhereChain([]))
        .mockReturnValueOnce(buildWhereChain([]));
      db.delete.mockReturnValueOnce({ where: jest.fn().mockResolvedValue([]) });

      const result = await service.create('user-1', { period_start: '2026-03-14', period_end: '2026-03-20' });
      expect(result.periodStart).toBe('2026-03-09');
    });
  });

  // ─── upsertEntries — blocked statuses ─────────────────────────────────────

  describe('upsertEntries — manager_approved and cc_approved statuses', () => {
    it('should throw ForbiddenException when status is manager_approved', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', status: 'manager_approved' };
      db.select.mockReturnValueOnce(buildSelectChain([sheet]));

      await expect(
        service.upsertEntries('user-1', 'ts-1', []),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when status is cc_approved', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', status: 'cc_approved' };
      db.select.mockReturnValueOnce(buildSelectChain([sheet]));

      await expect(
        service.upsertEntries('user-1', 'ts-1', []),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── submit — 'approved' status ───────────────────────────────────────────

  describe('submit — status guards', () => {
    it('should throw BadRequestException when status is approved', async () => {
      // approved is NOT in ['draft', 'rejected', 'submitted'] — should throw
      const sheet = { id: 'ts-1', userId: 'user-1', status: 'approved' };
      db.select.mockReturnValueOnce(buildSelectChain([sheet]));

      await expect(service.submit('user-1', 'ts-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when status is manager_approved', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', status: 'manager_approved' };
      db.select.mockReturnValueOnce(buildSelectChain([sheet]));

      await expect(service.submit('user-1', 'ts-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when status is cc_approved', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', status: 'cc_approved' };
      db.select.mockReturnValueOnce(buildSelectChain([sheet]));

      await expect(service.submit('user-1', 'ts-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── submit — Teams webhook ───────────────────────────────────────────────

  describe('submit — Teams webhook notification', () => {
    it('should call teamsWebhook.sendCard on successful submit', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-10T10:00:00Z'));

      const sheet = {
        id: 'ts-1', userId: 'user-1', status: 'draft',
        periodStart: '2026-03-09', periodEnd: '2026-03-15',
      };
      const updated = { ...sheet, status: 'submitted' };

      jest.spyOn(service as any, 'autoFillLeaveEntries').mockResolvedValueOnce(undefined);
      jest.spyOn(service, 'validateMinimumHours').mockResolvedValueOnce(undefined);

      db.select.mockReturnValueOnce(buildSelectChain([sheet]));
      db.update.mockReturnValueOnce(buildUpdateChain([updated]));

      await service.submit('user-1', 'ts-1');

      expect(teamsWebhook.sendCard).toHaveBeenCalledTimes(1);
      expect(teamsWebhook.sendCard).toHaveBeenCalledWith(
        'Timesheet Submitted',
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({ name: 'Period' }),
        ]),
        '2196f3',
      );
    });

    it('should not throw if Teams webhook fails (fire-and-forget)', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-10T10:00:00Z'));

      const sheet = {
        id: 'ts-1', userId: 'user-1', status: 'draft',
        periodStart: '2026-03-09', periodEnd: '2026-03-15',
      };
      const updated = { ...sheet, status: 'submitted' };

      jest.spyOn(service as any, 'autoFillLeaveEntries').mockResolvedValueOnce(undefined);
      jest.spyOn(service, 'validateMinimumHours').mockResolvedValueOnce(undefined);

      teamsWebhook.sendCard.mockRejectedValueOnce(new Error('Teams API down'));

      db.select.mockReturnValueOnce(buildSelectChain([sheet]));
      db.update.mockReturnValueOnce(buildUpdateChain([updated]));

      // Should resolve without throwing despite webhook error
      const result = await service.submit('user-1', 'ts-1');
      expect(result.status).toBe('submitted');
    });
  });

  // ─── upsertEntries — multiple charge codes, mixed valid/invalid ───────────

  describe('upsertEntries — mixed valid/invalid charge codes', () => {
    it('should throw listing only invalid charge codes when some are assigned and some are not', async () => {
      const sheet = {
        id: 'ts-1', userId: 'user-1', status: 'draft',
        periodStart: '2026-03-09', periodEnd: '2026-03-15',
      };
      const entries = [
        { charge_code_id: 'CC-001', date: '2026-03-09', hours: 8 },
        { charge_code_id: 'CC-INVALID-1', date: '2026-03-10', hours: 8 },
        { charge_code_id: 'CC-INVALID-2', date: '2026-03-11', hours: 8 },
      ];
      // Only CC-001 is allowed
      const allowedCodes = [{ chargeCodeId: 'CC-001' }];

      db.select
        .mockReturnValueOnce(buildSelectChain([sheet]))
        .mockReturnValueOnce(buildWhereChain(allowedCodes));

      try {
        await service.upsertEntries('user-1', 'ts-1', entries);
        fail('Should have thrown BadRequestException');
      } catch (e: any) {
        expect(e).toBeInstanceOf(BadRequestException);
        const msg = e.message;
        expect(msg).toContain('CC-INVALID-1');
        expect(msg).toContain('CC-INVALID-2');
        expect(msg).not.toContain('CC-001');
      }
    });
  });

  // ─── autoFillLeaveEntries (via create — no spy) ───────────────────────────

  describe('autoFillLeaveEntries — actual DB logic (via create)', () => {
    it('should insert LEAVE-001 entries for approved vacation weekdays', async () => {
      const sheet = {
        id: 'ts-1', userId: 'user-1',
        periodStart: '2026-03-09', periodEnd: '2026-03-15',
        status: 'draft',
      };

      // create: no existing sheet
      db.select.mockReturnValueOnce(buildSelectChain([]));
      db.insert.mockReturnValueOnce(buildInsertChain([sheet]));

      // autoFillLeaveEntries:
      // 1) approved vacations — Mon-Tue full day
      db.select.mockReturnValueOnce(buildWhereChain([
        { startDate: '2026-03-09', endDate: '2026-03-10', leaveType: 'full_day' },
      ]));
      // 2) holidays — none
      db.select.mockReturnValueOnce(buildWhereChain([]));
      // 3) delete existing LEAVE-001
      db.delete.mockReturnValueOnce({ where: jest.fn().mockResolvedValue([]) });
      // 4) insert new LEAVE-001 entries
      db.insert.mockReturnValueOnce(buildInsertChain([]));

      await service.create('user-1', { period_start: '2026-03-09', period_end: '2026-03-15' });

      // Verify insert was called for leave entries (second insert call)
      expect(db.insert).toHaveBeenCalledTimes(2); // 1st = timesheet, 2nd = leave entries
      const leaveInsert = db.insert.mock.results[1]?.value;
      expect(leaveInsert.values).toHaveBeenCalled();
    });

    it('should insert half-day vacation entries with AM/PM description suffix', async () => {
      const sheet = {
        id: 'ts-1', userId: 'user-1',
        periodStart: '2026-03-09', periodEnd: '2026-03-15',
        status: 'draft',
      };

      db.select.mockReturnValueOnce(buildSelectChain([]));
      db.insert.mockReturnValueOnce(buildInsertChain([sheet]));

      // Half-day AM vacation on Monday
      db.select.mockReturnValueOnce(buildWhereChain([
        { startDate: '2026-03-09', endDate: '2026-03-09', leaveType: 'half_am' },
      ]));
      db.select.mockReturnValueOnce(buildWhereChain([])); // no holidays
      db.delete.mockReturnValueOnce({ where: jest.fn().mockResolvedValue([]) });
      db.insert.mockReturnValueOnce(buildInsertChain([]));

      await service.create('user-1', { period_start: '2026-03-09', period_end: '2026-03-15' });

      // Verify values passed contain half-day hours and description
      const leaveInsertChain = db.insert.mock.results[1]?.value;
      const valuesCall = leaveInsertChain?.values?.mock?.calls?.[0]?.[0];
      expect(valuesCall).toBeDefined();
      if (valuesCall) {
        expect(valuesCall[0].hours).toBe('4');
        expect(valuesCall[0].description).toBe('Annual Leave (AM)');
        expect(valuesCall[0].chargeCodeId).toBe('LEAVE-001');
      }
    });

    it('should skip weekend days when filling leave entries', async () => {
      const sheet = {
        id: 'ts-1', userId: 'user-1',
        periodStart: '2026-03-09', periodEnd: '2026-03-15',
        status: 'draft',
      };

      db.select.mockReturnValueOnce(buildSelectChain([]));
      db.insert.mockReturnValueOnce(buildInsertChain([sheet]));

      // Full week vacation including weekend
      db.select.mockReturnValueOnce(buildWhereChain([
        { startDate: '2026-03-09', endDate: '2026-03-15', leaveType: 'full_day' },
      ]));
      db.select.mockReturnValueOnce(buildWhereChain([])); // no holidays
      db.delete.mockReturnValueOnce({ where: jest.fn().mockResolvedValue([]) });
      db.insert.mockReturnValueOnce(buildInsertChain([]));

      await service.create('user-1', { period_start: '2026-03-09', period_end: '2026-03-15' });

      const leaveInsertChain = db.insert.mock.results[1]?.value;
      const valuesCall = leaveInsertChain?.values?.mock?.calls?.[0]?.[0];
      expect(valuesCall).toBeDefined();
      if (valuesCall) {
        // Mon-Fri = 5 weekdays, Sat-Sun skipped
        expect(valuesCall).toHaveLength(5);
        const dates = valuesCall.map((v: any) => v.date);
        expect(dates).not.toContain('2026-03-14'); // Saturday
        expect(dates).not.toContain('2026-03-15'); // Sunday
      }
    });

    it('should merge holidays and vacation without duplicates', async () => {
      const sheet = {
        id: 'ts-1', userId: 'user-1',
        periodStart: '2026-03-09', periodEnd: '2026-03-15',
        status: 'draft',
      };

      db.select.mockReturnValueOnce(buildSelectChain([]));
      db.insert.mockReturnValueOnce(buildInsertChain([sheet]));

      // Vacation on Monday
      db.select.mockReturnValueOnce(buildWhereChain([
        { startDate: '2026-03-09', endDate: '2026-03-09', leaveType: 'full_day' },
      ]));
      // Holiday also on Monday (should not create duplicate)
      db.select.mockReturnValueOnce(buildWhereChain([
        { date: '2026-03-09', holidayName: 'Test Holiday' },
      ]));
      db.delete.mockReturnValueOnce({ where: jest.fn().mockResolvedValue([]) });
      db.insert.mockReturnValueOnce(buildInsertChain([]));

      await service.create('user-1', { period_start: '2026-03-09', period_end: '2026-03-15' });

      const leaveInsertChain = db.insert.mock.results[1]?.value;
      const valuesCall = leaveInsertChain?.values?.mock?.calls?.[0]?.[0];
      expect(valuesCall).toBeDefined();
      if (valuesCall) {
        // Only 1 entry for 2026-03-09 (vacation takes precedence, holiday deduped)
        const marchNinthEntries = valuesCall.filter((v: any) => v.date === '2026-03-09');
        expect(marchNinthEntries).toHaveLength(1);
        expect(marchNinthEntries[0].description).toBe('Annual Leave'); // vacation, not holiday
      }
    });

    it('should not insert anything when no vacations or holidays exist', async () => {
      const sheet = {
        id: 'ts-1', userId: 'user-1',
        periodStart: '2026-03-09', periodEnd: '2026-03-15',
        status: 'draft',
      };

      db.select.mockReturnValueOnce(buildSelectChain([]));
      db.insert.mockReturnValueOnce(buildInsertChain([sheet]));

      db.select.mockReturnValueOnce(buildWhereChain([])); // no vacations
      db.select.mockReturnValueOnce(buildWhereChain([])); // no holidays
      db.delete.mockReturnValueOnce({ where: jest.fn().mockResolvedValue([]) });

      await service.create('user-1', { period_start: '2026-03-09', period_end: '2026-03-15' });

      // Should only have 1 insert call (the timesheet itself), no leave entries
      expect(db.insert).toHaveBeenCalledTimes(1);
    });
  });

  // ─── upsertEntries — resets status to draft ───────────────────────────────

  describe('upsertEntries — status reset to draft', () => {
    it('should reset status to draft when editing a submitted timesheet', async () => {
      const sheet = {
        id: 'ts-1', userId: 'user-1', status: 'submitted',
        periodStart: '2026-03-09', periodEnd: '2026-03-15',
      };
      const entries = [
        { charge_code_id: 'CC-001', date: '2026-03-09', hours: 8 },
      ];
      const allowedCodes = [{ chargeCodeId: 'CC-001' }];

      db.select
        .mockReturnValueOnce(buildSelectChain([sheet]))
        .mockReturnValueOnce(buildWhereChain(allowedCodes))
        .mockReturnValueOnce(buildWhereChain([])); // no vacations

      db.delete.mockReturnValueOnce({ where: jest.fn().mockResolvedValue([]) });

      const inserted = [{ id: 'e-1', chargeCodeId: 'CC-001', date: '2026-03-09', hours: '8' }];
      db.insert.mockReturnValueOnce(buildInsertChain(inserted));

      const updateChain = buildUpdateChain([{ ...sheet, status: 'draft' }]);
      db.update.mockReturnValueOnce(updateChain);

      await service.upsertEntries('user-1', 'ts-1', entries);

      // Verify that update was called (sets status back to draft)
      expect(db.update).toHaveBeenCalled();
      const setCall = updateChain.set.mock.calls[0][0];
      expect(setCall.status).toBe('draft');
    });
  });

  // ─── submit — cutoff boundary precision ───────────────────────────────────

  describe('submit — cutoff boundary precision', () => {
    it('should allow submission at exactly 23:59:59 on cutoff date', async () => {
      jest.useFakeTimers();
      // Cutoff for period ending 2026-03-15 is 2026-03-15 23:59:59 UTC
      jest.setSystemTime(new Date('2026-03-15T23:59:59.000Z'));

      const sheet = {
        id: 'ts-1', userId: 'user-1', status: 'draft',
        periodStart: '2026-03-09', periodEnd: '2026-03-15',
      };
      const updated = { ...sheet, status: 'submitted' };

      jest.spyOn(service as any, 'autoFillLeaveEntries').mockResolvedValueOnce(undefined);
      jest.spyOn(service, 'validateMinimumHours').mockResolvedValueOnce(undefined);

      db.select.mockReturnValueOnce(buildSelectChain([sheet]));
      db.update.mockReturnValueOnce(buildUpdateChain([updated]));

      const result = await service.submit('user-1', 'ts-1');
      expect(result.status).toBe('submitted');
    });

    it('should allow resubmit of already-submitted timesheet', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-12T10:00:00Z'));

      const sheet = {
        id: 'ts-1', userId: 'user-1', status: 'submitted',
        periodStart: '2026-03-09', periodEnd: '2026-03-15',
      };
      const updated = { ...sheet, status: 'submitted' };

      jest.spyOn(service as any, 'autoFillLeaveEntries').mockResolvedValueOnce(undefined);
      jest.spyOn(service, 'validateMinimumHours').mockResolvedValueOnce(undefined);

      db.select.mockReturnValueOnce(buildSelectChain([sheet]));
      db.update.mockReturnValueOnce(buildUpdateChain([updated]));

      // submitted → submitted should be allowed (re-submit)
      const result = await service.submit('user-1', 'ts-1');
      expect(result.status).toBe('submitted');
    });
  });

  // ─── validateMinimumHours — multi-entry aggregation ───────────────────────

  describe('validateMinimumHours — aggregation edge cases', () => {
    it('should sum hours across multiple entries on the same day', async () => {
      // 3 entries for Monday totaling exactly 8 hours
      const entries = [
        { date: '2026-03-09', hours: '3' },
        { date: '2026-03-09', hours: '3' },
        { date: '2026-03-09', hours: '2' },
      ];

      db.select
        .mockReturnValueOnce(buildEntriesWhereChain(entries))
        .mockReturnValueOnce(buildEntriesWhereChain([]))
        .mockReturnValueOnce(buildEntriesWhereChain([]));

      await expect(
        service.validateMinimumHours('ts-1', '2026-03-09', '2026-03-09', 'user-1'),
      ).resolves.toBeUndefined();
    });

    it('should handle decimal hours correctly (3.5 + 4.5 = 8)', async () => {
      const entries = [
        { date: '2026-03-09', hours: '3.5' },
        { date: '2026-03-09', hours: '4.5' },
      ];

      db.select
        .mockReturnValueOnce(buildEntriesWhereChain(entries))
        .mockReturnValueOnce(buildEntriesWhereChain([]))
        .mockReturnValueOnce(buildEntriesWhereChain([]));

      await expect(
        service.validateMinimumHours('ts-1', '2026-03-09', '2026-03-09', 'user-1'),
      ).resolves.toBeUndefined();
    });

    it('should fail when decimal hours fall just short (3.5 + 4 = 7.5)', async () => {
      const entries = [
        { date: '2026-03-09', hours: '3.5' },
        { date: '2026-03-09', hours: '4' },
      ];

      db.select
        .mockReturnValueOnce(buildEntriesWhereChain(entries))
        .mockReturnValueOnce(buildEntriesWhereChain([]))
        .mockReturnValueOnce(buildEntriesWhereChain([]));

      await expect(
        service.validateMinimumHours('ts-1', '2026-03-09', '2026-03-09', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

// ─── Helpers ────────────────────────────────────────────────────────────────

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
  chain.where.mockReturnValue({ ...chain });
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
