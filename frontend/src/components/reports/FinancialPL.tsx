'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { StatCard } from '@/components/shared/StatCard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AlertList } from '@/components/reports/AlertList';
import { DollarSign, TrendingDown, AlertTriangle } from 'lucide-react';
import { type BudgetAlert, type ChargeabilityAlert } from './types';

interface TeamPL {
  department: string;
  totalBudget: number;
  totalHours: number;
  billableHours: number;
  chargeability: number;
  totalCost: number;
  billableRevenue: number;
  margin: number;
  marginPercent: number;
}

interface FinancialImpactResponse {
  overBudgetCost: number;
  overBudgetCount: number;
  lowChargeabilityCost: number;
  netImpact: number;
  avgCostRate: number;
  targetChargeability: number;
  actualChargeability: number;
  byTeam?: TeamPL[];
  byChargeCode?: {
    chargeCodeId: string;
    chargeCodeName: string;
    budget: number;
    actual: number;
    variance: number;
    forecastOverrun: number;
  }[];
}

interface FinancialPLProps {
  period?: string;
  team?: string;
  budgetAlerts?: BudgetAlert[];
  chargeabilityAlerts?: ChargeabilityAlert[];
  loadingAlerts?: boolean;
}

export function FinancialPL({ period, team, budgetAlerts = [], chargeabilityAlerts = [], loadingAlerts }: FinancialPLProps) {
  const totalAlertCount = budgetAlerts.length + chargeabilityAlerts.length;

  const { data, isLoading } = useQuery<FinancialImpactResponse>({
    queryKey: ['reports', 'financial-impact', period, team],
    queryFn: () => {
      const params = new URLSearchParams();
      if (period) params.set('period', period);
      if (team && team !== 'all') params.set('team', team);
      const qs = params.toString();
      return api.get(`/reports/financial-impact${qs ? `?${qs}` : ''}`);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-5 animate-pulse">
              <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-24 mb-3" />
              <div className="h-8 bg-stone-200 dark:bg-stone-700 rounded w-32 mb-2" />
              <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-20" />
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-5 animate-pulse">
          <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-40 mb-4" />
          <div className="h-32 bg-stone-100 dark:bg-stone-800 rounded" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const teams = data.byTeam ?? [];

  return (
    <Tabs defaultValue="pl-summary" className="space-y-4">
      <TabsList>
        <TabsTrigger value="pl-summary">P/L Summary</TabsTrigger>
        <TabsTrigger value="alerts">
          Alerts{totalAlertCount > 0 ? ` (${totalAlertCount})` : ''}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pl-summary" className="space-y-4">
        {/* P/L Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={AlertTriangle}
            label="Over-budget cost"
            value={formatCurrency(data.overBudgetCost)}
            subtext={`${data.overBudgetCount} projects over budget`}
            accent="var(--accent-red)"
          />
          <StatCard
            icon={TrendingDown}
            label="Low chargeability gap"
            value={formatCurrency(data.lowChargeabilityCost)}
            subtext={`Actual ${data.actualChargeability}% vs Target ${data.targetChargeability}%`}
            accent="var(--accent-amber)"
          />
          <StatCard
            icon={DollarSign}
            label="Net P/L impact"
            value={formatCurrency(data.netImpact)}
            subtext="Combined cost exposure"
            accent={data.netImpact > 0 ? 'var(--accent-red)' : 'var(--accent-green)'}
          />
        </div>

        {/* Team P/L Table */}
        {teams.length > 0 && (
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="px-5 py-4 border-b border-[var(--border-default)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] font-[family-name:var(--font-heading)]">
                Program P/L Breakdown
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Cost, revenue, and margin by program
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-default)] bg-stone-50 dark:bg-stone-900">
                    <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                      Program
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                      Budget
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                      Cost
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                      Billable Rev.
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                      Margin
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                      Margin %
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                      Chargeability
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((t, idx) => (
                    <tr
                      key={t.department}
                      className={`border-b border-[var(--border-default)] ${
                        idx % 2 === 0 ? 'bg-[var(--bg-card)]' : 'bg-stone-50 dark:bg-stone-900/50'
                      }`}
                    >
                      <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">
                        {t.department}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-[var(--text-muted)]">
                        {t.totalBudget > 0 ? formatCurrency(t.totalBudget) : '-'}
                      </td>
                      <td className={`px-4 py-2.5 text-right text-xs ${t.totalBudget > 0 && t.totalCost > t.totalBudget ? 'text-[var(--accent-red)] font-medium' : 'text-[var(--text-primary)]'}`}>
                        {formatCurrency(t.totalCost)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-[var(--text-primary)]">
                        {formatCurrency(t.billableRevenue)}
                      </td>
                      <td className={`px-4 py-2.5 text-right text-xs font-medium ${
                        t.margin >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'
                      }`}>
                        {t.margin < 0 ? '-' : ''}{formatCurrency(Math.abs(t.margin))}
                      </td>
                      <td className={`px-4 py-2.5 text-right text-xs font-medium ${
                        t.marginPercent >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'
                      }`}>
                        {t.marginPercent.toFixed(1)}%
                      </td>
                      <td className={`px-4 py-2.5 text-right text-xs font-medium ${
                        t.chargeability >= 80 ? 'text-[var(--accent-green)]' : t.chargeability >= 60 ? 'text-[var(--accent-amber)]' : 'text-[var(--accent-red)]'
                      }`}>
                        {t.chargeability.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                {teams.length > 1 && (
                  <tfoot>
                    <tr className="border-t-2 border-stone-300 bg-stone-50/70">
                      <td className="px-4 py-2.5 font-semibold text-[var(--text-primary)] text-xs">
                        Total
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs font-semibold text-[var(--text-muted)]">
                        {formatCurrency(teams.reduce((s, t) => s + t.totalBudget, 0))}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs font-semibold text-[var(--text-primary)]">
                        {formatCurrency(teams.reduce((s, t) => s + t.totalCost, 0))}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs font-semibold text-[var(--text-primary)]">
                        {formatCurrency(teams.reduce((s, t) => s + t.billableRevenue, 0))}
                      </td>
                      <td className={`px-4 py-2.5 text-right text-xs font-semibold ${
                        teams.reduce((s, t) => s + t.margin, 0) >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'
                      }`}>
                        {formatCurrency(Math.abs(teams.reduce((s, t) => s + t.margin, 0)))}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs font-semibold text-[var(--text-muted)]">
                        -
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs font-semibold text-[var(--text-muted)]">
                        -
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="alerts">
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="px-5 py-4 border-b border-[var(--border-default)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] font-[family-name:var(--font-heading)]">Alerts</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Budget overruns and chargeability gaps. Click a budget row to see root cause.</p>
          </div>
          {loadingAlerts ? (
            <div className="p-5 animate-pulse space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-4 bg-stone-200 dark:bg-stone-700 rounded" style={{ width: `${100 - i * 15}%` }} />)}
            </div>
          ) : (
            <AlertList alerts={budgetAlerts} chargeabilityAlerts={chargeabilityAlerts} />
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
