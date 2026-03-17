import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChargeabilityGauge } from './ChargeabilityGauge';

// Mock Recharts
vi.mock('recharts', () => ({
  BarChart: ({ children, data }: { children?: React.ReactNode; data?: unknown[] }) => (
    <div data-testid="bar-chart" data-item-count={data?.length ?? 0}>{children}</div>
  ),
  Bar: ({ dataKey, children }: { dataKey?: string; children?: React.ReactNode }) => (
    <div data-testid={`bar-${dataKey}`}>{children}</div>
  ),
  XAxis: ({ type, tickFormatter }: { type?: string; tickFormatter?: (v: unknown) => string }) => (
    <div data-testid="xaxis" data-type={type} />
  ),
  YAxis: ({ dataKey, type }: { dataKey?: string; type?: string }) => (
    <div data-testid="yaxis" data-key={dataKey} data-type={type} />
  ),
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ReferenceLine: ({ x, label }: { x?: number; label?: { value?: string } }) => (
    <div data-testid="reference-line" data-x={x} data-label={label?.value} />
  ),
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Cell: ({ fill }: { fill?: string }) => <div data-testid="cell" data-fill={fill} />,
}));

const mockMembers = [
  { userId: 'u1', fullName: 'Alice Smith', chargeabilityRate: 85 },
  { userId: 'u2', fullName: 'Bob Jones', chargeabilityRate: 72 },
  { userId: 'u3', fullName: 'Carol White', chargeabilityRate: 55 },
];

describe('ChargeabilityGauge', () => {
  describe('with data', () => {
    it('should render ResponsiveContainer', () => {
      render(<ChargeabilityGauge members={mockMembers} target={80} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should render BarChart', () => {
      render(<ChargeabilityGauge members={mockMembers} target={80} />);
      const chart = screen.getByTestId('bar-chart');
      expect(chart).toBeInTheDocument();
      expect(chart.getAttribute('data-item-count')).toBe('3');
    });

    it('should render a reference line for the target', () => {
      render(<ChargeabilityGauge members={mockMembers} target={80} />);
      const refLine = screen.getByTestId('reference-line');
      expect(refLine).toBeInTheDocument();
      expect(refLine.getAttribute('data-x')).toBe('80');
    });

    it('should render target label on reference line', () => {
      render(<ChargeabilityGauge members={mockMembers} target={80} />);
      const refLine = screen.getByTestId('reference-line');
      expect(refLine.getAttribute('data-label')).toContain('80%');
    });

    it('should render rate bar', () => {
      render(<ChargeabilityGauge members={mockMembers} target={80} />);
      expect(screen.getByTestId('bar-rate')).toBeInTheDocument();
    });
  });

  describe('with empty data', () => {
    it('should render empty state message', () => {
      render(<ChargeabilityGauge members={[]} target={80} />);
      expect(screen.getByText('No chargeability data available')).toBeInTheDocument();
    });

    it('should not render bar chart when data is empty', () => {
      render(<ChargeabilityGauge members={[]} target={80} />);
      expect(screen.queryByTestId('bar-chart')).toBeNull();
    });
  });

  describe('color coding', () => {
    it('should render Cell components for each member', () => {
      render(<ChargeabilityGauge members={mockMembers} target={80} />);
      const cells = screen.getAllByTestId('cell');
      expect(cells.length).toBe(mockMembers.length);
    });
  });
});
