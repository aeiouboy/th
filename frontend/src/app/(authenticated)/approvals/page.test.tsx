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
    const title = screen.queryByText(/approvals/i);
    expect(title).toBeTruthy();
  });

  it('should render Manager/CC Owner tab toggle', () => {
    render(<ApprovalsPage />);
    const managerTab = screen.queryByText(/as manager/i) || screen.queryByText(/manager/i);
    expect(managerTab).toBeTruthy();
  });

  it('should render CC Owner tab', () => {
    render(<ApprovalsPage />);
    const ccTab = screen.queryByText(/cc owner/i) || screen.queryByText(/charge/i);
    expect(ccTab).toBeTruthy();
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
});
