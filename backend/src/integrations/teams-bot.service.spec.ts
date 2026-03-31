import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TeamsBotService } from './teams-bot.service';
import { DRIZZLE } from '../database/drizzle.provider';
import { TimesheetsService } from '../timesheets/timesheets.service';
import { BudgetsService } from '../budgets/budgets.service';

// Chainable mock builder — terminal call is .limit() or .where() or .leftJoin() depending on query type
function buildSelectChain(resolveValue: any[]) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(resolveValue),
  };
  chain.where.mockReturnValue(chain);
  chain.leftJoin.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  return chain;
}

function buildSelectChainResolveOnWhere(resolveValue: any[]) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(resolveValue),
    leftJoin: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockResolvedValue(resolveValue),
    limit: jest.fn().mockResolvedValue(resolveValue),
  };
  chain.leftJoin.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  return chain;
}

describe('TeamsBotService', () => {
  let service: TeamsBotService;
  let db: any;
  let timesheetsService: any;
  let budgetsService: any;

  beforeEach(async () => {
    db = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    timesheetsService = {
      create: jest.fn(),
      findByPeriod: jest.fn().mockResolvedValue(null),
      findById: jest.fn().mockResolvedValue(null),
      upsertEntries: jest.fn().mockResolvedValue([]),
      getUserChargeCodes: jest.fn().mockResolvedValue([]),
    };

    budgetsService = {
      getBudgetForChargeCode: jest.fn(),
    };

    const configService = {
      get: jest.fn().mockReturnValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsBotService,
        { provide: DRIZZLE, useValue: db },
        { provide: TimesheetsService, useValue: timesheetsService },
        { provide: BudgetsService, useValue: budgetsService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<TeamsBotService>(TeamsBotService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── parseTimeEntry (pure logic — no DB calls) ───────────────────────────

  describe('parseTimeEntry', () => {
    it('should parse "Log 4h on PRJ-042 today"', () => {
      const result = service.parseTimeEntry('Log 4h on PRJ-042 today');
      expect(result).not.toBeNull();
      expect(result!.hours).toBe(4);
      expect(result!.chargeCodeId).toBe('PRJ-042');
    });

    it('should parse fractional hours "Log 2.5h on ACT-010 today"', () => {
      const result = service.parseTimeEntry('Log 2.5h on ACT-010 today');
      expect(result).not.toBeNull();
      expect(result!.hours).toBe(2.5);
    });

    it('should parse "Logged 2h code review ACT-010 yesterday"', () => {
      const result = service.parseTimeEntry('Logged 2h code review ACT-010 yesterday');
      expect(result).not.toBeNull();
      expect(result!.hours).toBe(2);
      expect(result!.chargeCodeId).toBe('ACT-010');
    });

    it('should use yesterday date when "yesterday" keyword present', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const expectedDate = yesterday.toISOString().split('T')[0];

      const result = service.parseTimeEntry('Log 3h on PRJ-042 yesterday');
      expect(result!.date).toBe(expectedDate);
    });

    it('should use today date when no date keyword and no ISO date', () => {
      const today = new Date().toISOString().split('T')[0];
      const result = service.parseTimeEntry('Log 4h on PRJ-042 today');
      expect(result!.date).toBe(today);
    });

    it('should parse an explicit ISO date "Add 3.5h PRJ-042 2026-03-15 design work"', () => {
      const result = service.parseTimeEntry('Add 3.5h PRJ-042 2026-03-15 design work');
      expect(result).not.toBeNull();
      expect(result!.date).toBe('2026-03-15');
      expect(result!.hours).toBe(3.5);
    });

    it('should extract description after charge code', () => {
      const result = service.parseTimeEntry('Log 4h PRJ-042 design review');
      expect(result!.description).toBe('design review');
    });

    it('should extract description before charge code (e.g. "Logged 2h code review ACT-010")', () => {
      const result = service.parseTimeEntry('Logged 2h code review ACT-010 today');
      expect(result!.description).toBeTruthy();
      expect(result!.description).toContain('code review');
    });

    it('should return null when no hours pattern is found', () => {
      expect(service.parseTimeEntry('Log on PRJ-042 today')).toBeNull();
    });

    it('should return null when hours is 0', () => {
      expect(service.parseTimeEntry('Log 0h on PRJ-042 today')).toBeNull();
    });

    it('should return null when hours exceed 24', () => {
      expect(service.parseTimeEntry('Log 25h on PRJ-042 today')).toBeNull();
    });

    it('should return null when no charge code pattern is found', () => {
      expect(service.parseTimeEntry('Log 4h today')).toBeNull();
    });

    it('should handle charge codes with underscores "PRJ_042"', () => {
      const result = service.parseTimeEntry('Log 4h PRJ_042 today');
      expect(result).not.toBeNull();
      expect(result!.chargeCodeId).toBe('PRJ_042');
    });

    it('should parse "Add 8h on TSK-001 2026-03-15"', () => {
      const result = service.parseTimeEntry('Add 8h on TSK-001 2026-03-15');
      expect(result!.hours).toBe(8);
      expect(result!.chargeCodeId).toBe('TSK-001');
      expect(result!.date).toBe('2026-03-15');
    });
  });

  // ─── getSuggestedPrompts ──────────────────────────────────────────────────

  describe('getSuggestedPrompts', () => {
    it('should return a non-empty array of prompt strings', () => {
      const prompts = service.getSuggestedPrompts();
      expect(Array.isArray(prompts)).toBe(true);
      expect(prompts.length).toBeGreaterThan(0);
      prompts.forEach((p) => expect(typeof p).toBe('string'));
    });
  });

  // ─── handleIncomingMessage — routing ─────────────────────────────────────

  describe('handleIncomingMessage — help/fallback', () => {
    it('should return help message when command is unrecognized', async () => {
      const response = await service.handleIncomingMessage('user-1', 'hello there');
      expect(response.type).toBe('message');
      // Service responds in Thai — verify it returns a non-empty help/greeting message
      expect(response.text.length).toBeGreaterThan(0);
    });

    it('should return help for empty string', async () => {
      const response = await service.handleIncomingMessage('user-1', '   ');
      expect(response.type).toBe('message');
      expect(response.suggestedActions).toBeDefined();
    });
  });

  // ─── Command: log time ───────────────────────────────────────────────────

  describe('handleIncomingMessage — log time command', () => {
    const userId = 'user-1';
    const timesheet = { id: 'ts-1', userId, periodStart: '2026-03-09', periodEnd: '2026-03-15', status: 'draft' };
    const chargeCode = { id: 'PRJ-042', name: 'Digital Transformation' };

    it('should log time successfully for a valid command', async () => {
      // DB: charge code lookup, vacation check, holiday check, existing entries
      // Note: access check now uses timesheetsService.getUserChargeCodes (mocked above in beforeEach)
      db.select
        .mockReturnValueOnce(buildSelectChain([chargeCode]))           // charge code lookup
        .mockReturnValueOnce(buildSelectChain([]))                     // vacation check (no vacation)
        .mockReturnValueOnce(buildSelectChain([]))                     // holiday check (no holiday)
        .mockReturnValueOnce(buildSelectChainResolveOnWhere([]));      // existing entries

      // User has access to PRJ-042
      timesheetsService.getUserChargeCodes.mockResolvedValue([{ chargeCodeId: 'PRJ-042' }]);
      timesheetsService.findByPeriod.mockResolvedValue(null);
      timesheetsService.create.mockResolvedValue(timesheet);
      timesheetsService.upsertEntries.mockResolvedValue([]);

      const response = await service.handleIncomingMessage(userId, 'Log 4h on PRJ-042 today');

      expect(response.type).toBe('message');
      // Service responds in Thai — check the key data (hours and charge code ID) appear
      expect(response.text).toContain('PRJ-042');
      expect(timesheetsService.create).toHaveBeenCalledWith(userId, expect.any(Object));
      expect(timesheetsService.upsertEntries).toHaveBeenCalled();
    });

    it('should return error message when charge code is not found in DB', async () => {
      db.select.mockReturnValueOnce(buildSelectChain([])); // charge code not found

      const response = await service.handleIncomingMessage(userId, 'Log 4h on PRJ-999 today');

      expect(response.type).toBe('message');
      expect(response.text).toContain('PRJ-999');
      // Service responds in Thai — just verify the charge code ID appears in the error
    });

    it('should return parse error message for invalid format', async () => {
      const response = await service.handleIncomingMessage(userId, 'log some time please');
      expect(response.type).toBe('message');
      // Service responds in Thai — verify error response is non-empty
      expect(response.text.length).toBeGreaterThan(0);
      expect(response.suggestedActions).toBeDefined();
    });

    it('should preserve existing entries when adding a new one', async () => {
      const existingEntry = { chargeCodeId: 'ACT-010', date: '2026-03-09', hours: '2', description: null };

      db.select
        .mockReturnValueOnce(buildSelectChain([chargeCode]))
        .mockReturnValueOnce(buildSelectChain([]))                             // vacation check
        .mockReturnValueOnce(buildSelectChain([]))                             // holiday check
        .mockReturnValueOnce(buildSelectChainResolveOnWhere([existingEntry])); // existing entries

      // User has access to PRJ-042
      timesheetsService.getUserChargeCodes.mockResolvedValue([{ chargeCodeId: 'PRJ-042' }]);
      timesheetsService.findByPeriod.mockResolvedValue(null);
      timesheetsService.create.mockResolvedValue(timesheet);
      timesheetsService.upsertEntries.mockResolvedValue([]);

      await service.handleIncomingMessage(userId, 'Log 4h on PRJ-042 today');

      const upsertCall = timesheetsService.upsertEntries.mock.calls[0];
      const entries: any[] = upsertCall[2];
      // Should contain both the existing entry and the new one
      expect(entries.length).toBe(2);
    });

    it('should return a message type response with suggestedActions after logging', async () => {
      db.select
        .mockReturnValueOnce(buildSelectChain([chargeCode]))
        .mockReturnValueOnce(buildSelectChain([]))                             // vacation check
        .mockReturnValueOnce(buildSelectChain([]))                             // holiday check
        .mockReturnValueOnce(buildSelectChainResolveOnWhere([]));              // existing entries

      // User has access to PRJ-042
      timesheetsService.getUserChargeCodes.mockResolvedValue([{ chargeCodeId: 'PRJ-042' }]);
      timesheetsService.findByPeriod.mockResolvedValue(null);
      timesheetsService.create.mockResolvedValue(timesheet);
      timesheetsService.upsertEntries.mockResolvedValue([]);

      const response = await service.handleIncomingMessage(userId, 'Logged 3h on PRJ-042 2026-03-15 planning');

      expect(response.type).toBe('message');
      // Service responds in Thai — verify key data points appear
      expect(response.text).toContain('2026-03-15');
      expect(response.suggestedActions).toBeDefined();
      expect(response.suggestedActions!.length).toBeGreaterThan(0);
    });
  });

  // ─── Command: budget status ───────────────────────────────────────────────

  describe('handleIncomingMessage — budget status command', () => {
    const userId = 'user-1';

    it('should return budget card when charge code is found', async () => {
      const budgetData = {
        chargeCodeName: 'Digital Transformation',
        budgetAmount: 100000,
        actualSpent: 45000,
        percentage: 45,
        status: 'on_track',
        forecastAtCompletion: null,
      };
      budgetsService.getBudgetForChargeCode.mockResolvedValue(budgetData);

      const response = await service.handleIncomingMessage(userId, "What's my budget status for PRJ-042?");

      expect(response.type).toBe('card');
      expect(response.text).toContain('Budget Status');
      expect(response.text).toContain('PRJ-042');
      expect(response.text).toContain('45%');
      expect(response.data).toBeDefined();
    });

    it('should include forecast line when forecastAtCompletion is present', async () => {
      const budgetData = {
        chargeCodeName: 'Project Alpha',
        budgetAmount: 100000,
        actualSpent: 75000,
        percentage: 75,
        status: 'at_risk',
        forecastAtCompletion: 110000,
      };
      budgetsService.getBudgetForChargeCode.mockResolvedValue(budgetData);

      const response = await service.handleIncomingMessage(userId, 'budget status for PRJ-042?');

      expect(response.text).toContain('Forecast');
    });

    it('should return error message when no charge code is in the query', async () => {
      const response = await service.handleIncomingMessage(userId, "What's my budget status?");
      expect(response.type).toBe('message');
      // Service responds in Thai — verify the response tells user to specify a charge code
      expect(response.text.length).toBeGreaterThan(0);
    });

    it('should return error when budgets service throws', async () => {
      budgetsService.getBudgetForChargeCode.mockRejectedValue(new Error('Not found'));

      const response = await service.handleIncomingMessage(userId, 'budget status for PRJ-042?');

      expect(response.type).toBe('message');
      expect(response.text).toContain('PRJ-042');
    });

    it('should route "How is budget for PRJ-042?" to budget handler', async () => {
      budgetsService.getBudgetForChargeCode.mockResolvedValue({
        chargeCodeName: 'Test',
        budgetAmount: 1000,
        actualSpent: 500,
        percentage: 50,
        status: 'on_track',
        forecastAtCompletion: null,
      });

      const response = await service.handleIncomingMessage(userId, 'How is budget for PRJ-042?');
      expect(response.type).toBe('card');
    });
  });

  // ─── Command: show timesheet ──────────────────────────────────────────────

  describe('handleIncomingMessage — show timesheet command', () => {
    const userId = 'user-1';

    it('should return "no timesheet" message when none exists for the week', async () => {
      timesheetsService.findByPeriod.mockResolvedValue(null);

      const response = await service.handleIncomingMessage(userId, 'Show my timesheet for this week');

      expect(response.type).toBe('message');
      // Service returns Thai — verify non-empty message
      expect(response.text.length).toBeGreaterThan(0);
      expect(response.suggestedActions).toBeDefined();
    });

    it('should return a card with timesheet summary when timesheet exists', async () => {
      const sheet = {
        id: 'ts-1',
        periodStart: '2026-03-09',
        periodEnd: '2026-03-15',
        status: 'draft',
      };
      const detail = {
        ...sheet,
        entries: [
          {
            date: '2026-03-09',
            hours: 4,
            chargeCodeId: 'PRJ-042',
            chargeCodeName: 'Digital Transformation',
          },
          {
            date: '2026-03-09',
            hours: 4,
            chargeCodeId: 'ACT-010',
            chargeCodeName: 'Planning',
          },
        ],
      };

      timesheetsService.findByPeriod.mockResolvedValue(sheet);
      timesheetsService.findById.mockResolvedValue(detail);

      const response = await service.handleIncomingMessage(userId, 'Show my timesheet for this week');

      expect(response.type).toBe('card');
      expect(response.text).toContain('2026-03-09');
      expect(response.text).toContain('8h'); // total
    });

    it('should handle timesheet with no entries gracefully', async () => {
      const sheet = { id: 'ts-1', periodStart: '2026-03-09', periodEnd: '2026-03-15', status: 'draft' };
      const detail = { ...sheet, entries: [] };

      timesheetsService.findByPeriod.mockResolvedValue(sheet);
      timesheetsService.findById.mockResolvedValue(detail);

      const response = await service.handleIncomingMessage(userId, 'Show my timesheet for this week');

      expect(response.type).toBe('card');
      expect(response.text).toContain('0h');
    });

    it('should route "my timesheet" to timesheet handler', async () => {
      timesheetsService.findByPeriod.mockResolvedValue(null);

      const response = await service.handleIncomingMessage(userId, 'show my timesheet');
      expect(timesheetsService.findByPeriod).toHaveBeenCalled();
    });
  });

  // ─── Command: hours today ─────────────────────────────────────────────────

  describe('handleIncomingMessage — hours today command', () => {
    const userId = 'user-1';
    const today = new Date().toISOString().split('T')[0];

    it('should return no-hours message when no timesheet exists', async () => {
      timesheetsService.findByPeriod.mockResolvedValue(null);

      const response = await service.handleIncomingMessage(userId, "How many hours did I log today?");

      expect(response.type).toBe('message');
      // Service responds in Thai — verify today's date appears and response is non-empty
      expect(response.text.length).toBeGreaterThan(0);
      expect(response.text).toContain(today);
    });

    it('should return no-hours message when timesheet exists but no entries for today', async () => {
      const sheet = { id: 'ts-1', userId, periodStart: '2026-03-09', status: 'draft' };
      timesheetsService.findByPeriod.mockResolvedValue(sheet);

      // DB query for today's entries returns empty
      db.select.mockReturnValueOnce(buildSelectChainResolveOnWhere([]));

      const response = await service.handleIncomingMessage(userId, "How many hours did I log today?");

      expect(response.type).toBe('message');
      // Service responds in Thai — verify non-empty response
      expect(response.text.length).toBeGreaterThan(0);
    });

    it('should return total hours logged today', async () => {
      const sheet = { id: 'ts-1', userId, periodStart: '2026-03-09', status: 'draft' };
      timesheetsService.findByPeriod.mockResolvedValue(sheet);

      const entries = [
        { hours: '4', chargeCodeId: 'PRJ-042', chargeCodeName: 'Digital Transformation', description: null },
        { hours: '2', chargeCodeId: 'ACT-010', chargeCodeName: 'Planning', description: 'sprint planning' },
      ];
      db.select.mockReturnValueOnce(buildSelectChainResolveOnWhere(entries));

      const response = await service.handleIncomingMessage(userId, "How many hours did I log today?");

      expect(response.type).toBe('message');
      // Response should contain total hours and charge code info
      expect(response.text).toContain('6');
      // Response uses charge code name when available
      expect(response.text).toContain('Digital Transformation');
    });

    it('should route "hours did i log" to hours today handler', async () => {
      timesheetsService.findByPeriod.mockResolvedValue(null);

      const response = await service.handleIncomingMessage(userId, 'how many hours did i log today');
      expect(timesheetsService.findByPeriod).toHaveBeenCalled();
    });
  });

  // ─── Command: charge codes ────────────────────────────────────────────────

  describe('handleIncomingMessage — charge codes command', () => {
    const userId = 'user-1';

    it('should return no-codes message when user has no assigned charge codes', async () => {
      timesheetsService.getUserChargeCodes.mockResolvedValue([]);

      const response = await service.handleIncomingMessage(userId, 'What charge codes am I assigned to?');

      expect(response.type).toBe('message');
      // Service responds in Thai — verify non-empty message
      expect(response.text.length).toBeGreaterThan(0);
    });

    it('should return card with charge code list when user has codes', async () => {
      const codes = [
        { name: 'Digital Transformation', chargeCodeId: 'PRJ-042', isBillable: true, programName: 'Program A' },
        { name: 'Planning', chargeCodeId: 'ACT-010', isBillable: false, programName: null },
      ];
      timesheetsService.getUserChargeCodes.mockResolvedValue(codes);

      const response = await service.handleIncomingMessage(userId, 'What charge codes am I assigned to?');

      expect(response.type).toBe('card');
      expect(response.text).toContain('PRJ-042');
      // Service uses Thai for billable/non-billable labels
      expect(response.text.length).toBeGreaterThan(0);
      expect(response.text).toContain('Program A');
    });

    it('should include suggestedActions in charge codes response', async () => {
      timesheetsService.getUserChargeCodes.mockResolvedValue([
        { name: 'Test', chargeCodeId: 'PRJ-001', isBillable: true, programName: null },
      ]);

      const response = await service.handleIncomingMessage(userId, 'What charge codes am I assigned to?');
      expect(response.suggestedActions).toBeDefined();
      expect(response.suggestedActions!.length).toBeGreaterThan(0);
    });

    it('should route "my charge codes" to charge codes handler', async () => {
      timesheetsService.getUserChargeCodes.mockResolvedValue([]);
      await service.handleIncomingMessage(userId, 'what are my charge codes');
      expect(timesheetsService.getUserChargeCodes).toHaveBeenCalledWith(userId);
    });
  });
});
