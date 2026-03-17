'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface ActivityItem {
  category: string;
  hours: number;
  percentage: number;
}

interface ActivityPieProps {
  data: ActivityItem[];
}

const COLORS = [
  'var(--accent-teal)',
  'var(--accent-amber)',
  'var(--accent-purple)',
  'var(--accent-green)',
  '#64748b',
  '#e11d48',
  '#2563eb',
];

export function ActivityPie({ data }: ActivityPieProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">
        No activity data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={95}
          paddingAngle={3}
          dataKey="hours"
          nameKey="category"
          animationDuration={800}
        >
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [`${Number(value).toFixed(1)}h`]}
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
          wrapperStyle={{ fontSize: '12px' }}
          formatter={(value) => {
            const item = data.find((d) => d.category === value);
            return (
              <span style={{ color: 'var(--text-secondary)' }}>
                {value} ({item?.percentage ?? 0}%)
              </span>
            );
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
