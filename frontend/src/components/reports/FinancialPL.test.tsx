import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    expect(await screen.findByText('Team')).toBeInTheDocument();
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
});
