import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
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

  describe('updateAvatar', () => {
    it('should update avatarUrl with a valid https URL', async () => {
      const updated = { id: 'u1', email: 'alice@test.com', avatarUrl: 'https://cdn.example.com/avatar.png' };
      db.update.mockReturnValueOnce(buildUpdateChain([updated]));

      const result = await service.updateAvatar('u1', 'https://cdn.example.com/avatar.png');
      expect(result.avatarUrl).toBe('https://cdn.example.com/avatar.png');
    });

    it('should update avatarUrl with a valid http URL', async () => {
      const updated = { id: 'u1', email: 'alice@test.com', avatarUrl: 'http://cdn.example.com/avatar.png' };
      db.update.mockReturnValueOnce(buildUpdateChain([updated]));

      const result = await service.updateAvatar('u1', 'http://cdn.example.com/avatar.png');
      expect(result.avatarUrl).toBe('http://cdn.example.com/avatar.png');
    });

    it('should throw BadRequestException when avatarUrl is not a valid URL', async () => {
      await expect(service.updateAvatar('u1', 'not-a-url')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when avatarUrl uses non-http protocol', async () => {
      await expect(service.updateAvatar('u1', 'ftp://cdn.example.com/avatar.png')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for empty avatarUrl', async () => {
      await expect(service.updateAvatar('u1', '')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      db.update.mockReturnValueOnce(buildUpdateChain([]));

      await expect(service.updateAvatar('nonexistent', 'https://cdn.example.com/avatar.png')).rejects.toThrow(NotFoundException);
    });

    it('should update the correct user ID', async () => {
      const updated = { id: 'u2', email: 'bob@test.com', avatarUrl: 'https://cdn.example.com/bob.png' };
      db.update.mockReturnValueOnce(buildUpdateChain([updated]));

      const result = await service.updateAvatar('u2', 'https://cdn.example.com/bob.png');
      expect(result.id).toBe('u2');
    });
  });

  describe('findAll pagination', () => {
    it('should default limit to 100 when not provided', async () => {
      db.select.mockReturnValueOnce(buildFromChain([]));
      await service.findAll();
      const chain = db.select.mock.results[0].value;
      expect(chain.limit).toHaveBeenCalledWith(100);
    });

    it('should cap limit at 500 when limit exceeds 500', async () => {
      db.select.mockReturnValueOnce(buildFromChain([]));
      await service.findAll({ limit: 9999 });
      const chain = db.select.mock.results[0].value;
      expect(chain.limit).toHaveBeenCalledWith(500);
    });

    it('should use provided limit when within bounds', async () => {
      db.select.mockReturnValueOnce(buildFromChain([]));
      await service.findAll({ limit: 50 });
      const chain = db.select.mock.results[0].value;
      expect(chain.limit).toHaveBeenCalledWith(50);
    });

    it('should default offset to 0 when not provided', async () => {
      db.select.mockReturnValueOnce(buildFromChain([]));
      await service.findAll();
      const chain = db.select.mock.results[0].value;
      expect(chain.offset).toHaveBeenCalledWith(0);
    });

    it('should use provided offset', async () => {
      db.select.mockReturnValueOnce(buildFromChain([]));
      await service.findAll({ offset: 50 });
      const chain = db.select.mock.results[0].value;
      expect(chain.offset).toHaveBeenCalledWith(50);
    });
  });
});

// Helpers
function buildFromChain(resolveValue: any[]) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockResolvedValue(resolveValue),
  };
  return chain;
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
