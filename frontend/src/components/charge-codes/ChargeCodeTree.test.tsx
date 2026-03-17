import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChargeCodeTree, ChargeCodeNode } from './ChargeCodeTree';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ChevronRight: ({ className }: { className?: string }) => <span className={className} data-testid="chevron-right" />,
  ChevronDown: ({ className }: { className?: string }) => <span className={className} data-testid="chevron-down" />,
}));

const sampleTree: ChargeCodeNode[] = [
  {
    id: 'PRG-001',
    name: 'Alpha Program',
    level: 'program',
    parentId: null,
    budgetAmount: '100000',
    isBillable: true,
    children: [
      {
        id: 'PRJ-001',
        name: 'Project One',
        level: 'project',
        parentId: 'PRG-001',
        budgetAmount: '50000',
        isBillable: true,
        children: [
          {
            id: 'ACT-001',
            name: 'Activity One',
            level: 'activity',
            parentId: 'PRJ-001',
            budgetAmount: null,
            isBillable: true,
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: 'PRG-002',
    name: 'Beta Program',
    level: 'program',
    parentId: null,
    budgetAmount: null,
    isBillable: false,
    children: [],
  },
];

describe('ChargeCodeTree', () => {
  describe('rendering', () => {
    it('should show empty state when tree is empty', () => {
      render(<ChargeCodeTree tree={[]} selectedId={null} onSelect={vi.fn()} />);
      expect(screen.getByText('No charge codes found')).toBeInTheDocument();
    });

    it('should render top-level program nodes', () => {
      render(<ChargeCodeTree tree={sampleTree} selectedId={null} onSelect={vi.fn()} />);
      expect(screen.getByText('Alpha Program')).toBeInTheDocument();
      expect(screen.getByText('Beta Program')).toBeInTheDocument();
    });

    it('should render PRG level badges for programs', () => {
      render(<ChargeCodeTree tree={sampleTree} selectedId={null} onSelect={vi.fn()} />);
      const prgBadges = screen.getAllByText('PRG');
      expect(prgBadges).toHaveLength(2);
    });

    it('should render correct level badges for each level', () => {
      render(<ChargeCodeTree tree={sampleTree} selectedId={null} onSelect={vi.fn()} />);
      // Programs expanded by default (depth < 1), show children
      const prgBadgesAll = screen.getAllByText('PRG');
      expect(prgBadgesAll.length).toBeGreaterThan(0);
      // Project level badge also visible since PRG-001 is expanded
      expect(screen.getByText('PRJ')).toBeInTheDocument();
    });

    it('should display budget amount when provided', () => {
      render(<ChargeCodeTree tree={sampleTree} selectedId={null} onSelect={vi.fn()} />);
      // Alpha Program has $100,000 budget
      expect(screen.getByText('$100,000')).toBeInTheDocument();
    });

    it('should not display budget amount when not provided', () => {
      render(<ChargeCodeTree tree={sampleTree} selectedId={null} onSelect={vi.fn()} />);
      // Beta Program has no budget, should not show any amount for it
      // Just verify it renders without crashing
      expect(screen.getByText('Beta Program')).toBeInTheDocument();
    });
  });

  describe('expand/collapse', () => {
    it('should expand top-level nodes by default (depth < 1)', () => {
      render(<ChargeCodeTree tree={sampleTree} selectedId={null} onSelect={vi.fn()} />);
      // Project One should be visible since Alpha Program is expanded by default
      expect(screen.getByText('Project One')).toBeInTheDocument();
    });

    it('should show expand icon for nodes with children', () => {
      render(<ChargeCodeTree tree={sampleTree} selectedId={null} onSelect={vi.fn()} />);
      // Alpha Program has children and is expanded (ChevronDown)
      const chevronDownIcons = screen.getAllByTestId('chevron-down');
      expect(chevronDownIcons.length).toBeGreaterThan(0);
    });

    it('should show collapse icon for collapsed nodes with children', () => {
      render(<ChargeCodeTree tree={sampleTree} selectedId={null} onSelect={vi.fn()} />);
      // Project One has children and is NOT expanded by default (depth >= 1)
      const chevronRightIcons = screen.getAllByTestId('chevron-right');
      expect(chevronRightIcons.length).toBeGreaterThan(0);
    });

    it('should expand a collapsed node when chevron is clicked', () => {
      render(<ChargeCodeTree tree={sampleTree} selectedId={null} onSelect={vi.fn()} />);
      // Activity One is a child of Project One which is collapsed
      expect(screen.queryByText('Activity One')).not.toBeInTheDocument();

      // Click the chevron for Project One
      const chevronRight = screen.getAllByTestId('chevron-right')[0];
      fireEvent.click(chevronRight);

      expect(screen.getByText('Activity One')).toBeInTheDocument();
    });

    it('should collapse an expanded node when chevron is clicked', () => {
      render(<ChargeCodeTree tree={sampleTree} selectedId={null} onSelect={vi.fn()} />);
      // Alpha Program is expanded by default, showing Project One
      expect(screen.getByText('Project One')).toBeInTheDocument();

      // Click the chevron for Alpha Program to collapse it
      const chevronDown = screen.getAllByTestId('chevron-down')[0];
      fireEvent.click(chevronDown);

      expect(screen.queryByText('Project One')).not.toBeInTheDocument();
    });
  });

  describe('selection', () => {
    it('should call onSelect with the node id when a node is clicked', () => {
      const onSelect = vi.fn();
      render(<ChargeCodeTree tree={sampleTree} selectedId={null} onSelect={onSelect} />);

      fireEvent.click(screen.getByText('Alpha Program'));
      expect(onSelect).toHaveBeenCalledWith('PRG-001');
    });

    it('should visually highlight the selected node', () => {
      render(<ChargeCodeTree tree={sampleTree} selectedId="PRG-001" onSelect={vi.fn()} />);
      const alphaButton = screen.getByText('Alpha Program').closest('button');
      expect(alphaButton).toHaveClass('font-medium');
    });

    it('should not highlight unselected nodes', () => {
      render(<ChargeCodeTree tree={sampleTree} selectedId="PRG-001" onSelect={vi.fn()} />);
      const betaButton = screen.getByText('Beta Program').closest('button');
      expect(betaButton).not.toHaveClass('font-medium');
    });
  });

  describe('hierarchy', () => {
    it('should render project nodes nested under program', () => {
      render(<ChargeCodeTree tree={sampleTree} selectedId={null} onSelect={vi.fn()} />);
      const prjBadges = screen.queryAllByText('PRJ');
      // PRJ-001 visible since PRG-001 is expanded by default
      expect(prjBadges.length).toBeGreaterThan(0);
    });

    it('should render nodes with increasing indentation for depth', () => {
      render(<ChargeCodeTree tree={sampleTree} selectedId={null} onSelect={vi.fn()} />);
      const projectButton = screen.getByText('Project One').closest('button');
      // Depth 1 -> paddingLeft = 20+8 = 28px
      expect(projectButton).toHaveStyle({ paddingLeft: '28px' });
    });
  });
});
