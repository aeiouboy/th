'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface DepartmentUtilization {
  department: string;
  rate: number;
  loggedHours: number;
  availableHours: number;
}

interface UtilizationChartProps {
  data: DepartmentUtilization[];
}

export function UtilizationChart({ data }: UtilizationChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">
        No utilization data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
        <XAxis
          dataKey="department"
          tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
          tickLine={{ stroke: 'var(--border-default)' }}
          axisLine={{ stroke: 'var(--border-default)' }}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 12, fill: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}
          tickLine={{ stroke: 'var(--border-default)' }}
          axisLine={{ stroke: 'var(--border-default)' }}
        />
        <Tooltip
          formatter={(value, name) => [`${Number(value).toFixed(1)}%`, String(name)]}
          contentStyle={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
            fontSize: '13px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
          labelStyle={{ fontWeight: 600, color: 'var(--text-primary)' }}
        />
        <Bar dataKey="rate" name="Utilization" radius={[4, 4, 0, 0]} animationDuration={800}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={
                entry.rate >= 80
                  ? 'var(--accent-green)'
                  : entry.rate >= 60
                    ? 'var(--accent-amber)'
                    : 'var(--accent-red)'
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
