import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityPie } from './ActivityPie';

// Mock Recharts
vi.mock('recharts', () => ({
  PieChart: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ data, dataKey, nameKey, innerRadius, outerRadius, children }: {
    data?: unknown[];
    dataKey?: string;
    nameKey?: string;
    innerRadius?: number;
    outerRadius?: number;
    children?: React.ReactNode;
  }) => (
    <div
      data-testid="pie"
      data-count={data?.length ?? 0}
      data-key={dataKey}
      data-name-key={nameKey}
      data-inner-radius={innerRadius}
      data-outer-radius={outerRadius}
    >{children}</div>
  ),
  Cell: ({ fill }: { fill?: string }) => <div data-testid="cell" data-fill={fill} />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

const mockData = [
  { category: 'Development', hours: 120, percentage: 50 },
  { category: 'Review', hours: 60, percentage: 25 },
  { category: 'Meetings', hours: 30, percentage: 12.5 },
  { category: 'Documentation', hours: 30, percentage: 12.5 },
];

describe('ActivityPie', () => {
  describe('with data', () => {
    it('should render ResponsiveContainer', () => {
      render(<ActivityPie data={mockData} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should render PieChart', () => {
      render(<ActivityPie data={mockData} />);
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    it('should render Pie with correct item count', () => {
      render(<ActivityPie data={mockData} />);
      const pie = screen.getByTestId('pie');
      expect(pie.getAttribute('data-count')).toBe('4');
    });

    it('should render Pie with hours dataKey', () => {
      render(<ActivityPie data={mockData} />);
      const pie = screen.getByTestId('pie');
      expect(pie.getAttribute('data-key')).toBe('hours');
    });

    it('should render Pie with category nameKey', () => {
      render(<ActivityPie data={mockData} />);
      const pie = screen.getByTestId('pie');
      expect(pie.getAttribute('data-name-key')).toBe('category');
    });

    it('should render as donut (innerRadius > 0)', () => {
      render(<ActivityPie data={mockData} />);
      const pie = screen.getByTestId('pie');
      const innerRadius = Number(pie.getAttribute('data-inner-radius'));
      expect(innerRadius).toBeGreaterThan(0);
    });

    it('should render Cell components for each item', () => {
      render(<ActivityPie data={mockData} />);
      const cells = screen.getAllByTestId('cell');
      expect(cells.length).toBe(mockData.length);
    });

    it('should render Legend', () => {
      render(<ActivityPie data={mockData} />);
      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });

    it('should render Tooltip', () => {
      render(<ActivityPie data={mockData} />);
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });
  });

  describe('with empty data', () => {
    it('should render empty state message', () => {
      render(<ActivityPie data={[]} />);
      expect(screen.getByText('No activity data available')).toBeInTheDocument();
    });

    it('should not render pie chart when data is empty', () => {
      render(<ActivityPie data={[]} />);
      expect(screen.queryByTestId('pie-chart')).toBeNull();
    });
  });
});
