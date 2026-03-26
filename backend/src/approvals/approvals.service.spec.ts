import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { TeamsWebhookService } from '../integrations/teams-webhook.service';
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
        { provide: TeamsWebhookService, useValue: { sendCard: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get<ApprovalsService>(ApprovalsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getPending', () => {
    it('should return empty results when no pending approvals exist', async () => {
      // managerPending and ccPending queries
      db.select
        .mockReturnValueOnce(buildWhereResolveChain([]))  // managerPending
        .mockReturnValueOnce(buildWhereGroupByChain([])); // ccPending

      const result = await service.getPending('manager-1');
      expect(result.pending).toHaveLength(0);
    });

    it('should return timesheets pending approval', async () => {
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

      db.selectDistinct
        .mockReturnValueOnce(buildWhereResolveChain([{ timesheetId: 'ts-1', programName: 'Program A' }])); // programs

      const result = await service.getPending('manager-1');
      expect(result.pending).toHaveLength(1);
      expect(result.pending[0].id).toBe('ts-1');
      expect(result.pending[0].totalHours).toBe(40);
      expect(result.pending[0].programs).toEqual(['Program A']);
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

    it('should throw ForbiddenException when approver is not the employee manager and not a CC approver', async () => {
      const ts = { id: 'ts-1', userId: 'emp-1', status: 'submitted' };
      const employee = { id: 'emp-1', managerId: 'other-manager' };

      db.select
        .mockReturnValueOnce(buildLimitChain([ts]))
        .mockReturnValueOnce(buildLimitChain([employee]))
        .mockReturnValueOnce(buildLimitChain([])); // no CC match either

      await expect(service.approve('ts-1', 'wrong-manager')).rejects.toThrow(ForbiddenException);
    });

    it('should transition timesheet from submitted to approved (period not yet ended)', async () => {
      // Use a future period so it becomes 'approved' not 'locked'
      const ts = { id: 'ts-1', userId: 'emp-1', status: 'submitted', periodStart: '2027-01-06', periodEnd: '2027-01-12' };
      const employee = { id: 'emp-1', managerId: 'manager-1' };
      const updated = { ...ts, status: 'approved' };

      db.select
        .mockReturnValueOnce(buildLimitChain([ts]))       // find timesheet
        .mockReturnValueOnce(buildLimitChain([employee])); // find employee (is manager)

      db.update.mockReturnValueOnce(buildUpdateChain([updated])); // approved
      db.insert.mockReturnValueOnce(buildInsertChain([]));        // approval log

      const result = await service.approve('ts-1', 'manager-1');
      expect(result.status).toBe('approved');
    });

    it('should create an audit log entry when approving', async () => {
      const ts = { id: 'ts-1', userId: 'emp-1', status: 'submitted' };
      const employee = { id: 'emp-1', managerId: 'manager-1' };

      db.select
        .mockReturnValueOnce(buildLimitChain([ts]))
        .mockReturnValueOnce(buildLimitChain([employee]));

      db.update.mockReturnValueOnce(buildUpdateChain([]));
      db.insert.mockReturnValueOnce(buildInsertChain([]));

      await service.approve('ts-1', 'manager-1');
      expect(db.insert).toHaveBeenCalled();
    });

    it('should throw BadRequestException when timesheet is manager_approved (no longer valid)', async () => {
      const ts = { id: 'ts-1', userId: 'emp-1', status: 'manager_approved' };

      db.select.mockReturnValueOnce(buildLimitChain([ts]));

      await expect(service.approve('ts-1', 'cc-approver')).rejects.toThrow(BadRequestException);
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
      const ts = { id: 'ts-1', userId: 'emp-1', status: 'submitted', periodStart: '2026-03-09', periodEnd: '2026-03-15' };
      const employee = { id: 'emp-1', managerId: 'manager-1' };
      const employeeProfile = { fullName: 'Alice', email: 'alice@test.com' };

      db.select
        .mockReturnValueOnce(buildLimitChain([ts]))
        .mockReturnValueOnce(buildLimitChain([employee]))
        .mockReturnValueOnce(buildLimitChain([employeeProfile]));

      db.update.mockReturnValueOnce(buildUpdateChain([{ ...ts, status: 'rejected' }]));
      db.insert.mockReturnValueOnce(buildInsertChain([]));

      const result = await service.reject('ts-1', 'manager-1', 'Missing hours');
      expect(result.status).toBe('rejected');
    });

    it('should create audit log with reject action', async () => {
      const ts = { id: 'ts-1', userId: 'emp-1', status: 'submitted', periodStart: '2026-03-09', periodEnd: '2026-03-15' };
      const employee = { id: 'emp-1', managerId: 'manager-1' };
      const employeeProfile = { fullName: 'Alice', email: 'alice@test.com' };

      db.select
        .mockReturnValueOnce(buildLimitChain([ts]))
        .mockReturnValueOnce(buildLimitChain([employee]))
        .mockReturnValueOnce(buildLimitChain([employeeProfile]));

      db.update.mockReturnValueOnce(buildUpdateChain([]));
      db.insert.mockReturnValueOnce(buildInsertChain([]));

      await service.reject('ts-1', 'manager-1', 'reason');
      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('bulkApprove', () => {
    it('should approve multiple timesheets and return results', async () => {
      // Each approve call needs: ts lookup, employee lookup, update, insert (log)
      const makeApproveSequence = () => {
        db.select
          .mockReturnValueOnce(buildLimitChain([{ id: 'ts-x', userId: 'emp-1', status: 'submitted', periodStart: '2027-01-06', periodEnd: '2027-01-12' }]))
          .mockReturnValueOnce(buildLimitChain([{ id: 'emp-1', managerId: 'manager-1' }]));
        db.update.mockReturnValueOnce(buildUpdateChain([{ status: 'approved' }]));
        db.insert.mockReturnValueOnce(buildInsertChain([]));
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
