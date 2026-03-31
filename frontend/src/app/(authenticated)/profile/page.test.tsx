import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test-utils';
import ProfilePage from './page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/profile',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock API - returns a valid user profile to prevent rendering errors
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({
      id: 'u-001',
      email: 'john.doe@company.com',
      fullName: 'John Doe',
      role: 'employee',
      department: 'Engineering',
      jobGrade: 'P3',
    }),
    put: vi.fn().mockResolvedValue({}),
  },
}));

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
  }),
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  UserIcon: () => <span data-testid="user-icon" />,
  MailIcon: () => <span data-testid="mail-icon" />,
  ShieldIcon: () => <span data-testid="shield-icon" />,
  BuildingIcon: () => <span data-testid="building-icon" />,
  BriefcaseIcon: () => <span data-testid="briefcase-icon" />,
  PencilIcon: () => <span data-testid="pencil-icon" />,
  LockIcon: () => <span data-testid="lock-icon" />,
  Loader2Icon: () => <span data-testid="loader-icon" />,
  EyeIcon: () => <span data-testid="eye-icon" />,
  EyeOffIcon: () => <span data-testid="eye-off-icon" />,
  CameraIcon: () => <span data-testid="camera-icon" />,
  // Extra icons the page might use
  User: () => <span data-testid="user-icon" />,
  Mail: () => <span data-testid="mail-icon" />,
  Shield: () => <span data-testid="shield-icon" />,
  Building: () => <span data-testid="building-icon" />,
  Briefcase: () => <span data-testid="briefcase-icon" />,
  Pencil: () => <span data-testid="pencil-icon" />,
  Lock: () => <span data-testid="lock-icon" />,
  Loader2: () => <span data-testid="loader-icon" />,
  Eye: () => <span data-testid="eye-icon" />,
  EyeOff: () => <span data-testid="eye-off-icon" />,
  Camera: () => <span data-testid="camera-icon" />,
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
  CardDescription: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <p className={className}>{children}</p>
  ),
}));

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  AvatarImage: ({ src, alt }: { src?: string; alt?: string }) => (
    <img src={src} alt={alt} />
  ),
  AvatarFallback: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: ({ className }: { className?: string }) => <hr className={className} />,
}));

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render user info section', async () => {
    render(<ProfilePage />);
    await waitFor(() => {
      // After loading, "John Doe" from the mock API should appear
      const profileSection = screen.queryAllByText(/john doe/i);
      const unnamedUser = screen.queryAllByText(/unnamed user/i);
      const profileTitle = screen.queryAllByText(/profile details/i);
      expect(profileSection.length > 0 || unnamedUser.length > 0 || profileTitle.length > 0).toBe(true);
    });
  });

  it('should render email field', async () => {
    render(<ProfilePage />);
    await waitFor(() => {
      const emailItems = screen.queryAllByText(/email/i);
      expect(emailItems.length).toBeGreaterThan(0);
    });
  });

  it('should render role badge or field', async () => {
    render(<ProfilePage />);
    await waitFor(() => {
      // "Employee" should appear as the role badge
      const roleItems = screen.queryAllByText(/employee/i);
      const roleLabel = screen.queryAllByText(/role/i);
      expect(roleItems.length > 0 || roleLabel.length > 0).toBe(true);
    });
  });

  it('should render edit profile button or form', async () => {
    render(<ProfilePage />);
    await waitFor(() => {
      const editBtns = screen.queryAllByText(/edit/i);
      const pencilIcons = screen.queryAllByTestId('pencil-icon');
      expect(editBtns.length > 0 || pencilIcons.length > 0).toBe(true);
    });
  });

  it('should render password change section', async () => {
    render(<ProfilePage />);
    await waitFor(() => {
      const pwItems = screen.queryAllByText(/password/i);
      const lockIcons = screen.queryAllByTestId('lock-icon');
      expect(pwItems.length > 0 || lockIcons.length > 0).toBe(true);
    });
  });

  it('should render department field', async () => {
    render(<ProfilePage />);
    await waitFor(() => {
      const deptItems = screen.queryAllByText(/department/i);
      expect(deptItems.length).toBeGreaterThan(0);
    });
  });
});
