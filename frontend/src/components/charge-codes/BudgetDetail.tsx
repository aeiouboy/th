'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/lib/currency';

interface BudgetNode {
  id: string;
  name: string;
  level: string | null;
  budget: number;
  actual: number;
  variance: number;
  percentage: number;
  children: BudgetNode[];
}

interface TeamBreakdownItem {
  name: string;
  hours: number;
  cost: number;
  percentage: number;
}

interface PersonBreakdownItem {
  userId: string;
  name: string;
  hours: number;
  cost: number;
  percentage: number;
}

interface BudgetDetailData {
  budget: number;
  actual: number;
  variance: number;
  percentage: number;
  children: BudgetNode[];
  teamBreakdown: TeamBreakdownItem[];
  personBreakdown: PersonBreakdownItem[];
}

function getProgressColor(percentage: number): string {
  if (percentage > 100) return 'bg-[var(--accent-red)]';
  if (percentage >= 80) return 'bg-[var(--accent-amber)]';
  return 'bg-[var(--accent-green)]';
}

function getProgressTextColor(percentage: number): string {
  if (percentage > 100) return 'text-[var(--accent-red)]';
  if (percentage >= 80) return 'text-[var(--accent-amber)]';
  return 'text-[var(--accent-green)]';
}

function BudgetTreeNode({ node, depth = 0 }: { node: BudgetNode; depth?: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children.length > 0;
  const { formatCurrency } = useCurrency();

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 py-1.5 px-2 text-sm hover:bg-[var(--bg-card-hover)] rounded transition-colors',
          depth % 2 === 1 && 'bg-stone-50/50 dark:bg-stone-900/30',
        )}
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 rounded p-0.5 hover:bg-stone-200 transition-colors"
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
            )}
          </button>
        ) : (
          <span className="w-[18px] shrink-0" />
        )}

        <span className="font-mono text-xs text-[var(--text-muted)] shrink-0 w-16">{node.id}</span>
        <span className="truncate text-[var(--text-primary)] flex-1">{node.name}</span>

        <div className="flex items-center gap-3 shrink-0">
          <div className="w-24">
            <div className="h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
              <div
                className={cn('h-full rounded-full transition-all', getProgressColor(node.percentage))}
                style={{ width: `${Math.min(100, node.percentage)}%` }}
              />
            </div>
          </div>
          <span className={cn('text-xs font-mono w-12 text-right', getProgressTextColor(node.percentage))}>
            {node.percentage}%
          </span>
          <span className="text-xs font-mono text-[var(--text-secondary)] w-20 text-right">
            {formatCurrency(node.actual)}
          </span>
          <span className="text-xs font-mono text-[var(--text-muted)] w-20 text-right">
            / {formatCurrency(node.budget)}
          </span>
        </div>
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <BudgetTreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function BudgetDetail({ chargeCodeId }: { chargeCodeId: string }) {
  const { formatCurrency } = useCurrency();
  const [showPersons, setShowPersons] = useState(false);

  const { data, isLoading } = useQuery<BudgetDetailData>({
    queryKey: ['charge-codes', chargeCodeId, 'budget-detail'],
    queryFn: () => api.get(`/charge-codes/${chargeCodeId}/budget-detail`),
    enabled: !!chargeCodeId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 bg-stone-100 dark:bg-stone-800 rounded" />
        ))}
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-[var(--text-muted)] text-center py-4">No budget data available</p>;
  }

  return (
    <div className="space-y-5">
      {/* Top-level summary */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <dt className="text-xs text-[var(--text-muted)] font-medium">Total Budget</dt>
          <dd className="text-sm font-medium text-[var(--text-primary)]">{formatCurrency(data.budget)}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--text-muted)] font-medium">Actual Spent</dt>
          <dd className="text-sm font-medium text-[var(--text-primary)]">{formatCurrency(data.actual)}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--text-muted)] font-medium">Variance</dt>
          <dd className={cn('text-sm font-medium', data.variance >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]')}>
            {formatCurrency(data.variance)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--text-muted)] font-medium">Usage</dt>
          <dd className={cn('text-sm font-medium', getProgressTextColor(data.percentage))}>
            {data.percentage}%
          </dd>
        </div>
      </div>

      {/* Progress bar */}
      {data.budget > 0 && (
        <div>
          <div className="h-3 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
            <div
              className={cn('h-full rounded-full transition-all', getProgressColor(data.percentage))}
              style={{ width: `${Math.min(100, data.percentage)}%` }}
            />
          </div>
        </div>
      )}

      {/* Budget tree */}
      {data.children.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
            Budget Breakdown
          </h4>
          <div className="rounded-md border border-[var(--border-default)] overflow-hidden">
            {data.children.map((child) => (
              <BudgetTreeNode key={child.id} node={child} />
            ))}
          </div>
        </div>
      )}

      {/* Team/Person Breakdown */}
      {(data.teamBreakdown.length > 0 || data.personBreakdown.length > 0) && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
              {showPersons ? 'Person Breakdown' : 'Team Breakdown'}
            </h4>
            <button
              onClick={() => setShowPersons(!showPersons)}
              className="text-xs text-[var(--accent-teal)] hover:underline"
            >
              Show {showPersons ? 'by team' : 'by person'}
            </button>
          </div>

          <div className="rounded-md border border-[var(--border-default)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-stone-50 dark:bg-stone-900/50">
                  <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-muted)]">
                    {showPersons ? 'Person' : 'Team'}
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-[var(--text-muted)]">Hours</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-[var(--text-muted)]">Cost</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-[var(--text-muted)]">%</th>
                </tr>
              </thead>
              <tbody>
                {(showPersons ? data.personBreakdown : data.teamBreakdown).map((item, i) => (
                  <tr
                    key={showPersons ? (item as PersonBreakdownItem).userId : item.name}
                    className={cn(
                      'border-b border-[var(--border-default)] last:border-b-0',
                      i % 2 === 1 && 'bg-stone-50/50 dark:bg-stone-900/30',
                    )}
                  >
                    <td className="px-3 py-2 text-[var(--text-primary)]">{item.name}</td>
                    <td className="px-3 py-2 text-right font-mono text-[var(--text-secondary)]">{item.hours}</td>
                    <td className="px-3 py-2 text-right font-mono text-[var(--text-secondary)]">{formatCurrency(item.cost)}</td>
                    <td className="px-3 py-2 text-right font-mono text-[var(--text-secondary)]">{item.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
