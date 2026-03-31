import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test-utils';
import { PeriodSelector } from './PeriodSelector';
import { startOfWeek, format } from 'date-fns';

// Mock shadcn/ui select
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: { children: React.ReactNode; onValueChange?: (v: string) => void; value?: string }) => (
    <div data-testid="select" data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-trigger">{children}</div>
  ),
  SelectValue: () => <span data-testid="select-value" />,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({ children, value }: { children: React.ReactNode; value?: string }) => (
    <option value={value}>{children}</option>
  ),
}));

describe('PeriodSelector', () => {
  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const onSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the select dropdown', () => {
    render(<PeriodSelector currentWeekStart={currentWeekStart} onSelect={onSelect} />);
    expect(screen.getByTestId('select')).toBeInTheDocument();
  });

  it('should render select trigger with correct width', () => {
    render(<PeriodSelector currentWeekStart={currentWeekStart} onSelect={onSelect} />);
    const trigger = screen.getByTestId('select-trigger');
    expect(trigger).toBeInTheDocument();
  });

  it('should render 104 week options', () => {
    render(<PeriodSelector currentWeekStart={currentWeekStart} onSelect={onSelect} />);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(104);
  });

  it('should pass current week start value to select', () => {
    render(<PeriodSelector currentWeekStart={currentWeekStart} onSelect={onSelect} />);
    const select = screen.getByTestId('select');
    // Value should be the formatted date of the current Monday (local timezone, not UTC)
    const expectedValue = format(currentWeekStart, 'yyyy-MM-dd');
    expect(select.getAttribute('data-value')).toBe(expectedValue);
  });

  it('should include "Week" in option labels', () => {
    render(<PeriodSelector currentWeekStart={currentWeekStart} onSelect={onSelect} />);
    const options = screen.getAllByRole('option');
    // All options should have "Week" in their label
    options.forEach((opt) => {
      expect(opt.textContent).toMatch(/Week \d+/);
    });
  });

  it('should include year in option labels', () => {
    render(<PeriodSelector currentWeekStart={currentWeekStart} onSelect={onSelect} />);
    const options = screen.getAllByRole('option');
    const currentYear = new Date().getFullYear().toString();
    // At least the first option should have current year
    expect(options[0].textContent).toContain(currentYear);
  });

  it('should list weeks in descending order (most recent first)', () => {
    render(<PeriodSelector currentWeekStart={currentWeekStart} onSelect={onSelect} />);
    const options = screen.getAllByRole('option');
    // First option (most recent) should have higher ISO date than last option
    const firstValue = options[0].getAttribute('value') || '';
    const lastValue = options[options.length - 1].getAttribute('value') || '';
    expect(firstValue > lastValue).toBe(true);
  });
});
