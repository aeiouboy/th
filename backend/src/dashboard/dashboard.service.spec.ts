import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { DRIZZLE } from '../database/drizzle.provider';

describe('DashboardService', () => {
  let service: DashboardService;
  let db: any;

  beforeEach(async () => {
    db = {
      select: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: DRIZZLE, useValue: db },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── getChargeabilityYtd ──────────────────────────────────────────────────

  describe('getChargeabilityYtd', () => {
    it('should return empty months array and 0 ytdChargeability when no entries', async () => {
      db.select.mockReturnValueOnce(buildGroupByChain([]));

      const result = await service.getChargeabilityYtd('user-1');

      expect(result.ytdChargeability).toBe(0);
      expect(Array.isArray(result.months)).toBe(true);
      // months array has entries for all months from Jan to current
      const now = new Date();
      expect(result.months).toHaveLength(now.getMonth() + 1);
    });

    it('should calculate ytdChargeability as billable / total hours * 100', async () => {
      const rows = [
        { month: `${new Date().getFullYear()}-01`, isBillable: true, totalHours: '80' },
        { month: `${new Date().getFullYear()}-01`, isBillable: false, totalHours: '20' },
      ];
      db.select.mockReturnValueOnce(buildGroupByChain(rows));

      const result = await service.getChargeabilityYtd('user-1');

      expect(result.ytdChargeability).toBe(80); // 80/100 = 80%
    });

    it('should return 0 chargeability for months with no hours', async () => {
      const rows = [
        { month: `${new Date().getFullYear()}-01`, isBillable: true, totalHours: '0' },
      ];
      db.select.mockReturnValueOnce(buildGroupByChain(rows));

      const result = await service.getChargeabilityYtd('user-1');
      const jan = result.months.find((m) => m.month.endsWith('-01'));
      expect(jan?.chargeability).toBe(0);
    });

    it('should fill all months from Jan to current month', async () => {
      db.select.mockReturnValueOnce(buildGroupByChain([]));

      const result = await service.getChargeabilityYtd('user-1');
      const now = new Date();
      const expectedCount = now.getMonth() + 1; // 0-indexed + 1
      expect(result.months).toHaveLength(expectedCount);
    });

    it('should round chargeability to nearest integer', async () => {
      const rows = [
        { month: `${new Date().getFullYear()}-01`, isBillable: true, totalHours: '75' },
        { month: `${new Date().getFullYear()}-01`, isBillable: false, totalHours: '25' },
      ];
      db.select.mockReturnValueOnce(buildGroupByChain(rows));

      const result = await service.getChargeabilityYtd('user-1');
      const jan = result.months.find((m) => m.month.endsWith('-01'));
      expect(jan?.chargeability).toBe(75);
    });

    it('should aggregate billable and non-billable hours by month', async () => {
      const year = new Date().getFullYear();
      const rows = [
        { month: `${year}-02`, isBillable: true, totalHours: '40' },
        { month: `${year}-02`, isBillable: false, totalHours: '10' },
        { month: `${year}-02`, isBillable: true, totalHours: '20' }, // second row same month
      ];
      db.select.mockReturnValueOnce(buildGroupByChain(rows));

      const result = await service.getChargeabilityYtd('user-1');
      const feb = result.months.find((m) => m.month.endsWith('-02'));
      expect(feb?.totalHours).toBe(70); // 40+10+20
      expect(feb?.billableHours).toBe(60); // 40+20
    });
  });

  // ─── getProgramDistribution ───────────────────────────────────────────────

  describe('getProgramDistribution', () => {
    it('should return empty arrays when no entries', async () => {
      // Two calls: currentPeriod and ytd
      db.select
        .mockReturnValueOnce(buildGroupByChain([]))
        .mockReturnValueOnce(buildGroupByChain([]));

      const result = await service.getProgramDistribution('user-1');

      expect(result.currentPeriod).toEqual([]);
      expect(result.ytd).toEqual([]);
    });

    it('should group entries by root program from path', async () => {
      const rows = [
        {
          chargeCodeId: 'PRJ-001',
          path: 'PRG-001/PRJ-001',
          programName: 'Program Alpha',
          ccName: 'Project 1',
          hours: '40',
        },
        {
          chargeCodeId: 'ACT-001',
          path: 'PRG-001/PRJ-001/ACT-001',
          programName: 'Program Alpha',
          ccName: 'Activity 1',
          hours: '20',
        },
      ];

      db.select
        .mockReturnValueOnce(buildGroupByChain(rows))
        .mockReturnValueOnce(buildGroupByChain([]));

      const result = await service.getProgramDistribution('user-1');

      // Both entries belong to PRG-001
      expect(result.currentPeriod).toHaveLength(1);
      expect(result.currentPeriod[0].programId).toBe('PRG-001');
      expect(result.currentPeriod[0].hours).toBe(60);
    });

    it('should calculate percentage from total hours', async () => {
      const rows = [
        { chargeCodeId: 'PRJ-001', path: 'PRG-001/PRJ-001', programName: 'Alpha', ccName: 'P1', hours: '75' },
        { chargeCodeId: 'PRJ-002', path: 'PRG-002/PRJ-002', programName: 'Beta', ccName: 'P2', hours: '25' },
      ];

      db.select
        .mockReturnValueOnce(buildGroupByChain(rows))
        .mockReturnValueOnce(buildGroupByChain([]));

      const result = await service.getProgramDistribution('user-1');

      const alpha = result.currentPeriod.find((p) => p.programId === 'PRG-001');
      const beta = result.currentPeriod.find((p) => p.programId === 'PRG-002');
      expect(alpha?.percentage).toBe(75);
      expect(beta?.percentage).toBe(25);
    });

    it('should sort programs by hours descending', async () => {
      const rows = [
        { chargeCodeId: 'PRJ-001', path: 'PRG-001/PRJ-001', programName: 'Small', ccName: 'P1', hours: '10' },
        { chargeCodeId: 'PRJ-002', path: 'PRG-002/PRJ-002', programName: 'Large', ccName: 'P2', hours: '90' },
      ];

      db.select
        .mockReturnValueOnce(buildGroupByChain(rows))
        .mockReturnValueOnce(buildGroupByChain([]));

      const result = await service.getProgramDistribution('user-1');

      expect(result.currentPeriod[0].programId).toBe('PRG-002'); // largest first
    });

    it('should use ccName as fallback when programName is null', async () => {
      const rows = [
        { chargeCodeId: 'PRG-001', path: 'PRG-001', programName: null, ccName: 'Standalone Code', hours: '16' },
      ];

      db.select
        .mockReturnValueOnce(buildGroupByChain(rows))
        .mockReturnValueOnce(buildGroupByChain([]));

      const result = await service.getProgramDistribution('user-1');

      expect(result.currentPeriod[0].programName).toBe('Standalone Code');
    });

    it('should return both currentPeriod and ytd data independently', async () => {
      const currentRows = [
        { chargeCodeId: 'PRJ-001', path: 'PRG-001/PRJ-001', programName: 'Current Prog', ccName: 'P1', hours: '8' },
      ];
      const ytdRows = [
        { chargeCodeId: 'PRJ-001', path: 'PRG-001/PRJ-001', programName: 'YTD Prog', ccName: 'P1', hours: '200' },
      ];

      db.select
        .mockReturnValueOnce(buildGroupByChain(currentRows))
        .mockReturnValueOnce(buildGroupByChain(ytdRows));

      const result = await service.getProgramDistribution('user-1');

      expect(result.currentPeriod[0].hours).toBe(8);
      expect(result.ytd[0].hours).toBe(200);
    });
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildGroupByChain(resolveValue: any[]) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    // drizzle chain: make the chain thenable so await works at any point
    then: (resolve: (value: any[]) => void) => resolve(resolveValue),
  };
  chain.where.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  chain.leftJoin.mockReturnValue(chain);
  chain.groupBy.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  return chain;
}
