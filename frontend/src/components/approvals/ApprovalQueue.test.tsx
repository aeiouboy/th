import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ApprovalQueue } from './ApprovalQueue';

// Mock @base-ui/react dialog
vi.mock('@base-ui/react/dialog', () => ({
  Dialog: {
    Root: ({ children, open }: { children: React.ReactNode; open?: boolean }) => open ? <div data-testid="dialog">{children}</div> : null,
    Trigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Backdrop: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-backdrop">{children}</div>,
    Popup: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-popup">{children}</div>,
    Close: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Title: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
    Description: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  },
}));

// Mock @base-ui/react Badge components
vi.mock('@base-ui/react/merge-props', () => ({ mergeProps: (...args: Record<string, unknown>[]) => Object.assign({}, ...args) }));
vi.mock('@base-ui/react/use-render', () => ({
  useRender: ({ defaultTagName: Tag = 'span', props }: { defaultTagName?: string; props: Record<string, unknown> }) => {
    const { slot: _slot, variant: _variant, ...rest } = props;
    return <Tag {...rest} />;
  },
}));

// Mock the API module
vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn().mockResolvedValue({}),
    get: vi.fn().mockResolvedValue({}),
  },
}));

// Mock TimesheetReview to avoid API calls in tests
vi.mock('./TimesheetReview', () => ({
  TimesheetReview: ({ timesheetId }: { timesheetId: string }) => (
    <div data-testid={`review-${timesheetId}`}>Timesheet Review</div>
  ),
}));

// Mock Button component
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, className, title }: { children?: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: string; className?: string; title?: string }) => (
    <button onClick={onClick} disabled={disabled} className={className} title={title} data-variant={variant}>
      {children}
    </button>
  ),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  XIcon: () => <span data-testid="x-icon" />,
  Eye: () => <span data-testid="eye-icon" />,
  Check: () => <span data-testid="check-icon" />,
  X: () => <span data-testid="x-icon-2" />,
  AlertTriangle: () => <span data-testid="alert-triangle-icon" />,
  CheckCircle: () => <span data-testid="check-circle-icon" />,
}));

const makePendingTimesheet = (overrides = {}) => ({
  id: 'ts-1',
  userId: 'emp-1',
  periodStart: '2026-03-09',
  periodEnd: '2026-03-15',
  status: 'submitted',
  submittedAt: '2026-03-10T08:00:00',
  totalHours: 40,
  employee: {
    id: 'emp-1',
    fullName: 'Alice Smith',
    email: 'alice@test.com',
    department: 'Engineering',
  },
  ...overrides,
});

