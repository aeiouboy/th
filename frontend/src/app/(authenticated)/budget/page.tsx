'use client';

import { useState, useEffect, Fragment, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { StatCard } from '@/components/shared/StatCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { MultiSelectFilter } from '@/components/budget/MultiSelectFilter';
import { TeamBreakdown } from '@/components/budget/TeamBreakdown';

interface BudgetSummaryResponse {
  totalBudget: number;
  totalActualSpent: number;
  totalForecast: number;
  overallPercentage: number;
  chargeCodesOverBudget: number;
  chargeCodesAtRisk: number;
  totalChargeCodes: number;
}

interface BudgetItem {
  chargeCodeId: string;
  name: string;
  budget: number;
  actual: number;
  forecast: number | null;
  severity: 'red' | 'orange' | 'yellow' | 'green';
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
  level?: string;
  budgetAmount: number;
  actualSpent: number;
  variance: number;
  percentUsed: number;
  children?: BudgetChild[];
}

const SEVERITY_CONFIG = {
  red: {
    label: 'Over Budget',
    dotClass: 'bg-[var(--accent-red)]',
    bgClass: 'bg-red-50 dark:bg-red-950/30',
    borderClass: 'border-l-[var(--accent-red)]',
    badgeBg: 'bg-red-100 dark:bg-red-900/40 text-[var(--accent-red)]',
  },
  orange: {
    label: 'Critical',
    dotClass: 'bg-[var(--accent-amber)]',
    bgClass: 'bg-amber-50 dark:bg-amber-950/20',
    borderClass: 'border-l-[var(--accent-amber)]',
    badgeBg: 'bg-amber-100 dark:bg-amber-900/40 text-[var(--accent-amber)]',
  },
  yellow: {
    label: 'Warning',
    dotClass: 'bg-yellow-500',
    bgClass: 'bg-yellow-50 dark:bg-yellow-950/20',
    borderClass: 'border-l-yellow-500',
    badgeBg: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400',
  },
  green: {
    label: 'On Track',
    dotClass: 'bg-[var(--accent-green)]',
    bgClass: '',
    borderClass: 'border-l-[var(--accent-green)]',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-900/40 text-[var(--accent-green)]',
  },
} as const;

function getSeverityConfig(severity: string) {
  return SEVERITY_CONFIG[severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.green;
}

interface PaginatedBudgetResponse {
  data: BudgetItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function BudgetPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const { data: summary = emptySummary, isLoading: loadingSummary } = useQuery<BudgetSummaryResponse>({
    queryKey: ['budget-summary'],
    queryFn: () => api.get('/budgets/summary'),
  });

  // Fetch all items (unfiltered, large limit) to build filter options
  const { data: allBudgetResponse, isLoading: loadingAll } = useQuery<PaginatedBudgetResponse>({
    queryKey: ['budgets-all'],
    queryFn: () => api.get('/budgets?limit=100'),
  });
  const allBudgetItems = allBudgetResponse?.data ?? [];

  // Initialize selected programs once data loads
  useEffect(() => {
    if (!initialized && allBudgetItems.length > 0) {
      setSelectedPrograms(allBudgetItems.map((item) => item.chargeCodeId));
      setInitialized(true);
    }
  }, [allBudgetItems, initialized]);

  // Filter options from all items
  const filterOptions = useMemo(
    () => allBudgetItems.map((item) => ({ id: item.chargeCodeId, label: item.name })),
    [allBudgetItems],
  );

  // Filtered budget items based on selection with pagination
  const { data: budgetResponse, isLoading: loadingItems } = useQuery<PaginatedBudgetResponse>({
    queryKey: ['budgets', selectedPrograms, currentPage, pageSize],
    queryFn: () => {
      const p = new URLSearchParams();
      p.set('page', String(currentPage));
      p.set('limit', String(pageSize));
      if (selectedPrograms.length > 0 && selectedPrograms.length < allBudgetItems.length) {
        p.set('chargeCodeIds', selectedPrograms.join(','));
      }
      return api.get(`/budgets?${p.toString()}`);
    },
    enabled: initialized,
  });
  const budgetItems = budgetResponse?.data ?? [];
  const totalPages = budgetResponse?.totalPages ?? 1;
  const totalItems = budgetResponse?.total ?? 0;

  const isLoading = loadingSummary || loadingAll || loadingItems;

  // Derive KPI from budget items (what's shown in the table)
  const stats = useMemo(() => {
    const totalBudget = budgetItems.reduce((s, a) => s + a.budget, 0);
    const totalActual = budgetItems.reduce((s, a) => s + a.actual, 0);
    const totalForecast = budgetItems.reduce((s, a) => s + (a.forecast ?? 0), 0);
    const overCount = budgetItems.filter((a) => a.severity === 'red').length;
    const atRiskCount = budgetItems.filter((a) => a.severity === 'orange' || a.severity === 'yellow').length;
    const onTrackCount = budgetItems.filter((a) => a.severity === 'green').length;
    return { totalBudget, totalActual, totalForecast, overCount, atRiskCount, onTrackCount };
  }, [budgetItems]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budget Tracking"
        description="Monitor charge code budgets, spending, and forecasts"
      />

      {/* Multi-select filter */}
      {filterOptions.length > 0 && (
        <MultiSelectFilter
          options={filterOptions}
          selected={selectedPrograms}
          onChange={(v) => { setSelectedPrograms(v); setCurrentPage(1); }}
          label="Programs"
        />
      )}

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
          <StatCard
            icon={DollarSign}
            label="Total budget"
            value={formatCurrency(stats.totalBudget)}
            subtext={`${budgetItems.length} charge codes`}
            accent="var(--accent-teal)"
          />
          <StatCard
            icon={TrendingUp}
            label="Actual spent"
            value={formatCurrency(stats.totalActual)}
            subtext={stats.totalBudget > 0 ? `${Math.round((stats.totalActual / stats.totalBudget) * 100)}% consumed` : '—'}
            accent="var(--accent-amber)"
          />
          <StatCard
            icon={AlertTriangle}
            label="Forecast"
            value={formatCurrency(stats.totalForecast)}
            subtext={stats.totalForecast > stats.totalBudget ? `Over by ${formatCurrency(stats.totalForecast - stats.totalBudget)}` : 'Within budget'}
            accent={stats.totalForecast > stats.totalBudget ? 'var(--accent-red)' : 'var(--accent-green)'}
          />
          <StatCard
            icon={BarChart3}
            label="Status"
            value={`${stats.onTrackCount} / ${budgetItems.length}`}
            subtext={`${stats.overCount} over, ${stats.atRiskCount} at risk`}
            accent={stats.overCount > 0 ? 'var(--accent-red)' : 'var(--accent-green)'}
          />
        </div>
      )}

      {/* Budget table */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
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
        ) : budgetItems.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No budget data"
            description="All projects are on track — no budget alerts to display"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-stone-50 dark:bg-stone-900 sticky top-0 z-10">
                  <th className="w-10" />
                  <th className="text-left px-3 py-3 font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                    Charge Code
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider w-[100px]">
                    Budget
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider w-[100px]">
                    Actual
                  </th>
                  <th className="px-4 py-3 font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider w-[220px]">
                    Usage
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider w-[100px]">
                    Forecast
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider w-[110px]">
                    Variance
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider w-[120px]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {budgetItems.map((item) => {
                  const isExpanded = expandedId === item.chargeCodeId;
                  return (
                    <BudgetRow
                      key={item.chargeCodeId}
                      item={item}
                      isExpanded={isExpanded}
                      onToggle={() => setExpandedId(isExpanded ? null : item.chargeCodeId)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-[var(--border-default)] flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)] text-xs">
              Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalItems)} of {totalItems}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === 'ellipsis' ? (
                    <span key={`e${i}`} className="px-1 text-[var(--text-muted)]">...</span>
                  ) : (
                    <Button
                      key={p}
                      variant={p === currentPage ? 'default' : 'outline'}
                      size="sm"
                      className="min-w-[32px]"
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </Button>
                  ),
                )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Parent row (Program level) ─── */
function BudgetRow({
  item,
  isExpanded,
  onToggle,
}: {
  item: BudgetItem;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [children, setChildren] = useState<BudgetChild[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const percentUsed = item.budget > 0 ? Math.round((item.actual / item.budget) * 100) : 0;
  const config = getSeverityConfig(item.severity);
  const variance = item.budget - item.actual;

  useEffect(() => {
    if (!isExpanded) return;
    setLoadingChildren(true);
    api.get<{ breakdown: BudgetChild[] }>(`/reports/project-cost?charge_code_id=${encodeURIComponent(item.chargeCodeId)}`)
      .then((data) => setChildren(data.breakdown ?? []))
      .catch(() => setChildren([]))
      .finally(() => setLoadingChildren(false));
  }, [isExpanded, item.chargeCodeId]);

  const visibleChildren = useMemo(() => {
    if (showAll) return children;
    return children.filter((c) => c.budgetAmount > 0 || c.actualSpent > 0);
  }, [children, showAll]);

  const hiddenCount = children.length - visibleChildren.length;

  return (
    <>
      {/* Parent row */}
      <tr
        className={`
          border-b border-[var(--border-default)] cursor-pointer
          transition-all duration-150
          hover:bg-[var(--bg-card-hover)]
          border-l-[3px] ${config.borderClass}
          ${isExpanded ? 'bg-stone-50/50 dark:bg-stone-800/30' : 'bg-[var(--bg-card)]'}
        `}
        onClick={onToggle}
      >
        <td className="pl-3 py-3 text-center">
          <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-0' : ''}`}>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
            )}
          </div>
        </td>
        <td className="px-3 py-3">
          <div className="flex items-center gap-2.5">
            <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${config.dotClass} ring-2 ring-white dark:ring-stone-900`} />
            <div>
              <div className="font-semibold text-[var(--text-primary)] text-sm">{item.name}</div>
              <div className="text-[11px] text-[var(--text-muted)] font-[family-name:var(--font-mono)] mt-0.5">
                {item.chargeCodeId}
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-right font-medium text-sm text-[var(--text-primary)] tabular-nums">
          {formatCurrency(item.budget)}
        </td>
        <td className="px-4 py-3 text-right font-medium text-sm text-[var(--text-primary)] tabular-nums">
          {formatCurrency(item.actual)}
        </td>
        <td className="px-4 py-3">
          <ProgressBar percent={percentUsed} severity={item.severity} />
        </td>
        <td className={`px-4 py-3 text-right tabular-nums text-sm ${
          item.forecast != null && item.forecast > item.budget ? 'text-[var(--accent-red)] font-medium' : 'text-[var(--text-secondary)]'
        }`}>
          {item.forecast != null && item.forecast > 0 ? formatCurrency(item.forecast) : '—'}
        </td>
        <td className="px-4 py-3 text-right tabular-nums">
          <VarianceCell value={variance} />
        </td>
        <td className="px-4 py-3 text-center">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide ${config.badgeBg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
            {config.label}
          </span>
          {percentUsed <= 80 && item.forecast != null && item.forecast > item.budget && (
            <div className="text-[10px] text-[var(--accent-amber)] mt-1">Forecast เกิน budget</div>
          )}
        </td>
      </tr>

      {/* Expanded children */}
      {isExpanded && (
        <>
          {loadingChildren ? (
            <tr className="border-b border-[var(--border-default)] bg-stone-50/70 dark:bg-stone-900/30">
              <td colSpan={8} className="px-5 py-4">
                <div className="flex items-center gap-3 pl-8">
                  <div className="w-4 h-4 border-2 border-[var(--accent-teal)] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-[var(--text-muted)]">Loading breakdown…</span>
                </div>
              </td>
            </tr>
          ) : visibleChildren.length === 0 && hiddenCount === 0 ? (
            <tr className="border-b border-[var(--border-default)] bg-stone-50/70 dark:bg-stone-900/30">
              <td colSpan={8} className="px-5 py-4 text-center text-xs text-[var(--text-muted)]">
                No child charge codes
              </td>
            </tr>
          ) : (
            <>
              {visibleChildren.map((child, childIdx) => (
                <ChildRow
                  key={child.chargeCodeId}
                  child={child}
                  depth={1}
                  isLast={childIdx === visibleChildren.length - 1 && hiddenCount === 0}
                  showZeroBudget={showAll}
                />
              ))}
              {hiddenCount > 0 && (
                <tr className="border-b border-[var(--border-default)] bg-stone-50/50 dark:bg-stone-900/20">
                  <td colSpan={8} className="px-5 py-2.5 pl-14">
                    <button
                      className="text-[11px] text-[var(--accent-teal)] hover:underline cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); setShowAll(true); }}
                    >
                      Show {hiddenCount} items with ฿0 budget
                    </button>
                  </td>
                </tr>
              )}
            </>
          )}

          {/* Team breakdown */}
          <tr className="border-b border-[var(--border-default)] bg-stone-50/70 dark:bg-stone-900/30">
            <td colSpan={8} className="pl-10">
              <TeamBreakdown chargeCodeId={item.chargeCodeId} />
            </td>
          </tr>
        </>
      )}
    </>
  );
}

/* ─── Child / Grandchild row ─── */
function ChildRow({
  child,
  depth,
  isLast,
  showZeroBudget,
}: {
  child: BudgetChild;
  depth: number;
  isLast: boolean;
  showZeroBudget: boolean;
}) {
  const percent = child.budgetAmount > 0 ? Math.round((child.actualSpent / child.budgetAmount) * 100) : 0;
  const severity = percent >= 100 ? 'red' : percent >= 80 ? 'orange' : percent >= 60 ? 'yellow' : 'green';
  const hasActivity = child.budgetAmount > 0 || child.actualSpent > 0;

  const visibleGrandchildren = useMemo(() => {
    if (!child.children) return [];
    if (showZeroBudget) return child.children;
    return child.children.filter((gc) => gc.budgetAmount > 0 || gc.actualSpent > 0);
  }, [child.children, showZeroBudget]);

  const indentPl = depth === 1 ? 'pl-10' : 'pl-16';
  const bgClass = depth === 1
    ? 'bg-stone-50/70 dark:bg-stone-900/30'
    : 'bg-stone-100/50 dark:bg-stone-900/15';

  return (
    <Fragment>
      <tr
        className={`
          border-b border-[var(--border-default)]
          ${bgClass}
          ${!hasActivity ? 'opacity-40' : ''}
          transition-colors duration-100
        `}
        style={{ animation: 'fadeSlideIn 200ms ease-out both', animationDelay: `${depth * 30}ms` }}
      >
        <td className="py-2" />
        <td className={`px-3 py-2 ${indentPl}`}>
          <div className="flex items-center gap-2">
            {/* Tree connector line */}
            <div className="flex flex-col items-center w-3 shrink-0">
              <div className={`w-px ${isLast && visibleGrandchildren.length === 0 ? 'h-2.5' : 'h-full'} bg-stone-300 dark:bg-stone-600`} />
              <div className="w-2 h-px bg-stone-300 dark:bg-stone-600 self-end" />
            </div>
            <div>
              <div className={`${depth === 1 ? 'text-[13px] font-medium text-[var(--text-primary)]' : 'text-[12px] text-[var(--text-secondary)]'}`}>
                {child.chargeCodeName}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] font-[family-name:var(--font-mono)]">
                {child.chargeCodeId}
              </div>
            </div>
            {percent >= 90 && child.budgetAmount > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-[var(--accent-red)] font-semibold uppercase tracking-wider">
                overrun
              </span>
            )}
          </div>
        </td>
        <td className={`px-4 py-2 text-right tabular-nums ${depth === 1 ? 'text-xs text-[var(--text-primary)]' : 'text-[11px] text-[var(--text-muted)]'}`}>
          {child.budgetAmount > 0 ? formatCurrency(child.budgetAmount) : <span className="text-[var(--text-muted)]">—</span>}
        </td>
        <td className={`px-4 py-2 text-right tabular-nums ${depth === 1 ? 'text-xs text-[var(--text-primary)]' : 'text-[11px] text-[var(--text-muted)]'}`}>
          {child.actualSpent > 0 ? formatCurrency(child.actualSpent) : <span className="text-[var(--text-muted)]">—</span>}
        </td>
        <td className="px-4 py-2">
          {child.budgetAmount > 0 ? (
            <ProgressBar percent={percent} severity={severity} small={depth > 1} />
          ) : (
            <span className="text-[10px] text-[var(--text-muted)]">No budget set</span>
          )}
        </td>
        <td className="px-4 py-2" />
        <td className="px-4 py-2 text-right tabular-nums">
          <VarianceCell value={child.variance} small={depth > 1} />
        </td>
        <td className="px-4 py-2" />
      </tr>

      {/* Grandchildren */}
      {visibleGrandchildren.map((gc, gcIdx) => (
        <ChildRow
          key={gc.chargeCodeId}
          child={gc}
          depth={depth + 1}
          isLast={gcIdx === visibleGrandchildren.length - 1}
          showZeroBudget={showZeroBudget}
        />
      ))}
    </Fragment>
  );
}

/* ─── Progress bar ─── */
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
    'bg-[var(--accent-teal)]';

  const trackColor =
    severity === 'red' ? 'bg-red-100 dark:bg-red-900/20' :
    severity === 'orange' ? 'bg-amber-100 dark:bg-amber-900/20' :
    'bg-stone-200 dark:bg-stone-700';

  return (
    <div className="flex items-center gap-2.5">
      <div className={`flex-1 ${small ? 'h-1.5' : 'h-2.5'} rounded-full ${trackColor} overflow-hidden`}>
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-700 ease-out`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <span className={`min-w-[36px] text-right font-medium tabular-nums ${small ? 'text-[10px]' : 'text-xs'} ${
        percent >= 100 ? 'text-[var(--accent-red)]' :
        percent >= 80 ? 'text-[var(--accent-amber)]' :
        'text-[var(--text-secondary)]'
      }`}>
        {percent}%
      </span>
    </div>
  );
}

/* ─── Variance cell ─── */
function VarianceCell({ value, small = false }: { value: number; small?: boolean }) {
  const isNegative = value < 0;
  const textSize = small ? 'text-[11px]' : 'text-xs';

  if (value === 0) {
    return <span className={`${textSize} text-[var(--text-muted)]`}>—</span>;
  }

  return (
    <span className={`${textSize} font-medium tabular-nums ${
      isNegative
        ? 'text-[var(--accent-red)]'
        : 'text-[var(--accent-green)]'
    }`}>
      {isNegative ? '−' : '+'}
      {formatCurrency(Math.abs(value))}
    </span>
  );
}
