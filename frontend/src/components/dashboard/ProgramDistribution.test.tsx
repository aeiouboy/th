import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ProgramDistribution } from './ProgramDistribution';

// Mock recharts
vi.mock('recharts', () => ({
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

// Mock Card components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock Button
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant }: { children: React.ReactNode; onClick?: () => void; variant?: string }) => (
    <button onClick={onClick} data-variant={variant}>{children}</button>
  ),
}));

// Mock TanStack Query hook
const mockUseQuery = vi.fn();
vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
}));

// Mock api
vi.mock('@/lib/api', () => ({
  api: { get: vi.fn() },
}));

const mockData = {
  currentPeriod: [
    { programName: 'Digital Transform', programId: 'PRG-001', hours: 32, percentage: 80 },
    { programName: 'Infra Upgrade', programId: 'PRG-002', hours: 8, percentage: 20 },
  ],
  ytd: [
    { programName: 'Digital Transform', programId: 'PRG-001', hours: 320, percentage: 75 },
    { programName: 'Infra Upgrade', programId: 'PRG-002', hours: 80, percentage: 20 },
    { programName: 'New Initiative', programId: 'PRG-003', hours: 20, percentage: 5 },
  ],
};

describe('ProgramDistribution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render "Program Distribution" heading', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });
    render(<ProgramDistribution />);
    expect(screen.getByText('Program Distribution')).toBeInTheDocument();
  });

  it('should render loading skeleton while data is loading', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });
    render(<ProgramDistribution />);
    const loadingEl = document.querySelector('.animate-pulse');
    expect(loadingEl).toBeTruthy();
  });

  it('should render "No data available yet" when no entries for current period', () => {
    mockUseQuery.mockReturnValue({
      data: { currentPeriod: [], ytd: [] },
      isLoading: false,
    });
    render(<ProgramDistribution />);
    expect(screen.getByText(/No data available yet/i)).toBeInTheDocument();
  });

  it('should render pie chart when data is available', () => {
    mockUseQuery.mockReturnValue({ data: mockData, isLoading: false });
    render(<ProgramDistribution />);
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('should show program names in legend', () => {
    mockUseQuery.mockReturnValue({ data: mockData, isLoading: false });
    render(<ProgramDistribution />);
    expect(screen.getByText('Digital Transform')).toBeInTheDocument();
    expect(screen.getByText('Infra Upgrade')).toBeInTheDocument();
  });

  it('should show "Current Period" and "YTD" toggle buttons', () => {
    mockUseQuery.mockReturnValue({ data: mockData, isLoading: false });
    render(<ProgramDistribution />);
    expect(screen.getByText('Current Period')).toBeInTheDocument();
    expect(screen.getByText('YTD')).toBeInTheDocument();
  });

  it('should switch to YTD view when YTD button is clicked', () => {
    mockUseQuery.mockReturnValue({ data: mockData, isLoading: false });
    render(<ProgramDistribution />);

    // Initially shows current period data
    expect(screen.getByText('Digital Transform')).toBeInTheDocument();
    expect(screen.queryByText('New Initiative')).toBeNull();

    // Click YTD button
    fireEvent.click(screen.getByText('YTD'));

    // After clicking YTD, "New Initiative" (only in ytd data) should appear
    expect(screen.getByText('New Initiative')).toBeInTheDocument();
  });

  it('should display hours and percentage for each program', () => {
    mockUseQuery.mockReturnValue({ data: mockData, isLoading: false });
    render(<ProgramDistribution />);
    // Check that program data is rendered with hours and percentage
    expect(screen.getByText(/32h.*80%/)).toBeInTheDocument();
  });
});
