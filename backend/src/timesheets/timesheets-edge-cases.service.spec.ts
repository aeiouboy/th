/**
 * Edge-case tests for TimesheetsService — fills gaps not covered by existing suites:
 *
 * 1. getWeekBounds: Sunday/Monday/Saturday inputs, cross-month boundary, year boundary
 * 2. autoFillLeaveEntries: full flow via create() — holidays, half-day AM/PM suffixes,
 *    weekend skip, vacation+holiday dedup on same date, null leaveType, null holidayName
 * 3. upsertEntries: mixed valid/invalid charge codes, all-vacation-day scenario,
 *    multi-charge-code, multi-day vacation span, status reset to draft
 * 4. submit: Teams webhook called + failure resilience, re-submit, approved rejection,
 *    autoFill before validate ordering
 * 5. validateMinimumHours: 3+ entries summing on single day, overlapping vacations,
 *    multi-day vacation range
 * 6. copyFromPrevious: LEAVE-001 excluded, cross-month boundary, row count verification
 * 7. create: idempotency (no autoFill when existing)
 * 8. findByPeriod: date normalization
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
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  // ─── getWeekBounds edge cases (tested via create) ────────────────────────

  describe('getWeekBounds — Sunday input (day===0 special path)', () => {
    it('should normalize Sunday 2026-03-15 to Monday 2026-03-09', async () => {
      const sheet = {
        id: 'ts-1',
        userId: 'user-1',
        periodStart: '2026-03-09',
        periodEnd: '2026-03-15',
        status: 'draft',
      };

      db.select.mockReturnValueOnce(buildLimitChain([]));
      db.insert.mockReturnValueOnce(buildInsertChain([sheet]));
      db.select
        .mockReturnValueOnce(buildWhereChain([]))
        .mockReturnValueOnce(buildWhereChain([]));
      db.delete.mockReturnValueOnce({ where: jest.fn().mockResolvedValue([]) });

      const result = await service.create('user-1', {
        period_start: '2026-03-15',
        period_end: '2026-03-21',
      });
      expect(result.periodStart).toBe('2026-03-09');
      expect(result.periodEnd).toBe('2026-03-15');
    });

    it('should keep Monday input as-is (2026-03-09 stays 2026-03-09)', async () => {
      const sheet = {
        id: 'ts-2',
        userId: 'user-1',
        periodStart: '2026-03-09',
        periodEnd: '2026-03-15',
        status: 'draft',
      };

      db.select.mockReturnValueOnce(buildLimitChain([]));
      db.insert.mockReturnValueOnce(buildInsertChain([sheet]));
      db.select
        .mockReturnValueOnce(buildWhereChain([]))
        .mockReturnValueOnce(buildWhereChain([]));
      db.delete.mockReturnValueOnce({ where: jest.fn().mockResolvedValue([]) });

      const result = await service.create('user-1', {
        period_start: '2026-03-09',
        period_end: '2026-03-15',
      });
      expect(result.periodStart).toBe('2026-03-09');
    });

    it('should normalize Saturday 2026-03-14 to Monday 2026-03-09', async () => {
      const sheet = {
        id: 'ts-3',
        userId: 'user-1',
        periodStart: '2026-03-09',
        periodEnd: '2026-03-15',
        status: 'draft',
      };

      db.select.mockReturnValueOnce(buildLimitChain([]));
      db.insert.mockReturnValueOnce(buildInsertChain([sheet]));
      db.select
        .mockReturnValueOnce(buildWhereChain([]))
        .mockReturnValueOnce(buildWhereChain([]));
      db.delete.mockReturnValueOnce({ where: jest.fn().mockResolvedValue([]) });

      const result = await service.create('user-1', {
        period_start: '2026-03-14',
        period_end: '2026-03-20',
      });
      expect(result.periodStart).toBe('2026-03-09');
    });
  });

  describe('getWeekBounds — cross-month boundary', () => {
    it('should normalize Apr 1 (Wed) to Mon Mar 30 spanning month boundary', async () => {
      const sheet = {
        id: 'ts-xm',
        userId: 'user-1',
        periodStart: '2026-03-30',
        periodEnd: '2026-04-05',
        status: 'draft',
      };

      db.select.mockReturnValueOnce(buildLimitChain([]));
      db.insert.mockReturnValueOnce(buildInsertChain([sheet]));
      db.select
        .mockReturnValueOnce(buildWhereChain([]))
        .mockReturnValueOnce(buildWhereChain([]));
      db.delete.mockReturnValueOnce({ where: jest.fn().mockResolvedValue([]) });

      const result = await service.create('user-1', { period_start: '2026-04-01', period_end: '2026-04-07' });
      expect(result.periodStart).toBe('2026-03-30');
      expect(result.periodEnd).toBe('2026-04-05');
    });
  });

  describe('getWeekBounds — year boundary', () => {
    it('should normalize Jan 1 2026 (Thu) to Mon Dec 29 2025', async () => {
      const sheet = {
        id: 'ts-yr',
        userId: 'user-1',
        periodStart: '2025-12-29',
        periodEnd: '2026-01-04',
        status: 'draft',
      };

      db.select.mockReturnValueOnce(buildLimitChain([]));
      db.insert.mockReturnValueOnce(buildInsertChain([sheet]));
      db.select
        .mockReturnValueOnce(buildWhereChain([]))
        .mockReturnValueOnce(buildWhereChain([]));
      db.delete.mockReturnValueOnce({ where: jest.fn().mockResolvedValue([]) });

      const result = await service.create('user-1', { period_start: '2026-01-01', period_end: '2026-01-07' });
      expect(result.periodStart).toBe('2025-12-29');
      expect(result.periodEnd).toBe('2026-01-04');
    });
  });

  // ─── autoFillLeaveEntries (via create — full flow, no spyOn) ─────────────

  describe('autoFillLeaveEntries — full flow via create()', () => {
    it('should insert LEAVE-001 entries for approved full-day vacation', async () => {
      const sheet = {
        id: 'ts-auto',
        userId: 'user-1',
        periodStart: '2026-03-09',
        periodEnd: '2026-03-15',
        status: 'draft',
      };

      db.select.mockReturnValueOnce(buildLimitChain([]));
      db.insert.mockReturnValueOnce(buildInsertChain([sheet]));

      db.select.mockReturnValueOnce(buildWhereChain([
        { startDate: '2026-03-10', endDate: '2026-03-11', leaveType: 'full_day' },
      ]));
      db.select.mockReturnValueOnce(buildWhereChain([]));
      db.delete.mockReturnValueOnce({ where: jest.fn().mockResolvedValue([]) });
      db.insert.mockReturnValueOnce(buildInsertChain([]));

      await service.create('user-1', { period_start: '2026-03-09', period_end: '2026-03-15' });

      expect(db.insert).toHaveBeenCalledTimes(2);
      const secondInsertChain = db.insert.mock.results[1]?.value;
      expect(secondInsertChain.values).toHaveBeenCalled();
    });

    it('should include AM suffix for half_am leave type', async () => {
      const sheet = {
        id: 'ts-half',
        userId: 'user-1',
        periodStart: '2026-03-09',
        periodEnd: '2026-03-15',
        status: 'draft',
      };

      db.select.mockReturnValueOnce(buildLimitChain([]));
      db.insert.mockReturnValueOnce(buildInsertChain([sheet]));

      db.select.mockReturnValueOnce(buildWhereChain([
        { startDate: '2026-03-09', endDate: '2026-03-09', leaveType: 'half_am' },
      ]));
      db.select.mockReturnValueOnce(buildWhereChain([]));
      db.delete.mockReturnValueOnce({ where: jest.fn().mockResolvedValue([]) });

      const insertValues: any[] = [];
      db.insert.mockReturnValueOnce({
        values: jest.fn().mockImplementation((vals: any) => {
          insertValues.push(...vals);
          return Promise.resolve();
        }),
      });

      await service.create('user-1', { period_start: '2026-03-09', period_end: '2026-03-15' });

      expect(insertValues.length).toBeGreaterThan(0);
      const leaveEntry = insertValues.find((v: any) => v.chargeCodeId === 'LEAVE-001');
      expect(leaveEntry).toBeDefined();
      expect(leaveEntry.hours).toBe('4');
      expect(leaveEntry.description).toContain('(AM)');
    });

    it('should skip weekends when inserting leave entries', async () => {
      const sheet = {
        id: 'ts-wknd',
        userId: 'user-1',
        periodStart: '2026-03-09',
        periodEnd: '2026-03-15',
        status: 'draft',
      };

      db.select.mockReturnValueOnce(buildLimitChain([]));
      db.insert.mockReturnValueOnce(buildInsertChain([sheet]));

      db.select.mockReturnValueOnce(buildWhereChain([
        { startDate: '2026-03-09', endDate: '2026-03-15', leaveType: 'full_day' },
      ]));
      db.select.mockReturnValueOnce(buildWhereChain([]));
      db.delete.mockReturnValueOnce({ where: jest.fn().mockResolvedValue([]) });

      const insertValues: any[] = [];
      db.insert.mockReturnValueOnce({
        values: jest.fn().mockImplementation((vals: any) => {
          insertValues.push(...vals);
          return Promise.resolve();
        }),
      });

      await service.create('user-1', { period_start: '2026-03-09', period_end: '2026-03-15' });

      const leaveDates = insertValues
        .filter((v: any) => v.chargeCodeId === 'LEAVE-001')
        .map((v: any) => v.date);

      expect(leaveDates).toHaveLength(5);
      expect(leaveDates).not.toContain('2026-03-14');
      expect(leaveDates).not.toContain('2026-03-15');
    });

    it('should not duplicate when vacation and holiday overlap on same date', async () => {
      const sheet = {
        id: 'ts-dedup',
        userId: 'user-1',
        periodStart: '2026-03-09',
        periodEnd: '2026-03-15',
        status: 'draft',
      };

      db.select.mockReturnValueOnce(buildLimitChain([]));
      db.insert.mockReturnValueOnce(buildInsertChain([sheet]));

      db.select.mockReturnValueOnce(buildWhereChain([
        { startDate: '2026-03-11', endDate: '2026-03-11', leaveType: 'full_day' },
      ]));
      db.select.mockReturnValueOnce(buildWhereChain([
        { date: '2026-03-11', holidayName: 'National Day' },
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

      const wednesdayEntries = insertValues.filter(
        (v: any) => v.chargeCodeId === 'LEAVE-001' && v.date === '2026-03-11',
      );
      expect(wednesdayEntries).toHaveLength(1);
      expect(wednesdayEntries[0].description).toBe('Annual Leave');
    });

    it('should insert holiday entries with holiday name as description', async () => {
      const sheet = {
        id: 'ts-hol',
        userId: 'user-1',
        periodStart: '2026-03-09',
        periodEnd: '2026-03-15',
        status: 'draft',
      };

      db.select.mockReturnValueOnce(buildLimitChain([]));
      db.insert.mockReturnValueOnce(buildInsertChain([sheet]));

      db.select.mockReturnValueOnce(buildWhereChain([]));
      db.select.mockReturnValueOnce(buildWhereChain([
        { date: '2026-03-11', holidayName: 'Makha Bucha Day' },
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

      const holEntry = insertValues.find(
        (v: any) => v.date === '2026-03-11' && v.chargeCodeId === 'LEAVE-001',
      );
      expect(holEntry).toBeDefined();
      expect(holEntry.hours).toBe('8');
      expect(holEntry.description).toBe('Makha Bucha Day');
    });

    it('should not insert any leave entries when no vacations and no holidays', async () => {
      const sheet = {
        id: 'ts-none',
        userId: 'user-1',
        periodStart: '2026-03-09',
        periodEnd: '2026-03-15',
        status: 'draft',
      };

      db.select.mockReturnValueOnce(buildLimitChain([]));
      db.insert.mockReturnValueOnce(buildInsertChain([sheet]));

      db.select.mockReturnValueOnce(buildWhereChain([]));
      db.select.mockReturnValueOnce(buildWhereChain([]));
      db.delete.mockReturnValueOnce({ where: jest.fn().mockResolvedValue([]) });

      await service.create('user-1', { period_start: '2026-03-09', period_end: '2026-03-15' });

      expect(db.insert).toHaveBeenCalledTimes(1);
    });
  });

  // ─── autoFillLeaveEntries — half_pm suffix ────────────────────────────────

  describe('autoFillLeaveEntries — half_pm suffix', () => {
    it('should include PM suffix for half_pm leave type', async () => {
      const sheet = {
        id: 'ts-pm',
        userId: 'user-1',
        periodStart: '2026-03-09',
        periodEnd: '2026-03-15',
        status: 'draft',
      };

      db.select.mockReturnValueOnce(buildLimitChain([]));
      db.insert.mockReturnValueOnce(buildInsertChain([sheet]));

      db.select.mockReturnValueOnce(buildWhereChain([
        { startDate: '2026-03-10', endDate: '2026-03-10', leaveType: 'half_pm' },
      ]));
      db.select.mockReturnValueOnce(buildWhereChain([]));
      db.delete.mockReturnValueOnce({ where: jest.fn().mockResolvedValue([]) });

      const insertValues: any[] = [];
      db.insert.mockReturnValueOnce({
        values: jest.fn().mockImplementation((vals: any) => {
          insertValues.push(...vals);
          return Promise.resolve();
        }),
      });

      await service.create('user-1', { period_start: '2026-03-09', period_end: '2026-03-15' });

      const leaveEntry = insertValues.find(
        (v: any) => v.chargeCodeId === 'LEAVE-001' && v.date === '2026-03-10',
      );
      expect(leaveEntry).toBeDefined();
      expect(leaveEntry.hours).toBe('4');
      expect(leaveEntry.description).toBe('Annual Leave (PM)');
    });
  });

  // ─── autoFillLeaveEntries — null holidayName fallback ─────────────────────

  describe('autoFillLeaveEntries — null holiday name', () => {
    it('should default to "Public Holiday" when holidayName is null', async () => {
      const sheet = {
        id: 'ts-nullhol',
        userId: 'user-1',
        periodStart: '2026-03-09',
        periodEnd: '2026-03-15',
        status: 'draft',
      };

      db.select.mockReturnValueOnce(buildLimitChain([]));
      db.insert.mockReturnValueOnce(buildInsertChain([sheet]));

      db.select.mockReturnValueOnce(buildWhereChain([]));
      db.select.mockReturnValueOnce(buildWhereChain([
        { date: '2026-03-12', holidayName: null },
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

      const holEntry = insertValues.find(
        (v: any) => v.date === '2026-03-12' && v.chargeCodeId === 'LEAVE-001',
      );
      expect(holEntry).toBeDefined();
      expect(holEntry.description).toBe('Public Holiday');
    });
  });

  // ─── autoFillLeaveEntries — weekend holiday skip ──────────────────────────

  describe('autoFillLeaveEntries — weekend holiday skip', () => {
    it('should skip holiday that falls on Saturday', async () => {
      const sheet = {
        id: 'ts-wkndhol',
        userId: 'user-1',
        periodStart: '2026-03-09',
        periodEnd: '2026-03-15',
        status: 'draft',
      };

      db.select.mockReturnValueOnce(buildLimitChain([]));
      db.insert.mockReturnValueOnce(buildInsertChain([sheet]));

      db.select.mockReturnValueOnce(buildWhereChain([]));
      db.select.mockReturnValueOnce(buildWhereChain([
        { date: '2026-03-14', holidayName: 'Weekend Holiday' },
      ]));
      db.delete.mockReturnValueOnce({ where: jest.fn().mockResolvedValue([]) });

      await service.create('user-1', { period_start: '2026-03-09', period_end: '2026-03-15' });

      expect(db.insert).toHaveBeenCalledTimes(1);
    });
  });

  // ─── autoFillLeaveEntries — null leaveType defaults to full_day ───────────

  describe('autoFillLeaveEntries — null leaveType', () => {
    it('should treat null/undefined leaveType as full_day (8h)', async () => {
      const sheet = {
        id: 'ts-nulltype',
        userId: 'user-1',
        periodStart: '2026-03-09',
        periodEnd: '2026-03-15',
        status: 'draft',
      };

      db.select.mockReturnValueOnce(buildLimitChain([]));
      db.insert.mockReturnValueOnce(buildInsertChain([sheet]));

      db.select.mockReturnValueOnce(buildWhereChain([
        { startDate: '2026-03-09', endDate: '2026-03-09', leaveType: null },
      ]));
      db.select.mockReturnValueOnce(buildWhereChain([]));
      db.delete.mockReturnValueOnce({ where: jest.fn().mockResolvedValue([]) });

      const insertValues: any[] = [];
      db.insert.mockReturnValueOnce({
        values: jest.fn().mockImplementation((vals: any) => {
          insertValues.push(...vals);
          return Promise.resolve();
        }),
      });

      await service.create('user-1', { period_start: '2026-03-09', period_end: '2026-03-15' });

      const leaveEntry = insertValues.find(
        (v: any) => v.chargeCodeId === 'LEAVE-001' && v.date === '2026-03-09',
      );
      expect(leaveEntry).toBeDefined();
      expect(leaveEntry.hours).toBe('8');
      expect(leaveEntry.description).toBe('Annual Leave');
    });
  });

  // ─── upsertEntries — mixed valid/invalid charge codes ────────────────────

  describe('upsertEntries — partial charge code rejection', () => {
    it('should reject entire batch when any charge code is not assigned', async () => {
      const sheet = {
        id: 'ts-1',
        userId: 'user-1',
        status: 'draft',
        periodStart: '2026-03-09',
        periodEnd: '2026-03-15',
      };
      const entries = [
        { charge_code_id: 'CC-001', date: '2026-03-09', hours: 4 },
        { charge_code_id: 'CC-BAD', date: '2026-03-09', hours: 4 },
      ];

      db.select
        .mockReturnValueOnce(buildLimitChain([sheet]))
        .mockReturnValueOnce(buildWhereChain([{ chargeCodeId: 'CC-001' }]));

      await expect(
        service.upsertEntries('user-1', 'ts-1', entries),
      ).rejects.toThrow(BadRequestException);

      try {
        db.select
          .mockReturnValueOnce(buildLimitChain([sheet]))
          .mockReturnValueOnce(buildWhereChain([{ chargeCodeId: 'CC-001' }]));
        await service.upsertEntries('user-1', 'ts-1', entries);
      } catch (e: any) {
        expect(e.message).toContain('CC-BAD');
      }
    });

    it('should return only leave entries when all user entries are on vacation days', async () => {
      const sheet = {
        id: 'ts-1',
        userId: 'user-1',
        status: 'draft',
        periodStart: '2026-03-09',
        periodEnd: '2026-03-15',
      };
      const entries = [
        { charge_code_id: 'CC-001', date: '2026-03-09', hours: 8 },
      ];
      const allowedCodes = [{ chargeCodeId: 'CC-001' }];
      const approvedVacations = [
        { startDate: '2026-03-09', endDate: '2026-03-09', leaveType: 'full_day' },
      ];

      db.select
        .mockReturnValueOnce(buildLimitChain([sheet]))
        .mockReturnValueOnce(buildWhereChain(allowedCodes))
        .mockReturnValueOnce(buildWhereChain(approvedVacations));

      db.delete.mockReturnValueOnce({ where: jest.fn().mockResolvedValue([]) });

      const existingLeave = [
        { id: 'leave-1', chargeCodeId: 'LEAVE-001', date: '2026-03-09', hours: '8' },
      ];
      db.select.mockReturnValueOnce(buildWhereChain(existingLeave));

      const result = await service.upsertEntries('user-1', 'ts-1', entries);
      expect(result).toEqual(existingLeave);
      expect(db.insert).not.toHaveBeenCalled();
    });
  });

  describe('upsertEntries — multiple charge codes', () => {
    it('should accept entries with 3 different valid charge codes in one upsert', async () => {
      const sheet = {
        id: 'ts-1', userId: 'user-1', status: 'draft',
        periodStart: '2026-03-09', periodEnd: '2026-03-15',
      };
      const entries = [
        { charge_code_id: 'CC-001', date: '2026-03-09', hours: 4 },
        { charge_code_id: 'CC-002', date: '2026-03-09', hours: 2 },
        { charge_code_id: 'CC-003', date: '2026-03-09', hours: 2 },
      ];

      db.select
        .mockReturnValueOnce(buildLimitChain([sheet]))
        .mockReturnValueOnce(buildWhereChain([
          { chargeCodeId: 'CC-001' },
          { chargeCodeId: 'CC-002' },
          { chargeCodeId: 'CC-003' },
        ]))
        .mockReturnValueOnce(buildWhereChain([]));

      db.delete.mockReturnValueOnce({ where: jest.fn().mockResolvedValue([]) });

      const inserted = entries.map((e, i) => ({
        id: `e-${i}`, chargeCodeId: e.charge_code_id, date: e.date, hours: String(e.hours),
      }));
      db.insert.mockReturnValueOnce(buildInsertChain(inserted));
      db.update.mockReturnValueOnce(buildUpdateChain([sheet]));

      const result = await service.upsertEntries('user-1', 'ts-1', entries);
      expect(result).toHaveLength(3);
    });
  });

  describe('upsertEntries — multi-day vacation spanning period boundary', () => {
    it('should only filter vacation dates within the timesheet period', async () => {
      const sheet = {
        id: 'ts-1', userId: 'user-1', status: 'draft',
        periodStart: '2026-03-09', periodEnd: '2026-03-15',
      };
      const entries = [
        { charge_code_id: 'CC-001', date: '2026-03-09', hours: 8 },
        { charge_code_id: 'CC-001', date: '2026-03-10', hours: 8 },
      ];
      const allowedCodes = [{ chargeCodeId: 'CC-001' }];
      const vacations = [
        { startDate: '2026-03-06', endDate: '2026-03-09', leaveType: 'full_day' },
      ];

      db.select
        .mockReturnValueOnce(buildLimitChain([sheet]))
        .mockReturnValueOnce(buildWhereChain(allowedCodes))
        .mockReturnValueOnce(buildWhereChain(vacations));

      db.delete.mockReturnValueOnce({ where: jest.fn().mockResolvedValue([]) });

      const inserted = [{ id: 'e-1', chargeCodeId: 'CC-001', date: '2026-03-10', hours: '8' }];
      db.insert.mockReturnValueOnce(buildInsertChain(inserted));
      db.update.mockReturnValueOnce(buildUpdateChain([sheet]));

      const result = await service.upsertEntries('user-1', 'ts-1', entries);
      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2026-03-10');
    });
  });

  // ─── upsertEntries — status reset to draft on edit ───────────────────────

  describe('upsertEntries — status reset', () => {
    it('should reset status to draft when editing a submitted timesheet', async () => {
      const sheet = {
        id: 'ts-1',
        userId: 'user-1',
        status: 'submitted',
        periodStart: '2026-03-09',
        periodEnd: '2026-03-15',
      };
      const entries = [
        { charge_code_id: 'CC-001', date: '2026-03-09', hours: 8 },
      ];
      const allowedCodes = [{ chargeCodeId: 'CC-001' }];

      db.select
        .mockReturnValueOnce(buildLimitChain([sheet]))
        .mockReturnValueOnce(buildWhereChain(allowedCodes))
        .mockReturnValueOnce(buildWhereChain([]));

      db.delete.mockReturnValueOnce({ where: jest.fn().mockResolvedValue([]) });

      const inserted = [{ id: 'e-1', chargeCodeId: 'CC-001', date: '2026-03-09', hours: '8' }];
      db.insert.mockReturnValueOnce(buildInsertChain(inserted));

      const updateChain = buildUpdateChain([{ ...sheet, status: 'draft' }]);
      db.update.mockReturnValueOnce(updateChain);

      await service.upsertEntries('user-1', 'ts-1', entries);

      expect(db.update).toHaveBeenCalledTimes(1);
    });

    it('should verify set() receives status: draft and updatedAt explicitly', async () => {
      const sheet = {
        id: 'ts-1',
        userId: 'user-1',
        status: 'approved',
        periodStart: '2026-03-09',
        periodEnd: '2026-03-15',
      };
      const entries = [
        { charge_code_id: 'CC-001', date: '2026-03-09', hours: 8 },
      ];
      const allowedCodes = [{ chargeCodeId: 'CC-001' }];

      db.select
        .mockReturnValueOnce(buildLimitChain([sheet]))
        .mockReturnValueOnce(buildWhereChain(allowedCodes))
        .mockReturnValueOnce(buildWhereChain([]));

      db.delete.mockReturnValueOnce({ where: jest.fn().mockResolvedValue([]) });

      const inserted = [{ id: 'e-1', chargeCodeId: 'CC-001', date: '2026-03-09', hours: '8' }];
      db.insert.mockReturnValueOnce(buildInsertChain(inserted));

      const updateChain = buildUpdateChain([{ ...sheet, status: 'draft' }]);
      db.update.mockReturnValueOnce(updateChain);

      await service.upsertEntries('user-1', 'ts-1', entries);

      const setArg = updateChain.set.mock.calls[0][0];
      expect(setArg.status).toBe('draft');
      expect(setArg.updatedAt).toBeInstanceOf(Date);
    });
  });

  // ─── submit — Teams webhook ──────────────────────────────────────────────

  describe('submit — Teams webhook behavior', () => {
    it('should call Teams webhook after successful submission', async () => {
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - today.getDay() + 1);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const fmt = (d: Date) => d.toISOString().split('T')[0];

      const sheet = {
        id: 'ts-1',
        userId: 'user-1',
        status: 'draft',
        periodStart: fmt(monday),
        periodEnd: fmt(sunday),
      };
      const updated = { ...sheet, status: 'submitted' };

      jest.spyOn(service as any, 'autoFillLeaveEntries').mockResolvedValueOnce(undefined);
      jest.spyOn(service, 'validateMinimumHours').mockResolvedValueOnce(undefined);

      db.select.mockReturnValueOnce(buildLimitChain([sheet]));
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

    it('should succeed even when Teams webhook throws', async () => {
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - today.getDay() + 1);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const fmt = (d: Date) => d.toISOString().split('T')[0];

      const sheet = {
        id: 'ts-1',
        userId: 'user-1',
        status: 'draft',
        periodStart: fmt(monday),
        periodEnd: fmt(sunday),
      };
      const updated = { ...sheet, status: 'submitted' };

      jest.spyOn(service as any, 'autoFillLeaveEntries').mockResolvedValueOnce(undefined);
      jest.spyOn(service, 'validateMinimumHours').mockResolvedValueOnce(undefined);

      db.select.mockReturnValueOnce(buildLimitChain([sheet]));
      db.update.mockReturnValueOnce(buildUpdateChain([updated]));

      teamsWebhook.sendCard.mockRejectedValueOnce(new Error('Teams API down'));

      const result = await service.submit('user-1', 'ts-1');
      expect(result.status).toBe('submitted');
    });
  });

  // ─── submit — re-submit from submitted status ────────────────────────────

  describe('submit — re-submit from submitted status', () => {
    it('should allow re-submitting an already-submitted timesheet', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-14T10:00:00Z'));

      const sheet = {
        id: 'ts-1', userId: 'user-1', status: 'submitted',
        periodStart: '2026-03-09', periodEnd: '2026-03-15',
      };
      const updated = { ...sheet, status: 'submitted', submittedAt: new Date() };

      jest.spyOn(service as any, 'autoFillLeaveEntries').mockResolvedValueOnce(undefined);
      jest.spyOn(service, 'validateMinimumHours').mockResolvedValueOnce(undefined);

      db.select.mockReturnValueOnce(buildLimitChain([sheet]));
      db.update.mockReturnValueOnce(buildUpdateChain([updated]));

      const result = await service.submit('user-1', 'ts-1');
      expect(result.status).toBe('submitted');
    });
  });

  // ─── submit — approved status is rejected ─────────────────────────────────

  describe('submit — approved status is rejected', () => {
    it('should throw BadRequestException when status is approved', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', status: 'approved' };
      db.select.mockReturnValueOnce(buildLimitChain([sheet]));

      await expect(service.submit('user-1', 'ts-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── submit — autoFill before validate ordering ───────────────────────────

  describe('submit — autoFillLeaveEntries runs before validateMinimumHours', () => {
    it('should call autoFill before validate to ensure leave entries are synced', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-14T10:00:00Z'));

      const sheet = {
        id: 'ts-1', userId: 'user-1', status: 'draft',
        periodStart: '2026-03-09', periodEnd: '2026-03-15',
      };
      const updated = { ...sheet, status: 'submitted' };

      const callOrder: string[] = [];
      jest.spyOn(service as any, 'autoFillLeaveEntries').mockImplementation(async () => {
        callOrder.push('autoFill');
      });
      jest.spyOn(service, 'validateMinimumHours').mockImplementation(async () => {
        callOrder.push('validate');
      });

      db.select.mockReturnValueOnce(buildLimitChain([sheet]));
      db.update.mockReturnValueOnce(buildUpdateChain([updated]));

      await service.submit('user-1', 'ts-1');
      expect(callOrder).toEqual(['autoFill', 'validate']);
    });
  });

  // ─── submit — cutoff edge: exactly at boundary ───────────────────────────

  describe('submit — cutoff boundary precision', () => {
    it('should allow submission at exactly 23:59:58 on cutoff date', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-15T23:59:58Z'));

      const sheet = {
        id: 'ts-1',
        userId: 'user-1',
        status: 'draft',
        periodStart: '2026-03-09',
        periodEnd: '2026-03-15',
      };
      const updated = { ...sheet, status: 'submitted' };

      jest.spyOn(service as any, 'autoFillLeaveEntries').mockResolvedValueOnce(undefined);
      jest.spyOn(service, 'validateMinimumHours').mockResolvedValueOnce(undefined);

      db.select.mockReturnValueOnce(buildLimitChain([sheet]));
      db.update.mockReturnValueOnce(buildUpdateChain([updated]));

      const result = await service.submit('user-1', 'ts-1');
      expect(result.status).toBe('submitted');
    });

    it('should reject submission 1 second after cutoff', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-16T00:00:00Z'));

      const sheet = {
        id: 'ts-1',
        userId: 'user-1',
        status: 'draft',
        periodStart: '2026-03-09',
        periodEnd: '2026-03-15',
      };

      jest.spyOn(service as any, 'autoFillLeaveEntries').mockResolvedValueOnce(undefined);

      db.select.mockReturnValueOnce(buildLimitChain([sheet]));

      await expect(service.submit('user-1', 'ts-1')).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── validateMinimumHours — multi-entry summation ───────────────────────

  describe('validateMinimumHours — multi-entry summation', () => {
    it('should pass when 3 entries sum to exactly 8h on one day', async () => {
      const entries = [
        { date: '2026-03-09', hours: '3' },
        { date: '2026-03-09', hours: '3' },
        { date: '2026-03-09', hours: '2' },
        { date: '2026-03-10', hours: '8' },
        { date: '2026-03-11', hours: '8' },
        { date: '2026-03-12', hours: '8' },
        { date: '2026-03-13', hours: '8' },
      ];

      db.select.mockReturnValueOnce(buildEntriesWhereChain(entries));
      db.select.mockReturnValueOnce(buildEntriesWhereChain([]));
      db.select.mockReturnValueOnce(buildEntriesWhereChain([]));

      await expect(
        service.validateMinimumHours('ts-1', '2026-03-09', '2026-03-15', 'user-1'),
      ).resolves.toBeUndefined();
    });

    it('should fail when 3 entries sum to less than 8h on one day', async () => {
      const entries = [
        { date: '2026-03-09', hours: '2' },
        { date: '2026-03-09', hours: '2' },
        { date: '2026-03-09', hours: '3' },
        { date: '2026-03-10', hours: '8' },
        { date: '2026-03-11', hours: '8' },
        { date: '2026-03-12', hours: '8' },
        { date: '2026-03-13', hours: '8' },
      ];

      db.select.mockReturnValueOnce(buildEntriesWhereChain(entries));
      db.select.mockReturnValueOnce(buildEntriesWhereChain([]));
      db.select.mockReturnValueOnce(buildEntriesWhereChain([]));

      await expect(
        service.validateMinimumHours('ts-1', '2026-03-09', '2026-03-15', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow weekend entries without minimum hour requirement', async () => {
      const entries = [
        { date: '2026-03-09', hours: '8' },
        { date: '2026-03-10', hours: '8' },
        { date: '2026-03-11', hours: '8' },
        { date: '2026-03-12', hours: '8' },
        { date: '2026-03-13', hours: '8' },
        { date: '2026-03-14', hours: '2' },
      ];

      db.select.mockReturnValueOnce(buildEntriesWhereChain(entries));
      db.select.mockReturnValueOnce(buildEntriesWhereChain([]));
      db.select.mockReturnValueOnce(buildEntriesWhereChain([]));

      await expect(
        service.validateMinimumHours('ts-1', '2026-03-09', '2026-03-15', 'user-1'),
      ).resolves.toBeUndefined();
    });
  });

  // ─── validateMinimumHours — overlapping vacations ─────────────────────────

  describe('validateMinimumHours — overlapping vacations (Math.max)', () => {
    it('should take max leave hours when half_am and full_day overlap on same day', async () => {
      const entries = [
        { date: '2026-03-09', hours: '2' },
        { date: '2026-03-10', hours: '8' },
        { date: '2026-03-11', hours: '8' },
        { date: '2026-03-12', hours: '8' },
        { date: '2026-03-13', hours: '8' },
      ];

      db.select.mockReturnValueOnce(buildEntriesWhereChain(entries));
      db.select.mockReturnValueOnce(buildEntriesWhereChain([]));
      db.select.mockReturnValueOnce(buildEntriesWhereChain([
        { startDate: '2026-03-09', endDate: '2026-03-09', leaveType: 'half_am' },
        { startDate: '2026-03-09', endDate: '2026-03-09', leaveType: 'full_day' },
      ]));

      await expect(
        service.validateMinimumHours('ts-1', '2026-03-09', '2026-03-15', 'user-1'),
      ).resolves.toBeUndefined();
    });
  });

  describe('validateMinimumHours — multi-day vacation range', () => {
    it('should skip all weekdays in a Mon-Wed full-day vacation range', async () => {
      const entries = [
        { date: '2026-03-12', hours: '8' },
        { date: '2026-03-13', hours: '8' },
      ];

      db.select.mockReturnValueOnce(buildEntriesWhereChain(entries));
      db.select.mockReturnValueOnce(buildEntriesWhereChain([]));
      db.select.mockReturnValueOnce(buildEntriesWhereChain([
        { startDate: '2026-03-09', endDate: '2026-03-11', leaveType: 'full_day' },
      ]));

      await expect(
        service.validateMinimumHours('ts-1', '2026-03-09', '2026-03-15', 'user-1'),
      ).resolves.toBeUndefined();
    });
  });

  // ─── copyFromPrevious — LEAVE-001 exclusion ──────────────────────────────

  describe('copyFromPrevious — LEAVE-001 handling', () => {
    it('should return empty when previous entries are only LEAVE-001', async () => {
      const sheet = {
        id: 'ts-1',
        userId: 'user-1',
        status: 'draft',
        periodStart: '2026-03-09',
        periodEnd: '2026-03-15',
      };
      const prevSheet = {
        id: 'ts-prev',
        userId: 'user-1',
        periodStart: '2026-03-02',
        periodEnd: '2026-03-08',
      };

      db.select
        .mockReturnValueOnce(buildLimitChain([sheet]))
        .mockReturnValueOnce(buildLimitChain([]))
        .mockReturnValueOnce(buildLimitChain([prevSheet]))
        .mockReturnValueOnce(buildGroupByChain([]));

      const result = await service.copyFromPrevious('user-1', 'ts-1');
      expect(result.entries).toHaveLength(0);
      expect(result.message).toContain('No entries to copy');
    });
  });

  // ─── copyFromPrevious — cross-month boundary ──────────────────────────────

  describe('copyFromPrevious — cross-month previous week', () => {
    it('should find previous week correctly when current period starts in Apr (prev is Mar 30)', async () => {
      const sheet = {
        id: 'ts-1', userId: 'user-1', status: 'draft',
        periodStart: '2026-04-06', periodEnd: '2026-04-12',
      };
      const prevSheet = {
        id: 'ts-prev', userId: 'user-1',
        periodStart: '2026-03-30', periodEnd: '2026-04-05',
      };
      const prevEntries = [
        { chargeCodeId: 'CC-001', chargeCodeName: 'Project Alpha', isBillable: true },
      ];

      db.select
        .mockReturnValueOnce(buildLimitChain([sheet]))
        .mockReturnValueOnce(buildLimitChain([]))
        .mockReturnValueOnce(buildLimitChain([prevSheet]))
        .mockReturnValueOnce(buildGroupByChain(prevEntries));

      db.insert.mockReturnValueOnce(buildInsertChain([]));

      const result = await service.copyFromPrevious('user-1', 'ts-1');
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].chargeCodeId).toBe('CC-001');
    });
  });

  // ─── copyFromPrevious — exact row count verification ──────────────────────

  describe('copyFromPrevious — row count matches weekdays × charge codes', () => {
    it('should create exactly 5 × 3 = 15 rows for 3 charge codes', async () => {
      const sheet = {
        id: 'ts-1',
        userId: 'user-1',
        status: 'draft',
        periodStart: '2026-03-09',
        periodEnd: '2026-03-15',
      };
      const prevSheet = {
        id: 'ts-prev',
        userId: 'user-1',
        periodStart: '2026-03-02',
        periodEnd: '2026-03-08',
      };
      const prevEntries = [
        { chargeCodeId: 'PRJ-001', chargeCodeName: 'Alpha', isBillable: true },
        { chargeCodeId: 'PRJ-002', chargeCodeName: 'Beta', isBillable: true },
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

      expect(result.entries).toHaveLength(3);
      expect(insertChain.values).toHaveBeenCalled();

      const rows = insertChain.values.mock.calls[0][0];
      expect(rows).toHaveLength(15);
      expect(rows.every((r: any) => r.hours === '0')).toBe(true);
      const uniqueDates = [...new Set(rows.map((r: any) => r.date))];
      expect(uniqueDates).toHaveLength(5);
      expect(uniqueDates).toContain('2026-03-09');
      expect(uniqueDates).toContain('2026-03-13');
      expect(uniqueDates).not.toContain('2026-03-14');
      expect(uniqueDates).not.toContain('2026-03-15');
    });
  });

  // ─── create — idempotency ─────────────────────────────────────────────────

  describe('create — idempotency', () => {
    it('should not call insert or autoFillLeaveEntries when timesheet already exists', async () => {
      const existing = { id: 'ts-existing', userId: 'user-1', periodStart: '2026-03-09', status: 'submitted' };
      db.select.mockReturnValueOnce(buildLimitChain([existing]));

      const autoFillSpy = jest.spyOn(service as any, 'autoFillLeaveEntries');

      const result = await service.create('user-1', { period_start: '2026-03-09', period_end: '2026-03-15' });
      expect(result).toEqual(existing);
      expect(db.insert).not.toHaveBeenCalled();
      expect(autoFillSpy).not.toHaveBeenCalled();
    });
  });

  // ─── findByPeriod — date normalization ────────────────────────────────────

  describe('findByPeriod — normalizes mid-week date', () => {
    it('should normalize Thursday input to query for Monday period', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', periodStart: '2026-03-09' };
      db.select.mockReturnValueOnce(buildLimitChain([sheet]));

      const result = await service.findByPeriod('user-1', '2026-03-12');
      expect(result).toEqual(sheet);
    });
  });
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

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
