'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, AlertTriangle, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface BudgetSummaryResponse {
  totalBudget: number;
  totalActualSpent: number;
  totalForecast: number;
  overallPercentage: number;
  chargeCodesOverBudget: number;
  chargeCodesAtRisk: number;
  totalChargeCodes: number;
}

interface BudgetAlert {
  chargeCodeId: string;
  name: string;
  budget: number;
  actual: number;
  forecast: number | null;
  severity: string;
  rootCauseActivity: string | null;
}

const emptySummary: BudgetSummaryResponse = {
  totalBudget: 0,
  totalActualSpent: 0,
  totalForecast: 0,
  overallPercentage: 0,
  chargeCodesOverBudget: 0,
  chargeCodesAtRisk: 0,
  totalChargeCodes: 0,
};

interface BudgetChild {
  chargeCodeId: string;
  chargeCodeName: string;
  budgetAmount: number;
  actualSpent: number;
  variance: number;
  percentUsed: number;
}

function severityConfig(severity: string) {
  switch (severity) {
    case 'red':
      return { variant: 'destructive' as const, label: 'Over Budget', dotClass: 'bg-[var(--accent-red)]' };
    case 'orange':
      return { variant: 'amber' as const, label: 'Critical', dotClass: 'bg-[var(--accent-amber)]' };
    case 'yellow':
      return { variant: 'amber' as const, label: 'Warning', dotClass: 'bg-yellow-500' };
    default:
      return { variant: 'green' as const, label: 'On Track', dotClass: 'bg-[var(--accent-green)]' };
  }
}

