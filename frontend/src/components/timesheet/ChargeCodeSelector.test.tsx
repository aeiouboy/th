import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChargeCodeSelector } from './ChargeCodeSelector';

// Mock shadcn/ui Select components
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange }: { children?: React.ReactNode; onValueChange?: (v: string) => void }) => (
    <div data-testid="select" onClick={() => onValueChange?.('PRJ-042')}>{children}</div>
  ),
  SelectTrigger: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <button className={className} data-testid="select-trigger">{children}</button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span data-testid="select-value">{placeholder}</span>
  ),
  SelectContent: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({ children, value }: { children?: React.ReactNode; value?: string }) => (
    <div data-testid={`select-item-${value}`} data-value={value}>{children}</div>
  ),
}));

// Mock Badge
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
}));

const sampleCodes = [
  { chargeCodeId: 'PRJ-042', name: 'Web Portal', isBillable: true },
  { chargeCodeId: 'ACT-010', name: 'Code Review', isBillable: true },
  { chargeCodeId: 'TSK-005', name: 'Meetings', isBillable: false },
];

describe('ChargeCodeSelector', () => {
  describe('when there are unused codes', () => {
    it('should render the select trigger with placeholder', () => {
      render(
        <ChargeCodeSelector
          availableCodes={sampleCodes}
          usedCodeIds={new Set()}
          onSelect={vi.fn()}
        />
      );
      expect(screen.getByTestId('select-value')).toHaveTextContent('+ Add Charge Code');
    });

    it('should render select items for each unused code', () => {
      render(
        <ChargeCodeSelector
          availableCodes={sampleCodes}
          usedCodeIds={new Set()}
          onSelect={vi.fn()}
        />
      );
      expect(screen.getByTestId('select-item-PRJ-042')).toBeInTheDocument();
      expect(screen.getByTestId('select-item-ACT-010')).toBeInTheDocument();
      expect(screen.getByTestId('select-item-TSK-005')).toBeInTheDocument();
    });

    it('should not render items for already-used codes', () => {
      render(
        <ChargeCodeSelector
          availableCodes={sampleCodes}
          usedCodeIds={new Set(['PRJ-042'])}
          onSelect={vi.fn()}
        />
      );
      expect(screen.queryByTestId('select-item-PRJ-042')).toBeNull();
      expect(screen.getByTestId('select-item-ACT-010')).toBeInTheDocument();
    });

    it('should display charge code IDs in items', () => {
      render(
        <ChargeCodeSelector
          availableCodes={sampleCodes}
          usedCodeIds={new Set()}
          onSelect={vi.fn()}
        />
      );
      expect(screen.getByText('PRJ-042')).toBeInTheDocument();
    });

    it('should display charge code names in items', () => {
      render(
        <ChargeCodeSelector
          availableCodes={sampleCodes}
          usedCodeIds={new Set()}
          onSelect={vi.fn()}
        />
      );
      expect(screen.getByText('Web Portal')).toBeInTheDocument();
    });

    it('should render Billable badge for billable codes', () => {
      render(
        <ChargeCodeSelector
          availableCodes={[{ chargeCodeId: 'PRJ-042', name: 'Web Portal', isBillable: true }]}
          usedCodeIds={new Set()}
          onSelect={vi.fn()}
        />
      );
      expect(screen.getByText('Billable')).toBeInTheDocument();
    });

    it('should render Non-billable badge for non-billable codes', () => {
      render(
        <ChargeCodeSelector
          availableCodes={[{ chargeCodeId: 'TSK-005', name: 'Meetings', isBillable: false }]}
          usedCodeIds={new Set()}
          onSelect={vi.fn()}
        />
      );
      expect(screen.getByText('Non-billable')).toBeInTheDocument();
    });

    it('should call onSelect with code when selection is made', () => {
      const onSelect = vi.fn();
      render(
        <ChargeCodeSelector
          availableCodes={sampleCodes}
          usedCodeIds={new Set()}
          onSelect={onSelect}
        />
      );
      // Click the select to trigger onValueChange with 'PRJ-042'
      const select = screen.getByTestId('select');
      select.click();
      expect(onSelect).toHaveBeenCalledWith(sampleCodes[0]);
    });
  });

  describe('when all codes are used', () => {
    it('should render a message when all codes are in use', () => {
      render(
        <ChargeCodeSelector
          availableCodes={sampleCodes}
          usedCodeIds={new Set(['PRJ-042', 'ACT-010', 'TSK-005'])}
          onSelect={vi.fn()}
        />
      );
      expect(screen.getByText(/all assigned charge codes are in use/i)).toBeInTheDocument();
    });

    it('should not render the select trigger when all codes are used', () => {
      render(
        <ChargeCodeSelector
          availableCodes={sampleCodes}
          usedCodeIds={new Set(['PRJ-042', 'ACT-010', 'TSK-005'])}
          onSelect={vi.fn()}
        />
      );
      expect(screen.queryByTestId('select-trigger')).toBeNull();
    });
  });

  describe('when no codes available', () => {
    it('should render all-in-use message when available codes is empty', () => {
      render(
        <ChargeCodeSelector
          availableCodes={[]}
          usedCodeIds={new Set()}
          onSelect={vi.fn()}
        />
      );
      expect(screen.getByText(/all assigned charge codes are in use/i)).toBeInTheDocument();
    });
  });
});
