import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { DRIZZLE } from '../database/drizzle.provider';

describe('CalendarService', () => {
  let service: CalendarService;
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
        CalendarService,
        { provide: DRIZZLE, useValue: db },
      ],
    }).compile();

    service = module.get<CalendarService>(CalendarService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('populateWeekends', () => {
    it('should insert weekend entries for a given year', async () => {
      const insertChain = {
        values: jest.fn().mockReturnThis(),
        onConflictDoUpdate: jest.fn().mockResolvedValue([{}]),
      };
      db.insert.mockReturnValue(insertChain);

      const result = await service.populateWeekends(2026);
      expect(result.year).toBe(2026);
      // 2026 has 52 Saturdays + 53 Sundays (or similar), roughly 104-105 weekend days
      expect(result.weekendsPopulated).toBeGreaterThan(100);
      expect(db.insert).toHaveBeenCalled();
    });

    it('should only insert weekend dates (count matches expected weekends for 2026)', async () => {
      let insertCount = 0;
      const insertChain = {
        values: jest.fn().mockImplementation(() => {
          insertCount++;
          return insertChain;
        }),
        onConflictDoUpdate: jest.fn().mockResolvedValue([{}]),
      };
      db.insert.mockReturnValue(insertChain);

      await service.populateWeekends(2026);

      // 2026: Jan 1 is Thursday. There are 104 or 105 weekend days depending on Dec 31.
      // Accept either 104 or 105 (timezone-safe)
      expect(insertCount).toBeGreaterThanOrEqual(104);
      expect(insertCount).toBeLessThanOrEqual(106);
    });
  });

  describe('createHoliday', () => {
    it('should create a new holiday entry when date does not exist', async () => {
      db.select.mockReturnValueOnce(buildLimitChain([])); // no existing entry
      const created = { id: 1, date: '2026-04-13', isHoliday: true, holidayName: 'Songkran', countryCode: 'TH' };
      db.insert.mockReturnValueOnce({ values: jest.fn().mockReturnThis(), returning: jest.fn().mockResolvedValue([created]) });

      const result = await service.createHoliday('2026-04-13', 'Songkran');
      expect(result.isHoliday).toBe(true);
      expect(result.holidayName).toBe('Songkran');
    });

    it('should update existing entry to be a holiday when date already exists', async () => {
      const existing = { id: 1, date: '2026-04-13', isWeekend: false, isHoliday: false };
      db.select.mockReturnValueOnce(buildLimitChain([existing]));
      const updated = { ...existing, isHoliday: true, holidayName: 'Songkran' };
      db.update.mockReturnValueOnce(buildUpdateChain([updated]));

      const result = await service.createHoliday('2026-04-13', 'Songkran');
      expect(result.isHoliday).toBe(true);
    });
  });

  describe('updateHoliday', () => {
    it('should throw NotFoundException when holiday does not exist', async () => {
      db.select.mockReturnValueOnce(buildLimitChain([]));
      await expect(service.updateHoliday(999, { holidayName: 'New Name' })).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when entry exists but is not a holiday', async () => {
      const entry = { id: 1, date: '2026-04-11', isWeekend: true, isHoliday: false };
      db.select.mockReturnValueOnce(buildLimitChain([entry]));
      await expect(service.updateHoliday(1, { holidayName: 'New Name' })).rejects.toThrow(NotFoundException);
    });

    it('should update holiday name successfully', async () => {
      const existing = { id: 1, date: '2026-04-13', isHoliday: true, holidayName: 'Songkran' };
      const updated = { ...existing, holidayName: 'Thai New Year' };
      db.select.mockReturnValueOnce(buildLimitChain([existing]));
      db.update.mockReturnValueOnce(buildUpdateChain([updated]));

      const result = await service.updateHoliday(1, { holidayName: 'Thai New Year' });
      expect(result.holidayName).toBe('Thai New Year');
    });
  });

  describe('deleteHoliday', () => {
    it('should throw NotFoundException when holiday does not exist', async () => {
      db.select.mockReturnValueOnce(buildLimitChain([]));
      await expect(service.deleteHoliday(999)).rejects.toThrow(NotFoundException);
    });

    it('should clear holiday fields (not delete) when entry is also a weekend', async () => {
      const entry = { id: 1, date: '2026-04-11', isWeekend: true, isHoliday: true, holidayName: 'Test' };
      db.select.mockReturnValueOnce(buildLimitChain([entry]));
      db.update.mockReturnValueOnce(buildUpdateChain([{ ...entry, isHoliday: false, holidayName: null }]));

      const result = (await service.deleteHoliday(1)) as any;
      expect(db.delete).not.toHaveBeenCalled();
      expect(result.isHoliday).toBe(false);
    });

    it('should delete the entry entirely when it is only a holiday', async () => {
      const entry = { id: 1, date: '2026-04-13', isWeekend: false, isHoliday: true, holidayName: 'Songkran' };
      db.select.mockReturnValueOnce(buildLimitChain([entry]));
      const deleteChain = { from: jest.fn().mockReturnThis(), where: jest.fn().mockResolvedValue([]) };
      db.delete.mockReturnValueOnce(deleteChain);

      const result = await service.deleteHoliday(1);
      expect(db.delete).toHaveBeenCalled();
      expect(result).toEqual({ deleted: true });
    });
  });

  describe('getWorkingDays', () => {
    it('should count working days excluding weekends and holidays', async () => {
      // For a Mon-Fri week with no holidays: 5 working days
      const nonWorkingDays = [
        { date: '2026-03-14', isWeekend: true, isHoliday: false },  // Sat
        { date: '2026-03-15', isWeekend: true, isHoliday: false },  // Sun
      ];
      db.select.mockReturnValueOnce(buildWhereChain(nonWorkingDays));

      const result = await service.getWorkingDays('2026-03-09', '2026-03-15');
      expect(result.workingDays).toBe(5);
      expect(result.totalDays).toBe(7);
      expect(result.weekends).toBe(2);
      expect(result.holidays).toBe(0);
    });

    it('should subtract vacation days when userId is provided', async () => {
      const nonWorkingDays = [
        { date: '2026-03-14', isWeekend: true, isHoliday: false },
        { date: '2026-03-15', isWeekend: true, isHoliday: false },
      ];
      const vacations = [{ userId: 'u1', startDate: '2026-03-09', endDate: '2026-03-09', status: 'approved' }];

      db.select
        .mockReturnValueOnce(buildWhereChain(nonWorkingDays))
        .mockReturnValueOnce(buildWhereChain(vacations));

      const result = await service.getWorkingDays('2026-03-09', '2026-03-15', 'u1');
      expect(result.workingDays).toBe(4); // 5 working days minus 1 vacation
    });
  });

  describe('createVacation', () => {
    it('should throw BadRequestException when end date is before start date', async () => {
      await expect(
        service.createVacation('u1', '2026-03-15', '2026-03-10')
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a vacation request successfully', async () => {
      const vacation = { id: 1, userId: 'u1', startDate: '2026-03-09', endDate: '2026-03-13', status: 'pending' };
      db.insert.mockReturnValueOnce({
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([vacation]),
      });

      const result = await service.createVacation('u1', '2026-03-09', '2026-03-13');
      expect(result.status).toBe('pending');
      expect(result.userId).toBe('u1');
    });
  });

  describe('approveVacation', () => {
    it('should throw NotFoundException when vacation does not exist', async () => {
      db.select.mockReturnValueOnce(buildLimitChain([]));
      await expect(service.approveVacation(999, 'manager-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when vacation is not pending', async () => {
      const vacation = { id: 1, userId: 'u1', status: 'approved' };
      db.select.mockReturnValueOnce(buildLimitChain([vacation]));
      await expect(service.approveVacation(1, 'manager-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when approver is not the manager', async () => {
      const vacation = { id: 1, userId: 'u1', status: 'pending' };
      const requester = { id: 'u1', managerId: 'other-manager' };

      db.select
        .mockReturnValueOnce(buildLimitChain([vacation]))
        .mockReturnValueOnce(buildLimitChain([requester]));

      await expect(service.approveVacation(1, 'wrong-manager')).rejects.toThrow(ForbiddenException);
    });

    it('should approve a pending vacation successfully', async () => {
      const vacation = { id: 1, userId: 'u1', status: 'pending' };
      const requester = { id: 'u1', managerId: 'manager-1' };
      const updated = { ...vacation, status: 'approved', approvedBy: 'manager-1' };

      db.select
        .mockReturnValueOnce(buildLimitChain([vacation]))
        .mockReturnValueOnce(buildLimitChain([requester]));
      db.update.mockReturnValueOnce(buildUpdateChain([updated]));

      const result = await service.approveVacation(1, 'manager-1');
      expect(result.status).toBe('approved');
    });
  });

  describe('createVacation - half-day validation', () => {
    it('should throw BadRequestException when half-day leave spans multiple days', async () => {
      await expect(
        service.createVacation('u1', '2026-03-09', '2026-03-10', 'half_am'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow half-day leave for a single day', async () => {
      const vacation = {
        id: 2,
        userId: 'u1',
        startDate: '2026-03-09',
        endDate: '2026-03-09',
        leaveType: 'half_am',
        status: 'pending',
      };
      db.insert.mockReturnValueOnce({
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([vacation]),
      });

      const result = await service.createVacation('u1', '2026-03-09', '2026-03-09', 'half_am');
      expect(result.status).toBe('pending');
      expect(result.leaveType).toBe('half_am');
    });

    it('should create a full-day vacation request', async () => {
      const vacation = {
        id: 3,
        userId: 'u1',
        startDate: '2026-03-09',
        endDate: '2026-03-13',
        leaveType: 'full_day',
        status: 'pending',
      };
      db.insert.mockReturnValueOnce({
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([vacation]),
      });

      const result = await service.createVacation('u1', '2026-03-09', '2026-03-13', 'full_day');
      expect(result.status).toBe('pending');
      expect(result.leaveType).toBe('full_day');
    });
  });

  describe('rejectVacation', () => {
    it('should reject a pending vacation request', async () => {
      const vacation = { id: 1, userId: 'u1', status: 'pending' };
      const requester = { id: 'u1', managerId: 'manager-1' };
      const updated = { ...vacation, status: 'rejected', approvedBy: 'manager-1' };

      db.select
        .mockReturnValueOnce(buildLimitChain([vacation]))
        .mockReturnValueOnce(buildLimitChain([requester]));
      db.update.mockReturnValueOnce(buildUpdateChain([updated]));

      const result = await service.rejectVacation(1, 'manager-1');
      expect(result.status).toBe('rejected');
    });

    it('should throw NotFoundException when vacation does not exist', async () => {
      db.select.mockReturnValueOnce(buildLimitChain([]));
      await expect(service.rejectVacation(999, 'manager-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when vacation is not pending', async () => {
      const vacation = { id: 1, userId: 'u1', status: 'approved' };
      db.select.mockReturnValueOnce(buildLimitChain([vacation]));
      await expect(service.rejectVacation(1, 'manager-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when rejector is not the manager', async () => {
      const vacation = { id: 1, userId: 'u1', status: 'pending' };
      const requester = { id: 'u1', managerId: 'other-manager' };

      db.select
        .mockReturnValueOnce(buildLimitChain([vacation]))
        .mockReturnValueOnce(buildLimitChain([requester]));

      await expect(service.rejectVacation(1, 'wrong-manager')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getMyVacations', () => {
    it('should return user vacations', async () => {
      const vacations = [
        { id: 1, userId: 'u1', startDate: '2026-03-09', endDate: '2026-03-13', status: 'approved' },
        { id: 2, userId: 'u1', startDate: '2026-04-01', endDate: '2026-04-01', status: 'pending' },
      ];
      db.select.mockReturnValueOnce(buildWhereChain(vacations));

      const result = await service.getMyVacations('u1');
      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe('u1');
      expect(result[1].status).toBe('pending');
    });
  });

  describe('getPendingVacationsForManager', () => {
    it('should return empty array when manager has no direct reports', async () => {
      db.select.mockReturnValueOnce(buildWhereChain([]));

      const result = await service.getPendingVacationsForManager('manager-1');
      expect(result).toEqual([]);
    });

    it('should return pending vacations for managed users', async () => {
      // First select: get managed users
      db.select.mockReturnValueOnce(buildWhereChain([{ id: 'u1' }, { id: 'u2' }]));
      // Second select: get pending vacations with inner join
      const pendingVacations = [
        {
          vacation: { id: 1, userId: 'u1', status: 'pending', startDate: '2026-04-01', endDate: '2026-04-03' },
          user: { id: 'u1', fullName: 'User One', email: 'u1@test.com' },
        },
      ];
      db.select.mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(pendingVacations),
      });

      const result = await service.getPendingVacationsForManager('manager-1');
      expect(result).toHaveLength(1);
      expect(result[0].vacation.status).toBe('pending');
      expect(result[0].user.fullName).toBe('User One');
    });
  });
});

// Helpers
function buildLimitChain(resolveValue: any[]) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(resolveValue),
  };
  chain.where.mockReturnValue(chain);
  return chain;
}

function buildWhereChain(resolveValue: any[]) {
  return {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(resolveValue),
    innerJoin: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockResolvedValue(resolveValue),
  };
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
