import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test-utils';
import DashboardPage from './page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
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

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock Badge
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
}));

// Mock Button
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    size?: string;
    className?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} className={className} data-variant={variant} data-size={size}>
      {children}
    </button>
  ),
}));

// Mock Card components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <h3 className={className}>{children}</h3>
  ),
  CardContent: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render status banner with week period', async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      const greetings = ['Good morning', 'Good afternoon', 'Good evening'];
      const found = greetings.some((g) => {
        try {
          screen.getByText(new RegExp(g, 'i'));
          return true;
        } catch {
          return false;
        }
      });
      expect(found).toBe(true);
    });
  });

  it('should render 4 metric cards', async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Hours This Period')).toBeInTheDocument();
      expect(screen.getByText('Chargeability')).toBeInTheDocument();
      expect(screen.getByText('Pending Approvals')).toBeInTheDocument();
      expect(screen.getByText('Active Charge Codes')).toBeInTheDocument();
    });
  });

  it('should render Recent Entries section', async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('My Recent Entries')).toBeInTheDocument();
    });
  });

  it('should render Alerts & Notifications section', async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Alerts & Notifications')).toBeInTheDocument();
    });
  });

  it('should render quick action Log Time button', async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Log Time')).toBeInTheDocument();
    });
  });

  it('should render My Codes quick action', async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('My Codes')).toBeInTheDocument();
    });
  });

  it('should render progress bar tracking area', async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      const progressText = screen.getByText(/h logged/i);
      expect(progressText).toBeInTheDocument();
    });
  });
});
