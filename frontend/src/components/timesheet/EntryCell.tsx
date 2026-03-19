'use client';

import { useRef, useState, useCallback } from 'react';

interface EntryCellProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  isBillable?: boolean;
  onNavigate?: (direction: 'right' | 'down') => void;
  description?: string;
  onNoteClick?: () => void;
}

export function EntryCell({ value, onChange, disabled, isBillable, onNavigate, description, onNoteClick }: EntryCellProps) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState('');
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFocus = useCallback(() => {
    setEditing(true);
    setLocalValue(value > 0 ? value.toFixed(2) : '');
  }, [value]);

  const commit = useCallback(() => {
    setEditing(false);
    const parsed = parseFloat(localValue);
    if (isNaN(parsed) || parsed < 0) {
      onChange(0);
    } else if (parsed > 24) {
      onChange(24);
    } else {
      onChange(Math.round(parsed * 100) / 100);
    }
  }, [localValue, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Tab') {
        commit();
        onNavigate?.('right');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        commit();
        onNavigate?.('down');
      } else if (e.key === 'Escape') {
        setEditing(false);
        setLocalValue('');
      }
    },
    [commit, onNavigate],
  );

  if (disabled) {
    return (
      <div className="h-9 w-full flex items-center justify-center bg-stone-100 dark:bg-stone-800 text-[var(--text-muted)] font-[family-name:var(--font-mono)] text-sm rounded">
        {value > 0 ? value.toFixed(2) : '-'}
      </div>
    );
  }

  return editing ? (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      autoFocus
      className="h-9 w-full text-center font-[family-name:var(--font-mono)] text-sm border-2 border-[var(--border-focus)] rounded bg-[var(--bg-card)] outline-none focus:ring-2 focus:ring-[var(--accent-teal-light)] px-1 transition-colors duration-100"
    />
  ) : (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={handleFocus}
        onFocus={handleFocus}
        className={`h-9 w-full text-center font-[family-name:var(--font-mono)] text-sm rounded cursor-text px-1 transition-all duration-100 ${
          value > 0
            ? `border border-[var(--border-default)] bg-[var(--bg-card)] ${isBillable ? 'text-[var(--accent-teal)] font-medium' : 'text-[var(--text-primary)]'}`
            : 'border border-dashed border-stone-300 dark:border-stone-600 bg-[var(--bg-card)] text-[var(--text-muted)] hover:border-[var(--accent-teal)]'
        }`}
      >
        {value > 0 ? value.toFixed(2) : ''}
      </button>
      {/* Note indicator — colored corner triangle when has note, subtle icon on hover */}
      {value > 0 && description && (
        <button
          type="button"
          className="absolute top-0 right-0 w-0 h-0 border-t-[10px] border-r-[10px] border-b-0 border-l-0 border-t-[var(--accent-amber)] border-r-[var(--accent-amber)] border-b-transparent border-l-transparent rounded-tr cursor-pointer"
          style={{ borderStyle: 'solid' }}
          title="Edit note"
          onClick={(e) => { e.stopPropagation(); onNoteClick?.(); }}
        />
      )}
      {value > 0 && !description && hovered && (
        <button
          type="button"
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[var(--accent-teal)] text-white flex items-center justify-center shadow-sm opacity-80 hover:opacity-100 transition-opacity"
          title="Add note"
          onClick={(e) => { e.stopPropagation(); onNoteClick?.(); }}
        >
          <NoteIcon />
        </button>
      )}
    </div>
  );
}

function NoteIcon() {
  return (
    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" /><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838.838-2.872a2 2 0 0 1 .506-.854z" />
    </svg>
  );
}
