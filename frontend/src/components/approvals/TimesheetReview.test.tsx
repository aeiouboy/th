import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TimesheetReview } from './TimesheetReview';
import * as apiModule from '@/lib/api';

// Mock API
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

// Mock Table components
vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children?: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children?: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <td className={className}>{children}</td>
  ),
  TableHead: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <th className={className}>{children}</th>
  ),
  TableHeader: ({ children }: { children?: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <tr className={className}>{children}</tr>
  ),
}));

const mockTimesheetDetail = {
  id: 'ts-1',
  periodStart: '2026-03-09',
  periodEnd: '2026-03-15',
  entries: [
    {
      id: 'e1',
      chargeCodeId: 'PRJ-042',
      date: '2026-03-09',
      hours: '4.0',
      description: null,
      chargeCode: { id: 'PRJ-042', name: 'Web Portal' },
    },
    {
      id: 'e2',
      chargeCodeId: 'ACT-010',
      date: '2026-03-09',
      hours: '4.0',
      description: null,
      chargeCode: { id: 'ACT-010', name: 'Code Review' },
    },
  ],
  employee: {
    id: 'emp-1',
    fullName: 'Alice Smith',
    email: 'alice@company.com',
    department: 'Engineering',
  },
};

describe('TimesheetReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('should show loading skeleton initially', () => {
      vi.mocked(apiModule.api.get).mockReturnValue(new Promise(() => {})); // never resolves
      const { container } = render(<TimesheetReview timesheetId="ts-1" />);
      expect(container.querySelector('.animate-pulse')).toBeTruthy();
    });
  });

  describe('success state', () => {
    beforeEach(() => {
      vi.mocked(apiModule.api.get).mockResolvedValue(mockTimesheetDetail);
    });

    it('should render charge code column header', async () => {
      render(<TimesheetReview timesheetId="ts-1" />);
      await waitFor(() => {
        expect(screen.getByText('Charge Code')).toBeInTheDocument();
      });
    });

    it('should render Total column header', async () => {
      render(<TimesheetReview timesheetId="ts-1" />);
      await waitFor(() => {
        expect(screen.getByText('Total')).toBeInTheDocument();
      });
    });

    it('should render charge code names', async () => {
      render(<TimesheetReview timesheetId="ts-1" />);
      await waitFor(() => {
        expect(screen.getByText('Web Portal')).toBeInTheDocument();
        expect(screen.getByText('Code Review')).toBeInTheDocument();
      });
    });

    it('should render charge code IDs', async () => {
      render(<TimesheetReview timesheetId="ts-1" />);
      await waitFor(() => {
        expect(screen.getByText('PRJ-042')).toBeInTheDocument();
        expect(screen.getByText('ACT-010')).toBeInTheDocument();
      });
    });

    it('should render Daily Total row', async () => {
      render(<TimesheetReview timesheetId="ts-1" />);
      await waitFor(() => {
        expect(screen.getByText('Daily Total')).toBeInTheDocument();
      });
    });
  });

  describe('error/fallback state', () => {
    it('should render mock data when API fails', async () => {
      vi.mocked(apiModule.api.get).mockRejectedValue(new Error('Network error'));
      render(<TimesheetReview timesheetId="ts-1" />);
      await waitFor(() => {
        // Mock data includes "Web Portal" charge code
        expect(screen.getByText('Web Portal')).toBeInTheDocument();
      });
    });
  });

  describe('empty state', () => {
    it('should render empty state when no entries', async () => {
      vi.mocked(apiModule.api.get).mockResolvedValue({ ...mockTimesheetDetail, entries: [] });
      render(<TimesheetReview timesheetId="ts-1" />);
      await waitFor(() => {
        expect(screen.getByText('No entries found')).toBeInTheDocument();
      });
    });
  });
});
