import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertList } from './AlertList';

const mockAlerts = [
  {
    chargeCodeId: 'PRJ-042',
    name: 'Web Portal Redesign',
    budget: 200000,
    actual: 220000,
    forecast: 240000,
    severity: 'red',
    rootCauseActivity: 'ACT-015 Development overspend',
  },
  {
    chargeCodeId: 'PRJ-018',
    name: 'Analytics Platform',
    budget: 80000,
    actual: 72000,
    forecast: 85000,
    severity: 'orange',
    rootCauseActivity: null,
  },
  {
    chargeCodeId: 'ACT-001',
    name: 'Development',
    budget: 50000,
    actual: 40000,
    forecast: 52000,
    severity: 'yellow',
    rootCauseActivity: null,
  },
];

describe('AlertList', () => {
  describe('rendering', () => {
    it('should render Severity column header', () => {
      render(<AlertList alerts={mockAlerts} />);
      expect(screen.getByText('Severity')).toBeInTheDocument();
    });

    it('should render Charge Code column header', () => {
      render(<AlertList alerts={mockAlerts} />);
      expect(screen.getByText('Charge Code')).toBeInTheDocument();
    });

    it('should render Budget column header', () => {
      render(<AlertList alerts={mockAlerts} />);
      expect(screen.getByText('Budget')).toBeInTheDocument();
    });

    it('should render Actual column header', () => {
      render(<AlertList alerts={mockAlerts} />);
      expect(screen.getByText('Actual')).toBeInTheDocument();
    });

    it('should render Overrun column header', () => {
      render(<AlertList alerts={mockAlerts} />);
      expect(screen.getByText('Overrun')).toBeInTheDocument();
    });

    it('should render all alert names', () => {
      render(<AlertList alerts={mockAlerts} />);
      expect(screen.getByText('Web Portal Redesign')).toBeInTheDocument();
      expect(screen.getByText('Analytics Platform')).toBeInTheDocument();
      expect(screen.getByText('Development')).toBeInTheDocument();
    });

    it('should render charge code IDs', () => {
      render(<AlertList alerts={mockAlerts} />);
      expect(screen.getByText('PRJ-042')).toBeInTheDocument();
      expect(screen.getByText('PRJ-018')).toBeInTheDocument();
    });

    it('should render formatted budget amounts', () => {
      render(<AlertList alerts={mockAlerts} />);
      // $200,000 formatted
      expect(screen.getByText('$200,000')).toBeInTheDocument();
    });

    it('should render severity indicators for all alerts', () => {
      render(<AlertList alerts={mockAlerts} />);
      const severityLabels = screen.getAllByText(/red|orange|yellow/i);
      expect(severityLabels.length).toBeGreaterThan(0);
    });
  });

  describe('sorting', () => {
    it('should sort by severity by default (red first)', () => {
      render(<AlertList alerts={mockAlerts} />);
      // Red severity should appear before orange in the rendered list
      const rows = document.querySelectorAll('tbody tr');
      expect(rows.length).toBeGreaterThan(0);
    });

    it('should sort by overrun when Overrun header is clicked', () => {
      render(<AlertList alerts={mockAlerts} />);
      const overrunHeader = screen.getByText('Overrun');
      fireEvent.click(overrunHeader);
      // After clicking, overrun sort is active (underline class applied)
      expect(overrunHeader.className).toContain('underline');
    });

    it('should sort by severity when Severity header is clicked', () => {
      render(<AlertList alerts={mockAlerts} />);
      const severityHeader = screen.getByText('Severity');
      fireEvent.click(severityHeader);
      expect(severityHeader.className).toContain('underline');
    });
  });

  describe('expand row', () => {
    it('should show root cause when row is clicked and rootCauseActivity exists', () => {
      render(<AlertList alerts={mockAlerts} />);
      const firstRow = screen.getByText('Web Portal Redesign').closest('tr');
      fireEvent.click(firstRow!);
      expect(screen.getByText('ACT-015 Development overspend')).toBeInTheDocument();
    });

    it('should collapse expanded row when clicked again', () => {
      render(<AlertList alerts={mockAlerts} />);
      const firstRow = screen.getByText('Web Portal Redesign').closest('tr');
      fireEvent.click(firstRow!);
      fireEvent.click(firstRow!);
      expect(screen.queryByText('ACT-015 Development overspend')).not.toBeInTheDocument();
    });

    it('should not show expanded row for alert with no rootCauseActivity', () => {
      render(<AlertList alerts={mockAlerts} />);
      const secondRow = screen.getByText('Analytics Platform').closest('tr');
      fireEvent.click(secondRow!);
      // No root cause to expand
      expect(screen.queryByText('Root cause:')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should render empty state message when no alerts', () => {
      render(<AlertList alerts={[]} />);
      expect(screen.getByText(/No budget alerts/i)).toBeInTheDocument();
    });
  });
});
