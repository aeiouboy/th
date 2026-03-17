import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoginPage from './page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/login',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  }),
}));

// Mock next/font/google
vi.mock('next/font/google', () => ({
  Plus_Jakarta_Sans: () => ({ className: 'mock-jakarta', variable: '--font-heading' }),
  DM_Sans: () => ({ className: 'mock-dm', variable: '--font-body' }),
  IBM_Plex_Mono: () => ({ className: 'mock-mono', variable: '--font-mono' }),
}));

// Mock Button component
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, type, className, variant }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: string;
    className?: string;
    variant?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} type={type as 'button' | 'submit' | 'reset'} className={className} data-variant={variant}>
      {children}
    </button>
  ),
}));

// Mock Input component
vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the logo/branding', () => {
    render(<LoginPage />);
    expect(screen.getByText('Timesheet System')).toBeInTheDocument();
  });

  it('should render email input', () => {
    render(<LoginPage />);
    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('type', 'email');
  });

  it('should render password input', () => {
    render(<LoginPage />);
    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('should render Sign In button', () => {
    render(<LoginPage />);
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('should render Microsoft SSO button', () => {
    render(<LoginPage />);
    expect(screen.getByText('Sign in with Microsoft')).toBeInTheDocument();
  });

  it('should render Forgot password link', () => {
    render(<LoginPage />);
    expect(screen.getByText('Forgot password?')).toBeInTheDocument();
  });

  it('should render "or" divider', () => {
    render(<LoginPage />);
    expect(screen.getByText('or')).toBeInTheDocument();
  });

  it('should render subtitle text', () => {
    render(<LoginPage />);
    expect(screen.getByText(/sign in to manage your timesheets/i)).toBeInTheDocument();
  });
});
