import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AccessManager } from './AccessManager';

// Mock API
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue([
      { id: 'u1', email: 'john@company.com', fullName: 'John Doe' },
      { id: 'u2', email: 'jane@company.com', fullName: 'Jane Smith' },
      { id: 'u3', email: 'alex@company.com', fullName: 'Alex Kim' },
    ]),
    put: vi.fn().mockResolvedValue({}),
  },
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  X: () => <span data-testid="x-icon" />,
  Plus: () => <span data-testid="plus-icon" />,
  UserPlus: () => <span data-testid="user-plus-icon" />,
  Search: () => <span data-testid="search-icon" />,
  Check: () => <span data-testid="check-icon" />,
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

// Mock Badge
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
}));

const assignedUsers = [
  { userId: 'u1', email: 'alice@company.com', fullName: 'Alice Smith' },
  { userId: 'u2', email: 'bob@company.com', fullName: 'Bob Jones' },
];

describe('AccessManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render "Assigned Users" heading', () => {
      render(
        <AccessManager
          chargeCodeId="CC-001"
          assignedUsers={assignedUsers}
          onUpdate={vi.fn()}
        />
      );
      expect(screen.getByText('Assigned Users')).toBeInTheDocument();
    });

    it('should render the Add button', () => {
      render(
        <AccessManager
          chargeCodeId="CC-001"
          assignedUsers={assignedUsers}
          onUpdate={vi.fn()}
        />
      );
      expect(screen.getByText('Add')).toBeInTheDocument();
    });

    it('should render assigned user names', () => {
      render(
        <AccessManager
          chargeCodeId="CC-001"
          assignedUsers={assignedUsers}
          onUpdate={vi.fn()}
        />
      );
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    });

    it('should render assigned user emails', () => {
      render(
        <AccessManager
          chargeCodeId="CC-001"
          assignedUsers={assignedUsers}
          onUpdate={vi.fn()}
        />
      );
      expect(screen.getByText('alice@company.com')).toBeInTheDocument();
      expect(screen.getByText('bob@company.com')).toBeInTheDocument();
    });

    it('should show empty state when no users assigned', () => {
      render(
        <AccessManager
          chargeCodeId="CC-001"
          assignedUsers={[]}
          onUpdate={vi.fn()}
        />
      );
      expect(screen.getByText('No users assigned')).toBeInTheDocument();
    });
  });

  describe('add user flow', () => {
    it('should toggle add user panel when Add button is clicked', async () => {
      render(
        <AccessManager
          chargeCodeId="CC-001"
          assignedUsers={assignedUsers}
          onUpdate={vi.fn()}
        />
      );
      fireEvent.click(screen.getByText('Add'));
      await waitFor(() => {
        // New UI shows search input when panel opens
        expect(screen.getByPlaceholderText('Search by name or email...')).toBeInTheDocument();
      });
    });

    it('should show available users in add panel (excludes already assigned)', async () => {
      render(
        <AccessManager
          chargeCodeId="CC-001"
          assignedUsers={assignedUsers}
          onUpdate={vi.fn()}
        />
      );
      fireEvent.click(screen.getByText('Add'));
      // Wait for api.get to resolve
      await waitFor(() => {
        // Alex Kim (u3) is not in assignedUsers (u1=alice, u2=bob), so should appear
        expect(screen.getByText('Alex Kim')).toBeInTheDocument();
      });
    });

    it('should call api.put when a user is added', async () => {
      const { api } = await import('@/lib/api');
      render(
        <AccessManager
          chargeCodeId="CC-001"
          assignedUsers={[]}
          onUpdate={vi.fn()}
        />
      );
      // Open the add panel
      fireEvent.click(screen.getByText('Add'));
      // Wait for user list to render
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      // Click John Doe to select (checkbox toggle)
      fireEvent.click(screen.getByText('John Doe'));
      // Click the "Add (1)" button to confirm
      await waitFor(() => {
        const addBtn = screen.getAllByText(/^Add/).find((el) => el.textContent?.includes('('));
        expect(addBtn).toBeTruthy();
        if (addBtn) fireEvent.click(addBtn);
      });
      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith('/charge-codes/CC-001/access', {
          addUserIds: ['u1'],
        });
      });
    });

    it('should call onUpdate after adding a user', async () => {
      const onUpdate = vi.fn();
      render(
        <AccessManager
          chargeCodeId="CC-001"
          assignedUsers={[]}
          onUpdate={onUpdate}
        />
      );
      // Open the add panel
      fireEvent.click(screen.getByText('Add'));
      // Wait for user list
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      // Select user then confirm
      fireEvent.click(screen.getByText('John Doe'));
      await waitFor(() => {
        const addBtn = screen.getAllByText(/^Add/).find((el) => el.textContent?.includes('('));
        if (addBtn) fireEvent.click(addBtn);
      });
      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalled();
      });
    });
  });

  describe('remove user', () => {
    it('should render remove buttons for each assigned user', () => {
      render(
        <AccessManager
          chargeCodeId="CC-001"
          assignedUsers={assignedUsers}
          onUpdate={vi.fn()}
        />
      );
      const removeButtons = screen.getAllByTestId('x-icon');
      expect(removeButtons.length).toBe(assignedUsers.length);
    });

    it('should call api.put with removeUserIds when remove is clicked', async () => {
      const { api } = await import('@/lib/api');
      render(
        <AccessManager
          chargeCodeId="CC-001"
          assignedUsers={assignedUsers}
          onUpdate={vi.fn()}
        />
      );
      // Click the first remove button
      const removeButtons = screen.getAllByTestId('x-icon');
      fireEvent.click(removeButtons[0].closest('button')!);
      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith('/charge-codes/CC-001/access', {
          removeUserIds: ['u1'],
        });
      });
    });
  });
});
