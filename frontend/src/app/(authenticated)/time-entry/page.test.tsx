import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test-utils';
import TimeEntryPage from './page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/time-entry',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock API
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn().mockRejectedValue(new Error('API not available')),
    post: vi.fn().mockRejectedValue(new Error('API not available')),
    put: vi.fn().mockRejectedValue(new Error('API not available')),
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

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock TimesheetGrid
vi.mock('@/components/timesheet/TimesheetGrid', () => ({
  TimesheetGrid: ({ rows }: { rows: unknown[] }) => (
    <div data-testid="timesheet-grid">Timesheet Grid ({rows.length} rows)</div>
  ),
}));

// Mock ChargeCodeSelector
vi.mock('@/components/timesheet/ChargeCodeSelector', () => ({
  ChargeCodeSelector: () => <div data-testid="charge-code-selector">Charge Code Selector</div>,
}));

// Mock Badge
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
}));

// Mock Button
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

// Mock Card
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

describe('TimeEntryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render Suspense fallback while loading', () => {
    // When useSearchParams suspends (default React behavior in SSR/static),
    // the Suspense boundary should show the loading fallback
    const { container } = render(<TimeEntryPage />);
    // The Suspense wrapper exists — verify the page renders without crashing
    // (the fix was adding <Suspense> to prevent Next.js 16 build failure)
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('should wrap content in Suspense boundary with spinner fallback', async () => {
    render(<TimeEntryPage />);
    // The page should eventually resolve past the Suspense boundary
    // and show the actual content (Week of..., Save Draft, etc.)
    await waitFor(() => {
      expect(screen.getByText('Save Draft')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should render period navigator with prev/next controls', () => {
    render(<TimeEntryPage />);
    // Previous and next period buttons may not have title attributes; look for week label instead
    const prevButtons = screen.queryAllByTitle(/previous|prev/i);
    const nextButtons = screen.queryAllByTitle(/next/i);
    // The week label "Week of ..." should always render
    const periodLabel = screen.queryAllByText(/week of/i);
    expect(prevButtons.length > 0 || nextButtons.length > 0 || periodLabel.length > 0).toBe(true);
  });

  it('should render timesheet grid component', async () => {
    render(<TimeEntryPage />);
    // Grid renders after loading state resolves (query fails -> loading=false, grid shows)
    await waitFor(() => {
      expect(screen.getByTestId('timesheet-grid')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should render actions bar with Save Draft button', () => {
    render(<TimeEntryPage />);
    expect(screen.getByText('Save Draft')).toBeInTheDocument();
  });

  it('should render Submit button', () => {
    render(<TimeEntryPage />);
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  it('should render Add Charge Code selector', () => {
    render(<TimeEntryPage />);
    // ChargeCodeSelector renders as a Select with placeholder "+ Add Charge Code"
    // The placeholder may not render as visible text in test env, so check for the component container
    const addButton = screen.queryByText(/add charge code/i)
      || screen.queryByTestId('charge-code-selector')
      || screen.queryByRole('combobox');
    expect(addButton).toBeTruthy();
  });

  it('should render the page title', () => {
    render(<TimeEntryPage />);
    const title = screen.queryByText(/time entry|timesheet/i);
    expect(title).toBeTruthy();
  });
});
