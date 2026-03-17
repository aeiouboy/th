import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EntryCell } from './EntryCell';

describe('EntryCell', () => {
  describe('disabled state (weekend/holiday)', () => {
    it('should render disabled cell with dash when value is 0', () => {
      render(<EntryCell value={0} onChange={vi.fn()} disabled />);
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('should render disabled cell with formatted value when value > 0', () => {
      render(<EntryCell value={4} onChange={vi.fn()} disabled />);
      expect(screen.getByText('4.00')).toBeInTheDocument();
    });

    it('should not render an interactive button when disabled', () => {
      render(<EntryCell value={0} onChange={vi.fn()} disabled />);
      // Should be a div, not a button
      expect(screen.queryByRole('button')).toBeNull();
    });
  });

  describe('empty state (not editing)', () => {
    it('should render empty string when value is 0', () => {
      render(<EntryCell value={0} onChange={vi.fn()} />);
      const button = screen.getByRole('button');
      expect(button.textContent).toBe('');
    });

    it('should render formatted value when value > 0', () => {
      render(<EntryCell value={8} onChange={vi.fn()} />);
      expect(screen.getByText('8.00')).toBeInTheDocument();
    });
  });

  describe('focus/editing behavior', () => {
    it('should switch to input mode when button is clicked', () => {
      render(<EntryCell value={0} onChange={vi.fn()} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should populate input with current value on focus when value > 0', () => {
      render(<EntryCell value={4.5} onChange={vi.fn()} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      const input = screen.getByRole('textbox');
      expect((input as HTMLInputElement).value).toBe('4.50');
    });

    it('should show empty input on focus when value is 0', () => {
      render(<EntryCell value={0} onChange={vi.fn()} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      const input = screen.getByRole('textbox');
      expect((input as HTMLInputElement).value).toBe('');
    });

    it('should call onChange with parsed value on blur', () => {
      const onChange = vi.fn();
      render(<EntryCell value={0} onChange={onChange} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '6.5' } });
      fireEvent.blur(input);
      expect(onChange).toHaveBeenCalledWith(6.5);
    });

    it('should call onChange with 0 on blur when input is invalid', () => {
      const onChange = vi.fn();
      render(<EntryCell value={0} onChange={onChange} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'abc' } });
      fireEvent.blur(input);
      expect(onChange).toHaveBeenCalledWith(0);
    });

    it('should cap value at 24 when entered value exceeds 24', () => {
      const onChange = vi.fn();
      render(<EntryCell value={0} onChange={onChange} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '30' } });
      fireEvent.blur(input);
      expect(onChange).toHaveBeenCalledWith(24);
    });

    it('should call onChange with 0 when negative value entered', () => {
      const onChange = vi.fn();
      render(<EntryCell value={0} onChange={onChange} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '-3' } });
      fireEvent.blur(input);
      expect(onChange).toHaveBeenCalledWith(0);
    });
  });

  describe('keyboard navigation', () => {
    it('should call onNavigate with "right" when Tab is pressed', () => {
      const onNavigate = vi.fn();
      render(<EntryCell value={0} onChange={vi.fn()} onNavigate={onNavigate} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Tab' });
      expect(onNavigate).toHaveBeenCalledWith('right');
    });

    it('should call onNavigate with "down" when Enter is pressed', () => {
      const onNavigate = vi.fn();
      render(<EntryCell value={0} onChange={vi.fn()} onNavigate={onNavigate} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onNavigate).toHaveBeenCalledWith('down');
    });

    it('should exit editing mode on Escape', () => {
      render(<EntryCell value={0} onChange={vi.fn()} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Escape' });
      // After escape, should return to button
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('billable styling', () => {
    it('should apply billable class when isBillable is true and value > 0', () => {
      render(<EntryCell value={8} onChange={vi.fn()} isBillable={true} />);
      const button = screen.getByRole('button');
      // Teal color class should be applied
      expect(button.className).toContain('teal');
    });
  });

  describe('note icon', () => {
    it('should show note icon on hover when value > 0', () => {
      render(<EntryCell value={4} onChange={vi.fn()} />);
      const container = screen.getByRole('button').closest('div');
      fireEvent.mouseEnter(container!);
      const noteButton = screen.queryByTitle('Add note');
      expect(noteButton).toBeTruthy();
    });

    it('should not show note icon on hover when value is 0', () => {
      render(<EntryCell value={0} onChange={vi.fn()} />);
      const container = screen.getByRole('button').closest('div');
      fireEvent.mouseEnter(container!);
      expect(screen.queryByTitle('Add note')).toBeNull();
    });
  });
});
