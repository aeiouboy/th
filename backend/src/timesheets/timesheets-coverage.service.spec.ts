/**
 * Coverage tests for previously untested TimesheetsService methods:
 * - getEntries
 * - getUserChargeCodes (3-source merge: assigned + timesheet history + LEAVE-001)
 * - submit cutoff enforcement (time-sensitive)
 * - upsertEntries edge cases (status 'submitted'/'approved' allows edit)
 */
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { TimesheetsService } from './timesheets.service';
import { CalendarService } from '../calendar/calendar.service';
import { TeamsWebhookService } from '../integrations/teams-webhook.service';
import { DRIZZLE } from '../database/drizzle.provider';

describe('TimesheetsService — Coverage', () => {
  let service: TimesheetsService;
  let db: any;

  beforeEach(async () => {
    db = {
      select: jest.fn(),
      selectDistinct: jest.fn(),
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

  // ─── getEntries ─────────────────────────────────────────────────────────────

  describe('getEntries', () => {
    it('should throw NotFoundException when timesheet does not exist', async () => {
      db.select.mockReturnValueOnce(buildLimitChain([]));
      await expect(service.getEntries('user-1', 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('should return entries with charge code info when timesheet exists', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', periodStart: '2026-03-09', status: 'draft' };
      const entries = [
        { id: 'e-1', timesheetId: 'ts-1', chargeCodeId: 'CC-001', date: '2026-03-09', hours: '8', chargeCodeName: 'Project Alpha', isBillable: true },
        { id: 'e-2', timesheetId: 'ts-1', chargeCodeId: 'CC-002', date: '2026-03-10', hours: '4', chargeCodeName: 'Admin', isBillable: false },
      ];

      db.select
        .mockReturnValueOnce(buildLimitChain([sheet]))       // find sheet
        .mockReturnValueOnce(buildEntriesWhereChain(entries)); // fetchEntriesWithChargeCodes

      const result = await service.getEntries('user-1', 'ts-1');
      expect(result).toHaveLength(2);
      expect(result[0].chargeCodeName).toBe('Project Alpha');
      expect(result[1].isBillable).toBe(false);
    });

    it('should return empty array when timesheet has no entries', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', status: 'draft' };
      db.select
        .mockReturnValueOnce(buildLimitChain([sheet]))
        .mockReturnValueOnce(buildEntriesWhereChain([]));

      const result = await service.getEntries('user-1', 'ts-1');
      expect(result).toEqual([]);
    });
  });

  // ─── getUserChargeCodes ────────────────────────────────────────────────────

  describe('getUserChargeCodes', () => {
    it('should return assigned charge codes', async () => {
      const assignedCodes = [
        { chargeCodeId: 'PRJ-001', name: 'Project Alpha', isBillable: true, programName: 'Prog-A', activityCategory: 'Dev' },
      ];

      // 1) assigned codes via chargeCodeUsers
      db.select.mockReturnValueOnce(buildInnerJoinWhereChain(assignedCodes));
      // 2) timesheet history codes
      db.selectDistinct.mockReturnValueOnce(buildInnerJoinWhereChain([]));
      // No LEAVE-001 lookup needed since it's not in existing set — wait, let me check
      // Actually: existingIds won't have LEAVE-001, so it queries for it
      db.select.mockReturnValueOnce(buildLimitChain([
        { chargeCodeId: 'LEAVE-001', name: 'Annual Leave', isBillable: false, programName: null, activityCategory: null },
      ]));

      const result = await service.getUserChargeCodes('user-1');
      expect(result).toHaveLength(2); // PRJ-001 + LEAVE-001
      expect(result.map((c: any) => c.chargeCodeId)).toContain('PRJ-001');
      expect(result.map((c: any) => c.chargeCodeId)).toContain('LEAVE-001');
    });

    it('should merge timesheet history codes that are not in assigned set', async () => {
      const assignedCodes = [
        { chargeCodeId: 'PRJ-001', name: 'Project Alpha', isBillable: true, programName: 'Prog-A', activityCategory: 'Dev' },
      ];
      const historyCodes = [
        { chargeCodeId: 'PRJ-001', name: 'Project Alpha', isBillable: true, programName: 'Prog-A', activityCategory: 'Dev' }, // duplicate
        { chargeCodeId: 'OLD-999', name: 'Legacy Project', isBillable: false, programName: 'Prog-B', activityCategory: 'Support' }, // new
      ];

      db.select.mockReturnValueOnce(buildInnerJoinWhereChain(assignedCodes));
      db.selectDistinct.mockReturnValueOnce(buildInnerJoinWhereChain(historyCodes));
      db.select.mockReturnValueOnce(buildLimitChain([
        { chargeCodeId: 'LEAVE-001', name: 'Annual Leave', isBillable: false, programName: null, activityCategory: null },
      ]));

      const result = await service.getUserChargeCodes('user-1');
      // PRJ-001 (assigned) + OLD-999 (history, not duplicate) + LEAVE-001 (system)
      expect(result).toHaveLength(3);
      expect(result.map((c: any) => c.chargeCodeId)).toEqual(
        expect.arrayContaining(['PRJ-001', 'OLD-999', 'LEAVE-001']),
      );
    });

    it('should not duplicate LEAVE-001 if already in assigned or history codes', async () => {
      const assignedCodes = [
        { chargeCodeId: 'LEAVE-001', name: 'Annual Leave', isBillable: false, programName: null, activityCategory: null },
        { chargeCodeId: 'PRJ-001', name: 'Project Alpha', isBillable: true, programName: 'Prog-A', activityCategory: 'Dev' },
      ];

      db.select.mockReturnValueOnce(buildInnerJoinWhereChain(assignedCodes));
      db.selectDistinct.mockReturnValueOnce(buildInnerJoinWhereChain([]));
      // LEAVE-001 already in existingIds — should NOT query for it again

      const result = await service.getUserChargeCodes('user-1');
      expect(result).toHaveLength(2);
      const leaveCount = result.filter((c: any) => c.chargeCodeId === 'LEAVE-001').length;
      expect(leaveCount).toBe(1);
    });

    it('should return only LEAVE-001 when user has no assigned or history codes', async () => {
      db.select.mockReturnValueOnce(buildInnerJoinWhereChain([])); // no assigned
      db.selectDistinct.mockReturnValueOnce(buildInnerJoinWhereChain([])); // no history
      db.select.mockReturnValueOnce(buildLimitChain([
        { chargeCodeId: 'LEAVE-001', name: 'Annual Leave', isBillable: false, programName: null, activityCategory: null },
      ]));

      const result = await service.getUserChargeCodes('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].chargeCodeId).toBe('LEAVE-001');
    });

    it('should return empty if LEAVE-001 does not exist in DB and user has no codes', async () => {
      db.select.mockReturnValueOnce(buildInnerJoinWhereChain([]));
      db.selectDistinct.mockReturnValueOnce(buildInnerJoinWhereChain([]));
      db.select.mockReturnValueOnce(buildLimitChain([])); // LEAVE-001 not in DB

      const result = await service.getUserChargeCodes('user-1');
      expect(result).toHaveLength(0);
    });
  });

  // ─── submit — cutoff enforcement ──────────────────────────────────────────

  describe('submit — cutoff enforcement', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('should allow submission when within the cutoff window (period ends before 15th)', async () => {
      // Period: 2026-03-09 to 2026-03-15 — cutoff is 2026-03-15
      // Current time: 2026-03-14 (within window)
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-14T10:00:00Z'));

      const sheet = { id: 'ts-1', userId: 'user-1', status: 'draft', periodStart: '2026-03-09', periodEnd: '2026-03-15' };
      const updated = { ...sheet, status: 'submitted' };

      jest.spyOn(service as any, 'autoFillLeaveEntries').mockResolvedValueOnce(undefined);
      jest.spyOn(service, 'validateMinimumHours').mockResolvedValueOnce(undefined);

      db.select.mockReturnValueOnce(buildLimitChain([sheet]));
      db.update.mockReturnValueOnce(buildUpdateChain([updated]));

      const result = await service.submit('user-1', 'ts-1');
      expect(result.status).toBe('submitted');
    });

    it('should reject submission when past the mid-month cutoff (period end <= 15th)', async () => {
      // Period: 2026-03-09 to 2026-03-15 — cutoff is 2026-03-15 23:59:59
      // Current time: 2026-03-16 (past cutoff)
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-16T10:00:00Z'));

      const sheet = { id: 'ts-1', userId: 'user-1', status: 'draft', periodStart: '2026-03-09', periodEnd: '2026-03-15' };

      jest.spyOn(service as any, 'autoFillLeaveEntries').mockResolvedValueOnce(undefined);

      db.select.mockReturnValueOnce(buildLimitChain([sheet]));

      await expect(service.submit('user-1', 'ts-1')).rejects.toThrow(ForbiddenException);
    });

    it('should allow submission when within end-of-month cutoff window', async () => {
      // Period: 2026-03-23 to 2026-03-29 — cutoff is 2026-03-31 (last day of March)
      // Current time: 2026-03-30 (within window)
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-30T10:00:00Z'));

      const sheet = { id: 'ts-1', userId: 'user-1', status: 'draft', periodStart: '2026-03-23', periodEnd: '2026-03-29' };
      const updated = { ...sheet, status: 'submitted' };

      jest.spyOn(service as any, 'autoFillLeaveEntries').mockResolvedValueOnce(undefined);
      jest.spyOn(service, 'validateMinimumHours').mockResolvedValueOnce(undefined);

      db.select.mockReturnValueOnce(buildLimitChain([sheet]));
      db.update.mockReturnValueOnce(buildUpdateChain([updated]));

      const result = await service.submit('user-1', 'ts-1');
      expect(result.status).toBe('submitted');
    });

    it('should reject submission when past end-of-month cutoff', async () => {
      // Period: 2026-03-23 to 2026-03-29 — cutoff is 2026-03-31 23:59:59
      // Current time: 2026-04-01 (past cutoff)
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-04-01T10:00:00Z'));

      const sheet = { id: 'ts-1', userId: 'user-1', status: 'draft', periodStart: '2026-03-23', periodEnd: '2026-03-29' };

      jest.spyOn(service as any, 'autoFillLeaveEntries').mockResolvedValueOnce(undefined);

      db.select.mockReturnValueOnce(buildLimitChain([sheet]));

      await expect(service.submit('user-1', 'ts-1')).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── upsertEntries — additional status tests ──────────────────────────────

  describe('upsertEntries — submitted/approved status allows edit', () => {
    it('should allow editing when status is submitted', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', status: 'submitted', periodStart: '2026-03-09', periodEnd: '2026-03-15' };
      db.select
        .mockReturnValueOnce(buildLimitChain([sheet]))
        .mockReturnValueOnce(buildEntriesWhereChain([])); // approvedVacations

      const deleteChain = { where: jest.fn().mockResolvedValue([]) };
      db.delete.mockReturnValueOnce(deleteChain);

      db.select.mockReturnValueOnce(buildEntriesWhereChain([])); // existing leave entries

      const result = await service.upsertEntries('user-1', 'ts-1', []);
      expect(result).toEqual([]);
    });

    it('should allow editing when status is approved', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', status: 'approved', periodStart: '2026-03-09', periodEnd: '2026-03-15' };
      db.select
        .mockReturnValueOnce(buildLimitChain([sheet]))
        .mockReturnValueOnce(buildEntriesWhereChain([])); // approvedVacations

      const deleteChain = { where: jest.fn().mockResolvedValue([]) };
      db.delete.mockReturnValueOnce(deleteChain);

      db.select.mockReturnValueOnce(buildEntriesWhereChain([]));

      const result = await service.upsertEntries('user-1', 'ts-1', []);
      expect(result).toEqual([]);
    });

    it('should preserve description when provided in entry', async () => {
      const sheet = { id: 'ts-1', userId: 'user-1', status: 'draft', periodStart: '2026-03-09', periodEnd: '2026-03-15' };
      const entries = [
        { charge_code_id: 'CC-001', date: '2026-03-09', hours: 8, description: 'Sprint review meeting' },
      ];
      const allowedCodes = [{ chargeCodeId: 'CC-001' }];

      db.select
        .mockReturnValueOnce(buildLimitChain([sheet]))
        .mockReturnValueOnce(buildEntriesWhereChain(allowedCodes))
        .mockReturnValueOnce(buildEntriesWhereChain([])); // no vacations

      const deleteChain = { where: jest.fn().mockResolvedValue([]) };
      db.delete.mockReturnValueOnce(deleteChain);

      const inserted = [{ id: 'e-1', chargeCodeId: 'CC-001', date: '2026-03-09', hours: '8', description: 'Sprint review meeting' }];
      db.insert.mockReturnValueOnce(buildInsertChain(inserted));

      const updateChain = buildUpdateChain([sheet]);
      db.update.mockReturnValueOnce(updateChain);

      const result = await service.upsertEntries('user-1', 'ts-1', entries);
      expect(result).toHaveLength(1);
      expect(result[0].description).toBe('Sprint review meeting');
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

function buildInnerJoinWhereChain(resolveValue: any[]) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(resolveValue),
  };
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
