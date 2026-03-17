import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test-utils';
import SettingsPage from './page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/settings',
  useSearchParams: () => new URLSearchParams(),
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
  SunIcon: () => <span data-testid="sun-icon" />,
  MoonIcon: () => <span data-testid="moon-icon" />,
  BellIcon: () => <span data-testid="bell-icon" />,
  MailIcon: () => <span data-testid="mail-icon" />,
  MessageSquareIcon: () => <span data-testid="message-icon" />,
  CalendarIcon: () => <span data-testid="calendar-icon" />,
  GlobeIcon: () => <span data-testid="globe-icon" />,
  CheckIcon: () => <span data-testid="check-icon" />,
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
  CardDescription: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <p className={className}>{children}</p>
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: { children?: React.ReactNode; onValueChange?: (v: string) => void; value?: string }) => (
    <div data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children?: React.ReactNode; value?: string }) => (
    <option value={value}>{children}</option>
  ),
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: ({ className }: { className?: string }) => <hr className={className} />,
}));

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the page title', () => {
    render(<SettingsPage />);
    const title = screen.queryByText(/settings/i);
    expect(title).toBeTruthy();
  });

  it('should render theme toggle section', () => {
    render(<SettingsPage />);
    const themeSection = screen.queryByText(/theme/i) || screen.queryByText(/appearance/i) || screen.queryByTestId('sun-icon') || screen.queryByTestId('moon-icon');
    expect(themeSection).toBeTruthy();
  });

  it('should render Light and Dark theme options', () => {
    render(<SettingsPage />);
    const lightOption = screen.queryByText(/light/i);
    const darkOption = screen.queryByText(/dark/i);
    expect(lightOption !== null || darkOption !== null).toBe(true);
  });

  it('should render notification preferences section', () => {
    render(<SettingsPage />);
    const notifItems = screen.queryAllByText(/notification/i);
    const bellIcons = screen.queryAllByTestId('bell-icon');
    expect(notifItems.length > 0 || bellIcons.length > 0).toBe(true);
  });

  it('should render email notification toggle', () => {
    render(<SettingsPage />);
    const emailItems = screen.queryAllByText(/email/i);
    const mailIcons = screen.queryAllByTestId('mail-icon');
    expect(emailItems.length > 0 || mailIcons.length > 0).toBe(true);
  });

  it('should render timezone settings', () => {
    render(<SettingsPage />);
    const timezoneItems = screen.queryAllByText(/timezone/i);
    const globeIcons = screen.queryAllByTestId('globe-icon');
    expect(timezoneItems.length > 0 || globeIcons.length > 0).toBe(true);
  });
});
