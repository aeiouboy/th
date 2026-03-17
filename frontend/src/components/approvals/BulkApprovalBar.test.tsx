import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BulkApprovalBar } from './BulkApprovalBar';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Check: () => <span data-testid="check-icon" />,
  X: () => <span data-testid="x-icon" />,
}));

// Mock Button
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    size?: string;
    className?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} className={className} data-variant={variant}>
      {children}
    </button>
  ),
}));

describe('BulkApprovalBar', () => {
  describe('when count is 0', () => {
    it('should not render anything', () => {
      const { container } = render(
        <BulkApprovalBar count={0} onApprove={vi.fn()} onReject={vi.fn()} loading={false} />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('when count > 0', () => {
    it('should render the count', () => {
      render(
        <BulkApprovalBar count={3} onApprove={vi.fn()} onReject={vi.fn()} loading={false} />
      );
      expect(screen.getByText('3 selected')).toBeInTheDocument();
    });

    it('should render Approve Selected button', () => {
      render(
        <BulkApprovalBar count={2} onApprove={vi.fn()} onReject={vi.fn()} loading={false} />
      );
      expect(screen.getByText('Approve Selected')).toBeInTheDocument();
    });

    it('should render Reject Selected button', () => {
      render(
        <BulkApprovalBar count={2} onApprove={vi.fn()} onReject={vi.fn()} loading={false} />
      );
      expect(screen.getByText('Reject Selected')).toBeInTheDocument();
    });

    it('should call onApprove when Approve Selected is clicked', () => {
      const onApprove = vi.fn();
      render(
        <BulkApprovalBar count={2} onApprove={onApprove} onReject={vi.fn()} loading={false} />
      );
      fireEvent.click(screen.getByText('Approve Selected'));
      expect(onApprove).toHaveBeenCalledOnce();
    });

    it('should call onReject when Reject Selected is clicked', () => {
      const onReject = vi.fn();
      render(
        <BulkApprovalBar count={2} onApprove={vi.fn()} onReject={onReject} loading={false} />
      );
      fireEvent.click(screen.getByText('Reject Selected'));
      expect(onReject).toHaveBeenCalledOnce();
    });

    it('should disable buttons when loading is true', () => {
      render(
        <BulkApprovalBar count={2} onApprove={vi.fn()} onReject={vi.fn()} loading={true} />
      );
      const approveBtn = screen.getByText('Approve Selected').closest('button');
      const rejectBtn = screen.getByText('Reject Selected').closest('button');
      expect(approveBtn).toBeDisabled();
      expect(rejectBtn).toBeDisabled();
    });

    it('should show singular "1 selected" for count of 1', () => {
      render(
        <BulkApprovalBar count={1} onApprove={vi.fn()} onReject={vi.fn()} loading={false} />
      );
      expect(screen.getByText('1 selected')).toBeInTheDocument();
    });

    it('should render check icon in approve button', () => {
      render(
        <BulkApprovalBar count={1} onApprove={vi.fn()} onReject={vi.fn()} loading={false} />
      );
      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    });

    it('should render x icon in reject button', () => {
      render(
        <BulkApprovalBar count={1} onApprove={vi.fn()} onReject={vi.fn()} loading={false} />
      );
      expect(screen.getByTestId('x-icon')).toBeInTheDocument();
    });
  });
});
