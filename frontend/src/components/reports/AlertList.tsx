'use client';

import { useState, useMemo, Fragment } from 'react';
import { formatCurrency } from '@/lib/utils';
import { type BudgetAlert, type ChargeabilityAlert, severityColorClass, compareSeverity } from './types';

type AlertFilter = 'all' | 'budget' | 'chargeability';

interface AlertListProps {
  alerts: BudgetAlert[];
  chargeabilityAlerts?: ChargeabilityAlert[];
}

function SeverityDot({ severity }: { severity: string }) {
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${severityColorClass(severity)}`} />;
}

export function AlertList({ alerts, chargeabilityAlerts = [] }: AlertListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'severity' | 'overrun'>('severity');
  const [filter, setFilter] = useState<AlertFilter>(chargeabilityAlerts.length > 0 ? 'all' : 'budget');

  const hasChargeabilityAlerts = chargeabilityAlerts.length > 0;

  const sorted = useMemo(() => {
    return [...alerts].sort((a, b) => {
      if (sortBy === 'severity') {
        return compareSeverity(a.severity, b.severity);
      }
      const overrunA = Math.max(0, a.actual - a.budget);
      const overrunB = Math.max(0, b.actual - b.budget);
      return overrunB - overrunA;
    });
  }, [alerts, sortBy]);

  const sortedChargeability = useMemo(() => {
    return [...chargeabilityAlerts].sort((a, b) => compareSeverity(a.severity, b.severity));
  }, [chargeabilityAlerts]);

  const showBudget = filter === 'all' || filter === 'budget';
  const showChargeability = filter === 'all' || filter === 'chargeability';

  const isEmpty = (showBudget ? sorted.length : 0) + (showChargeability ? sortedChargeability.length : 0) === 0;

  if (sorted.length === 0 && sortedChargeability.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--text-muted)] text-sm">
        No budget alerts - all projects are on track.
      </div>
    );
  }

  return (
    <div>
      {/* Filter tabs */}
      {hasChargeabilityAlerts && (
        <div className="flex gap-1 px-4 pt-3 pb-2">
          {(['all', 'budget', 'chargeability'] as AlertFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                filter === f
                  ? 'bg-[var(--accent-teal)] text-white'
                  : 'bg-stone-100 dark:bg-stone-800 text-[var(--text-secondary)] hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              {f === 'all' ? `All (${sorted.length + sortedChargeability.length})` :
               f === 'budget' ? `Budget (${sorted.length})` :
               `Chargeability (${sortedChargeability.length})`}
            </button>
          ))}
        </div>
      )}

      {isEmpty ? (
        <div className="text-center py-8 text-[var(--text-muted)] text-sm">
          No alerts in this category.
        </div>
      ) : (
        <div className="overflow-x-auto">
          {/* Budget alerts table */}
          {showBudget && sorted.length > 0 && (
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
                      <td className="px-4 py-2.5 text-right text-xs text-[var(--text-primary)]">
                        {formatCurrency(alert.budget)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-[var(--text-primary)]">
                        {formatCurrency(alert.actual)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {(() => {
                          const overrunAmount = Math.max(0, alert.actual - alert.budget);
                          const overrunPercent = alert.budget > 0
                            ? Math.round(((alert.actual - alert.budget) / alert.budget) * 100)
                            : 0;
                          return overrunAmount > 0 ? (
                            <span className="text-[var(--accent-red)] font-medium text-xs">
                              +{formatCurrency(overrunAmount)} ({overrunPercent > 0 ? '+' : ''}{overrunPercent}%)
                            </span>
                          ) : (
                            <span className="text-[var(--accent-amber)] font-medium text-xs">
                              {alert.budget > 0 ? Math.round((alert.actual / alert.budget) * 100) : 0}%
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-[var(--text-muted)]">
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
          )}

          {/* Chargeability alerts table */}
          {showChargeability && sortedChargeability.length > 0 && (
            <>
              {showBudget && sorted.length > 0 && (
                <div className="px-4 py-3 border-b border-[var(--border-default)] bg-stone-50 dark:bg-stone-900">
                  <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    Chargeability Alerts
                  </span>
                </div>
              )}
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-default)] bg-stone-50 dark:bg-stone-900">
                    <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                      Current %
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                      Target %
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                      Gap
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                      Cost Impact
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedChargeability.map((alert, idx) => (
                    <tr
                      key={alert.employeeId}
                      className={`border-b border-[var(--border-default)] ${
                        idx % 2 === 0 ? 'bg-[var(--bg-card)]' : 'bg-stone-50 dark:bg-stone-900/50'
                      }`}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <SeverityDot severity={alert.severity} />
                          <span className="capitalize text-[var(--text-secondary)] text-xs">
                            {alert.severity}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">
                        {alert.name}
                      </td>
                      <td className={`px-4 py-2.5 text-right text-xs font-medium ${
                        alert.chargeability < 60 ? 'text-[var(--accent-red)]' :
                        alert.chargeability < 70 ? 'text-[var(--accent-amber)]' :
                        'text-[var(--text-primary)]'
                      }`}>
                        {alert.chargeability.toFixed(1)}%
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-[var(--text-muted)]">
                        {alert.target}%
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-[var(--accent-red)] font-medium">
                        -{(alert.target - alert.chargeability).toFixed(1)}%
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-[var(--accent-red)] font-medium">
                        {formatCurrency(alert.costImpact)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}
