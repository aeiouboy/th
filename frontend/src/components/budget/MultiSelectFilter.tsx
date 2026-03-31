'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

interface FilterOption {
  id: string;
  label: string;
}

interface MultiSelectFilterProps {
  options: FilterOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  label?: string;
}

export function MultiSelectFilter({
  options,
  selected,
  onChange,
  label = 'Programs',
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const allSelected = selected.length === options.length;
  const noneSelected = selected.length === 0;

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const selectAll = () => onChange(options.map((o) => o.id));
  const clearAll = () => onChange([]);

  const selectedLabels = options
    .filter((o) => selected.includes(o.id))
    .map((o) => o.label);

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] text-sm text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
      >
        <span className="text-[var(--text-muted)] text-xs font-medium">{label}:</span>
        {noneSelected ? (
          <span className="text-[var(--text-muted)]">None selected</span>
        ) : allSelected ? (
          <span>All ({options.length})</span>
        ) : (
          <span>
            {selected.length} of {options.length}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Selected chips */}
      {!allSelected && !noneSelected && selected.length <= 5 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedLabels.map((label) => {
            const opt = options.find((o) => o.label === label);
            if (!opt) return null;
            return (
              <span
                key={opt.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--accent-teal)]/10 text-[var(--accent-teal)] text-xs font-medium"
              >
                {label}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggle(opt.id); }}
                  className="hover:bg-[var(--accent-teal)]/20 rounded-full p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-72 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] shadow-lg">
          {/* Actions */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-default)]">
            <span className="text-xs text-[var(--text-muted)]">
              Showing {selected.length} of {options.length} {label.toLowerCase()}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-[var(--accent-teal)] hover:underline cursor-pointer"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-[var(--text-muted)] hover:underline cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="max-h-60 overflow-y-auto py-1">
            {options.map((opt) => {
              const isSelected = selected.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggle(opt.id)}
                  className={`
                    w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left
                    hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer
                    ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}
                  `}
                >
                  <div className={`
                    w-4 h-4 rounded border flex items-center justify-center shrink-0
                    ${isSelected
                      ? 'bg-[var(--accent-teal)] border-[var(--accent-teal)]'
                      : 'border-[var(--border-default)]'
                    }
                  `}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="truncate">{opt.label}</span>
                  <span className="ml-auto text-[10px] text-[var(--text-muted)] font-[family-name:var(--font-mono)]">
                    {opt.id}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
