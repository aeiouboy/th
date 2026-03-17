import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BudgetChart } from './BudgetChart';

// Mock Recharts — they don't work in jsdom
vi.mock('recharts', () => ({
  BarChart: ({ children, data }: { children?: React.ReactNode; data?: unknown[] }) => (
    <div data-testid="bar-chart" data-item-count={data?.length ?? 0}>{children}</div>
  ),
  Bar: ({ dataKey, fill }: { dataKey?: string; fill?: string }) => (
    <div data-testid={`bar-${dataKey}`} data-fill={fill} />
  ),
  XAxis: ({ dataKey }: { dataKey?: string }) => <div data-testid={`xaxis-${dataKey}`} />,
  YAxis: () => <div data-testid="yaxis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

const mockData = [
  { chargeCodeId: 'PRJ-042', chargeCodeName: 'Web Portal', budgetAmount: 200000, actualSpent: 150000, forecast: 190000 },
  { chargeCodeId: 'PRJ-018', chargeCodeName: 'Analytics Platform', budgetAmount: 80000, actualSpent: 72000, forecast: 85000 },
];

describe('BudgetChart', () => {
  describe('with data', () => {
    it('should render ResponsiveContainer', () => {
      render(<BudgetChart data={mockData} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should render BarChart with data', () => {
      render(<BudgetChart data={mockData} />);
      const barChart = screen.getByTestId('bar-chart');
      expect(barChart).toBeInTheDocument();
      expect(barChart.getAttribute('data-item-count')).toBe('2');
    });

    it('should render Actual bar', () => {
      render(<BudgetChart data={mockData} />);
      expect(screen.getByTestId('bar-Actual')).toBeInTheDocument();
    });

    it('should render Budget bar', () => {
      render(<BudgetChart data={mockData} />);
      expect(screen.getByTestId('bar-Budget')).toBeInTheDocument();
    });

    it('should render Legend', () => {
      render(<BudgetChart data={mockData} />);
      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });

    it('should render Tooltip', () => {
      render(<BudgetChart data={mockData} />);
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('should render CartesianGrid', () => {
      render(<BudgetChart data={mockData} />);
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    });
  });

  describe('with empty data', () => {
    it('should render empty state message when no data', () => {
      render(<BudgetChart data={[]} />);
      expect(screen.getByText('No budget data available')).toBeInTheDocument();
    });

    it('should not render bar chart when data is empty', () => {
      render(<BudgetChart data={[]} />);
      expect(screen.queryByTestId('bar-chart')).toBeNull();
    });
  });
});
