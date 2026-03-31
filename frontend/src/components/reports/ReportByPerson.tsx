'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
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
import { Search, Clock, DollarSign, Percent, Calendar } from 'lucide-react';

interface User {
  id: string;
  email: string;
  fullName: string | null;
  department: string | null;
}

interface PersonReport {
  person: { id: string; name: string; department: string | null } | null;
  history: { month: string; programs: { name: string; hours: number }[] }[];
  projectSummary: { name: string; hoursYtd: number; costYtd: number; percentage: number }[];
  vacationDays: number;
  totalHours: number;
}

function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getYearStart() {
  return `${new Date().getFullYear()}-01`;
}

// Generate unique colors for programs in stacked chart
const PROGRAM_COLORS = [
  'var(--accent-teal)',
  'var(--accent-amber)',
  'var(--accent-purple)',
  'var(--accent-red)',
  '#64748b',
  '#06b6d4',
  '#8b5cf6',
  '#f97316',
];

export function ReportByPerson() {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [periodFrom, setPeriodFrom] = useState(getYearStart());
  const [periodTo, setPeriodTo] = useState(getCurrentPeriod());
  const [searchQuery, setSearchQuery] = useState('');

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users'),
  });

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        (u.fullName?.toLowerCase().includes(q)) ||
        u.email.toLowerCase().includes(q),
    );
  }, [users, searchQuery]);

  const { data: report, isLoading } = useQuery<PersonReport>({
    queryKey: ['reports', 'by-person', selectedUser, periodFrom, periodTo],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('userId', selectedUser);
      if (periodFrom) params.set('periodFrom', periodFrom);
      if (periodTo) params.set('periodTo', periodTo);
      return api.get(`/reports/by-person?${params.toString()}`);
    },
    enabled: !!selectedUser,
  });

  const periodOptions = useMemo(() => {
    const options: string[] = [];
    const now = new Date();
    for (let i = -12; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      options.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return options;
  }, []);

  // Build stacked bar chart data from history
  const { chartData, programNames } = useMemo(() => {
    if (!report?.history.length) return { chartData: [], programNames: [] };

    const allPrograms = new Set<string>();
    for (const h of report.history) {
      for (const p of h.programs) allPrograms.add(p.name);
    }
    const programNames = Array.from(allPrograms);

    const chartData = report.history.map((h) => {
      const entry: Record<string, string | number> = {
        month: new Date(h.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      };
      for (const p of h.programs) {
        entry[p.name] = p.hours;
      }
      return entry;
    });

    return { chartData, programNames };
  }, [report]);

  // Compute billable hours from project summary
  const billableHours = report?.totalHours ?? 0;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-[240px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <Input
            placeholder="Search person..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 h-9 text-sm"
          />
        </div>

        <Select value={selectedUser} onValueChange={(v) => v && setSelectedUser(v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="เลือกบุคคล">
              {selectedUser ? (users.find((u) => u.id === selectedUser)?.fullName ?? users.find((u) => u.id === selectedUser)?.email ?? selectedUser) : 'เลือกบุคคล'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {filteredUsers.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.fullName ?? u.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={periodFrom} onValueChange={(v) => v && setPeriodFrom(v)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="From" />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map((p) => (
              <SelectItem key={p} value={p}>
                {new Date(p + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-sm text-[var(--text-muted)]">to</span>

        <Select value={periodTo} onValueChange={(v) => v && setPeriodTo(v)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="To" />
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

      {!selectedUser ? (
        <div className="text-center py-12 text-[var(--text-muted)] text-sm">
          Select a person to view the report
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse bg-stone-100 dark:bg-stone-800 rounded-lg" />
          ))}
        </div>
      ) : report ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              label="Total Hours"
              value={String(report.totalHours)}
              icon={Clock}
              accent="var(--accent-teal)"
            />
            <SummaryCard
              label="Billable Hours"
              value={String(billableHours)}
              icon={DollarSign}
              accent="var(--accent-green)"
            />
            <SummaryCard
              label="Chargeability"
              value={report.totalHours > 0 ? `${Math.round((billableHours / report.totalHours) * 100)}%` : '0%'}
              icon={Percent}
              accent="var(--accent-amber)"
            />
            <SummaryCard
              label="Vacation Days"
              value={String(report.vacationDays)}
              icon={Calendar}
              accent="var(--accent-purple)"
            />
          </div>

          {/* Stacked bar chart: monthly hours per program */}
          {chartData.length > 0 && (
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 font-[family-name:var(--font-heading)]">
                Monthly Hours by Program
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    {programNames.map((name, i) => (
                      <Bar
                        key={name}
                        dataKey={name}
                        stackId="hours"
                        fill={PROGRAM_COLORS[i % PROGRAM_COLORS.length]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Project Summary table */}
          {report.projectSummary.length > 0 && (
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 font-[family-name:var(--font-heading)]">
                Project Summary
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-default)]">
                    <th className="text-left py-2 text-xs font-medium text-[var(--text-muted)]">Project</th>
                    <th className="text-right py-2 text-xs font-medium text-[var(--text-muted)]">Hours (YTD)</th>
                    <th className="text-right py-2 text-xs font-medium text-[var(--text-muted)]">Cost (YTD)</th>
                    <th className="text-right py-2 text-xs font-medium text-[var(--text-muted)]">%</th>
                  </tr>
                </thead>
                <tbody>
                  {report.projectSummary.map((p) => (
                    <tr key={p.name} className="border-b border-[var(--border-default)] last:border-b-0">
                      <td className="py-2 text-[var(--text-primary)]">{p.name}</td>
                      <td className="py-2 text-right font-mono text-[var(--text-secondary)]">{p.hoursYtd}</td>
                      <td className="py-2 text-right font-mono text-[var(--text-secondary)]">{formatCurrency(p.costYtd)}</td>
                      <td className="py-2 text-right font-mono text-[var(--text-secondary)]">{p.percentage}%</td>
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

function SummaryCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  accent: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]" style={{ borderTopColor: accent, borderTopWidth: '2px' }}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" style={{ color: accent }} />
        <span className="text-xs text-[var(--text-muted)]">{label}</span>
      </div>
      <div className="text-xl font-bold text-[var(--text-primary)]">{value}</div>
    </div>
  );
}
