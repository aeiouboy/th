import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test-utils';
import ReportsPage from './page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/reports',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock API
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn().mockRejectedValue(new Error('API not available')),
  },
}));

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  }),
}));

// Mock Recharts chart components
vi.mock('@/components/reports/BudgetChart', () => ({
  BudgetChart: ({ data }: { data: unknown[] }) => (
    <div data-testid="budget-chart">Budget Chart ({data.length} items)</div>
  ),
}));

vi.mock('@/components/reports/ChargeabilityGauge', () => ({
  ChargeabilityGauge: ({ members }: { members: unknown[] }) => (
    <div data-testid="chargeability-gauge">Chargeability Gauge ({members.length} members)</div>
  ),
}));

vi.mock('@/components/reports/ActivityPie', () => ({
  ActivityPie: ({ data }: { data: unknown[] }) => (
    <div data-testid="activity-pie">Activity Pie ({data.length} items)</div>
  ),
}));

vi.mock('@/components/reports/AlertList', () => ({
  AlertList: ({ alerts }: { alerts: unknown[] }) => (
    <div data-testid="alert-list">Alert List ({alerts.length} alerts)</div>
  ),
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  FileDown: () => <span data-testid="file-down-icon" />,
  FileText: () => <span data-testid="file-text-icon" />,
  DollarSign: () => <span data-testid="dollar-sign-icon" />,
  TrendingUp: () => <span data-testid="trending-up-icon" />,
  Users: () => <span data-testid="users-icon" />,
  AlertTriangle: () => <span data-testid="alert-triangle-icon" />,
  ArrowUp: () => <span data-testid="arrow-up-icon" />,
  ArrowDown: () => <span data-testid="arrow-down-icon" />,
}));

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, className }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    className?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} className={className} data-variant={variant}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children?: React.ReactNode; value?: string }) => (
    <option value={value}>{children}</option>
  ),
}));

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the page title', () => {
    render(<ReportsPage />);
    const title = screen.queryByText(/reports/i);
    expect(title).toBeTruthy();
  });

  it('should render filter bar', () => {
    render(<ReportsPage />);
    // Export buttons are always in the header, not behind loading state
    const exportBtn = screen.queryByText(/export csv/i) || screen.queryByText(/export/i) || screen.queryByTestId('file-down-icon');
    expect(exportBtn).toBeTruthy();
  });

  it('should render KPI cards', async () => {
    render(<ReportsPage />);
    await waitFor(() => {
      const kpiLabels = [/total budget/i, /actual spent/i, /utilization/i, /overrun/i];
      const found = kpiLabels.some((label) => screen.queryByText(label) !== null);
      expect(found).toBe(true);
    });
  });

  it('should render Budget Chart component', async () => {
    render(<ReportsPage />);
    await waitFor(() => {
      expect(screen.getByTestId('budget-chart')).toBeInTheDocument();
    });
  });

  it('should render Chargeability Gauge component', async () => {
    render(<ReportsPage />);
    await waitFor(() => {
      expect(screen.getByTestId('chargeability-gauge')).toBeInTheDocument();
    });
  });

  it('should render Activity Pie component', async () => {
    render(<ReportsPage />);
    await waitFor(() => {
      expect(screen.getByTestId('activity-pie')).toBeInTheDocument();
    });
  });

  it('should render Alert List component', async () => {
    render(<ReportsPage />);
    await waitFor(() => {
      expect(screen.getByTestId('alert-list')).toBeInTheDocument();
    });
  });
});
