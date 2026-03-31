'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface ChargeCode {
  id: string;
  name: string;
  level: string;
}

interface ProgramReport {
  program: { id: string; name: string } | null;
  budgetVsActual: { budget: number; actual: number; variance: number };
  taskDistribution: { taskName: string; hours: number; cost: number; percentage: number }[];
  teamDistribution: { team: string; hours: number; cost: number; percentage: number }[];
}

function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function ReportByProgram() {
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [period, setPeriod] = useState(getCurrentPeriod());

  const { data: chargeCodes = [] } = useQuery<ChargeCode[]>({
    queryKey: ['charge-codes'],
    queryFn: () => api.get('/charge-codes'),
  });

  const programs = useMemo(
    () => chargeCodes.filter((cc) => cc.level === 'program'),
    [chargeCodes],
  );

  // Auto-select first program when loaded
  useEffect(() => {
    if (programs.length > 0 && !selectedProgram) {
      setSelectedProgram(programs[0].id);
    }
  }, [programs, selectedProgram]);

  const { data: report, isLoading } = useQuery<ProgramReport>({
    queryKey: ['reports', 'by-program', selectedProgram, period],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('programId', selectedProgram);
      if (period) params.set('period', period);
      return api.get(`/reports/by-program?${params.toString()}`);
    },
    enabled: !!selectedProgram,
  });

  const periodOptions = useMemo(() => {
    const options: string[] = [];
    const now = new Date();
    for (let i = -6; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      options.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return options;
  }, []);

  const budgetChartData = report ? [
    {
      name: report.program?.name ?? 'Program',
      Budget: report.budgetVsActual.budget,
      Actual: report.budgetVsActual.actual,
    },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedProgram} onValueChange={(v) => v && setSelectedProgram(v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="เลือก Program">
              {selectedProgram ? (programs.find((p) => p.id === selectedProgram)?.name ?? selectedProgram) : 'เลือก Program'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
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
      </div>

      {!selectedProgram ? (
        <div className="text-center py-12 text-[var(--text-muted)] text-sm">
          Select a program to view the report
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse bg-stone-100 dark:bg-stone-800 rounded-lg" />
          ))}
        </div>
      ) : report ? (
        <>
          {/* Budget vs Actual chart */}
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 font-[family-name:var(--font-heading)]">
              Budget vs Actual
            </h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <dt className="text-xs text-[var(--text-muted)]">Budget</dt>
                <dd className="text-lg font-semibold text-[var(--text-primary)]">{formatCurrency(report.budgetVsActual.budget)}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--text-muted)]">Actual</dt>
                <dd className="text-lg font-semibold text-[var(--text-primary)]">{formatCurrency(report.budgetVsActual.actual)}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--text-muted)]">Variance</dt>
                <dd className={`text-lg font-semibold ${report.budgetVsActual.variance >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                  {formatCurrency(report.budgetVsActual.variance)}
                </dd>
              </div>
            </div>
            {budgetChartData.length > 0 && budgetChartData[0].Budget > 0 && (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={budgetChartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                    <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value))]} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="Budget" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Actual" fill="var(--accent-teal)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Two-column: Task + Team distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Task Distribution */}
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 font-[family-name:var(--font-heading)]">
                Task Distribution
              </h3>
              {report.taskDistribution.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] text-center py-4">No data</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-default)]">
                      <th className="text-left py-2 text-xs font-medium text-[var(--text-muted)]">Task</th>
                      <th className="text-right py-2 text-xs font-medium text-[var(--text-muted)]">Hours</th>
                      <th className="text-right py-2 text-xs font-medium text-[var(--text-muted)]">Cost</th>
                      <th className="text-right py-2 text-xs font-medium text-[var(--text-muted)]">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.taskDistribution.map((t) => (
                      <tr key={t.taskName} className="border-b border-[var(--border-default)] last:border-b-0">
                        <td className="py-2 text-[var(--text-primary)] truncate max-w-[200px]">{t.taskName}</td>
                        <td className="py-2 text-right font-mono text-[var(--text-secondary)]">{t.hours}</td>
                        <td className="py-2 text-right font-mono text-[var(--text-secondary)]">{formatCurrency(t.cost)}</td>
                        <td className="py-2 text-right font-mono text-[var(--text-secondary)]">{t.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Team Distribution */}
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 font-[family-name:var(--font-heading)]">
                Team Distribution
              </h3>
              {report.teamDistribution.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] text-center py-4">No data</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-default)]">
                      <th className="text-left py-2 text-xs font-medium text-[var(--text-muted)]">Team</th>
                      <th className="text-right py-2 text-xs font-medium text-[var(--text-muted)]">Hours</th>
                      <th className="text-right py-2 text-xs font-medium text-[var(--text-muted)]">Cost</th>
                      <th className="text-right py-2 text-xs font-medium text-[var(--text-muted)]">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.teamDistribution.map((t) => (
                      <tr key={t.team} className="border-b border-[var(--border-default)] last:border-b-0">
                        <td className="py-2 text-[var(--text-primary)]">{t.team}</td>
                        <td className="py-2 text-right font-mono text-[var(--text-secondary)]">{t.hours}</td>
                        <td className="py-2 text-right font-mono text-[var(--text-secondary)]">{formatCurrency(t.cost)}</td>
                        <td className="py-2 text-right font-mono text-[var(--text-secondary)]">{t.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
