import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CostRatesService } from './cost-rates.service';
import { DRIZZLE } from '../database/drizzle.provider';

describe('CostRatesService', () => {
  let service: CostRatesService;
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
        CostRatesService,
        { provide: DRIZZLE, useValue: db },
      ],
    }).compile();

    service = module.get<CostRatesService>(CostRatesService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should return all cost rates ordered by jobGrade and effectiveFrom', async () => {
      const rates = [
        { id: 1, jobGrade: 'L4', hourlyRate: '85.00', effectiveFrom: '2026-01-01', effectiveTo: null },
        { id: 2, jobGrade: 'L5', hourlyRate: '100.00', effectiveFrom: '2026-01-01', effectiveTo: null },
      ];
      db.select.mockReturnValueOnce(buildOrderByChain(rates));

      const result = await service.findAll();
      expect(result).toHaveLength(2);
      expect(result[0].jobGrade).toBe('L4');
    });

    it('should return empty array when no cost rates exist', async () => {
      db.select.mockReturnValueOnce(buildOrderByChain([]));

      const result = await service.findAll();
      expect(result).toHaveLength(0);
    });
  });

  describe('create', () => {
    it('should create a new cost rate and return it', async () => {
      const created = { id: 1, jobGrade: 'L6', hourlyRate: '120.00', effectiveFrom: '2026-04-01', effectiveTo: null };
      db.insert.mockReturnValueOnce(buildInsertChain([created]));

      const result = await service.create({
        jobGrade: 'L6',
        hourlyRate: '120.00',
        effectiveFrom: '2026-04-01',
      });

      expect(result.id).toBe(1);
      expect(result.jobGrade).toBe('L6');
      expect(result.hourlyRate).toBe('120.00');
    });

    it('should create cost rate with effectiveTo date when provided', async () => {
      const created = { id: 2, jobGrade: 'L4', hourlyRate: '80.00', effectiveFrom: '2026-01-01', effectiveTo: '2026-12-31' };
      db.insert.mockReturnValueOnce(buildInsertChain([created]));

      const result = await service.create({
        jobGrade: 'L4',
        hourlyRate: '80.00',
        effectiveFrom: '2026-01-01',
        effectiveTo: '2026-12-31',
      });

      expect(result.effectiveTo).toBe('2026-12-31');
    });
  });

  describe('update', () => {
    it('should update an existing cost rate and return it', async () => {
      const updated = { id: 1, jobGrade: 'L4', hourlyRate: '90.00', effectiveFrom: '2026-01-01', effectiveTo: null };
      db.update.mockReturnValueOnce(buildUpdateChain([updated]));

      const result = await service.update(1, { hourlyRate: '90.00' });
      expect(result.hourlyRate).toBe('90.00');
    });

    it('should throw NotFoundException when cost rate does not exist', async () => {
      db.update.mockReturnValueOnce(buildUpdateChain([]));

      await expect(service.update(999, { hourlyRate: '90.00' })).rejects.toThrow(NotFoundException);
    });

    it('should allow partial updates (only jobGrade)', async () => {
      const updated = { id: 1, jobGrade: 'L5', hourlyRate: '85.00', effectiveFrom: '2026-01-01', effectiveTo: null };
      db.update.mockReturnValueOnce(buildUpdateChain([updated]));

      const result = await service.update(1, { jobGrade: 'L5' });
      expect(result.jobGrade).toBe('L5');
    });
  });

  describe('remove', () => {
    it('should delete a cost rate and return { deleted: true }', async () => {
      const deleted = { id: 1, jobGrade: 'L4', hourlyRate: '85.00' };
      db.delete.mockReturnValueOnce(buildDeleteChain([deleted]));

      const result = await service.remove(1);
      expect(result).toEqual({ deleted: true });
    });

    it('should throw NotFoundException when cost rate does not exist', async () => {
      db.delete.mockReturnValueOnce(buildDeleteChain([]));

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});

// Helpers
function buildOrderByChain(resolveValue: any[]) {
  return {
    from: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(resolveValue),
  };
}

function buildInsertChain(resolveValue: any[]) {
  return {
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue(resolveValue),
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

function buildDeleteChain(resolveValue: any[]) {
  const chain: any = {
    where: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue(resolveValue),
  };
  chain.where.mockReturnValue(chain);
  return chain;
}
