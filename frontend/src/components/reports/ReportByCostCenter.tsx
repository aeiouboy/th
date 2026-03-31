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

interface Profile {
  id: string;
  department: string | null;
}

interface CostCenterReport {
  costCenter: string;
  chargeability: number;
  chargeDistribution: { programName: string; chargeableHours: number; nonChargeableHours: number }[];
  teamMembers: { name: string; billableHours: number; totalHours: number; chargeability: number }[];
}

function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function ReportByCostCenter() {
  const [selectedCenter, setSelectedCenter] = useState<string>('');
  const [period, setPeriod] = useState(getCurrentPeriod());

  // Get distinct departments from profiles
  const { data: profiles = [] } = useQuery<Profile[]>({
    queryKey: ['users-for-costcenter'],
    queryFn: () => api.get('/users'),
  });

  const departments = useMemo(() => {
    const depts = new Set<string>();
    for (const p of profiles) {
      if (p.department) depts.add(p.department);
    }
    return Array.from(depts).sort();
  }, [profiles]);

  // Auto-select first department when loaded
  useEffect(() => {
    if (departments.length > 0 && !selectedCenter) {
      setSelectedCenter(departments[0]);
    }
  }, [departments, selectedCenter]);

  const { data: report, isLoading } = useQuery<CostCenterReport>({
    queryKey: ['reports', 'by-cost-center', selectedCenter, period],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('costCenter', selectedCenter);
      if (period) params.set('period', period);
      return api.get(`/reports/by-cost-center?${params.toString()}`);
    },
    enabled: !!selectedCenter,
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

  const chargeabilityColor = (rate: number) => {
    if (rate >= 80) return 'text-[var(--accent-green)]';
    if (rate >= 60) return 'text-[var(--accent-amber)]';
    return 'text-[var(--accent-red)]';
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedCenter} onValueChange={(v) => v && setSelectedCenter(v)}>
          <SelectTrigger className="w-[200px] max-w-[200px]">
            <SelectValue placeholder="เลือก Department">
              <span className="truncate block max-w-[160px]">{selectedCenter || 'เลือก Department'}</span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-w-[300px]">
            {departments.map((d) => (
              <SelectItem key={d} value={d}>
                <span className="truncate block max-w-[250px]">{d}</span>
              </SelectItem>
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

      {!selectedCenter ? (
        <div className="text-center py-12 text-[var(--text-muted)] text-sm">
          Select a department to view the report
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse bg-stone-100 dark:bg-stone-800 rounded-lg" />
          ))}
        </div>
      ) : report ? (
        <>
          {/* Chargeability display */}
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 font-[family-name:var(--font-heading)]">
              Chargeability
            </h3>
            <div className="flex items-center gap-4">
              <div className={`text-4xl font-bold ${chargeabilityColor(report.chargeability)}`}>
                {report.chargeability}%
              </div>
              <div className="flex-1">
                <div className="h-4 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
                  <div
                    className={`h-full rounded-full transition-all ${
                      report.chargeability >= 80 ? 'bg-[var(--accent-green)]' :
                      report.chargeability >= 60 ? 'bg-[var(--accent-amber)]' :
                      'bg-[var(--accent-red)]'
                    }`}
                    style={{ width: `${Math.min(100, report.chargeability)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Target: 80%</p>
              </div>
            </div>
          </div>

          {/* Horizontal bar chart: programs */}
          {report.chargeDistribution.length > 0 && (
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 font-[family-name:var(--font-heading)]">
                Charge Distribution by Program
              </h3>
              <div style={{ height: Math.max(200, report.chargeDistribution.length * 40 + 60) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={report.chargeDistribution}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                    <YAxis
                      dataKey="programName"
                      type="category"
                      width={120}
                      tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                    />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="chargeableHours" name="Chargeable" fill="var(--accent-teal)" stackId="hours" />
                    <Bar dataKey="nonChargeableHours" name="Non-Chargeable" fill="#94a3b8" stackId="hours" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Team member table */}
          {report.teamMembers.length > 0 && (
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 font-[family-name:var(--font-heading)]">
                Team Members
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-default)]">
                    <th className="text-left py-2 text-xs font-medium text-[var(--text-muted)]">Name</th>
                    <th className="text-right py-2 text-xs font-medium text-[var(--text-muted)]">Billable Hours</th>
                    <th className="text-right py-2 text-xs font-medium text-[var(--text-muted)]">Total Hours</th>
                    <th className="text-right py-2 text-xs font-medium text-[var(--text-muted)]">Chargeability</th>
                  </tr>
                </thead>
                <tbody>
                  {report.teamMembers.map((m) => (
                    <tr key={m.name} className="border-b border-[var(--border-default)] last:border-b-0">
                      <td className="py-2 text-[var(--text-primary)]">{m.name}</td>
                      <td className="py-2 text-right font-mono text-[var(--text-secondary)]">{m.billableHours}</td>
                      <td className="py-2 text-right font-mono text-[var(--text-secondary)]">{m.totalHours}</td>
                      <td className={`py-2 text-right font-mono font-medium ${chargeabilityColor(m.chargeability)}`}>
                        {m.chargeability}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
