import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimesheetGrid, GridData } from './TimesheetGrid';

// Mock @base-ui/react components used by Badge
vi.mock('@base-ui/react/merge-props', () => ({ mergeProps: (...args: Record<string, unknown>[]) => Object.assign({}, ...args) }));
vi.mock('@base-ui/react/use-render', () => ({
  useRender: ({ defaultTagName: Tag = 'span', props }: { defaultTagName?: string; props: Record<string, unknown> }) => {
    const { slot: _slot, variant: _variant, ...rest } = props;
    return <Tag {...rest} />;
  },
}));

// Mock EntryCell to avoid complex interactions
vi.mock('./EntryCell', () => ({
  EntryCell: ({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) => (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      disabled={disabled}
      data-testid="entry-cell"
    />
  ),
}));

const WEEK_START = new Date('2026-03-09'); // Monday

const defaultRows = [
  { chargeCodeId: 'PRJ-001', name: 'Project Alpha', isBillable: true },
  { chargeCodeId: 'PRJ-002', name: 'Project Beta', isBillable: false },
];

const defaultData: GridData = {
  'PRJ-001': {
    '2026-03-09': 8,
    '2026-03-10': 8,
    '2026-03-11': 8,
    '2026-03-12': 8,
    '2026-03-13': 8,
  },
  'PRJ-002': {
    '2026-03-09': 4,
    '2026-03-10': 0,
  },
};

describe('TimesheetGrid', () => {
  describe('rendering', () => {
    it('should render the charge code column header', () => {
      render(
        <TimesheetGrid
          weekStart={WEEK_START}
          rows={defaultRows}
          data={defaultData}
          onCellChange={vi.fn()}
        />
      );
      expect(screen.getByText('Charge Code')).toBeInTheDocument();
    });

    it('should render day headers (Mon through Sun)', () => {
      render(
        <TimesheetGrid
          weekStart={WEEK_START}
          rows={defaultRows}
          data={defaultData}
          onCellChange={vi.fn()}
        />
      );
      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getByText('Tue')).toBeInTheDocument();
      expect(screen.getByText('Wed')).toBeInTheDocument();
      expect(screen.getByText('Thu')).toBeInTheDocument();
      expect(screen.getByText('Fri')).toBeInTheDocument();
      expect(screen.getByText('Sat')).toBeInTheDocument();
      expect(screen.getByText('Sun')).toBeInTheDocument();
    });

    it('should render charge code names in rows', () => {
      render(
        <TimesheetGrid
          weekStart={WEEK_START}
          rows={defaultRows}
          data={defaultData}
          onCellChange={vi.fn()}
        />
      );
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      expect(screen.getByText('Project Beta')).toBeInTheDocument();
    });

    it('should render charge code IDs', () => {
      render(
        <TimesheetGrid
          weekStart={WEEK_START}
          rows={defaultRows}
          data={defaultData}
          onCellChange={vi.fn()}
        />
      );
      expect(screen.getByText('PRJ-001')).toBeInTheDocument();
      expect(screen.getByText('PRJ-002')).toBeInTheDocument();
    });

    it('should show empty state message when no rows', () => {
      render(
        <TimesheetGrid
          weekStart={WEEK_START}
          rows={[]}
          data={{}}
          onCellChange={vi.fn()}
        />
      );
      expect(screen.getByText(/No charge codes added/i)).toBeInTheDocument();
    });

    it('should render billable badge for billable charge codes', () => {
      render(
        <TimesheetGrid
          weekStart={WEEK_START}
          rows={defaultRows}
          data={defaultData}
          onCellChange={vi.fn()}
        />
      );
      const billableBadges = screen.getAllByText('billable');
      expect(billableBadges).toHaveLength(1);
    });

    it('should render non-billable badge for non-billable charge codes', () => {
      render(
        <TimesheetGrid
          weekStart={WEEK_START}
          rows={defaultRows}
          data={defaultData}
          onCellChange={vi.fn()}
        />
      );
      const nbBadges = screen.getAllByText('non-billable');
      expect(nbBadges).toHaveLength(1);
    });
  });

  describe('daily totals', () => {
    it('should display Daily Total label in footer', () => {
      render(
        <TimesheetGrid
          weekStart={WEEK_START}
          rows={defaultRows}
          data={defaultData}
          onCellChange={vi.fn()}
        />
      );
      expect(screen.getByText('Daily Total')).toBeInTheDocument();
    });

    it('should calculate correct daily total for Monday (8 + 4 = 12)', () => {
      render(
        <TimesheetGrid
          weekStart={WEEK_START}
          rows={defaultRows}
          data={defaultData}
          onCellChange={vi.fn()}
        />
      );
      // PRJ-001: 8h + PRJ-002: 4h = 12h on Monday
      expect(screen.getByText('12.00')).toBeInTheDocument();
    });

    it('should display Required row', () => {
      render(
        <TimesheetGrid
          weekStart={WEEK_START}
          rows={defaultRows}
          data={defaultData}
          onCellChange={vi.fn()}
        />
      );
      expect(screen.getByText('Required')).toBeInTheDocument();
    });

    it('should display Variance row', () => {
      render(
        <TimesheetGrid
          weekStart={WEEK_START}
          rows={defaultRows}
          data={defaultData}
          onCellChange={vi.fn()}
        />
      );
      expect(screen.getByText('Variance')).toBeInTheDocument();
    });
  });

  describe('variance indicators', () => {
    it('should show negative variance for days under 8 hours', () => {
      const sparseData: GridData = {
        'PRJ-001': { '2026-03-09': 6 }, // 6h on Monday, -2 variance
      };
      render(
        <TimesheetGrid
          weekStart={WEEK_START}
          rows={[defaultRows[0]]}
          data={sparseData}
          onCellChange={vi.fn()}
        />
      );
      // -2.0 should appear in variance row
      expect(screen.getByText('-2.0')).toBeInTheDocument();
    });

    it('should show checkmark for days meeting target hours', () => {
      const fullData: GridData = {
        'PRJ-001': {
          '2026-03-09': 8,
          '2026-03-10': 8,
          '2026-03-11': 8,
          '2026-03-12': 8,
          '2026-03-13': 8,
        },
      };
      render(
        <TimesheetGrid
          weekStart={WEEK_START}
          rows={[defaultRows[0]]}
          data={fullData}
          onCellChange={vi.fn()}
        />
      );
      // Checkmarks (✓) should appear for days that meet the 8h target
      const checkmarks = screen.getAllByText('✓');
      expect(checkmarks.length).toBeGreaterThan(0);
    });
  });

  describe('row totals', () => {
    it('should display Total column header', () => {
      render(
        <TimesheetGrid
          weekStart={WEEK_START}
          rows={defaultRows}
          data={defaultData}
          onCellChange={vi.fn()}
        />
      );
      expect(screen.getByText('TOTAL')).toBeInTheDocument();
    });
  });

  describe('remove row button', () => {
    it('should show remove button when onRemoveRow is provided and not disabled', () => {
      render(
        <TimesheetGrid
          weekStart={WEEK_START}
          rows={defaultRows}
          data={defaultData}
          onCellChange={vi.fn()}
          onRemoveRow={vi.fn()}
        />
      );
      const removeButtons = screen.getAllByTitle('Remove row');
      expect(removeButtons).toHaveLength(2);
    });

    it('should not show remove button when disabled', () => {
      render(
        <TimesheetGrid
          weekStart={WEEK_START}
          rows={defaultRows}
          data={defaultData}
          onCellChange={vi.fn()}
          onRemoveRow={vi.fn()}
          disabled={true}
        />
      );
      expect(screen.queryByTitle('Remove row')).not.toBeInTheDocument();
    });
  });
});
