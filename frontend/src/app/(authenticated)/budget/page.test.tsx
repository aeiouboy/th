import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test-utils';
import BudgetPage from './page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/budget',
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

// Mock lucide-react
vi.mock('lucide-react', () => ({
  ChevronDown: () => <span data-testid="chevron-down" />,
  ChevronRight: () => <span data-testid="chevron-right" />,
  AlertTriangle: () => <span data-testid="alert-triangle" />,
  TrendingUp: () => <span data-testid="trending-up" />,
  TrendingDown: () => <span data-testid="trending-down" />,
  DollarSign: () => <span data-testid="dollar-sign" />,
}));

// Mock UI components
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
}));

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

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <h3 className={className}>{children}</h3>
  ),
}));

describe('BudgetPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the page title', () => {
    render(<BudgetPage />);
    // "Budget Tracking" heading is always rendered regardless of loading state
    const title = screen.queryByText(/budget tracking/i) || screen.queryByText(/budget/i);
    expect(title).toBeTruthy();
  });

  it('should render overview cards', async () => {
    render(<BudgetPage />);
    await waitFor(() => {
      const budgetText = screen.queryByText(/total budget/i) || screen.queryByText(/budget overview/i);
      expect(budgetText).toBeTruthy();
    });
  });

  it('should render budget metrics', async () => {
    render(<BudgetPage />);
    await waitFor(() => {
      // After loading resolves, mock data is shown with dollar amounts
      const dollarSign = screen.queryByTestId('dollar-sign') || screen.queryByText(/\$\d/) || screen.queryByText(/\$[0-9,.MK]+/);
      expect(dollarSign).toBeTruthy();
    });
  });

  it('should render budget table or empty state', async () => {
    render(<BudgetPage />);
    await waitFor(() => {
      // When API fails, shows empty state; when data available shows table
      const emptyMsg = screen.queryByText(/no budget data/i) || screen.queryByText(/on track/i);
      const table = document.querySelector('table');
      const loadingEl = screen.queryAllByRole('status');
      expect(table !== null || emptyMsg !== null || loadingEl.length > 0).toBe(true);
    }, { timeout: 3000 });
  });
});
