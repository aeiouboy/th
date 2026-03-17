import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UtilizationChart } from './UtilizationChart';

// Mock Recharts
vi.mock('recharts', () => ({
  BarChart: ({ children, data }: { children?: React.ReactNode; data?: unknown[] }) => (
    <div data-testid="bar-chart" data-item-count={data?.length ?? 0}>{children}</div>
  ),
  Bar: ({ dataKey, name, children }: { dataKey?: string; name?: string; children?: React.ReactNode }) => (
    <div data-testid={`bar-${dataKey}`} data-name={name}>{children}</div>
  ),
  XAxis: ({ dataKey }: { dataKey?: string }) => (
    <div data-testid="xaxis" data-key={dataKey} />
  ),
  YAxis: () => <div data-testid="yaxis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Cell: ({ fill }: { fill?: string }) => <div data-testid="cell" data-fill={fill} />,
}));

const mockData = [
  { department: 'Engineering', rate: 85, loggedHours: 320, availableHours: 376 },
  { department: 'Design', rate: 72, loggedHours: 200, availableHours: 278 },
  { department: 'QA', rate: 55, loggedHours: 150, availableHours: 273 },
];

describe('UtilizationChart', () => {
  describe('with data', () => {
    it('should render ResponsiveContainer', () => {
      render(<UtilizationChart data={mockData} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should render BarChart with correct item count', () => {
      render(<UtilizationChart data={mockData} />);
      const chart = screen.getByTestId('bar-chart');
      expect(chart).toBeInTheDocument();
      expect(chart.getAttribute('data-item-count')).toBe('3');
    });

    it('should render rate bar with Utilization name', () => {
      render(<UtilizationChart data={mockData} />);
      const rateBar = screen.getByTestId('bar-rate');
      expect(rateBar).toBeInTheDocument();
      expect(rateBar.getAttribute('data-name')).toBe('Utilization');
    });

    it('should render XAxis with department dataKey', () => {
      render(<UtilizationChart data={mockData} />);
      const xAxis = screen.getByTestId('xaxis');
      expect(xAxis.getAttribute('data-key')).toBe('department');
    });

    it('should render Cell components for color coding', () => {
      render(<UtilizationChart data={mockData} />);
      const cells = screen.getAllByTestId('cell');
      expect(cells.length).toBe(mockData.length);
    });

    it('should render Tooltip', () => {
      render(<UtilizationChart data={mockData} />);
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });
  });

  describe('with empty data', () => {
    it('should render empty state message', () => {
      render(<UtilizationChart data={[]} />);
      expect(screen.getByText('No utilization data available')).toBeInTheDocument();
    });

    it('should not render bar chart when data is empty', () => {
      render(<UtilizationChart data={[]} />);
      expect(screen.queryByTestId('bar-chart')).toBeNull();
    });
  });
});
