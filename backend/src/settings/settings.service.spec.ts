import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from './settings.service';
import { DRIZZLE } from '../database/drizzle.provider';

describe('SettingsService', () => {
  let service: SettingsService;
  let db: any;

  beforeEach(async () => {
    db = {
      select: jest.fn(),
      insert: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: DRIZZLE, useValue: db },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getAll', () => {
    it('should return all settings as a key-value record', async () => {
      const rows = [
        { key: 'default_currency', value: 'THB', updatedAt: new Date() },
        { key: 'timezone', value: 'Asia/Bangkok', updatedAt: new Date() },
      ];
      db.select.mockReturnValueOnce({
        from: jest.fn().mockResolvedValue(rows),
      });

      const result = await service.getAll();
      expect(result).toEqual({
        default_currency: 'THB',
        timezone: 'Asia/Bangkok',
      });
    });

    it('should return empty record when no settings exist', async () => {
      db.select.mockReturnValueOnce({
        from: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getAll();
      expect(result).toEqual({});
    });
  });

  describe('get', () => {
    it('should return value for an existing key', async () => {
      db.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ key: 'default_currency', value: 'USD', updatedAt: new Date() }]),
          }),
        }),
      });

      const result = await service.get('default_currency');
      expect(result).toBe('USD');
    });

    it('should return THB as default when default_currency key is not found', async () => {
      db.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.get('default_currency');
      expect(result).toBe('THB');
    });

    it('should return empty string for unknown keys not found', async () => {
      db.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.get('nonexistent');
      expect(result).toBe('');
    });
  });

  describe('set', () => {
    it('should upsert a setting and return key-value', async () => {
      const row = { key: 'default_currency', value: 'EUR', updatedAt: new Date() };
      db.insert.mockReturnValueOnce({
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([row]),
          }),
        }),
      });

      const result = await service.set('default_currency', 'EUR');
      expect(result).toEqual({ key: 'default_currency', value: 'EUR' });
    });
  });
});
