import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { DRIZZLE } from '../database/drizzle.provider';

describe('UsersService', () => {
  let service: UsersService;
  let db: any;

  beforeEach(async () => {
    db = {
      select: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: DRIZZLE, useValue: db },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should return all user profiles', async () => {
      const profiles = [
        { id: 'u1', email: 'alice@test.com', fullName: 'Alice', role: 'employee' },
        { id: 'u2', email: 'bob@test.com', fullName: 'Bob', role: 'admin' },
      ];
      db.select.mockReturnValueOnce(buildFromChain(profiles));

      const result = await service.findAll();
      expect(result).toHaveLength(2);
      expect(result[0].email).toBe('alice@test.com');
    });

    it('should return empty array when no profiles exist', async () => {
      db.select.mockReturnValueOnce(buildFromChain([]));

      const result = await service.findAll();
      expect(result).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('should return the user when found', async () => {
      const profile = { id: 'u1', email: 'alice@test.com', fullName: 'Alice', role: 'employee' };
      db.select.mockReturnValueOnce(buildLimitChain([profile]));

      const result = await service.findById('u1');
      expect(result.id).toBe('u1');
      expect(result.email).toBe('alice@test.com');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      db.select.mockReturnValueOnce(buildLimitChain([]));

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update and return the user profile', async () => {
      const updated = { id: 'u1', email: 'alice@test.com', fullName: 'Alice Updated', role: 'employee' };
      db.update.mockReturnValueOnce(buildUpdateChain([updated]));

      const result = await service.updateProfile('u1', { fullName: 'Alice Updated' });
      expect(result.fullName).toBe('Alice Updated');
    });

    it('should throw NotFoundException when user to update does not exist', async () => {
      db.update.mockReturnValueOnce(buildUpdateChain([]));

      await expect(service.updateProfile('nonexistent', { fullName: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateRole', () => {
    it('should update user role successfully', async () => {
      const updated = { id: 'u1', email: 'alice@test.com', role: 'admin' };
      db.update.mockReturnValueOnce(buildUpdateChain([updated]));

      const result = await service.updateRole('u1', 'admin');
      expect(result.role).toBe('admin');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      db.update.mockReturnValueOnce(buildUpdateChain([]));

      await expect(service.updateRole('nonexistent', 'admin')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateJobGrade', () => {
    it('should update job grade successfully', async () => {
      const updated = { id: 'u1', email: 'alice@test.com', jobGrade: 'L5' };
      db.update.mockReturnValueOnce(buildUpdateChain([updated]));

      const result = await service.updateJobGrade('u1', 'L5');
      expect(result.jobGrade).toBe('L5');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      db.update.mockReturnValueOnce(buildUpdateChain([]));

      await expect(service.updateJobGrade('nonexistent', 'L5')).rejects.toThrow(NotFoundException);
    });
  });
});

// Helpers
function buildFromChain(resolveValue: any[]) {
  return {
    from: jest.fn().mockResolvedValue(resolveValue),
  };
}

function buildLimitChain(resolveValue: any[]) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(resolveValue),
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
