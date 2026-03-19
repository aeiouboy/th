import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationNotificationService } from './notification.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DRIZZLE } from '../database/drizzle.provider';

/**
 * Builds a fully thenable Drizzle-style query chain that resolves to `resolveValue`
 * regardless of which method is the terminal call (.from, .where, .groupBy, .limit, etc.).
 * Every method returns the same chain object so any method can be used last.
 */
function buildQueryChain(resolveValue: any[]): any {
  const promise = Promise.resolve(resolveValue);
  const chain: any = {
    // Thenable — so `await chain` works when used without any chained calls
    then: (onFulfilled: any, onRejected: any) => promise.then(onFulfilled, onRejected),
    catch: (onRejected: any) => promise.catch(onRejected),
    finally: (onFinally: any) => promise.finally(onFinally),
  };

  const methods = [
    'from', 'where', 'leftJoin', 'innerJoin', 'orderBy',
    'groupBy', 'limit', 'offset', 'having',
  ];
  for (const m of methods) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  // .limit() is often the terminal resolver — make it resolve the value
  chain.limit = jest.fn().mockResolvedValue(resolveValue);

  return chain;
}

// Alias for clarity
const buildSelectChain = buildQueryChain;
const buildSelectChainWhere = buildQueryChain;

function buildSelectDistinctChain(resolveValue: any[]) {
  return buildQueryChain(resolveValue);
}

