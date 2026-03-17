import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EntryNoteDialog } from './EntryNoteDialog';

describe('EntryNoteDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    chargeCodeName: 'PRG-001-DEV',
    date: '2026-03-16',
    description: '',
    onSave: vi.fn(),
  };

  it('should render dialog with correct title containing charge code name and formatted date', () => {
    render(<EntryNoteDialog {...defaultProps} />);
    expect(screen.getByText(/PRG-001-DEV/)).toBeInTheDocument();
    expect(screen.getByText(/Mar 16/)).toBeInTheDocument();
  });

  it('should render Save Note button', () => {
    render(<EntryNoteDialog {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Save Note' })).toBeInTheDocument();
  });

  it('should render Cancel button', () => {
    render(<EntryNoteDialog {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('should call onSave with textarea value when Save Note is clicked', () => {
    const onSave = vi.fn();
    render(<EntryNoteDialog {...defaultProps} onSave={onSave} />);
    const textarea = screen.getByPlaceholderText('Enter a note for this entry...');
    fireEvent.change(textarea, { target: { value: 'Fixed bug in auth module' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Note' }));
    expect(onSave).toHaveBeenCalledWith('Fixed bug in auth module');
  });

  it('should call onOpenChange(false) when Cancel is clicked', () => {
    const onOpenChange = vi.fn();
    render(<EntryNoteDialog {...defaultProps} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should pre-populate textarea with existing description', () => {
    render(<EntryNoteDialog {...defaultProps} description="Existing note" />);
    const textarea = screen.getByPlaceholderText('Enter a note for this entry...');
    expect((textarea as HTMLTextAreaElement).value).toBe('Existing note');
  });

  it('should not render dialog content when open is false', () => {
    render(<EntryNoteDialog {...defaultProps} open={false} />);
    expect(screen.queryByText(/PRG-001-DEV/)).toBeNull();
  });
});
