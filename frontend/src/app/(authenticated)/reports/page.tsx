'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { BudgetChart } from '@/components/reports/BudgetChart';
import { ChargeabilityGauge } from '@/components/reports/ChargeabilityGauge';
import { ActivityPie } from '@/components/reports/ActivityPie';
import { AlertList } from '@/components/reports/AlertList';
import { FinancialPL } from '@/components/reports/FinancialPL';
import { FileDown, FileText, DollarSign, TrendingUp, Users, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { StatCard } from '@/components/shared/StatCard';
import { PageHeader } from '@/components/shared/PageHeader';

// Types
interface BudgetSummary {
  totalBudget: number;
  totalActualSpent: number;
  totalForecast: number;
  overallPercentage: number;
  chargeCodesOverBudget: number;
  chargeCodesAtRisk: number;
  totalChargeCodes: number;
}

interface UtilizationReport {
  period: string;
  workingDays: number;
  overallUtilization: number;
  employees: {
    userId: string;
    fullName: string;
    department: string | null;
    availableHours: number;
    loggedHours: number;
    utilizationRate: number;
  }[];
  byDepartment: Record<string, { availableHours: number; loggedHours: number; rate: number }>;
}

interface ChargeabilityReport {
  target: number;
  overallBillableHours: number;
  overallTotalHours: number;
  overallChargeabilityRate: number;
  members: {
    userId: string;
    fullName: string;
    billableHours: number;
    totalHours: number;
    chargeabilityRate: number;
  }[];
}

interface FinancialImpact {
  overBudgetCost: number;
  overBudgetCount: number;
  lowChargeabilityCost: number;
  netImpact: number;
  avgCostRate: number;
  targetChargeability: number;
  actualChargeability: number;
}

interface ActivityDistribution {
  period: string;
  totalHours: number;
  distribution: { category: string; hours: number; percentage: number }[];
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

interface ChargeabilityAlert {
  type: 'chargeability';
  employeeId: string;
  name: string;
  billableHours: number;
  totalHours: number;
  chargeability: number;
  target: number;
  severity: string;
  costImpact: number;
}

interface ChargeCode {
  id: string;
  name: string;
  level: string;
  parentId: string | null;
  programName: string | null;
}

const emptyBudgetSummary: BudgetSummary = {
  totalBudget: 0,
  totalActualSpent: 0,
  totalForecast: 0,
  overallPercentage: 0,
  chargeCodesOverBudget: 0,
  chargeCodesAtRisk: 0,
  totalChargeCodes: 0,
};

const emptyChargeability: ChargeabilityReport = {
  target: 80,
  overallBillableHours: 0,
  overallTotalHours: 0,
  overallChargeabilityRate: 0,
  members: [],
};

const emptyActivityDist: ActivityDistribution = {
  period: '',
  totalHours: 0,
  distribution: [],
};

const emptyFinancialImpact: FinancialImpact = {
  overBudgetCost: 0,
  overBudgetCount: 0,
  lowChargeabilityCost: 0,
  netImpact: 0,
  avgCostRate: 0,
  targetChargeability: 80,
  actualChargeability: 0,
};

function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function ReportsPage() {
  const [period, setPeriod] = useState(getCurrentPeriod());
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');

  const { data: chargeCodes = [] } = useQuery<ChargeCode[]>({
    queryKey: ['charge-codes'],
    queryFn: () => api.get('/charge-codes'),
  });

  const programs = useMemo(
    () => chargeCodes.filter((cc) => cc.level === 'program'),
    [chargeCodes],
  );

  const { data: budgetSummary = emptyBudgetSummary, isLoading: loadingSummary } = useQuery<BudgetSummary>({
    queryKey: ['reports', 'budget-summary'],
    queryFn: () => api.get('/budgets/summary'),
  });

  const { data: utilization, isLoading: loadingUtil } = useQuery<UtilizationReport>({
    queryKey: ['reports', 'utilization', period],
    queryFn: () => api.get(`/reports/utilization?period=${period}`),
  });

  const { data: chargeability = emptyChargeability, isLoading: loadingCharge } = useQuery<ChargeabilityReport>({
    queryKey: ['reports', 'chargeability', selectedTeam],
    queryFn: () =>
      api.get(`/reports/chargeability${selectedTeam !== 'all' ? `?team=${encodeURIComponent(selectedTeam)}` : ''}`),
  });

  const { data: financialImpact = emptyFinancialImpact, isLoading: loadingFinancial } = useQuery<FinancialImpact>({
    queryKey: ['reports', 'financial-impact'],
    queryFn: () => api.get('/reports/financial-impact'),
  });

  const { data: activityDist = emptyActivityDist, isLoading: loadingActivity } = useQuery<ActivityDistribution>({
    queryKey: ['reports', 'activity-distribution', period],
    queryFn: () => api.get(`/reports/activity-distribution?period=${period}`),
  });

  const { data: budgetAlerts = [], isLoading: loadingAlerts } = useQuery<BudgetAlert[]>({
    queryKey: ['reports', 'budget-alerts'],
    queryFn: () => api.get('/reports/budget-alerts'),
  });

  const { data: chargeabilityAlerts = [] } = useQuery<ChargeabilityAlert[]>({
    queryKey: ['reports', 'chargeability-alerts'],
    queryFn: () => api.get('/budgets/chargeability-alerts'),
  });

  const { data: projectCost } = useQuery({
    queryKey: ['reports', 'project-cost', selectedProgram],
    queryFn: () =>
      api.get<{ breakdown: { chargeCodeId: string; chargeCodeName: string; budgetAmount: number; actualSpent: number }[] }>(
        `/reports/project-cost?charge_code_id=${encodeURIComponent(selectedProgram)}`,
      ),
    enabled: selectedProgram !== 'all',
  });

  const teams = useMemo(() => {
    if (!utilization?.byDepartment) return [];
    return Object.keys(utilization.byDepartment).sort();
  }, [utilization]);

  const budgetChartData = useMemo(() => {
    if (projectCost?.breakdown && projectCost.breakdown.length > 0) {
      return projectCost.breakdown;
    }
    return [];
  }, [projectCost]);

  const periodOptions = useMemo(() => {
    const options: string[] = [];
    const now = new Date();
    for (let i = -6; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      options.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return options;
  }, []);

  const handleExportCsv = () => {
    const rows = [['Severity', 'Charge Code', 'Name', 'Budget', 'Actual', 'Forecast']];
    for (const a of budgetAlerts) {
      rows.push([a.severity, a.chargeCodeId, a.name, a.budget.toString(), a.actual.toString(), (a.forecast ?? '').toString()]);
    }
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reports-${period}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Comprehensive view of project costs, utilization, and chargeability"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <FileDown className="w-3.5 h-3.5 mr-1.5" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm">
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Export PDF
            </Button>
          </div>
        }
      />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <Select value={selectedProgram} onValueChange={(v) => v && setSelectedProgram(v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Program" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Programs</SelectItem>
            {programs.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={period} onValueChange={(v) => v && setPeriod(v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map((p) => (
              <SelectItem key={p} value={p}>
                {new Date(p + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedTeam} onValueChange={(v) => v && setSelectedTeam(v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ROW 1: KPI Cards with colored top borders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingSummary ? (
          <>{[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}</>
        ) : (
          <>
            <StatCard label="Total budget" value={formatCurrency(budgetSummary.totalBudget)} subtext={`Across ${budgetSummary.totalChargeCodes} programs`} icon={DollarSign} accent="var(--accent-teal)" />
            <StatCard label="Actual spent" value={formatCurrency(budgetSummary.totalActualSpent)} subtext={`${budgetSummary.overallPercentage}% consumed`} icon={TrendingUp} accent="var(--accent-amber)" />
            <StatCard label="Utilization" value={`${utilization?.overallUtilization ?? 0}%`} subtext={loadingUtil ? 'Loading...' : `${utilization?.employees.length ?? 0} employees`} icon={Users} accent="var(--accent-green)" />
            <StatCard label="Overrun count" value={String(budgetSummary.chargeCodesOverBudget)} subtext={`${budgetSummary.chargeCodesAtRisk} at risk`} icon={AlertTriangle} accent="var(--accent-red)" />
          </>
        )}
      </div>

      {/* ROW 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Budget vs Actual" loading={loadingAlerts}>
          <div className="h-72"><BudgetChart data={budgetChartData} /></div>
        </ChartCard>
        <ChartCard title="Chargeability by Team" loading={loadingCharge}>
          <div className="h-72"><ChargeabilityGauge members={chargeability.members} target={chargeability.target} /></div>
        </ChartCard>
      </div>

      {/* ROW 3: Activity Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Activity Distribution" loading={loadingActivity}>
          <div className="h-72"><ActivityPie data={activityDist.distribution} /></div>
        </ChartCard>
        {loadingFinancial ? <SkeletonChart /> : (
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] font-[family-name:var(--font-heading)]">Financial Impact Summary</h3>
            <p className="text-xs text-[var(--text-muted)] mb-5">Profit & Loss impact analysis</p>
            <div className="space-y-4">
              <FinancialRow label="Over-budget cost" value={financialImpact.overBudgetCost} isNegative detail={`${financialImpact.overBudgetCount} projects over budget`} />
              <FinancialRow label="Low chargeability" value={financialImpact.lowChargeabilityCost} isNegative detail={`Actual: ${financialImpact.actualChargeability}% vs Target: ${financialImpact.targetChargeability}%`} />
              <div className="border-t border-[var(--border-default)] pt-3">
                <FinancialRow label="Net P/L Impact" value={financialImpact.netImpact} isNegative isBold />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ROW 3b: Financial P/L with Team Breakdown */}
      <FinancialPL period={period} team={selectedTeam} />

      {/* ROW 4: Alert table */}
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
    </div>
  );
}

function ChartCard({ title, loading, children }: { title: string; loading: boolean; children: React.ReactNode }) {
  if (loading) return <SkeletonChart />;
  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 font-[family-name:var(--font-heading)]">{title}</h3>
      {children}
    </div>
  );
}

function FinancialRow({ label, value, isNegative, isBold, detail }: { label: string; value: number; isNegative?: boolean; isBold?: boolean; detail?: string }) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <p className={`text-sm ${isBold ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{label}</p>
        {detail && <p className="text-xs text-[var(--text-muted)] mt-0.5">{detail}</p>}
      </div>
      <p className={`${isBold ? 'text-lg font-bold' : 'text-sm'} ${isNegative && value > 0 ? 'text-[var(--accent-red)]' : 'text-[var(--text-primary)]'}`}>
        {isNegative && value > 0 ? '-' : ''}{formatCurrency(value)}
      </p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-5 animate-pulse">
      <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-24 mb-3" />
      <div className="h-8 bg-stone-200 dark:bg-stone-700 rounded w-32 mb-2" />
      <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-20" />
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-5 animate-pulse">
      <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-40 mb-4" />
      <div className="h-64 bg-stone-100 dark:bg-stone-800 rounded" />
    </div>
  );
}