describe('IntegrationNotificationService', () => {
  let service: IntegrationNotificationService;
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
        IntegrationNotificationService,
        { provide: DRIZZLE, useValue: db },
        {
          provide: NotificationsService,
          useValue: { create: jest.fn().mockResolvedValue({}) },
        },
      ],
    }).compile();

    service = module.get<IntegrationNotificationService>(IntegrationNotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    service.clearNotifications();
  });

  // ─── getNotifications / clearNotifications ─────────────────────────────

  describe('getNotifications / clearNotifications', () => {
    it('should return empty array initially', () => {
      expect(service.getNotifications()).toEqual([]);
    });

    it('should clear notifications', async () => {
      // Populate via a real notification flow
      const users = [{ id: 'u1', email: 'u1@test.com', fullName: 'User One' }];
      const calCount = [{ count: '5' }];

      db.select
        .mockReturnValueOnce(buildSelectChainWhere(calCount)) // working days total
        .mockReturnValueOnce(buildSelectChainWhere(calCount)) // days passed so far
        .mockReturnValueOnce(buildSelectChainWhere(users))    // all users
        .mockReturnValueOnce(buildSelectChainWhere([]))        // timesheets
        .mockReturnValueOnce(buildSelectChainWhere([]));       // hours per user

      await service.sendTimesheetReminders();
      expect(service.getNotifications().length).toBeGreaterThan(0);

      service.clearNotifications();
      expect(service.getNotifications()).toEqual([]);
    });
  });

  // ─── sendTimesheetReminders ─────────────────────────────────────────────

  describe('sendTimesheetReminders', () => {
    const users = [
      { id: 'u1', email: 'alice@test.com', fullName: 'Alice' },
      { id: 'u2', email: 'bob@test.com', fullName: 'Bob' },
    ];

    function mockTimesheetReminder(
      options: {
        workingDaysTotal?: number;
        daysPassed?: number;
        users?: any[];
        timesheets?: any[];
        hoursPerUser?: any[];
      } = {},
    ) {
      const {
        workingDaysTotal = 5,
        daysPassed = 3,
        users: u = users,
        timesheets: ts = [],
        hoursPerUser: h = [],
      } = options;

      db.select
        .mockReturnValueOnce(buildSelectChainWhere([{ count: String(workingDaysTotal) }]))
        .mockReturnValueOnce(buildSelectChainWhere([{ count: String(daysPassed) }]))
        .mockReturnValueOnce(buildSelectChainWhere(u))
        .mockReturnValueOnce(buildSelectChainWhere(ts))
        .mockReturnValueOnce(buildSelectChainWhere(h));
    }

    it('should send reminders to users who have logged fewer hours than expected', async () => {
      // 3 days passed → expected 24h, users logged 0h
      mockTimesheetReminder({ daysPassed: 3, hoursPerUser: [] });

      const sent = await service.sendTimesheetReminders();

      expect(sent).toHaveLength(2); // both alice and bob are behind
      sent.forEach((n) => {
        expect(n.type).toBe('timesheet_reminder');
        expect(n.body).toContain('missing');
      });
    });

    it('should not send reminder to users with no hours shortfall', async () => {
      // 1 day passed → expected 8h, alice has logged 8h, bob 0h
      const hoursPerUser = [{ userId: 'u1', totalHours: '8' }];
      mockTimesheetReminder({ daysPassed: 1, hoursPerUser });

      const sent = await service.sendTimesheetReminders();

      // Only bob should get a reminder
      expect(sent).toHaveLength(1);
      expect(sent[0].recipientId).toBe('u2');
    });

    it('should skip users whose timesheet is already submitted or approved', async () => {
      const timesheets = [
        { userId: 'u1', timesheetId: 'ts-1', status: 'submitted' },
        { userId: 'u2', timesheetId: 'ts-2', status: 'manager_approved' },
      ];
      mockTimesheetReminder({ timesheets, daysPassed: 3 });

      const sent = await service.sendTimesheetReminders();

      // Both are past draft/rejected, so no reminders
      expect(sent).toHaveLength(0);
    });

    it('should still send reminder to users with rejected timesheets', async () => {
      const timesheets = [{ userId: 'u1', timesheetId: 'ts-1', status: 'rejected' }];
      const hoursPerUser = [{ userId: 'u1', totalHours: '0' }];
      mockTimesheetReminder({ timesheets, hoursPerUser, daysPassed: 3 });

      const sent = await service.sendTimesheetReminders();

      // u1 is rejected and behind → should receive reminder
      const alice = sent.find((n) => n.recipientId === 'u1');
      expect(alice).toBeDefined();
    });

    it('should return empty array when all users are on track', async () => {
      const hoursPerUser = [
        { userId: 'u1', totalHours: '24' },
        { userId: 'u2', totalHours: '24' },
      ];
      mockTimesheetReminder({ daysPassed: 3, hoursPerUser });

      const sent = await service.sendTimesheetReminders();
      expect(sent).toHaveLength(0);
    });

    it('should return empty array when no users exist', async () => {
      mockTimesheetReminder({ users: [], daysPassed: 3 });

      const sent = await service.sendTimesheetReminders();
      expect(sent).toHaveLength(0);
    });

    it('should compute expected hours correctly: daysPassed * 8', async () => {
      // 4 working days passed → 32h expected; user has 10h → missing 22h
      const hoursPerUser = [{ userId: 'u1', totalHours: '10' }];
      mockTimesheetReminder({
        users: [users[0]],
        daysPassed: 4,
        hoursPerUser,
      });

      const sent = await service.sendTimesheetReminders();
      expect(sent).toHaveLength(1);
      expect(sent[0].body).toContain('32h expected');
      expect(sent[0].body).toContain('22h');
    });

    it('should include notifications in getNotifications() after sending', async () => {
      mockTimesheetReminder({ daysPassed: 3 });

      await service.sendTimesheetReminders();
      const stored = service.getNotifications();
      expect(stored.length).toBeGreaterThan(0);
      expect(stored[0].id).toMatch(/^notif-/);
    });
  });

  // ─── sendApprovalReminders ──────────────────────────────────────────────

  describe('sendApprovalReminders', () => {
    it('should send reminder to manager with pending timesheets', async () => {
      const pendingTimesheets = [
        { timesheetId: 'ts-1', employeeId: 'e1', periodStart: '2026-03-09', employeeName: 'Alice', managerId: 'm1' },
        { timesheetId: 'ts-2', employeeId: 'e2', periodStart: '2026-03-09', employeeName: 'Bob', managerId: 'm1' },
      ];
      const manager = { id: 'm1', email: 'manager@test.com', fullName: 'Nattaya K' };

      db.select
        .mockReturnValueOnce(buildSelectChainWhere(pendingTimesheets)) // pending manager approvals
        .mockReturnValueOnce(buildSelectChain([manager]));              // manager profile

      const sent = await service.sendApprovalReminders();

      expect(sent).toHaveLength(1);
      expect(sent[0].type).toBe('approval_reminder');
      expect(sent[0].recipientId).toBe('m1');
      expect(sent[0].body).toContain('Alice');
      expect(sent[0].body).toContain('Bob');
    });

    it('should send separate notifications to different managers', async () => {
      const pendingTimesheets = [
        { timesheetId: 'ts-1', employeeId: 'e1', periodStart: '2026-03-09', employeeName: 'Alice', managerId: 'm1' },
        { timesheetId: 'ts-2', employeeId: 'e2', periodStart: '2026-03-09', employeeName: 'Bob', managerId: 'm2' },
      ];
      const manager1 = { id: 'm1', email: 'm1@test.com', fullName: 'Manager One' };
      const manager2 = { id: 'm2', email: 'm2@test.com', fullName: 'Manager Two' };

      db.select
        .mockReturnValueOnce(buildSelectChainWhere(pendingTimesheets))
        .mockReturnValueOnce(buildSelectChain([manager1]))
        .mockReturnValueOnce(buildSelectChain([manager2]));

      const sent = await service.sendApprovalReminders();

      expect(sent).toHaveLength(2);
      expect(sent.map((n) => n.recipientId)).toContain('m1');
      expect(sent.map((n) => n.recipientId)).toContain('m2');
    });

    it('should skip timesheets with no managerId', async () => {
      const pendingTimesheets = [
        { timesheetId: 'ts-1', employeeId: 'e1', periodStart: '2026-03-09', employeeName: 'Alice', managerId: null },
      ];

      db.select.mockReturnValueOnce(buildSelectChainWhere(pendingTimesheets));

      const sent = await service.sendApprovalReminders();
      expect(sent).toHaveLength(0);
    });

    it('should return empty array when no timesheets are pending', async () => {
      db.select.mockReturnValueOnce(buildSelectChainWhere([]));

      const sent = await service.sendApprovalReminders();
      expect(sent).toHaveLength(0);
    });

    it('should skip manager if their profile is not found in DB', async () => {
      const pendingTimesheets = [
        { timesheetId: 'ts-1', employeeId: 'e1', periodStart: '2026-03-09', employeeName: 'Alice', managerId: 'm-ghost' },
      ];

      db.select
        .mockReturnValueOnce(buildSelectChainWhere(pendingTimesheets))
        .mockReturnValueOnce(buildSelectChain([])); // manager not found

      const sent = await service.sendApprovalReminders();
      expect(sent).toHaveLength(0);
    });

    it('should include pending count in subject line', async () => {
      const pendingTimesheets = [
        { timesheetId: 'ts-1', employeeId: 'e1', periodStart: '2026-03-09', employeeName: 'Alice', managerId: 'm1' },
        { timesheetId: 'ts-2', employeeId: 'e2', periodStart: '2026-03-09', employeeName: 'Bob', managerId: 'm1' },
        { timesheetId: 'ts-3', employeeId: 'e3', periodStart: '2026-03-09', employeeName: 'Carol', managerId: 'm1' },
      ];
      const manager = { id: 'm1', email: 'm@test.com', fullName: 'Manager' };

      db.select
        .mockReturnValueOnce(buildSelectChainWhere(pendingTimesheets))
        .mockReturnValueOnce(buildSelectChain([manager]));

      const sent = await service.sendApprovalReminders();
      expect(sent[0].subject).toContain('3');
    });
  });

  // ─── sendManagerSummary ─────────────────────────────────────────────────

  describe('sendManagerSummary', () => {
    const managerId = 'm1';
    const manager = { id: managerId, email: 'manager@test.com', fullName: 'Nattaya K' };
    const reports = [
      { id: 'e1', fullName: 'Alice', email: 'alice@test.com' },
      { id: 'e2', fullName: 'Bob', email: 'bob@test.com' },
      { id: 'e3', fullName: 'Carol', email: 'carol@test.com' },
    ];

    function mockManagerSummary(tsStatuses: { userId: string; status: string }[] = []) {
      db.selectDistinct = jest.fn().mockReturnValue(buildSelectDistinctChain([{ managerId }]));
      db.select
        .mockReturnValueOnce(buildSelectChain([manager]))   // manager profile
        .mockReturnValueOnce(buildSelectChainWhere(reports)) // direct reports
        .mockReturnValueOnce(buildSelectChainWhere(tsStatuses)); // timesheet statuses
    }

    it('should send weekly summary to manager', async () => {
      mockManagerSummary([
        { userId: 'e1', status: 'manager_approved' },
        { userId: 'e2', status: 'submitted' },
      ]);

      const sent = await service.sendManagerSummary();

      expect(sent).toHaveLength(1);
      expect(sent[0].type).toBe('manager_summary');
      expect(sent[0].recipientId).toBe(managerId);
    });

    it('should correctly count completed, pending and not-submitted', async () => {
      mockManagerSummary([
        { userId: 'e1', status: 'cc_approved' },
        { userId: 'e2', status: 'submitted' },
        // e3 has no entry → not submitted
      ]);

      const sent = await service.sendManagerSummary();

      expect(sent[0].body).toContain('Completed/Approved: 1');
      expect(sent[0].body).toContain('Pending approval: 1');
      expect(sent[0].body).toContain('Not submitted: 1');
    });

    it('should handle all reports completed', async () => {
      const tsStatuses = reports.map((r) => ({ userId: r.id, status: 'locked' }));
      mockManagerSummary(tsStatuses);

      const sent = await service.sendManagerSummary();

      expect(sent[0].body).toContain('Completed/Approved: 3');
      expect(sent[0].body).toContain('Pending approval: 0');
      expect(sent[0].body).toContain('Not submitted: 0');
    });

    it('should handle all reports not submitted', async () => {
      mockManagerSummary([]); // no timesheets at all

      const sent = await service.sendManagerSummary();

      expect(sent[0].body).toContain('Not submitted: 3');
    });

    it('should skip manager when they have no direct reports', async () => {
      db.selectDistinct = jest.fn().mockReturnValue(buildSelectDistinctChain([{ managerId }]));
      db.select
        .mockReturnValueOnce(buildSelectChain([manager]))
        .mockReturnValueOnce(buildSelectChainWhere([])); // no direct reports

      const sent = await service.sendManagerSummary();
      expect(sent).toHaveLength(0);
    });

    it('should return empty array when no managers exist', async () => {
      db.selectDistinct = jest.fn().mockReturnValue(buildSelectDistinctChain([]));

      const sent = await service.sendManagerSummary();
      expect(sent).toHaveLength(0);
    });

    it('should include employee names and statuses in the detail section', async () => {
      mockManagerSummary([
        { userId: 'e1', status: 'submitted' },
      ]);

      const sent = await service.sendManagerSummary();

      expect(sent[0].body).toContain('Alice');
      expect(sent[0].body).toContain('Bob');
    });
  });

  // ─── sendWeeklyInsights ─────────────────────────────────────────────────

  describe('sendWeeklyInsights', () => {
    const recipients = [
      { id: 'a1', email: 'admin@test.com', fullName: 'Admin User' },
      { id: 'p1', email: 'pmo@test.com', fullName: 'PMO User' },
    ];

    function mockWeeklyInsights(options: {
      totalHours?: number;
      billableHours?: number;
      budgetRows?: any[];
      recipients?: any[];
    } = {}) {
      const {
        totalHours = 400,
        billableHours = 300,
        budgetRows = [],
        recipients: r = recipients,
      } = options;

      db.select
        .mockReturnValueOnce(buildSelectChainWhere([{ totalHours: String(totalHours) }]))
        .mockReturnValueOnce(buildSelectChainWhere([{ totalHours: String(billableHours) }]))
        .mockReturnValueOnce(buildSelectChainWhere(budgetRows))
        .mockReturnValueOnce(buildSelectChainWhere(r));
    }

    it('should send weekly insights to pmo, finance and admin users', async () => {
      mockWeeklyInsights();

      const sent = await service.sendWeeklyInsights();

      expect(sent).toHaveLength(2);
      sent.forEach((n) => expect(n.type).toBe('weekly_insights'));
    });

    it('should calculate chargeability rate correctly', async () => {
      // 300 billable / 400 total = 75%
      mockWeeklyInsights({ totalHours: 400, billableHours: 300 });

      const sent = await service.sendWeeklyInsights();

      expect(sent[0].body).toContain('75%');
    });

    it('should report 0% chargeability when total hours is 0', async () => {
      mockWeeklyInsights({ totalHours: 0, billableHours: 0 });

      const sent = await service.sendWeeklyInsights();

      expect(sent[0].body).toContain('0%');
    });

    it('should list budget overruns when actualSpent > budgetAmount', async () => {
      const budgetRows = [
        {
          chargeCodeId: 'PRJ-042',
          name: 'Digital Transformation',
          budgetAmount: '100000',
          actualSpent: '120000',
        },
      ];
      mockWeeklyInsights({ budgetRows });

      const sent = await service.sendWeeklyInsights();

      expect(sent[0].body).toContain('Budget overruns: 1');
      expect(sent[0].body).toContain('PRJ-042');
    });

    it('should report 0 overruns when all budgets are under limit', async () => {
      const budgetRows = [
        { chargeCodeId: 'PRJ-042', name: 'Digital Transformation', budgetAmount: '100000', actualSpent: '80000' },
      ];
      mockWeeklyInsights({ budgetRows });

      const sent = await service.sendWeeklyInsights();

      expect(sent[0].body).toContain('Budget overruns: 0');
      expect(sent[0].body).not.toContain('Over-budget charge codes');
    });

    it('should return empty array when no recipients found', async () => {
      mockWeeklyInsights({ recipients: [] });

      const sent = await service.sendWeeklyInsights();
      expect(sent).toHaveLength(0);
    });

    it('should include total and billable hours in the body', async () => {
      mockWeeklyInsights({ totalHours: 200, billableHours: 160 });

      const sent = await service.sendWeeklyInsights();

      expect(sent[0].body).toContain('200h');
      expect(sent[0].body).toContain('160h');
    });

    it('should include the week date range in the subject', async () => {
      mockWeeklyInsights();

      const sent = await service.sendWeeklyInsights();

      // Subject should contain a date in YYYY-MM-DD format
      expect(sent[0].subject).toMatch(/\d{4}-\d{2}-\d{2}/);
    });
  });

  // ─── sendAllNotifications ───────────────────────────────────────────────

  describe('sendAllNotifications', () => {
    it('should return counts for all four notification types', async () => {
      const users = [{ id: 'u1', email: 'u@test.com', fullName: 'User' }];
      const manager = { id: 'm1', email: 'm@test.com', fullName: 'Manager' };

      // sendTimesheetReminders: workingDays, daysPassed, users, timesheets, hoursPerUser
      // sendApprovalReminders: pending timesheets
      // sendManagerSummary: managers (selectDistinct), manager profile, reports, ts statuses
      // sendWeeklyInsights: totalHours, billableHours, budgetRows, recipients

      db.selectDistinct = jest.fn().mockReturnValue(buildSelectDistinctChain([{ managerId: 'm1' }]));
      db.select
        // sendTimesheetReminders
        .mockReturnValueOnce(buildSelectChainWhere([{ count: '5' }]))
        .mockReturnValueOnce(buildSelectChainWhere([{ count: '0' }]))
        .mockReturnValueOnce(buildSelectChainWhere(users))
        .mockReturnValueOnce(buildSelectChainWhere([]))
        .mockReturnValueOnce(buildSelectChainWhere([]))
        // sendApprovalReminders
        .mockReturnValueOnce(buildSelectChainWhere([]))
        // sendManagerSummary
        .mockReturnValueOnce(buildSelectChain([manager]))
        .mockReturnValueOnce(buildSelectChainWhere([]))
        // sendWeeklyInsights
        .mockReturnValueOnce(buildSelectChainWhere([{ totalHours: '400' }]))
        .mockReturnValueOnce(buildSelectChainWhere([{ totalHours: '300' }]))
        .mockReturnValueOnce(buildSelectChainWhere([]))
        .mockReturnValueOnce(buildSelectChainWhere(users));

      const result = await service.sendAllNotifications();

      expect(result).toHaveProperty('timesheetReminders');
      expect(result).toHaveProperty('approvalReminders');
      expect(result).toHaveProperty('managerSummaries');
      expect(result).toHaveProperty('weeklyInsights');
      expect(typeof result.timesheetReminders).toBe('number');
    });
  });

  // ─── createNotification (via public side effects) ──────────────────────

  describe('notification ID sequencing', () => {
    it('should generate sequential IDs starting at notif-1', async () => {
      const calCount = [{ count: '0' }];
      const users = [{ id: 'u1', email: 'u@test.com', fullName: 'User One' }];

      // 0 days passed → expectedHoursSoFar = 0 → no reminder should be sent
      // To force a notification, make daysPassed = 1 and user has 0h
      db.select
        .mockReturnValueOnce(buildSelectChainWhere([{ count: '5' }]))
        .mockReturnValueOnce(buildSelectChainWhere([{ count: '1' }]))
        .mockReturnValueOnce(buildSelectChainWhere(users))
        .mockReturnValueOnce(buildSelectChainWhere([]))
        .mockReturnValueOnce(buildSelectChainWhere([]));

      await service.sendTimesheetReminders();
      const notifications = service.getNotifications();
      expect(notifications[0]?.id).toBe('notif-1');
    });

    it('should increment notification IDs across calls', async () => {
      const users = [{ id: 'u1', email: 'u@test.com', fullName: 'User One' }];

      function mockCall() {
        db.select
          .mockReturnValueOnce(buildSelectChainWhere([{ count: '5' }]))
          .mockReturnValueOnce(buildSelectChainWhere([{ count: '1' }]))
          .mockReturnValueOnce(buildSelectChainWhere(users))
          .mockReturnValueOnce(buildSelectChainWhere([]))
          .mockReturnValueOnce(buildSelectChainWhere([]));
      }

      mockCall();
      await service.sendTimesheetReminders();
      mockCall();
      await service.sendTimesheetReminders();

      const notifications = service.getNotifications();
      expect(notifications.length).toBeGreaterThanOrEqual(2);
      const ids = notifications.map((n) => n.id);
      // IDs should be unique
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
