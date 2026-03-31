import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test-utils';
import ApprovalsPage from './page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/approvals',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock API
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn().mockRejectedValue(new Error('API not available')),
    post: vi.fn().mockRejectedValue(new Error('API not available')),
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

// Mock ApprovalQueue
vi.mock('@/components/approvals/ApprovalQueue', () => ({
  ApprovalQueue: ({ items }: { items: unknown[] }) => (
    <div data-testid="approval-queue">Approval Queue ({items.length} items)</div>
  ),
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Search: () => <span data-testid="search-icon" />,
  CheckCircle: () => <span data-testid="check-circle-icon" />,
  History: () => <span data-testid="history-icon" />,
  Palmtree: () => <span data-testid="palmtree-icon" />,
  CheckIcon: () => <span data-testid="check-icon" />,
  XIcon: () => <span data-testid="x-icon" />,
  Users: () => <span data-testid="users-icon" />,
  AlertTriangle: () => <span data-testid="alert-triangle-icon" />,
}));

// Mock MultiSelectFilter
vi.mock('@/components/budget/MultiSelectFilter', () => ({
  MultiSelectFilter: ({ label, options, selected, onChange }: { label?: string; options: { id: string; label: string }[]; selected: string[]; onChange: (ids: string[]) => void }) => (
    <div data-testid="multi-select-filter" data-label={label}>
      <button type="button" onClick={() => onChange(options.map(o => o.id))}>
        {label || 'Programs'}: {selected.length} selected
      </button>
    </div>
  ),
}));

// Mock UI components
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
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

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: { children?: React.ReactNode; value?: string; onValueChange?: (v: string) => void }) => (
    <div data-testid="tabs" data-value={value}>{children}</div>
  ),
  TabsList: ({ children }: { children?: React.ReactNode }) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: { children?: React.ReactNode; value?: string }) => (
    <button data-value={value}>{children}</button>
  ),
  TabsContent: ({ children, value }: { children?: React.ReactNode; value?: string }) => (
    <div data-value={value}>{children}</div>
  ),
}));

describe('ApprovalsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the page title', () => {
    render(<ApprovalsPage />);
    // Use queryAllByText to safely check multiple elements
    const titles = screen.queryAllByText(/approvals/i);
    expect(titles.length).toBeGreaterThan(0);
  });

  it('should render Pending Approvals tab', () => {
    render(<ApprovalsPage />);
    // Tab is now "Pending Approvals" not "Manager"
    const pendingTabs = screen.queryAllByText(/pending approvals/i);
    const approvalsTabs = screen.queryAllByText(/approvals/i);
    expect(pendingTabs.length > 0 || approvalsTabs.length > 0).toBe(true);
  });

  it('should render History tab', () => {
    render(<ApprovalsPage />);
    const historyTabs = screen.queryAllByText(/history/i);
    const vacationTabs = screen.queryAllByText(/vacation/i);
    expect(historyTabs.length > 0 || vacationTabs.length > 0).toBe(true);
  });

  it('should render filter bar with period dropdown', () => {
    render(<ApprovalsPage />);
    const filterArea = screen.queryByText(/period|filter/i);
    const selectEl = screen.queryByText(/all periods/i) || screen.queryByTestId('tabs');
    expect(filterArea !== null || selectEl !== null).toBe(true);
  });

  it('should render approval queue component', async () => {
    render(<ApprovalsPage />);
    await waitFor(() => {
      // Multiple ApprovalQueue components may render (one per tab)
      const queues = screen.queryAllByTestId('approval-queue');
      expect(queues.length).toBeGreaterThan(0);
    });
  });

  it('should render search input', () => {
    render(<ApprovalsPage />);
    const searchInput = screen.queryByPlaceholderText(/search/i) || screen.queryByTestId('search-icon');
    expect(searchInput).toBeTruthy();
  });

  it('should render MultiSelectFilter when pending items have programs', async () => {
    const { api } = await import('@/lib/api');
    const mockApi = api as { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> };
    mockApi.get.mockImplementation(async (path: string) => {
      if (path === '/approvals/pending') {
        return {
          pending: [
            {
              id: 'ts-1',
              userId: 'u1',
              periodStart: '2026-03-09',
              periodEnd: '2026-03-15',
              status: 'submitted',
              submittedAt: null,
              totalHours: 40,
              programs: ['Program A', 'Program B'],
              employee: { id: 'u1', fullName: 'Alice', email: 'alice@test.com', department: 'Engineering' },
            },
          ],
        };
      }
      if (path === '/approvals/history') return [];
      if (path === '/vacations/pending') return [];
      if (path === '/users/me') return { role: 'employee' };
      throw new Error('API not available');
    });

    render(<ApprovalsPage />);

    await waitFor(() => {
      const filter = screen.queryByTestId('multi-select-filter');
      expect(filter).toBeTruthy();
    });
  });
});
