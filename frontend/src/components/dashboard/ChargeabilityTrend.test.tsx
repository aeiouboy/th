import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ChargeabilityTrend } from './ChargeabilityTrend';

// Mock recharts to avoid canvas issues in jsdom
vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ReferenceLine: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

// Mock Card components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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

describe('ChargeabilityTrend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the "Chargeability Trend" heading', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });
    render(<ChargeabilityTrend />);
    expect(screen.getByText(/Chargeability Trend/i)).toBeInTheDocument();
  });

  it('should render loading skeleton while data is loading', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });
    render(<ChargeabilityTrend />);
    const loadingEl = document.querySelector('.animate-pulse');
    expect(loadingEl).toBeTruthy();
  });

  it('should render "No data available yet" when months array is empty', () => {
    mockUseQuery.mockReturnValue({
      data: { months: [], ytdChargeability: 0 },
      isLoading: false,
    });
    render(<ChargeabilityTrend />);
    expect(screen.getByText(/No data available yet/i)).toBeInTheDocument();
  });

  it('should render chart when data is available', () => {
    mockUseQuery.mockReturnValue({
      data: {
        months: [
          { month: '2026-01', chargeability: 82, billableHours: 164, totalHours: 200 },
        ],
        ytdChargeability: 82,
      },
      isLoading: false,
    });
    render(<ChargeabilityTrend />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('should display YTD chargeability percentage when data is available', () => {
    mockUseQuery.mockReturnValue({
      data: {
        months: [{ month: '2026-01', chargeability: 80, billableHours: 160, totalHours: 200 }],
        ytdChargeability: 80,
      },
      isLoading: false,
    });
    render(<ChargeabilityTrend />);
    expect(screen.getByText(/80% YTD/i)).toBeInTheDocument();
  });
});
