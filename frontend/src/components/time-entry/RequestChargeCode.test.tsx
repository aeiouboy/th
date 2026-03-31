import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { RequestChargeCode } from './RequestChargeCode';

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock Dialog components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="dialog" data-open={open ? 'true' : 'false'}>{children}</div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock Badge
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

// Mock Button
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

// Mock Input
vi.mock('@/components/ui/input', () => ({
  Input: ({ placeholder, value, onChange, autoFocus }: { placeholder?: string; value?: string; onChange?: (e: any) => void; autoFocus?: boolean }) => (
    <input placeholder={placeholder} value={value} onChange={onChange} autoFocus={autoFocus} />
  ),
}));

// Mock api
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue([]),
    post: vi.fn().mockResolvedValue({}),
  },
}));

// Mock TanStack Query
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: (...args: any[]) => mockUseMutation(...args),
}));

describe('RequestChargeCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no results
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
    mockUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  it('should render the "+ Request New CC" trigger button', () => {
    render(<RequestChargeCode />);
    expect(screen.getByText(/\+ Request New CC/i)).toBeInTheDocument();
  });

  it('should open dialog when trigger button is clicked', async () => {
    render(<RequestChargeCode />);
    const triggerBtn = screen.getByText(/\+ Request New CC/i);
    fireEvent.click(triggerBtn);

    await waitFor(() => {
      const dialog = screen.getByTestId('dialog');
      expect(dialog.getAttribute('data-open')).toBe('true');
    });
  });

  it('should show "Request Charge Code Access" title when dialog opens', async () => {
    render(<RequestChargeCode />);
    fireEvent.click(screen.getByText(/\+ Request New CC/i));

    await waitFor(() => {
      expect(screen.getByText('Request Charge Code Access')).toBeInTheDocument();
    });
  });

  it('should render search input in dialog', async () => {
    render(<RequestChargeCode />);
    fireEvent.click(screen.getByText(/\+ Request New CC/i));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search charge codes/i)).toBeInTheDocument();
    });
  });

  it('should show charge code results when query returns data', async () => {
    mockUseQuery.mockReturnValue({
      data: [
        { id: 'PRJ-001', name: 'Project Alpha', level: 'project', programName: 'Program A', isBillable: true, ownerId: null },
      ],
      isLoading: false,
    });

    render(<RequestChargeCode />);
    fireEvent.click(screen.getByText(/\+ Request New CC/i));

    // Type in search input to enable results
    const input = await screen.findByPlaceholderText(/Search charge codes/i);
    fireEvent.change(input, { target: { value: 'Alpha' } });

    await waitFor(() => {
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    });
  });

  it('should show "Billable" badge for billable charge codes', async () => {
    mockUseQuery.mockReturnValue({
      data: [
        { id: 'PRJ-001', name: 'Billable Project', level: 'project', programName: null, isBillable: true, ownerId: null },
      ],
      isLoading: false,
    });

    render(<RequestChargeCode />);
    fireEvent.click(screen.getByText(/\+ Request New CC/i));

    const input = await screen.findByPlaceholderText(/Search charge codes/i);
    fireEvent.change(input, { target: { value: 'Billable' } });

    await waitFor(() => {
      expect(screen.getByText('Billable')).toBeInTheDocument();
    });
  });

  it('should show "Non-billable" badge for non-billable charge codes', async () => {
    mockUseQuery.mockReturnValue({
      data: [
        { id: 'ACT-001', name: 'Internal Activity', level: 'activity', programName: null, isBillable: false, ownerId: null },
      ],
      isLoading: false,
    });

    render(<RequestChargeCode />);
    fireEvent.click(screen.getByText(/\+ Request New CC/i));

    const input = await screen.findByPlaceholderText(/Search charge codes/i);
    fireEvent.change(input, { target: { value: 'Internal' } });

    await waitFor(() => {
      expect(screen.getByText('Non-billable')).toBeInTheDocument();
    });
  });

  it('should show "Send Request" button disabled when reason is empty', async () => {
    // After selecting a code, should show confirmation with disabled Send Request button
    mockUseQuery.mockReturnValue({
      data: [
        { id: 'PRJ-001', name: 'Project Alpha', level: 'project', programName: null, isBillable: true, ownerId: null },
      ],
      isLoading: false,
    });

    render(<RequestChargeCode />);
    fireEvent.click(screen.getByText(/\+ Request New CC/i));

    const input = await screen.findByPlaceholderText(/Search charge codes/i);
    fireEvent.change(input, { target: { value: 'Alpha' } });

    await waitFor(() => {
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    });

    // Click on the result to select it
    fireEvent.click(screen.getByText('Project Alpha'));

    await waitFor(() => {
      const sendBtn = screen.getByText('Send Request');
      expect(sendBtn).toBeDisabled();
    });
  });
});