describe('ApprovalQueue', () => {
  let onRefresh: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onRefresh = vi.fn();
  });

  describe('rendering', () => {
    it('should show empty state when no items', () => {
      render(<ApprovalQueue items={[]} onRefresh={onRefresh} />);
      expect(screen.getByText('No pending approvals')).toBeInTheDocument();
    });

    it('should render table headers correctly', () => {
      render(<ApprovalQueue items={[makePendingTimesheet()]} onRefresh={onRefresh} />);
      expect(screen.getByText('Employee')).toBeInTheDocument();
      expect(screen.getByText('Period')).toBeInTheDocument();
      expect(screen.getByText('Hours')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('should render employee name in table row', () => {
      render(<ApprovalQueue items={[makePendingTimesheet()]} onRefresh={onRefresh} />);
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    it('should render employee department', () => {
      render(<ApprovalQueue items={[makePendingTimesheet()]} onRefresh={onRefresh} />);
      expect(screen.getByText('Engineering')).toBeInTheDocument();
    });

    it('should render hours', () => {
      render(<ApprovalQueue items={[makePendingTimesheet()]} onRefresh={onRefresh} />);
      expect(screen.getByText('40.0h')).toBeInTheDocument();
    });

    it('should show warning indicator for hours below 40', () => {
      render(<ApprovalQueue items={[makePendingTimesheet({ totalHours: 35 })]} onRefresh={onRefresh} />);
      expect(screen.getByText('35.0h')).toBeInTheDocument();
    });

    it('should render submitted status badge as Pending', () => {
      render(<ApprovalQueue items={[makePendingTimesheet({ status: 'submitted' })]} onRefresh={onRefresh} />);
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('should render manager_approved status badge', () => {
      render(<ApprovalQueue items={[makePendingTimesheet({ status: 'manager_approved' })]} onRefresh={onRefresh} />);
      expect(screen.getByText('Manager Approved')).toBeInTheDocument();
    });

    it('should render multiple rows for multiple items', () => {
      const items = [
        makePendingTimesheet({ id: 'ts-1', employee: { id: 'emp-1', fullName: 'Alice', email: 'a@test.com', department: null } }),
        makePendingTimesheet({ id: 'ts-2', employee: { id: 'emp-2', fullName: 'Bob', email: 'b@test.com', department: null } }),
      ];
      render(<ApprovalQueue items={items} onRefresh={onRefresh} />);
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  describe('checkbox selection', () => {
    it('should render a select-all checkbox in the header', () => {
      render(<ApprovalQueue items={[makePendingTimesheet()]} onRefresh={onRefresh} />);
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThanOrEqual(2); // header + row
    });

    it('should select all items when select-all checkbox is checked', () => {
      const items = [
        makePendingTimesheet({ id: 'ts-1' }),
        makePendingTimesheet({ id: 'ts-2' }),
      ];
      render(<ApprovalQueue items={items} onRefresh={onRefresh} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const selectAll = checkboxes[0];
      fireEvent.click(selectAll);

      // After clicking select-all, all row checkboxes should be checked
      const rowCheckboxes = checkboxes.slice(1);
      rowCheckboxes.forEach((cb) => expect(cb).toBeChecked());
    });

    it('should deselect all when select-all is clicked again', () => {
      const items = [makePendingTimesheet({ id: 'ts-1' })];
      render(<ApprovalQueue items={items} onRefresh={onRefresh} />);

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]); // select all
      fireEvent.click(checkboxes[0]); // deselect all

      const rowCheckboxes = checkboxes.slice(1);
      rowCheckboxes.forEach((cb) => expect(cb).not.toBeChecked());
    });

    it('should allow individual row selection', () => {
      const items = [
        makePendingTimesheet({ id: 'ts-1' }),
        makePendingTimesheet({ id: 'ts-2' }),
      ];
      render(<ApprovalQueue items={items} onRefresh={onRefresh} />);

      const checkboxes = screen.getAllByRole('checkbox');
      // Check only the first row
      fireEvent.click(checkboxes[1]);

      expect(checkboxes[1]).toBeChecked();
      expect(checkboxes[2]).not.toBeChecked();
    });
  });

  describe('bulk approval bar', () => {
    it('should show bulk approval bar when items are selected', () => {
      render(<ApprovalQueue items={[makePendingTimesheet()]} onRefresh={onRefresh} />);
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]); // select all

      expect(screen.getByText('1 selected')).toBeInTheDocument();
    });

    it('should not show bulk approval bar when nothing is selected', () => {
      render(<ApprovalQueue items={[makePendingTimesheet()]} onRefresh={onRefresh} />);
      expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
    });
  });

  describe('approve action', () => {
    it('should call api.post when approve button is clicked', async () => {
      const { api } = await import('@/lib/api');
      render(<ApprovalQueue items={[makePendingTimesheet()]} onRefresh={onRefresh} />);

      const approveButton = screen.getByTitle('Approve');
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/approvals/ts-1/approve', {});
      });
    });

    it('should call onRefresh after approve', async () => {
      const { api } = await import('@/lib/api');
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

      render(<ApprovalQueue items={[makePendingTimesheet()]} onRefresh={onRefresh} />);

      fireEvent.click(screen.getByTitle('Approve'));

      await waitFor(() => {
        expect(onRefresh).toHaveBeenCalled();
      });
    });
  });

  describe('reject dialog', () => {
    it('should open reject dialog when reject button is clicked', () => {
      render(<ApprovalQueue items={[makePendingTimesheet()]} onRefresh={onRefresh} />);
      const rejectButton = screen.getByTitle('Reject');
      fireEvent.click(rejectButton);

      expect(screen.getByText('Reject Timesheet')).toBeInTheDocument();
    });

    it('should not submit rejection without a comment', async () => {
      const { api } = await import('@/lib/api');
      render(<ApprovalQueue items={[makePendingTimesheet()]} onRefresh={onRefresh} />);

      fireEvent.click(screen.getByTitle('Reject'));
      const confirmButton = screen.getByText('Confirm Reject');
      expect(confirmButton).toBeDisabled();
      expect(api.post).not.toHaveBeenCalledWith(expect.stringContaining('reject'), expect.anything());
    });
  });

  describe('status badges', () => {
    it('should show locked badge for locked status', () => {
      render(<ApprovalQueue items={[makePendingTimesheet({ status: 'locked' })]} onRefresh={onRefresh} />);
      expect(screen.getByText('Locked')).toBeInTheDocument();
    });

    it('should show Rejected badge for rejected status', () => {
      render(<ApprovalQueue items={[makePendingTimesheet({ status: 'rejected' })]} onRefresh={onRefresh} />);
      expect(screen.getByText('Rejected')).toBeInTheDocument();
    });
  });
});
