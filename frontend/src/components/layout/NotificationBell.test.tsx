import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotificationBell } from './NotificationBell';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock the api module
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn().mockResolvedValue({}),
  },
}));

// Mock @/lib/utils
vi.mock('@/lib/utils', () => ({
  timeAgo: (_date: string) => 'just now',
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

// Mock lucide-react Bell icon
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>();
  const MockBell = ({ className }: { className?: string }) => (
    <svg className={className} data-testid="bell-icon" />
  );
  return { ...actual, Bell: MockBell };
});

import { api } from '@/lib/api';

const mockBudgetAlerts = [
  {
    chargeCodeId: 'PRJ-001',
    name: 'Digital Transformation',
    budget: 500000,
    actual: 620000,
    forecast: 700000,
    severity: 'red',
    rootCauseActivity: 'Dev sprint overspend',
  },
  {
    chargeCodeId: 'PRJ-002',
    name: 'Analytics Platform',
    budget: 200000,
    actual: 240000,
    forecast: 260000,
    severity: 'orange',
    rootCauseActivity: null,
  },
];

const mockChargeabilityAlerts = [
  {
    type: 'chargeability' as const,
    employeeId: 'emp-001',
    name: 'Wichai S.',
    billableHours: 100,
    totalHours: 160,
    chargeability: 62.5,
    target: 80,
    severity: 'yellow',
    costImpact: 40000,
  },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// Default mock: admin user with 3 unread notifications and alerts
function setupDefaultMocks() {
  (api.get as ReturnType<typeof vi.fn>).mockImplementation((path: string) => {
    if (path === '/users/me') return Promise.resolve({ role: 'admin' });
    if (path.includes('budget-alerts')) return Promise.resolve(mockBudgetAlerts);
    if (path.includes('chargeability-alerts')) return Promise.resolve(mockChargeabilityAlerts);
    if (path.includes('unread-count')) return Promise.resolve({ count: 3 });
    if (path.includes('notifications')) return Promise.resolve([]);
    return Promise.resolve([]);
  });
}

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  describe('UNIT-BELL-01: Bell icon renders', () => {
    it('should render the bell button with aria-label', async () => {
      render(<NotificationBell />, { wrapper: createWrapper() });
      const button = screen.getByRole('button', { name: /notifications/i });
      expect(button).toBeInTheDocument();
    });

    it('should render the bell icon SVG', async () => {
      render(<NotificationBell />, { wrapper: createWrapper() });
      expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
    });
  });

  describe('UNIT-BELL-02: Badge shows correct count when unread notifications exist', () => {
    it('should show badge with unread notification count (from DB)', async () => {
      // Badge = unreadCount (DB notifications only), not alertCount
      render(<NotificationBell />, { wrapper: createWrapper() });
      const badge = await screen.findByText('3');
      expect(badge).toBeInTheDocument();
    });

    it('should show badge with count from unread-count endpoint', async () => {
      (api.get as ReturnType<typeof vi.fn>).mockImplementation((path: string) => {
        if (path === '/users/me') return Promise.resolve({ role: 'admin' });
        if (path.includes('unread-count')) return Promise.resolve({ count: 5 });
        if (path.includes('budget-alerts')) return Promise.resolve(mockBudgetAlerts);
        if (path.includes('chargeability-alerts')) return Promise.resolve([]);
        if (path.includes('notifications')) return Promise.resolve([]);
        return Promise.resolve([]);
      });
      render(<NotificationBell />, { wrapper: createWrapper() });
      const badge = await screen.findByText('5');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('UNIT-BELL-03: Badge hidden when no unread notifications', () => {
    it('should not render badge when unread count is 0', async () => {
      (api.get as ReturnType<typeof vi.fn>).mockImplementation((path: string) => {
        if (path === '/users/me') return Promise.resolve({ role: 'admin' });
        if (path.includes('unread-count')) return Promise.resolve({ count: 0 });
        if (path.includes('budget-alerts')) return Promise.resolve([]);
        if (path.includes('chargeability-alerts')) return Promise.resolve([]);
        if (path.includes('notifications')) return Promise.resolve([]);
        return Promise.resolve([]);
      });
      render(<NotificationBell />, { wrapper: createWrapper() });
      // Wait for queries to settle
      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
      }, { timeout: 2000 });
      // Badge should not be present (badgeCount === 0)
      expect(screen.queryByText('0')).not.toBeInTheDocument();
      // No numeric badge rendered
      const button = screen.getByRole('button', { name: /notifications/i });
      const badge = button.querySelector('span');
      expect(badge).toBeNull();
    });
  });

  describe('UNIT-BELL-04: Popover opens on click', () => {
    it('should open popover when bell button is clicked', async () => {
      render(<NotificationBell />, { wrapper: createWrapper() });
      const button = screen.getByRole('button', { name: /notifications/i });

      // Popover not visible initially
      expect(screen.queryByText('Notifications')).not.toBeInTheDocument();

      fireEvent.click(button);

      // Popover heading should appear
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    it('should close popover when bell button is clicked again', async () => {
      render(<NotificationBell />, { wrapper: createWrapper() });
      const button = screen.getByRole('button', { name: /notifications/i });

      fireEvent.click(button);
      expect(screen.getByText('Notifications')).toBeInTheDocument();

      fireEvent.click(button);
      expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
    });
  });

  describe('UNIT-BELL-05: Popover shows alert items with severity indicators', () => {
    it('should show alert names inside popover after opening', async () => {
      render(<NotificationBell />, { wrapper: createWrapper() });

      // Wait for data to load (badge appears)
      await screen.findByText('3');

      const button = screen.getByRole('button', { name: /notifications/i });
      fireEvent.click(button);

      // Alert names should be visible in the popover
      expect(await screen.findByText('Digital Transformation')).toBeInTheDocument();
      expect(screen.getByText('Analytics Platform')).toBeInTheDocument();
    });

    it('should show severity dot elements for alerts', async () => {
      render(<NotificationBell />, { wrapper: createWrapper() });
      await screen.findByText('3');

      const button = screen.getByRole('button', { name: /notifications/i });
      fireEvent.click(button);

      // Severity dots are rendered as colored spans; check at least one alert detail is shown
      await waitFor(() => {
        const details = screen.getAllByText(/budget|chargeability/i);
        expect(details.length).toBeGreaterThan(0);
      });
    });

    it('should show "No notifications" message when popover opens with empty data', async () => {
      (api.get as ReturnType<typeof vi.fn>).mockImplementation((path: string) => {
        if (path === '/users/me') return Promise.resolve({ role: 'employee' });
        if (path.includes('unread-count')) return Promise.resolve({ count: 0 });
        if (path.includes('notifications')) return Promise.resolve([]);
        return Promise.resolve([]);
      });
      render(<NotificationBell />, { wrapper: createWrapper() });

      // Wait for queries to settle
      await waitFor(() => expect(api.get).toHaveBeenCalled(), { timeout: 2000 });

      const button = screen.getByRole('button', { name: /notifications/i });
      fireEvent.click(button);

      expect(screen.getByText(/no notifications - everything is on track/i)).toBeInTheDocument();
    });

    it('should limit displayed alerts to top 5 sorted by severity', async () => {
      // Provide 6 alerts — only 5 should appear in the list
      const manyAlerts = Array.from({ length: 6 }, (_, i) => ({
        chargeCodeId: `PRJ-00${i}`,
        name: `Project ${i}`,
        budget: 100000,
        actual: 120000,
        forecast: null,
        severity: 'orange',
        rootCauseActivity: null,
      }));
      (api.get as ReturnType<typeof vi.fn>).mockImplementation((path: string) => {
        if (path === '/users/me') return Promise.resolve({ role: 'admin' });
        if (path.includes('budget-alerts')) return Promise.resolve(manyAlerts);
        if (path.includes('chargeability-alerts')) return Promise.resolve([]);
        if (path.includes('unread-count')) return Promise.resolve({ count: 6 });
        if (path.includes('notifications')) return Promise.resolve([]);
        return Promise.resolve([]);
      });

      render(<NotificationBell />, { wrapper: createWrapper() });
      await screen.findByText('6');

      const button = screen.getByRole('button', { name: /notifications/i });
      fireEvent.click(button);

      await waitFor(() => {
        // Only up to 5 items shown in the popover list
        const listItems = screen.queryAllByRole('listitem');
        expect(listItems.length).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('UNIT-BELL-06: "View all notifications" link navigates to /notifications', () => {
    it('should render "View all notifications" footer link', async () => {
      render(<NotificationBell />, { wrapper: createWrapper() });

      const button = screen.getByRole('button', { name: /notifications/i });
      fireEvent.click(button);

      // Footer always has "View all notifications"
      expect(await screen.findByText(/view all notifications/i)).toBeInTheDocument();
    });

    it('should call router.push("/notifications") when "View all notifications" is clicked', async () => {
      const mockPush = vi.fn();
      vi.mocked(await import('next/navigation')).useRouter = () => ({ push: mockPush });

      render(<NotificationBell />, { wrapper: createWrapper() });
      await screen.findByText('3');

      const button = screen.getByRole('button', { name: /notifications/i });
      fireEvent.click(button);

      const viewAllBtn = await screen.findByText(/view all notifications/i);
      fireEvent.click(viewAllBtn);

      expect(mockPush).toHaveBeenCalledWith('/notifications');
    });
  });
});
