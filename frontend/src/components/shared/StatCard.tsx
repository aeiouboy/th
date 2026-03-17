'use client';

import type { LucideIcon } from 'lucide-react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  accent?: string;
  trend?: { value: string; direction: 'up' | 'down' };
}

export function StatCard({ label, value, subtext, icon: Icon, accent, trend }: StatCardProps) {
  const accentColor = accent || 'var(--accent-teal)';

  return (
    <div className="relative bg-[var(--bg-card)] rounded-xl shadow-[var(--shadow-sm)] border border-[var(--border-subtle)] p-5 overflow-hidden">
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: accentColor }}
      />

      {/* Icon */}
      {Icon && (
        <div className="absolute top-4 right-4 flex items-center justify-center w-9 h-9 rounded-full bg-[var(--bg-subtle)]">
          <Icon className="w-4 h-4 text-[var(--text-muted)]" />
        </div>
      )}

      {/* Label */}
      <p className="text-[11px] font-medium tracking-wide text-[var(--text-muted)]">
        {label}
      </p>

      {/* Value */}
      <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
        {value}
      </p>

      {/* Subtext & Trend */}
      <div className="flex items-center gap-2 mt-1">
        {trend && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-medium ${
              trend.direction === 'up' ? 'text-emerald-600' : 'text-red-500'
            }`}
          >
            {trend.direction === 'up' ? (
              <ArrowUp className="w-3 h-3" />
            ) : (
              <ArrowDown className="w-3 h-3" />
            )}
            {trend.value}
          </span>
        )}
        {subtext && (
          <span className="text-xs text-[var(--text-secondary)]">{subtext}</span>
        )}
      </div>
    </div>
  );
}
