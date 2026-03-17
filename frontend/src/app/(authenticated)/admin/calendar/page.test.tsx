import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../../test-utils';
import AdminCalendarPage from './page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/admin/calendar',
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

// Mock lucide-react
vi.mock('lucide-react', () => ({
  ChevronLeftIcon: () => <span data-testid="chevron-left" />,
  ChevronRightIcon: () => <span data-testid="chevron-right" />,
  PlusIcon: () => <span data-testid="plus-icon" />,
  PencilIcon: () => <span data-testid="pencil-icon" />,
  TrashIcon: () => <span data-testid="trash-icon" />,
  CheckIcon: () => <span data-testid="check-icon" />,
  XIcon: () => <span data-testid="x-icon" />,
  Loader2Icon: () => <span data-testid="loader-icon" />,
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

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
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

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange }: { children?: React.ReactNode; onValueChange?: (v: string) => void }) => (
    <div data-testid="select">{children}</div>
  ),
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children?: React.ReactNode; value?: string }) => (
    <option value={value}>{children}</option>
  ),
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

describe('AdminCalendarPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the page title', () => {
    render(<AdminCalendarPage />);
    // Use getAllByText since "Holiday" might appear multiple times; just check at least one exists
    const calendarItems = screen.queryAllByText(/calendar/i);
    const holidayItems = screen.queryAllByText(/holiday/i);
    expect(calendarItems.length > 0 || holidayItems.length > 0).toBe(true);
  });

  it('should render year navigation', () => {
    render(<AdminCalendarPage />);
    // Year number should appear (current year); multiple occurrences are fine
    const yearItems = screen.queryAllByText(/202[0-9]/);
    expect(yearItems.length).toBeGreaterThan(0);
  });

  it('should render prev/next navigation buttons', () => {
    render(<AdminCalendarPage />);
    const prevBtns = screen.queryAllByTestId('chevron-left');
    const nextBtns = screen.queryAllByTestId('chevron-right');
    expect(prevBtns.length > 0 || nextBtns.length > 0).toBe(true);
  });

  it('should render month names in calendar grid', async () => {
    render(<AdminCalendarPage />);
    await waitFor(() => {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August'];
      const found = monthNames.some((m) => screen.queryAllByText(new RegExp(m, 'i')).length > 0);
      expect(found).toBe(true);
    });
  });

  it('should render holiday list section', () => {
    render(<AdminCalendarPage />);
    const holidayItems = screen.queryAllByText(/holiday/i);
    expect(holidayItems.length).toBeGreaterThan(0);
  });

  it('should render Add Holiday button', () => {
    render(<AdminCalendarPage />);
    const addBtns = screen.queryAllByText(/add holiday/i);
    const plusIcons = screen.queryAllByTestId('plus-icon');
    expect(addBtns.length > 0 || plusIcons.length > 0).toBe(true);
  });
});