export default function BudgetPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: summary = emptySummary, isLoading: loadingSummary } = useQuery<BudgetSummaryResponse>({
    queryKey: ['budget-summary'],
    queryFn: () => api.get('/budgets/summary'),
  });

  const { data: alerts = [], isLoading: loadingAlerts } = useQuery<BudgetAlert[]>({
    queryKey: ['budget-alerts'],
    queryFn: () => api.get('/budgets/alerts'),
  });

  const remaining = summary.totalBudget - summary.totalActualSpent;
  const isLoading = loadingSummary || loadingAlerts;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] font-[family-name:var(--font-heading)]">
          Budget Tracking
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Monitor charge code budgets, spending, and forecasts
        </p>
      </div>

      {/* Overview cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-5 animate-pulse">
              <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-24 mb-3" />
              <div className="h-8 bg-stone-200 dark:bg-stone-700 rounded w-32 mb-2" />
              <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-20" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <OverviewCard
            icon={<DollarSign className="w-4 h-4" />}
            label="Total Budget"
            value={formatCurrency(summary.totalBudget)}
            subtitle={`${summary.totalChargeCodes} charge codes`}
            accentColor="var(--accent-teal)"
          />
          <OverviewCard
            icon={<TrendingUp className="w-4 h-4" />}
            label="Total Spent"
            value={formatCurrency(summary.totalActualSpent)}
            subtitle={`${summary.overallPercentage}% consumed`}
            accentColor="var(--accent-amber)"
          />
          <OverviewCard
            icon={<TrendingDown className="w-4 h-4" />}
            label="Remaining"
            value={formatCurrency(remaining)}
            subtitle={`${100 - summary.overallPercentage}% available`}
            accentColor="var(--accent-green)"
          />
          <OverviewCard
            icon={<AlertTriangle className="w-4 h-4" />}
            label="Forecast"
            value={formatCurrency(summary.totalForecast)}
            subtitle={`${summary.chargeCodesOverBudget} over, ${summary.chargeCodesAtRisk} at risk`}
            accentColor={summary.totalForecast > summary.totalBudget ? 'var(--accent-red)' : 'var(--accent-green)'}
          />
        </div>
      )}

      {/* Budget table with progress bars and drill-down */}
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="px-5 py-4 border-b border-[var(--border-default)] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] font-[family-name:var(--font-heading)]">
              Budget by Charge Code
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Click a row to see child-level breakdown
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-5 animate-pulse space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-32" />
                <div className="flex-1 h-3 bg-stone-200 dark:bg-stone-700 rounded" />
                <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-20" />
              </div>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-muted)] text-sm">
            No budget data available - all projects are on track.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-stone-50 dark:bg-stone-900 sticky top-0">
                <th className="text-left px-5 py-2.5 font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider w-8" />
                <th className="text-left px-2 py-2.5 font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                  Charge Code
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                  Budget
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                  Actual
                </th>
                <th className="px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider w-[200px]">
                  Usage
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                  Forecast
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((item, idx) => {
                const percentUsed = item.budget > 0 ? Math.round((item.actual / item.budget) * 100) : 0;
                const config = severityConfig(item.severity);
                const isExpanded = expandedId === item.chargeCodeId;

                return (
                  <BudgetRow
                    key={item.chargeCodeId}
                    item={item}
                    idx={idx}
                    percentUsed={percentUsed}
                    config={config}
                    isExpanded={isExpanded}
                    onToggle={() => setExpandedId(isExpanded ? null : item.chargeCodeId)}
                  />
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function BudgetRow({
  item,
  idx,
  percentUsed,
  config,
  isExpanded,
  onToggle,
}: {
  item: BudgetAlert;
  idx: number;
  percentUsed: number;
  config: { variant: 'destructive' | 'amber' | 'green'; label: string; dotClass: string };
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [children, setChildren] = useState<BudgetChild[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(false);

  useEffect(() => {
    if (!isExpanded) return;
    setLoadingChildren(true);
    api.get<{ breakdown: BudgetChild[] }>(`/reports/project-cost?charge_code_id=${encodeURIComponent(item.chargeCodeId)}`)
      .then((data) => setChildren(data.breakdown ?? []))
      .catch(() => setChildren([]))
      .finally(() => setLoadingChildren(false));
  }, [isExpanded, item.chargeCodeId]);

  return (
    <>
      <tr
        className={`border-b border-[var(--border-default)] cursor-pointer transition-colors hover:bg-[var(--bg-card-hover)] ${
          idx % 2 === 0 ? 'bg-[var(--bg-card)]' : 'bg-stone-50 dark:bg-stone-900/50'
        }`}
        onClick={onToggle}
      >
        <td className="pl-5 py-2.5">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
          )}
        </td>
        <td className="px-2 py-2.5">
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${config.dotClass}`} />
            <div>
              <div className="font-medium text-[var(--text-primary)]">{item.name}</div>
              <div className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-mono)]">
                {item.chargeCodeId}
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-2.5 text-right font-[family-name:var(--font-mono)] text-xs text-[var(--text-primary)]">
          {formatCurrency(item.budget)}
        </td>
        <td className="px-4 py-2.5 text-right font-[family-name:var(--font-mono)] text-xs text-[var(--text-primary)]">
          {formatCurrency(item.actual)}
        </td>
        <td className="px-4 py-2.5">
          <ProgressBar percent={percentUsed} severity={item.severity} />
        </td>
        <td className="px-4 py-2.5 text-right font-[family-name:var(--font-mono)] text-xs text-[var(--text-muted)]">
          {item.forecast ? formatCurrency(item.forecast) : '-'}
        </td>
        <td className="px-4 py-2.5">
          <Badge variant={config.variant}>{config.label}</Badge>
        </td>
      </tr>
      {/* Drill-down child rows */}
      {isExpanded && (
        <>
          {loadingChildren ? (
            <tr className="border-b border-[var(--border-default)] bg-stone-50 dark:bg-stone-900/30">
              <td colSpan={7} className="px-5 py-3 text-center text-xs text-[var(--text-muted)] animate-pulse">
                Loading breakdown...
              </td>
            </tr>
          ) : children.length === 0 ? (
            <tr className="border-b border-[var(--border-default)] bg-stone-50 dark:bg-stone-900/30">
              <td colSpan={7} className="px-5 py-3 text-center text-xs text-[var(--text-muted)]">
                No child charge codes
              </td>
            </tr>
          ) : (
            children.map((child) => {
              const childPercent = child.budgetAmount > 0 ? Math.round((child.actualSpent / child.budgetAmount) * 100) : 0;
              return (
                <tr
                  key={child.chargeCodeId}
                  className="border-b border-[var(--border-default)] bg-stone-50 dark:bg-stone-900/30"
                  style={{ animation: 'fade-in 200ms ease-out' }}
                >
                  <td className="pl-5 py-2" />
                  <td className="px-2 py-2 pl-8">
                    <div className="text-xs text-[var(--text-secondary)]">{child.chargeCodeName}</div>
                    <div className="text-[10px] text-[var(--text-muted)] font-[family-name:var(--font-mono)]">{child.chargeCodeId}</div>
                  </td>
                  <td className="px-4 py-2 text-right font-[family-name:var(--font-mono)] text-xs text-[var(--text-secondary)]">
                    {formatCurrency(child.budgetAmount)}
                  </td>
                  <td className="px-4 py-2 text-right font-[family-name:var(--font-mono)] text-xs text-[var(--text-secondary)]">
                    {formatCurrency(child.actualSpent)}
                  </td>
                  <td className="px-4 py-2">
                    <ProgressBar percent={childPercent} severity={childPercent >= 90 ? 'red' : childPercent >= 75 ? 'orange' : 'green'} small />
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-[var(--text-muted)]">-</td>
                  <td className="px-4 py-2" />
                </tr>
              );
            })
          )}
          {item.rootCauseActivity && (
            <tr className="border-b border-[var(--border-default)] bg-[var(--accent-red-light)] dark:bg-red-900/10">
              <td colSpan={7} className="px-5 py-2.5 pl-12">
                <div className="flex items-center gap-2 text-xs">
                  <AlertTriangle className="w-3 h-3 text-[var(--accent-red)]" />
                  <span className="font-medium text-[var(--accent-red)]">Root cause:</span>
                  <span className="text-[var(--text-secondary)]">{item.rootCauseActivity}</span>
                </div>
              </td>
            </tr>
          )}
        </>
      )}
    </>
  );
}

function ProgressBar({
  percent,
  severity,
  small = false,
}: {
  percent: number;
  severity: string;
  small?: boolean;
}) {
  const barColor =
    severity === 'red' ? 'bg-[var(--accent-red)]' :
    severity === 'orange' ? 'bg-[var(--accent-amber)]' :
    severity === 'yellow' ? 'bg-yellow-500' :
    'bg-[var(--accent-green)]';

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 ${small ? 'h-1.5' : 'h-2'} rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden`}>
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-600 ease-out`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <span className={`font-[family-name:var(--font-mono)] ${small ? 'text-[10px]' : 'text-xs'} ${
        percent >= 100 ? 'text-[var(--accent-red)] font-medium' :
        percent >= 80 ? 'text-[var(--accent-amber)]' :
        'text-[var(--text-muted)]'
      }`}>
        {percent}%
      </span>
    </div>
  );
}

function OverviewCard({
  icon,
  label,
  value,
  subtitle,
  accentColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle: string;
  accentColor: string;
}) {
  return (
    <div
      className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-150 hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
      style={{ borderTopWidth: '3px', borderTopColor: accentColor }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-md bg-stone-100 dark:bg-stone-800 text-[var(--text-secondary)]">
          {icon}
        </div>
        <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-2xl font-bold text-[var(--text-primary)] font-[family-name:var(--font-mono)]">{value}</p>
      <p className="text-xs text-[var(--text-muted)] mt-1">{subtitle}</p>
    </div>
  );
}
