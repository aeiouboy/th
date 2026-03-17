'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ChargeabilityMember {
  userId: string;
  fullName: string;
  chargeabilityRate: number;
}

interface ChargeabilityGaugeProps {
  members: ChargeabilityMember[];
  target: number;
}

export function ChargeabilityGauge({ members, target }: ChargeabilityGaugeProps) {
  const chartData = members.slice(0, 12).map((m) => ({
    name: m.fullName.length > 18 ? m.fullName.substring(0, 18) + '...' : m.fullName,
    rate: m.chargeabilityRate,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">
        No chargeability data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 10, right: 30, left: 80, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 12, fill: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}
          tickLine={{ stroke: 'var(--border-default)' }}
          axisLine={{ stroke: 'var(--border-default)' }}
        />
        <YAxis
          dataKey="name"
          type="category"
          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          width={75}
          tickLine={false}
          axisLine={{ stroke: 'var(--border-default)' }}
        />
        <Tooltip
          formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Chargeability']}
          contentStyle={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
            fontSize: '13px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
          labelStyle={{ fontWeight: 600, color: 'var(--text-primary)' }}
        />
        <ReferenceLine
          x={target}
          stroke="var(--text-muted)"
          strokeDasharray="4 4"
          strokeWidth={2}
          label={{ value: `${target}% Target`, position: 'top', fontSize: 11, fill: 'var(--text-muted)' }}
        />
        <Bar dataKey="rate" radius={[0, 4, 4, 0]} animationDuration={800}>
          {chartData.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.rate >= target ? 'var(--accent-green)' : 'var(--accent-red)'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
