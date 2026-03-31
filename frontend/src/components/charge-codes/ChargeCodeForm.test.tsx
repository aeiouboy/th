import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChargeCodeForm } from './ChargeCodeForm';

// Mock API — return a user list so owner select has options
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue([
      { id: 'u1', email: 'alice@test.com', fullName: 'Alice Admin' },
    ]),
    post: vi.fn().mockResolvedValue({ id: 'new-cc-1' }),
    put: vi.fn().mockResolvedValue({}),
  },
}));

// Mock UI components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children?: React.ReactNode; open?: boolean }) => (
    open ? <div data-testid="dialog">{children}</div> : null
  ),
  DialogContent: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: React.ReactNode }) => <h2>{children}</h2>,
  DialogFooter: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, type, variant, className }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: string;
    variant?: string;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      type={(type as 'button' | 'submit' | 'reset') || 'button'}
      className={className}
      data-variant={variant}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: { children?: React.ReactNode; value?: string; onValueChange?: (v: string) => void }) => (
    <div data-value={value} data-testid="select">{children}</div>
  ),
  SelectTrigger: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  SelectValue: () => <span />,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children?: React.ReactNode; value?: string }) => (
    <option value={value}>{children}</option>
  ),
}));

describe('ChargeCodeForm', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create mode (no editData)', () => {
    it('should render "Create Charge Code" title', () => {
      render(<ChargeCodeForm {...defaultProps} />);
      expect(screen.getByText('Create Charge Code')).toBeInTheDocument();
    });

    it('should render Name field', () => {
      render(<ChargeCodeForm {...defaultProps} />);
      expect(screen.getByPlaceholderText('Charge code name')).toBeInTheDocument();
    });

    it('should render Level dropdown in create mode', () => {
      render(<ChargeCodeForm {...defaultProps} />);
      const levelLabel = screen.queryByText('Level');
      expect(levelLabel).toBeTruthy();
    });

    it('should render Program Name field', () => {
      render(<ChargeCodeForm {...defaultProps} />);
      const programInput = screen.getByPlaceholderText('Optional');
      expect(programInput).toBeInTheDocument();
    });

    it('should render Cost Center field', () => {
      render(<ChargeCodeForm {...defaultProps} />);
      expect(screen.getByPlaceholderText('e.g. CC-100')).toBeInTheDocument();
    });

    it('should render Budget field', () => {
      render(<ChargeCodeForm {...defaultProps} />);
      expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
    });

    it('should render Valid From and Valid To date fields', () => {
      render(<ChargeCodeForm {...defaultProps} />);
      const dateInputs = document.querySelectorAll('input[type="date"]');
      expect(dateInputs.length).toBe(2);
    });

    it('should render Billable checkbox checked by default', () => {
      render(<ChargeCodeForm {...defaultProps} />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('should render Cancel and Create buttons', () => {
      render(<ChargeCodeForm {...defaultProps} />);
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Create')).toBeInTheDocument();
    });

    it('should call onOpenChange(false) when Cancel is clicked', () => {
      const onOpenChange = vi.fn();
      render(<ChargeCodeForm {...defaultProps} onOpenChange={onOpenChange} />);
      fireEvent.click(screen.getByText('Cancel'));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    // Helper to fill all required fields for create mode
    async function fillRequiredFields() {
      fireEvent.change(screen.getByPlaceholderText('e.g. PRG-001, FY260001'), {
        target: { value: 'PRG-001' },
      });
      fireEvent.change(screen.getByPlaceholderText('Charge code name'), {
        target: { value: 'New Code' },
      });
      // Wait for api.get('/users') to resolve so owner select has options
      await waitFor(() => {
        // Find the owner option that was loaded from api
        const aliceOption = document.querySelector('option[value="u1"]');
        expect(aliceOption).not.toBeNull();
      });
      // Now select the owner
      const allSelects = document.querySelectorAll('select');
      const ownerSelect = Array.from(allSelects).find((s) =>
        s.querySelector('option')?.textContent?.includes('Select owner')
      ) as HTMLSelectElement | undefined;
      if (ownerSelect) {
        fireEvent.change(ownerSelect, { target: { value: 'u1' } });
      }
      fireEvent.change(screen.getByPlaceholderText('e.g. CC-100'), {
        target: { value: 'CC-001' },
      });
      fireEvent.change(screen.getByPlaceholderText('0.00'), {
        target: { value: '10000' },
      });
      // Fill date fields
      const dateInputs = document.querySelectorAll('input[type="date"]');
      fireEvent.change(dateInputs[0], { target: { value: '2026-01-01' } });
      fireEvent.change(dateInputs[1], { target: { value: '2026-12-31' } });
    }

    it('should call api.post when form is submitted', async () => {
      const { api } = await import('@/lib/api');
      render(<ChargeCodeForm {...defaultProps} />);
      await fillRequiredFields();
      const form = screen.getByPlaceholderText('Charge code name').closest('form')!;
      fireEvent.submit(form);
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/charge-codes', expect.objectContaining({ name: 'New Code' }));
      });
    });

    it('should call onSuccess after successful create', async () => {
      const onSuccess = vi.fn();
      render(<ChargeCodeForm {...defaultProps} onSuccess={onSuccess} />);
      await fillRequiredFields();
      const form = screen.getByPlaceholderText('Charge code name').closest('form')!;
      fireEvent.submit(form);
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('edit mode (with editData)', () => {
    const editData = {
      id: 'cc-1',
      name: 'Existing Code',
      level: 'project',
      programName: 'My Program',
      costCenter: 'CC-100',
      budgetAmount: '50000',
      validFrom: '2026-01-01',
      validTo: '2026-12-31',
      isBillable: false,
      ownerId: 'u1',
      approverId: null,
      activityCategory: null,
    };

    it('should render "Edit Charge Code" title', () => {
      render(<ChargeCodeForm {...defaultProps} editData={editData} />);
      expect(screen.getByText('Edit Charge Code')).toBeInTheDocument();
    });

    it('should populate Name field with existing value', () => {
      render(<ChargeCodeForm {...defaultProps} editData={editData} />);
      expect(screen.getByDisplayValue('Existing Code')).toBeInTheDocument();
    });

    it('should not render Level dropdown in edit mode', () => {
      render(<ChargeCodeForm {...defaultProps} editData={editData} />);
      expect(screen.queryByText('Level')).toBeNull();
    });

    it('should render Update button instead of Create', () => {
      render(<ChargeCodeForm {...defaultProps} editData={editData} />);
      expect(screen.getByText('Update')).toBeInTheDocument();
      expect(screen.queryByText('Create')).toBeNull();
    });

    it('should uncheck Billable checkbox when editData.isBillable is false', () => {
      render(<ChargeCodeForm {...defaultProps} editData={editData} />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('should call api.put when form is submitted in edit mode', async () => {
      const { api } = await import('@/lib/api');
      render(<ChargeCodeForm {...defaultProps} editData={editData} />);
      fireEvent.submit(screen.getByPlaceholderText('Charge code name').closest('form')!);
      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith('/charge-codes/cc-1', expect.any(Object));
      });
    });
  });

  describe('error handling', () => {
    it('should display validation error when required fields are missing on submit', async () => {
      render(<ChargeCodeForm {...defaultProps} />);
      // Submit without filling required fields (Charge Code ID is required)
      fireEvent.submit(screen.getByPlaceholderText('Charge code name').closest('form')!);
      await waitFor(() => {
        // Form validates and shows error before calling api.post
        const errorEl = document.querySelector('[class*="accent-red"]');
        expect(errorEl).toBeTruthy();
      });
    });
  });

  describe('closed state', () => {
    it('should not render dialog when open is false', () => {
      render(<ChargeCodeForm {...defaultProps} open={false} />);
      expect(screen.queryByTestId('dialog')).toBeNull();
    });
  });
});
