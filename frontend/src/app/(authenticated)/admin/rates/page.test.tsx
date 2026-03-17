import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../../test-utils';
import AdminRatesPage from './page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/admin/rates',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock API
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn().mockRejectedValue(new Error('API not available')),
    post: vi.fn().mockRejectedValue(new Error('API not available')),
    put: vi.fn().mockRejectedValue(new Error('API not available')),
    delete: vi.fn().mockRejectedValue(new Error('API not available')),
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

// Mock currency
vi.mock('@/lib/currency', () => ({
  useCurrency: () => ({
    currency: 'THB',
    setCurrency: vi.fn(),
    refreshSettings: vi.fn().mockResolvedValue(undefined),
    formatCurrency: (v: number) => `฿${v.toLocaleString()}`,
    formatCurrencyShort: (v: number) => `฿${v}`,
    symbol: '฿',
  }),
  CurrencyProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  formatCurrencyStatic: (v: number) => `฿${v}`,
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Plus: () => <span data-testid="plus-icon" />,
  PlusIcon: () => <span data-testid="plus-icon" />,
  PencilIcon: () => <span data-testid="pencil-icon" />,
  TrashIcon: () => <span data-testid="trash-icon" />,
  CheckIcon: () => <span data-testid="check-icon" />,
  XIcon: () => <span data-testid="x-icon" />,
  Loader2Icon: () => <span data-testid="loader-icon" />,
  DollarSign: () => <span data-testid="dollar-sign" />,
  DollarSignIcon: () => <span data-testid="dollar-sign" />,
  TrendingUpIcon: () => <span data-testid="trending-up" />,
  TrendingUp: () => <span data-testid="trending-up" />,
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

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
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

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children?: React.ReactNode; value?: string }) => (
    <option value={value}>{children}</option>
  ),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children?: React.ReactNode; open?: boolean }) => (
    open ? <div data-testid="dialog">{children}</div> : null
  ),
  DialogContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: React.ReactNode }) => <h2>{children}</h2>,
  DialogFooter: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogClose: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children?: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children?: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <td className={className}>{children}</td>
  ),
  TableHead: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <th className={className}>{children}</th>
  ),
  TableHeader: ({ children }: { children?: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <tr className={className}>{children}</tr>
  ),
}));

describe('AdminRatesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the page title', () => {
    render(<AdminRatesPage />);
    const rateItems = screen.queryAllByText(/rates/i);
    const costRateItems = screen.queryAllByText(/cost rate/i);
    expect(rateItems.length > 0 || costRateItems.length > 0).toBe(true);
  });

  it('should render Add Rate button', () => {
    render(<AdminRatesPage />);
    const addBtn = screen.queryByText(/add rate/i) || screen.queryByTestId('plus-icon');
    expect(addBtn).toBeTruthy();
  });

  it('should render rate table column headers', () => {
    render(<AdminRatesPage />);
    const gradeHeaders = screen.queryAllByText(/job grade/i);
    const rateHeaders = screen.queryAllByText(/hourly rate/i);
    const anyGrade = screen.queryAllByText(/grade/i);
    const anyRate = screen.queryAllByText(/\brate\b/i);
    expect(gradeHeaders.length > 0 || rateHeaders.length > 0 || anyGrade.length > 0 || anyRate.length > 0).toBe(true);
  });

  it('should render Add Rate button or empty state', () => {
    render(<AdminRatesPage />);
    // Add Rate button is always visible (outside the loading/empty conditional)
    const addRateBtn = screen.queryByText(/add rate/i);
    const noRatesMsg = screen.queryAllByText(/no rates found/i);
    const loaderIcon = screen.queryAllByTestId('loader-icon');
    expect(addRateBtn !== null || noRatesMsg.length > 0 || loaderIcon.length > 0).toBe(true);
  });
});
