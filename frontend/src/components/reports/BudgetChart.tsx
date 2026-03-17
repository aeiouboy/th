'use client';

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

interface BudgetChartItem {
  chargeCodeId: string;
  chargeCodeName: string;
  budgetAmount: number;
  actualSpent: number;
  forecast?: number | null;
}

interface BudgetChartProps {
  data: BudgetChartItem[];
}


export function BudgetChart({ data }: BudgetChartProps) {
  const chartData = data.map((d, i) => ({
    name: d.chargeCodeName.length > 15 ? d.chargeCodeName.substring(0, 15) + '...' : d.chargeCodeName,
    Budget: d.budgetAmount,
    Actual: d.actualSpent,
    Remaining: Math.max(0, d.budgetAmount - d.actualSpent),
    Forecast: d.forecast ?? undefined,
    _animDelay: i * 100,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">
        No budget data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
          tickLine={{ stroke: 'var(--border-default)' }}
          axisLine={{ stroke: 'var(--border-default)' }}
        />
        <YAxis
          tickFormatter={(value) => formatCurrency(value)}
          tick={{ fontSize: 12, fill: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}
          tickLine={{ stroke: 'var(--border-default)' }}
          axisLine={{ stroke: 'var(--border-default)' }}
        />
        <Tooltip
          formatter={(value, name) => [formatCurrency(Number(value)), String(name)]}
          contentStyle={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
            fontSize: '13px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
          labelStyle={{ fontWeight: 600, color: 'var(--text-primary)' }}
        />
        <Legend
          wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }}
        />
        <Bar
          dataKey="Actual"
          fill="var(--accent-teal)"
          radius={[4, 4, 0, 0]}
          animationDuration={800}
          animationBegin={0}
        />
        <Bar
          dataKey="Budget"
          fill="var(--border-default)"
          radius={[4, 4, 0, 0]}
          animationDuration={800}
          animationBegin={600}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
