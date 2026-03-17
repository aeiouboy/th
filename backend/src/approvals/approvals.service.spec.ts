import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { DRIZZLE } from '../database/drizzle.provider';

describe('ApprovalsService', () => {
  let service: ApprovalsService;
  let db: any;

  beforeEach(async () => {
    db = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      selectDistinct: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalsService,
        { provide: DRIZZLE, useValue: db },
      ],
    }).compile();

    service = module.get<ApprovalsService>(ApprovalsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getPending', () => {
    it('should return empty results when no pending approvals exist', async () => {
      // managerPending and ccPending queries use .where().groupBy() chain
      db.select
        .mockReturnValueOnce(buildWhereResolveChain([]))  // managerPending
        .mockReturnValueOnce(buildWhereGroupByChain([])); // ccPending

      const result = await service.getPending('manager-1');
      expect(result.asManager).toHaveLength(0);
      expect(result.asCCOwner).toHaveLength(0);
    });

    it('should return timesheets pending manager approval', async () => {
      const managerPendingRows = [
        {
          timesheet: { id: 'ts-1', userId: 'emp-1', periodStart: '2026-03-09', periodEnd: '2026-03-15', status: 'submitted' },
          employee: { id: 'emp-1', fullName: 'Alice', email: 'alice@test.com', department: 'Engineering' },
        },
      ];

      db.select
        .mockReturnValueOnce(buildWhereResolveChain(managerPendingRows)) // managerPending
        .mockReturnValueOnce(buildWhereGroupByChain([]))                  // ccPending
        .mockReturnValueOnce(buildGroupByChain([{ timesheetId: 'ts-1', totalHours: '40' }])); // hours

      const result = await service.getPending('manager-1');
      expect(result.asManager).toHaveLength(1);
      expect(result.asManager[0].id).toBe('ts-1');
      expect(result.asManager[0].totalHours).toBe(40);
    });
  });

  describe('approve', () => {
    it('should throw NotFoundException when timesheet does not exist', async () => {
      db.select.mockReturnValueOnce(buildLimitChain([]));
      await expect(service.approve('bad-id', 'manager-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when timesheet is in locked status', async () => {
      const ts = { id: 'ts-1', userId: 'emp-1', status: 'locked' };
      db.select.mockReturnValueOnce(buildLimitChain([ts]));
      await expect(service.approve('ts-1', 'manager-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when approver is not the employee manager', async () => {
      const ts = { id: 'ts-1', userId: 'emp-1', status: 'submitted' };
      const employee = { id: 'emp-1', managerId: 'other-manager' };

      db.select
        .mockReturnValueOnce(buildLimitChain([ts]))
        .mockReturnValueOnce(buildLimitChain([employee]));

      await expect(service.approve('ts-1', 'wrong-manager')).rejects.toThrow(ForbiddenException);
    });

    it('should transition timesheet from submitted to manager_approved', async () => {
      const ts = { id: 'ts-1', userId: 'emp-1', status: 'submitted' };
      const employee = { id: 'emp-1', managerId: 'manager-1' };

      db.select
        .mockReturnValueOnce(buildLimitChain([ts]))       // find timesheet
        .mockReturnValueOnce(buildLimitChain([employee])) // find employee
        .mockReturnValueOnce(buildLimitChain([]));         // ccApproversNeeded (none needed -> auto-lock path)

      db.update.mockReturnValueOnce(buildUpdateChain([]));
      db.insert.mockReturnValueOnce(buildInsertChain([])); // approval log

      // Auto-lock since no CC approvers
      db.update.mockReturnValueOnce(buildUpdateChain([]));

      const result = await service.approve('ts-1', 'manager-1');
      expect(result.status).toBe('manager_approved');
    });

    it('should create an audit log entry when approving', async () => {
      const ts = { id: 'ts-1', userId: 'emp-1', status: 'submitted' };
      const employee = { id: 'emp-1', managerId: 'manager-1' };

      db.select
        .mockReturnValueOnce(buildLimitChain([ts]))
        .mockReturnValueOnce(buildLimitChain([employee]))
        .mockReturnValueOnce(buildLimitChain([]));

      db.update.mockReturnValueOnce(buildUpdateChain([]));
      const insertChain = buildInsertChain([]);
      db.insert.mockReturnValueOnce(insertChain);
      db.update.mockReturnValueOnce(buildUpdateChain([]));

      await service.approve('ts-1', 'manager-1');
      expect(db.insert).toHaveBeenCalled();
    });

    it('should auto-lock when no CC approvers are needed', async () => {
      const ts = { id: 'ts-1', userId: 'emp-1', status: 'submitted' };
      const employee = { id: 'emp-1', managerId: 'manager-1' };

      db.select
        .mockReturnValueOnce(buildLimitChain([ts]))
        .mockReturnValueOnce(buildLimitChain([employee]))
        .mockReturnValueOnce(buildLimitChain([])); // no CC approvers

      db.update.mockReturnValueOnce(buildUpdateChain([])); // manager_approved
      db.insert.mockReturnValueOnce(buildInsertChain([])); // log
      db.update.mockReturnValueOnce(buildUpdateChain([])); // locked

      const result = await service.approve('ts-1', 'manager-1');
      // Status returned is 'manager_approved'; locking happens as side effect
      expect(result.status).toBe('manager_approved');
      expect(db.update).toHaveBeenCalledTimes(2); // manager_approved + locked
    });

    it('should throw ForbiddenException when CC approver does not own any charge code on the timesheet', async () => {
      const ts = { id: 'ts-1', userId: 'emp-1', status: 'manager_approved' };

      db.select
        .mockReturnValueOnce(buildLimitChain([ts]))
        .mockReturnValueOnce(buildLimitChain([])); // no CC match

      await expect(service.approve('ts-1', 'cc-approver')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('reject', () => {
    it('should throw NotFoundException when timesheet does not exist', async () => {
      db.select.mockReturnValueOnce(buildLimitChain([]));
      await expect(service.reject('bad-id', 'manager-1', 'reason')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when rejecting a locked timesheet', async () => {
      const ts = { id: 'ts-1', userId: 'emp-1', status: 'locked' };
      db.select.mockReturnValueOnce(buildLimitChain([ts]));
      await expect(service.reject('ts-1', 'manager-1', 'reason')).rejects.toThrow(BadRequestException);
    });

    it('should reject a submitted timesheet and set status to rejected', async () => {
      const ts = { id: 'ts-1', userId: 'emp-1', status: 'submitted' };
      const employee = { id: 'emp-1', managerId: 'manager-1' };

      db.select
        .mockReturnValueOnce(buildLimitChain([ts]))
        .mockReturnValueOnce(buildLimitChain([employee]));

      db.update.mockReturnValueOnce(buildUpdateChain([{ ...ts, status: 'rejected' }]));
      db.insert.mockReturnValueOnce(buildInsertChain([]));

      const result = await service.reject('ts-1', 'manager-1', 'Missing hours');
      expect(result.status).toBe('rejected');
    });

    it('should create audit log with reject action', async () => {
      const ts = { id: 'ts-1', userId: 'emp-1', status: 'submitted' };
      const employee = { id: 'emp-1', managerId: 'manager-1' };

      db.select
        .mockReturnValueOnce(buildLimitChain([ts]))
        .mockReturnValueOnce(buildLimitChain([employee]));

      db.update.mockReturnValueOnce(buildUpdateChain([]));
      db.insert.mockReturnValueOnce(buildInsertChain([]));

      await service.reject('ts-1', 'manager-1', 'reason');
      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('bulkApprove', () => {
    it('should approve multiple timesheets and return results', async () => {
      // Each approve call needs: ts lookup, employee lookup, ccApprovers check, update, insert, update
      const makeApproveSequence = () => {
        db.select
          .mockReturnValueOnce(buildLimitChain([{ id: 'ts-x', userId: 'emp-1', status: 'submitted' }]))
          .mockReturnValueOnce(buildLimitChain([{ id: 'emp-1', managerId: 'manager-1' }]))
          .mockReturnValueOnce(buildLimitChain([]));
        db.update.mockReturnValueOnce(buildUpdateChain([]));
        db.insert.mockReturnValueOnce(buildInsertChain([]));
        db.update.mockReturnValueOnce(buildUpdateChain([]));
      };

      makeApproveSequence();
      makeApproveSequence();

      const result = await service.bulkApprove(['ts-1', 'ts-2'], 'manager-1');
      expect(result.results).toHaveLength(2);
    });

    it('should include error entry when individual approval fails', async () => {
      // First fails (not found)
      db.select.mockReturnValueOnce(buildLimitChain([]));

      const result = await service.bulkApprove(['bad-id'], 'manager-1');
      expect(result.results[0].status).toBe('error');
      expect(result.results[0].error).toBeDefined();
    });
  });
});

// Helpers
function buildWhereResolveChain(resolveValue: any[]) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(resolveValue),
  };
  chain.innerJoin.mockReturnValue(chain);
  return chain;
}

function buildWhereGroupByChain(resolveValue: any[]) {
  const innerChain: any = {
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockResolvedValue(resolveValue),
  };
  innerChain.where.mockReturnValue(innerChain);

  const chain: any = {
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnValue(innerChain),
    groupBy: jest.fn().mockResolvedValue(resolveValue),
  };
  chain.innerJoin.mockReturnValue(chain);
  return chain;
}

function buildLimitChain(resolveValue: any[]) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(resolveValue),
  };
  chain.where.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  return chain;
}

function buildJoinGroupByChain(resolveValue: any[]) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(resolveValue),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockResolvedValue(resolveValue),
    limit: jest.fn().mockResolvedValue(resolveValue),
  };
  chain.innerJoin.mockReturnValue(chain);
  chain.where.mockReturnValue({ ...chain, groupBy: jest.fn().mockResolvedValue(resolveValue) });
  return chain;
}

function buildGroupByChain(resolveValue: any[]) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockResolvedValue(resolveValue),
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

function buildInsertChain(resolveValue: any[]) {
  return {
    values: jest.fn().mockResolvedValue(resolveValue),
  };
}
