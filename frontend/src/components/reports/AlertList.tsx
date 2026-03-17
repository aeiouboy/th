'use client';

import { useState, Fragment } from 'react';

interface BudgetAlert {
  chargeCodeId: string;
  name: string;
  budget: number;
  actual: number;
  forecast: number | null;
  severity: string;
  rootCauseActivity: string | null;
}

interface AlertListProps {
  alerts: BudgetAlert[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function SeverityDot({ severity }: { severity: string }) {
  const colorClass =
    severity === 'red'
      ? 'bg-[var(--accent-red)]'
      : severity === 'orange'
        ? 'bg-[var(--accent-amber)]'
        : severity === 'yellow'
          ? 'bg-yellow-500'
          : 'bg-[var(--accent-green)]';

  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${colorClass}`} />;
}

export function AlertList({ alerts }: AlertListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'severity' | 'overrun'>('severity');

  const sorted = [...alerts].sort((a, b) => {
    if (sortBy === 'severity') {
      const order: Record<string, number> = { red: 0, orange: 1, yellow: 2 };
      return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
    }
    const overrunA = Math.max(0, a.actual - a.budget);
    const overrunB = Math.max(0, b.actual - b.budget);
    return overrunB - overrunA;
  });

  if (sorted.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--text-muted)] text-sm">
        No budget alerts - all projects are on track.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border-default)] bg-stone-50 dark:bg-stone-900">
            <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider">
              <button
                onClick={() => setSortBy('severity')}
                className={`hover:text-[var(--text-primary)] transition-colors ${sortBy === 'severity' ? 'underline underline-offset-2' : ''}`}
              >
                Severity
              </button>
            </th>
            <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider">
              Charge Code
            </th>
            <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider">
              Budget
            </th>
            <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider">
              Actual
            </th>
            <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider">
              <button
                onClick={() => setSortBy('overrun')}
                className={`hover:text-[var(--text-primary)] transition-colors ${sortBy === 'overrun' ? 'underline underline-offset-2' : ''}`}
              >
                Overrun
              </button>
            </th>
            <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider">
              Forecast
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((alert, idx) => (
            <Fragment key={alert.chargeCodeId}>
              <tr
                className={`border-b border-[var(--border-default)] cursor-pointer transition-colors hover:bg-[var(--bg-card-hover)] ${
                  idx % 2 === 0 ? 'bg-[var(--bg-card)]' : 'bg-stone-50 dark:bg-stone-900/50'
                }`}
                onClick={() =>
                  setExpandedId(expandedId === alert.chargeCodeId ? null : alert.chargeCodeId)
                }
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <SeverityDot severity={alert.severity} />
                    <span className="capitalize text-[var(--text-secondary)] text-xs">
                      {alert.severity.replace('_', ' ')}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="font-medium text-[var(--text-primary)]">{alert.name}</div>
                  <div className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-mono)]">
                    {alert.chargeCodeId}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right font-[family-name:var(--font-mono)] text-xs text-[var(--text-primary)]">
                  {formatCurrency(alert.budget)}
                </td>
                <td className="px-4 py-2.5 text-right font-[family-name:var(--font-mono)] text-xs text-[var(--text-primary)]">
                  {formatCurrency(alert.actual)}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {(() => {
                    const overrunAmount = Math.max(0, alert.actual - alert.budget);
                    const overrunPercent = alert.budget > 0
                      ? Math.round(((alert.actual - alert.budget) / alert.budget) * 100)
                      : 0;
                    return overrunAmount > 0 ? (
                      <span className="text-[var(--accent-red)] font-medium font-[family-name:var(--font-mono)] text-xs">
                        +{formatCurrency(overrunAmount)} ({overrunPercent > 0 ? '+' : ''}{overrunPercent}%)
                      </span>
                    ) : (
                      <span className="text-[var(--accent-amber)] font-medium font-[family-name:var(--font-mono)] text-xs">
                        {alert.budget > 0 ? Math.round((alert.actual / alert.budget) * 100) : 0}%
                      </span>
                    );
                  })()}
                </td>
                <td className="px-4 py-2.5 text-right font-[family-name:var(--font-mono)] text-xs text-[var(--text-muted)]">
                  {alert.forecast ? formatCurrency(alert.forecast) : '-'}
                </td>
              </tr>
              {expandedId === alert.chargeCodeId && alert.rootCauseActivity && (
                <tr className="border-b border-[var(--border-default)] bg-[var(--accent-red-light)] dark:bg-red-900/10">
                  <td colSpan={6} className="px-4 py-3">
                    <div className="text-xs text-[var(--text-secondary)]">
                      <span className="font-medium text-[var(--accent-red)]">Root cause:</span>{' '}
                      {alert.rootCauseActivity}
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
