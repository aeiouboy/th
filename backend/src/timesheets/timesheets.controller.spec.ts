/**
 * Controller tests for TimesheetsController
 * Verifies routing, parameter passing, and delegation to TimesheetsService.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { TimesheetsController } from './timesheets.controller';
import { TimesheetsService } from './timesheets.service';

describe('TimesheetsController', () => {
  let controller: TimesheetsController;
  let service: Record<string, jest.Mock>;

  const mockUser = { id: 'user-1', email: 'test@example.com' };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findByPeriod: jest.fn(),
      getAvailablePeriods: jest.fn(),
      getUserChargeCodes: jest.fn(),
      findById: jest.fn(),
      getEntries: jest.fn(),
      upsertEntries: jest.fn(),
      submit: jest.fn(),
      copyFromPrevious: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TimesheetsController],
      providers: [{ provide: TimesheetsService, useValue: service }],
    }).compile();

    controller = module.get<TimesheetsController>(TimesheetsController);
  });

  describe('POST / — create', () => {
    it('should delegate to service.create with user.id and dto', async () => {
      const dto = { period_start: '2026-03-09', period_end: '2026-03-15' };
      const expected = { id: 'ts-1', status: 'draft' };
      service.create.mockResolvedValue(expected as any);

      const result = await controller.create(mockUser, dto);
      expect(service.create).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual(expected);
    });
  });

  describe('GET / — findByPeriod', () => {
    it('should pass the period query param to service', async () => {
      const sheet = { id: 'ts-1', periodStart: '2026-03-09' };
      service.findByPeriod.mockResolvedValue(sheet as any);

      const result = await controller.findByPeriod(mockUser, '2026-03-09');
      expect(service.findByPeriod).toHaveBeenCalledWith('user-1', '2026-03-09');
      expect(result).toEqual(sheet);
    });

    it('should default to today when no period is provided', async () => {
      service.findByPeriod.mockResolvedValue(null as any);

      await controller.findByPeriod(mockUser, undefined);
      const calledPeriod = (service.findByPeriod as jest.Mock).mock.calls[0][1];
      // Should be a date string in YYYY-MM-DD format (today's date)
      expect(calledPeriod).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('GET /periods — getAvailablePeriods', () => {
    it('should delegate to service.getAvailablePeriods', async () => {
      const periods = ['2026-03-09', '2026-03-02'];
      service.getAvailablePeriods.mockResolvedValue(periods);

      const result = await controller.getAvailablePeriods(mockUser);
      expect(service.getAvailablePeriods).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(periods);
    });
  });

  describe('GET /charge-codes — getUserChargeCodes', () => {
    it('should delegate to service.getUserChargeCodes', async () => {
      const codes = [{ chargeCodeId: 'PRJ-001', name: 'Project Alpha' }];
      service.getUserChargeCodes.mockResolvedValue(codes as any);

      const result = await controller.getUserChargeCodes(mockUser);
      expect(service.getUserChargeCodes).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(codes);
    });
  });

  describe('GET /:id — findById', () => {
    it('should delegate to service.findById with user.id and id', async () => {
      const sheet = { id: 'ts-1', entries: [] };
      service.findById.mockResolvedValue(sheet as any);

      const result = await controller.findById(mockUser, 'ts-1');
      expect(service.findById).toHaveBeenCalledWith('user-1', 'ts-1');
      expect(result).toEqual(sheet);
    });
  });

  describe('GET /:id/entries — getEntries', () => {
    it('should delegate to service.getEntries', async () => {
      const entries = [{ id: 'e-1', hours: '8' }];
      service.getEntries.mockResolvedValue(entries as any);

      const result = await controller.getEntries(mockUser, 'ts-1');
      expect(service.getEntries).toHaveBeenCalledWith('user-1', 'ts-1');
      expect(result).toEqual(entries);
    });
  });

  describe('PUT /:id/entries — upsertEntries', () => {
    it('should delegate to service.upsertEntries with dto.entries', async () => {
      const dto = {
        entries: [
          { charge_code_id: 'CC-001', date: '2026-03-09', hours: 8 },
        ],
      };
      const inserted = [{ id: 'e-1', chargeCodeId: 'CC-001', hours: '8' }];
      service.upsertEntries.mockResolvedValue(inserted as any);

      const result = await controller.upsertEntries(mockUser, 'ts-1', dto as any);
      expect(service.upsertEntries).toHaveBeenCalledWith('user-1', 'ts-1', dto.entries);
      expect(result).toEqual(inserted);
    });
  });

  describe('POST /:id/submit — submit', () => {
    it('should delegate to service.submit', async () => {
      const updated = { id: 'ts-1', status: 'submitted' };
      service.submit.mockResolvedValue(updated as any);

      const result = await controller.submit(mockUser, 'ts-1');
      expect(service.submit).toHaveBeenCalledWith('user-1', 'ts-1');
      expect(result).toEqual(updated);
    });
  });

  describe('POST /:id/copy-from-previous — copyFromPrevious', () => {
    it('should delegate to service.copyFromPrevious', async () => {
      const copyResult = { message: 'Copied 2 charge code(s)', entries: [] };
      service.copyFromPrevious.mockResolvedValue(copyResult as any);

      const result = await controller.copyFromPrevious(mockUser, 'ts-1');
      expect(service.copyFromPrevious).toHaveBeenCalledWith('user-1', 'ts-1');
      expect(result).toEqual(copyResult);
    });
  });
});
