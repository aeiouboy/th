'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

interface MonthData {
  month: string;
  chargeability: number;
  billableHours: number;
  totalHours: number;
}

interface ChargeabilityYtdResponse {
  months: MonthData[];
  ytdChargeability: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonth(monthStr: string): string {
  const parts = monthStr.split('-');
  const monthIndex = parseInt(parts[1], 10) - 1;
  return MONTH_NAMES[monthIndex] || monthStr;
}

export function ChargeabilityTrend() {
  const { data, isLoading } = useQuery<ChargeabilityYtdResponse>({
    queryKey: ['dashboard-chargeability-ytd'],
    queryFn: () => api.get('/dashboard/chargeability-ytd'),
  });

  const chartData = (data?.months || []).map((m) => ({
    ...m,
    label: formatMonth(m.month),
  }));

  return (
    <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <CardHeader>
        <CardTitle className="text-base font-[family-name:var(--font-heading)] font-semibold text-[var(--text-primary)]">
          Chargeability Trend
          {data && (
            <span className="ml-2 text-sm font-normal text-[var(--text-secondary)]">
              {data.ytdChargeability}% YTD
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[250px] animate-pulse bg-stone-200/60 dark:bg-stone-700/60 rounded" />
        ) : chartData.length === 0 ? (
          <div className="h-[250px] flex items-center justify-center text-sm text-[var(--text-muted)]">
            No data available yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                axisLine={{ stroke: 'var(--border-default)' }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                axisLine={{ stroke: 'var(--border-default)' }}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                formatter={(value) => [`${value}%`, 'Chargeability']}
                contentStyle={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
              />
              <ReferenceLine
                y={80}
                stroke="var(--text-muted)"
                strokeDasharray="6 4"
                label={{
                  value: '80% target',
                  position: 'right',
                  fontSize: 11,
                  fill: 'var(--text-muted)',
                }}
              />
              <Line
                type="monotone"
                dataKey="chargeability"
                stroke="#0d9488"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#0d9488', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#0d9488', strokeWidth: 2, stroke: '#fff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
