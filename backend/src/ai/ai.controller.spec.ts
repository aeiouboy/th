/**
 * Controller tests for AiController
 * Verifies routing, parameter passing, and delegation to AiService.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

describe('AiController', () => {
  let controller: AiController;
  let service: Record<string, jest.Mock>;

  const mockUser = { id: 'user-1', email: 'test@example.com' };

  beforeEach(async () => {
    service = {
      parseTimeEntry: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [{ provide: AiService, useValue: service }],
    }).compile();

    controller = module.get<AiController>(AiController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /parse', () => {
    it('should return parsed entries on success', async () => {
      const entries = [
        { chargeCodeId: 'cc-1', hours: 6, description: 'OMS work' },
        { chargeCodeId: 'cc-2', hours: 2, description: 'HR meeting' },
      ];
      service.parseTimeEntry.mockResolvedValue(entries);

      const dto = { text: 'วันนี้ทำงาน OMS 6 ชม. กับ meeting HR 2 ชม.' };
      const result = await controller.parse(mockUser, dto);

      expect(result).toEqual(entries);
    });

    it('should throw BadRequestException when result has rejected property', async () => {
      service.parseTimeEntry.mockResolvedValue({
        rejected: true,
        reason: 'Could not parse input',
      });

      const dto = { text: 'gibberish input' };
      await expect(controller.parse(mockUser, dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.parse(mockUser, dto)).rejects.toThrow(
        'Could not parse input',
      );
    });

    it('should pass correct args to aiService.parseTimeEntry', async () => {
      service.parseTimeEntry.mockResolvedValue([]);

      const dto = { text: 'ทำงาน OMS 8 ชม.' };
      await controller.parse(mockUser, dto);

      expect(service.parseTimeEntry).toHaveBeenCalledWith(
        'ทำงาน OMS 8 ชม.',
        'user-1',
        undefined,
      );
    });

    it('should pass date to service when provided in dto', async () => {
      service.parseTimeEntry.mockResolvedValue([]);

      const dto = { text: 'ทำงาน OMS 8 ชม.', date: '2026-03-22' };
      await controller.parse(mockUser, dto);

      expect(service.parseTimeEntry).toHaveBeenCalledWith(
        'ทำงาน OMS 8 ชม.',
        'user-1',
        '2026-03-22',
      );
    });
  });
});
