import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FinancialPL } from './FinancialPL';

// Mock the api module
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

// Mock lucide-react icons used by StatCard
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>();
  const MockIcon = ({ className }: { className?: string }) => (
    <svg className={className} data-testid="mock-icon" />
  );
  return {
    ...actual,
    DollarSign: MockIcon,
    TrendingDown: MockIcon,
    AlertTriangle: MockIcon,
    ArrowUp: MockIcon,
    ArrowDown: MockIcon,
  };
});

import { api } from '@/lib/api';

const mockData = {
  overBudgetCost: 150000,
  overBudgetCount: 3,
  lowChargeabilityCost: 80000,
  netImpact: 230000,
  avgCostRate: 1500,
  targetChargeability: 80,
  actualChargeability: 65,
  byTeam: [
    {
      department: 'Engineering',
      totalHours: 500,
      billableHours: 350,
      chargeability: 70,
      totalCost: 750000,
      billableRevenue: 525000,
      margin: -225000,
      marginPercent: -42.86,
    },
    {
      department: 'Design',
      totalHours: 200,
      billableHours: 180,
      chargeability: 90,
      totalCost: 300000,
      billableRevenue: 360000,
      margin: 60000,
      marginPercent: 16.67,
    },
  ],
  byChargeCode: [],
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('FinancialPL', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);
  });

  it('should render stat cards with correct labels', async () => {
    render(<FinancialPL />, { wrapper: createWrapper() });
    expect(await screen.findByText('Over-budget cost')).toBeInTheDocument();
    expect(screen.getByText('Low chargeability gap')).toBeInTheDocument();
    expect(screen.getByText('Net P/L impact')).toBeInTheDocument();
  });

  it('should render stat card values', async () => {
    render(<FinancialPL />, { wrapper: createWrapper() });
    // formatCurrency(150000) => ฿150K
    expect(await screen.findByText('฿150K')).toBeInTheDocument();
    expect(screen.getByText('฿80K')).toBeInTheDocument();
    expect(screen.getByText('฿230K')).toBeInTheDocument();
  });

  it('should render team P/L table headers', async () => {
    render(<FinancialPL />, { wrapper: createWrapper() });
    expect(await screen.findByText('Program')).toBeInTheDocument();
    expect(screen.getByText('Cost')).toBeInTheDocument();
    expect(screen.getByText('Billable Rev.')).toBeInTheDocument();
    expect(screen.getByText('Margin')).toBeInTheDocument();
    expect(screen.getByText('Margin %')).toBeInTheDocument();
    expect(screen.getByText('Chargeability')).toBeInTheDocument();
  });

  it('should render team names in the table', async () => {
    render(<FinancialPL />, { wrapper: createWrapper() });
    expect(await screen.findByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('Design')).toBeInTheDocument();
  });

  it('should render chargeability percentages', async () => {
    render(<FinancialPL />, { wrapper: createWrapper() });
    expect(await screen.findByText('70.0%')).toBeInTheDocument();
    expect(screen.getByText('90.0%')).toBeInTheDocument();
  });

  it('should render subtext with chargeability comparison', async () => {
    render(<FinancialPL />, { wrapper: createWrapper() });
    expect(await screen.findByText('Actual 65% vs Target 80%')).toBeInTheDocument();
  });

  it('should pass period and team as query params', async () => {
    render(<FinancialPL period="2026-03" team="Engineering" />, { wrapper: createWrapper() });
    await screen.findByText('Over-budget cost');
    expect(api.get).toHaveBeenCalledWith('/reports/financial-impact?period=2026-03&team=Engineering');
  });

  it('should not pass team param when team is "all"', async () => {
    render(<FinancialPL period="2026-03" team="all" />, { wrapper: createWrapper() });
    await screen.findByText('Over-budget cost');
    expect(api.get).toHaveBeenCalledWith('/reports/financial-impact?period=2026-03');
  });

  it('should show total row when multiple teams exist', async () => {
    render(<FinancialPL />, { wrapper: createWrapper() });
    expect(await screen.findByText('Total')).toBeInTheDocument();
  });

  it('should not render team table when byTeam is empty', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockData,
      byTeam: [],
    });
    render(<FinancialPL />, { wrapper: createWrapper() });
    await screen.findByText('Over-budget cost');
    expect(screen.queryByText('Team P/L Breakdown')).not.toBeInTheDocument();
  });

  describe('UNIT-PL-TAB-01: Tab triggers render', () => {
    it('should render "P/L Summary" tab trigger', async () => {
      render(<FinancialPL />, { wrapper: createWrapper() });
      expect(await screen.findByRole('tab', { name: /P\/L Summary/i })).toBeInTheDocument();
    });

    it('should render "Alerts" tab trigger', async () => {
      render(<FinancialPL />, { wrapper: createWrapper() });
      expect(await screen.findByRole('tab', { name: /Alerts/i })).toBeInTheDocument();
    });
  });

  describe('UNIT-PL-TAB-02: Default tab is P/L Summary', () => {
    it('should show stat cards when default tab (P/L Summary) is active', async () => {
      render(<FinancialPL />, { wrapper: createWrapper() });
      expect(await screen.findByText('Over-budget cost')).toBeInTheDocument();
      expect(screen.getByText('Low chargeability gap')).toBeInTheDocument();
      expect(screen.getByText('Net P/L impact')).toBeInTheDocument();
    });
  });

  describe('UNIT-PL-TAB-03: Clicking Alerts tab shows AlertList content', () => {
    it('should show Alerts heading when Alerts tab is clicked', async () => {
      const budgetAlerts = [
        {
          chargeCodeId: 'PRJ-001',
          name: 'Over Budget Project',
          budget: 100000,
          actual: 130000,
          forecast: null,
          severity: 'red',
          rootCauseActivity: null,
        },
      ];
      render(
        <FinancialPL budgetAlerts={budgetAlerts} chargeabilityAlerts={[]} />,
        { wrapper: createWrapper() },
      );
      await screen.findByRole('tab', { name: /Alerts/i });

      const alertsTab = screen.getByRole('tab', { name: /Alerts/i });
      fireEvent.click(alertsTab);

      // AlertList content should be visible — subtext inside the Alerts tab
      expect(await screen.findByText(/budget overruns and chargeability gaps/i)).toBeInTheDocument();
    });

    it('should show alert name in AlertList when Alerts tab is active', async () => {
      const budgetAlerts = [
        {
          chargeCodeId: 'PRJ-042',
          name: 'Digital Transformation',
          budget: 500000,
          actual: 620000,
          forecast: 700000,
          severity: 'red',
          rootCauseActivity: 'Dev sprint overspend',
        },
      ];
      render(
        <FinancialPL budgetAlerts={budgetAlerts} chargeabilityAlerts={[]} />,
        { wrapper: createWrapper() },
      );
      await screen.findByRole('tab', { name: /Alerts/i });

      fireEvent.click(screen.getByRole('tab', { name: /Alerts/i }));

      expect(await screen.findByText('Digital Transformation')).toBeInTheDocument();
    });
  });

  describe('UNIT-PL-TAB-04: Alert count shown in tab label', () => {
    it('should show count in Alerts tab label when budget alerts are provided', async () => {
      const budgetAlerts = [
        { chargeCodeId: 'PRJ-001', name: 'A', budget: 100000, actual: 120000, forecast: null, severity: 'red', rootCauseActivity: null },
        { chargeCodeId: 'PRJ-002', name: 'B', budget: 50000, actual: 60000, forecast: null, severity: 'orange', rootCauseActivity: null },
      ];
      const chargeabilityAlerts = [
        { type: 'chargeability' as const, employeeId: 'e1', name: 'E1', billableHours: 60, totalHours: 100, chargeability: 60, target: 80, severity: 'yellow', costImpact: 20000 },
        { type: 'chargeability' as const, employeeId: 'e2', name: 'E2', billableHours: 50, totalHours: 100, chargeability: 50, target: 80, severity: 'red', costImpact: 30000 },
        { type: 'chargeability' as const, employeeId: 'e3', name: 'E3', billableHours: 55, totalHours: 100, chargeability: 55, target: 80, severity: 'orange', costImpact: 25000 },
      ];
      render(
        <FinancialPL budgetAlerts={budgetAlerts} chargeabilityAlerts={chargeabilityAlerts} />,
        { wrapper: createWrapper() },
      );
      // Tab label should show total count: 2 + 3 = 5
      expect(await screen.findByRole('tab', { name: /Alerts \(5\)/i })).toBeInTheDocument();
    });

    it('should show "Alerts" without count when no alerts are provided', async () => {
      render(<FinancialPL budgetAlerts={[]} chargeabilityAlerts={[]} />, { wrapper: createWrapper() });
      // Tab should just say "Alerts" with no count in parens
      const alertTab = await screen.findByRole('tab', { name: /^Alerts$/i });
      expect(alertTab).toBeInTheDocument();
    });
  });
});
