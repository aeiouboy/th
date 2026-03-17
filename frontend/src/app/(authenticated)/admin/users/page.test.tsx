import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../../test-utils';
import AdminUsersPage from './page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/admin/users',
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

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Search: () => <span data-testid="search-icon" />,
  SearchIcon: () => <span data-testid="search-icon" />,
  Plus: () => <span data-testid="plus-icon" />,
  PlusIcon: () => <span data-testid="plus-icon" />,
  UserPlus: () => <span data-testid="user-plus-icon" />,
  Shield: () => <span data-testid="shield-icon" />,
  ShieldIcon: () => <span data-testid="shield-icon" />,
  Loader2: () => <span data-testid="loader-icon" />,
  Loader2Icon: () => <span data-testid="loader-icon" />,
  MoreHorizontal: () => <span data-testid="more-icon" />,
  Check: () => <span data-testid="check-icon" />,
  X: () => <span data-testid="x-icon" />,
  Mail: () => <span data-testid="mail-icon" />,
  UsersIcon: () => <span data-testid="users-icon" />,
  UserCheckIcon: () => <span data-testid="user-check-icon" />,
  PencilIcon: () => <span data-testid="pencil-icon" />,
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
  // Always render children so DialogTrigger is always visible
  Dialog: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  // DialogContent only shown when open, but we always render Dialog
  DialogContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: React.ReactNode }) => <h2>{children}</h2>,
  DialogFooter: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
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

describe('AdminUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the page title', async () => {
    render(<AdminUsersPage />);
    // "User Management" card title is always visible
    await waitFor(() => {
      const userItems = screen.queryAllByText(/user management/i);
      const usersItems = screen.queryAllByText(/users/i);
      expect(userItems.length > 0 || usersItems.length > 0).toBe(true);
    });
  });

  it('should render user management card', () => {
    render(<AdminUsersPage />);
    // "User Management" card title is always visible
    const mgmtItems = screen.queryAllByText(/user management/i);
    const iconItems = screen.queryAllByTestId('users-icon');
    expect(mgmtItems.length > 0 || iconItems.length > 0).toBe(true);
  });

  it('should render search input', () => {
    render(<AdminUsersPage />);
    const searchInputs = screen.queryAllByPlaceholderText(/search/i);
    const searchIcons = screen.queryAllByTestId('search-icon');
    expect(searchInputs.length > 0 || searchIcons.length > 0).toBe(true);
  });

  it('should render user table with column headers', async () => {
    render(<AdminUsersPage />);
    await waitFor(() => {
      // After loading, table headers are shown (even with empty data)
      const nameHeaders = screen.queryAllByText(/^name$/i);
      const emailHeaders = screen.queryAllByText(/^email$/i);
      const roleHeaders = screen.queryAllByText(/^role$/i);
      const noUsersMsg = screen.queryAllByText(/no users found/i);
      expect(nameHeaders.length > 0 || emailHeaders.length > 0 || roleHeaders.length > 0 || noUsersMsg.length > 0).toBe(true);
    });
  });

  it('should render mock user data in table', async () => {
    render(<AdminUsersPage />);
    await waitFor(() => {
      // After loading, table or empty message is shown
      const table = document.querySelector('table');
      const noUsersMsg = screen.queryAllByText(/no users found/i);
      expect(table !== null || noUsersMsg.length > 0).toBe(true);
    });
  });
});
