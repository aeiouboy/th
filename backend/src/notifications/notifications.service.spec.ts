import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { DRIZZLE } from '../database/drizzle.provider';
import { TeamsWebhookService } from './teams-webhook.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let db: any;
  let teamsWebhookService: any;

  beforeEach(async () => {
    db = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    teamsWebhookService = {
      sendNotification: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: DRIZZLE, useValue: db },
        { provide: TeamsWebhookService, useValue: teamsWebhookService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('UNIT-NOTIF-01: should insert a notification and return it', async () => {
      const notification = {
        id: 'uuid-1',
        type: 'timesheet_reminder',
        recipientId: 'user-1',
        subject: 'Test Subject',
        body: 'Test Body',
        isRead: false,
        createdAt: new Date(),
        readAt: null,
      };

      const insertChain = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([notification]),
      };
      db.insert.mockReturnValueOnce(insertChain);

      // Mock the fire-and-forget Teams delivery: select returns profile
      const profileChain = buildLimitChain([{ fullName: 'Alice', email: 'alice@test.com' }]);
      db.select.mockReturnValueOnce(profileChain);

      const result = await service.create(
        'timesheet_reminder',
        'user-1',
        'Test Subject',
        'Test Body',
      );

      expect(db.insert).toHaveBeenCalledTimes(1);
      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'timesheet_reminder',
          recipientId: 'user-1',
          subject: 'Test Subject',
          body: 'Test Body',
        }),
      );
      expect(result).toEqual(notification);
    });

    it('UNIT-NOTIF-01b: should return the inserted notification object with correct fields', async () => {
      const notification = {
        id: 'uuid-2',
        type: 'approval_reminder',
        recipientId: 'user-2',
        subject: 'Approval Needed',
        body: '2 timesheets await your approval',
        isRead: false,
        createdAt: new Date(),
        readAt: null,
      };

      const insertChain = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([notification]),
      };
      db.insert.mockReturnValueOnce(insertChain);

      const profileChain = buildLimitChain([]);
      db.select.mockReturnValueOnce(profileChain);

      const result = await service.create(
        'approval_reminder',
        'user-2',
        'Approval Needed',
        '2 timesheets await your approval',
      );

      expect(result.id).toBe('uuid-2');
      expect(result.type).toBe('approval_reminder');
      expect(result.subject).toBe('Approval Needed');
    });
  });

  // ─── findByUser ────────────────────────────────────────────────────────────

  describe('findByUser', () => {
    it('UNIT-NOTIF-02: should return notifications filtered by recipientId, ordered by createdAt DESC', async () => {
      const notifs = [
        { id: 'n1', recipientId: 'user-1', isRead: false, createdAt: new Date('2026-03-18') },
        { id: 'n2', recipientId: 'user-1', isRead: true, createdAt: new Date('2026-03-17') },
      ];

      const chain = buildFindByUserChain(notifs);
      db.select.mockReturnValueOnce(chain);

      const result = await service.findByUser('user-1');

      expect(db.select).toHaveBeenCalledTimes(1);
      expect(result).toEqual(notifs);
    });

    it('UNIT-NOTIF-03: findByUser with unreadOnly=true filters to isRead=false only', async () => {
      const unreadNotifs = [
        { id: 'n1', recipientId: 'user-1', isRead: false, createdAt: new Date() },
      ];

      const chain = buildFindByUserChain(unreadNotifs);
      db.select.mockReturnValueOnce(chain);

      const result = await service.findByUser('user-1', { unreadOnly: true });

      expect(db.select).toHaveBeenCalledTimes(1);
      expect(result).toEqual(unreadNotifs);
    });

    it('UNIT-NOTIF-02b: should respect limit and offset options', async () => {
      const chain = buildFindByUserChain([]);
      db.select.mockReturnValueOnce(chain);

      await service.findByUser('user-1', { limit: 5, offset: 10 });

      expect(chain.limit).toHaveBeenCalledWith(5);
      expect(chain.offset).toHaveBeenCalledWith(10);
    });

    it('UNIT-NOTIF-02c: should return empty array when user has no notifications', async () => {
      const chain = buildFindByUserChain([]);
      db.select.mockReturnValueOnce(chain);

      const result = await service.findByUser('user-no-notifs');

      expect(result).toEqual([]);
    });
  });

  // ─── getUnreadCount ────────────────────────────────────────────────────────

  describe('getUnreadCount', () => {
    it('UNIT-NOTIF-04: should return correct unread count', async () => {
      const chain = buildCountChain([{ count: 5 }]);
      db.select.mockReturnValueOnce(chain);

      const result = await service.getUnreadCount('user-1');

      expect(result).toEqual({ count: 5 });
    });

    it('UNIT-NOTIF-04b: should return count 0 when no unread notifications', async () => {
      const chain = buildCountChain([{ count: 0 }]);
      db.select.mockReturnValueOnce(chain);

      const result = await service.getUnreadCount('user-1');

      expect(result).toEqual({ count: 0 });
    });

    it('UNIT-NOTIF-04c: should return 0 when result is empty (no rows)', async () => {
      const chain = buildCountChain([]);
      db.select.mockReturnValueOnce(chain);

      const result = await service.getUnreadCount('user-no-notifs');

      expect(result).toEqual({ count: 0 });
    });
  });

  // ─── markAsRead ────────────────────────────────────────────────────────────

  describe('markAsRead', () => {
    it('UNIT-NOTIF-05: should update isRead and readAt when notification exists and belongs to user', async () => {
      const notification = {
        id: 'notif-1',
        recipientId: 'user-1',
        isRead: false,
        readAt: null,
      };
      const updated = { ...notification, isRead: true, readAt: new Date() };

      // First select: find notification
      db.select.mockReturnValueOnce(buildLimitChain([notification]));
      // Second: update
      db.update.mockReturnValueOnce(buildUpdateChain([updated]));

      const result = await service.markAsRead('notif-1', 'user-1');

      expect(db.update).toHaveBeenCalledTimes(1);
      expect(result.isRead).toBe(true);
    });

    it('UNIT-NOTIF-05b: should throw NotFoundException when notification does not exist', async () => {
      db.select.mockReturnValueOnce(buildLimitChain([]));

      await expect(service.markAsRead('nonexistent', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('UNIT-NOTIF-05c: should throw ForbiddenException when notification belongs to another user', async () => {
      const notification = {
        id: 'notif-1',
        recipientId: 'user-other',
        isRead: false,
        readAt: null,
      };

      db.select.mockReturnValueOnce(buildLimitChain([notification]));

      await expect(service.markAsRead('notif-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── markAllAsRead ─────────────────────────────────────────────────────────

  describe('markAllAsRead', () => {
    it('UNIT-NOTIF-06: should bulk update all unread notifications for user', async () => {
      const updateChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      };
      db.update.mockReturnValueOnce(updateChain);

      const result = await service.markAllAsRead('user-1');

      expect(db.update).toHaveBeenCalledTimes(1);
      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({ isRead: true }),
      );
      expect(result).toEqual({ success: true });
    });

    it('UNIT-NOTIF-06b: should return success:true even when no notifications exist', async () => {
      const updateChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      };
      db.update.mockReturnValueOnce(updateChain);

      const result = await service.markAllAsRead('user-empty');

      expect(result).toEqual({ success: true });
    });
  });
});

// ─── Chain Helpers ──────────────────────────────────────────────────────────

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

/** Chain for findByUser — terminal is .offset() */
function buildFindByUserChain(resolveValue: any[]) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockResolvedValue(resolveValue),
  };
  chain.where.mockReturnValue(chain);
  return chain;
}

/** Chain for getUnreadCount — terminal is the select itself awaited (array of {count}) */
function buildCountChain(resolveValue: any[]) {
  const promise = Promise.resolve(resolveValue);
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    then: (onFulfilled: any, onRejected: any) => promise.then(onFulfilled, onRejected),
    catch: (onRejected: any) => promise.catch(onRejected),
    finally: (onFinally: any) => promise.finally(onFinally),
  };
  chain.where.mockReturnValue(chain);
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
