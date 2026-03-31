/**
 * Unit tests for TimesheetsScheduler
 * Covers:
 * - handleMidMonthCutoff — delegates to lockTimesheetsBefore
 * - handleEndOfMonthCutoff — only runs on actual last day of month
 * - lockTimesheetsBefore — locks submitted/approved timesheets, triggers warnings
 * - sendCutoffWarnings — sends notifications to users with draft timesheets
 * - Error handling — graceful failure logging
 */
import { Test, TestingModule } from '@nestjs/testing';
import { TimesheetsScheduler } from './timesheets.scheduler';
import { DRIZZLE } from '../database/drizzle.provider';
import { NotificationsService } from '../notifications/notifications.service';

describe('TimesheetsScheduler', () => {
  let scheduler: TimesheetsScheduler;
  let db: any;
  let notificationsService: { create: jest.Mock };

  beforeEach(async () => {
    db = {
      select: jest.fn(),
      update: jest.fn(),
    };

    notificationsService = {
      create: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimesheetsScheduler,
        { provide: DRIZZLE, useValue: db },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    scheduler = module.get<TimesheetsScheduler>(TimesheetsScheduler);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  // ─── handleMidMonthCutoff ─────────────────────────────────────────────────

  describe('handleMidMonthCutoff', () => {
    it('should call lockTimesheetsBefore with current date', async () => {
      const lockSpy = jest.spyOn(scheduler as any, 'lockTimesheetsBefore').mockResolvedValue(undefined);

      await scheduler.handleMidMonthCutoff();

      expect(lockSpy).toHaveBeenCalledTimes(1);
      expect(lockSpy.mock.calls[0][0]).toBeInstanceOf(Date);
    });
  });

  // ─── handleEndOfMonthCutoff ───────────────────────────────────────────────

  describe('handleEndOfMonthCutoff', () => {
    it('should run lockTimesheetsBefore on the actual last day of the month', async () => {
      jest.useFakeTimers();
      // March 31 is the last day of March
      jest.setSystemTime(new Date(2026, 2, 31, 0, 5)); // March 31, 00:05

      const lockSpy = jest.spyOn(scheduler as any, 'lockTimesheetsBefore').mockResolvedValue(undefined);

      await scheduler.handleEndOfMonthCutoff();

      expect(lockSpy).toHaveBeenCalledTimes(1);
    });

    it('should NOT run lockTimesheetsBefore on a non-last day (e.g., March 28)', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 2, 28, 0, 5)); // March 28

      const lockSpy = jest.spyOn(scheduler as any, 'lockTimesheetsBefore').mockResolvedValue(undefined);

      await scheduler.handleEndOfMonthCutoff();

      expect(lockSpy).not.toHaveBeenCalled();
    });

    it('should run on Feb 28 when it is not a leap year (2026)', async () => {
      jest.useFakeTimers();
      // 2026 is not a leap year, so Feb 28 is the last day
      jest.setSystemTime(new Date(2026, 1, 28, 0, 5)); // Feb 28, 2026

      const lockSpy = jest.spyOn(scheduler as any, 'lockTimesheetsBefore').mockResolvedValue(undefined);

      await scheduler.handleEndOfMonthCutoff();

      expect(lockSpy).toHaveBeenCalledTimes(1);
    });

    it('should NOT run on Feb 28 in a leap year (2028) — last day is Feb 29', async () => {
      jest.useFakeTimers();
      // 2028 IS a leap year, Feb 28 is NOT the last day
      jest.setSystemTime(new Date(2028, 1, 28, 0, 5));

      const lockSpy = jest.spyOn(scheduler as any, 'lockTimesheetsBefore').mockResolvedValue(undefined);

      await scheduler.handleEndOfMonthCutoff();

      expect(lockSpy).not.toHaveBeenCalled();
    });

    it('should run on Feb 29 in a leap year (2028)', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2028, 1, 29, 0, 5));

      const lockSpy = jest.spyOn(scheduler as any, 'lockTimesheetsBefore').mockResolvedValue(undefined);

      await scheduler.handleEndOfMonthCutoff();

      expect(lockSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle months with 30 days correctly (April)', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 3, 30, 0, 5)); // April 30

      const lockSpy = jest.spyOn(scheduler as any, 'lockTimesheetsBefore').mockResolvedValue(undefined);

      await scheduler.handleEndOfMonthCutoff();

      expect(lockSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ─── lockTimesheetsBefore ─────────────────────────────────────────────────

  describe('lockTimesheetsBefore (via handleMidMonthCutoff)', () => {
    it('should lock submitted/approved timesheets and send warnings', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-15T00:05:00Z'));

      // Lock: update returns locked timesheets
      const updateChain = buildUpdateReturningChain([
        { id: 'ts-1' },
        { id: 'ts-2' },
      ]);
      db.update.mockReturnValueOnce(updateChain);

      // sendCutoffWarnings: all users
      db.select
        .mockReturnValueOnce(buildSelectWhereChain([
          { id: 'user-1', email: 'alice@test.com', fullName: 'Alice' },
          { id: 'user-2', email: 'bob@test.com', fullName: 'Bob' },
        ]))
        // draft timesheets
        .mockReturnValueOnce(buildSelectWhereChain([
          { userId: 'user-2' }, // only Bob has drafts
        ]));

      await scheduler.handleMidMonthCutoff();

      // Verify lock update was executed
      expect(db.update).toHaveBeenCalled();

      // Verify notification was sent only to Bob (user-2)
      expect(notificationsService.create).toHaveBeenCalledTimes(1);
      expect(notificationsService.create).toHaveBeenCalledWith(
        'timesheet_reminder',
        'user-2',
        'Timesheet Cutoff Warning',
        expect.stringContaining('cutoff'),
      );
    });

    it('should not send warnings when no users have draft timesheets', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-15T00:05:00Z'));

      const updateChain = buildUpdateReturningChain([]);
      db.update.mockReturnValueOnce(updateChain);

      db.select
        .mockReturnValueOnce(buildSelectWhereChain([
          { id: 'user-1', email: 'alice@test.com', fullName: 'Alice' },
        ]))
        .mockReturnValueOnce(buildSelectWhereChain([])); // no drafts

      await scheduler.handleMidMonthCutoff();

      expect(notificationsService.create).not.toHaveBeenCalled();
    });

    it('should handle database error gracefully without throwing', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-15T00:05:00Z'));

      // update throws an error
      db.update.mockReturnValueOnce({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockRejectedValue(new Error('DB connection lost')),
      });

      // Should not throw
      await expect(scheduler.handleMidMonthCutoff()).resolves.toBeUndefined();
    });

    it('should handle notification error gracefully', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-15T00:05:00Z'));

      const updateChain = buildUpdateReturningChain([]);
      db.update.mockReturnValueOnce(updateChain);

      db.select
        .mockReturnValueOnce(buildSelectWhereChain([
          { id: 'user-1', email: 'alice@test.com', fullName: 'Alice' },
        ]))
        .mockReturnValueOnce(buildSelectWhereChain([
          { userId: 'user-1' },
        ]));

      notificationsService.create.mockRejectedValueOnce(new Error('Notification service down'));

      // sendCutoffWarnings catches errors internally — should not throw
      await expect(scheduler.handleMidMonthCutoff()).resolves.toBeUndefined();
    });
  });

  // ─── sendCutoffWarnings ───────────────────────────────────────────────────

  describe('sendCutoffWarnings — user matching', () => {
    it('should send warnings to multiple users with draft timesheets', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-31T00:05:00Z'));

      const updateChain = buildUpdateReturningChain([]);
      db.update.mockReturnValueOnce(updateChain);

      db.select
        .mockReturnValueOnce(buildSelectWhereChain([
          { id: 'user-1', email: 'alice@test.com', fullName: 'Alice' },
          { id: 'user-2', email: 'bob@test.com', fullName: 'Bob' },
          { id: 'user-3', email: 'charlie@test.com', fullName: 'Charlie' },
        ]))
        .mockReturnValueOnce(buildSelectWhereChain([
          { userId: 'user-1' },
          { userId: 'user-3' },
        ]));

      await scheduler.handleMidMonthCutoff();

      expect(notificationsService.create).toHaveBeenCalledTimes(2);
      // Alice and Charlie should receive warnings (not Bob)
      const notifiedUserIds = notificationsService.create.mock.calls.map((c: any) => c[1]);
      expect(notifiedUserIds).toContain('user-1');
      expect(notifiedUserIds).toContain('user-3');
      expect(notifiedUserIds).not.toContain('user-2');
    });

    it('should include cutoff date in notification message', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-04-30T00:05:00Z'));

      const updateChain = buildUpdateReturningChain([]);
      db.update.mockReturnValueOnce(updateChain);

      db.select
        .mockReturnValueOnce(buildSelectWhereChain([
          { id: 'user-1', email: 'test@test.com', fullName: 'Test User' },
        ]))
        .mockReturnValueOnce(buildSelectWhereChain([
          { userId: 'user-1' },
        ]));

      await scheduler.handleMidMonthCutoff();

      const notificationBody = notificationsService.create.mock.calls[0][3];
      expect(notificationBody).toContain('2026-04-30');
    });
  });
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildUpdateReturningChain(resolveValue: any[]) {
  const chain: any = {
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue(resolveValue),
  };
  chain.where.mockReturnValue(chain);
  return chain;
}

function buildSelectWhereChain(resolveValue: any[]) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(resolveValue),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockResolvedValue(resolveValue),
  };
  chain.where.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  return chain;
}
