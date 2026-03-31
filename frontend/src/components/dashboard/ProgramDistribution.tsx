'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface ProgramData {
  programName: string;
  programId: string;
  hours: number;
  percentage: number;
}

interface ProgramDistributionResponse {
  currentPeriod: ProgramData[];
  ytd: ProgramData[];
}

const COLORS = ['#0d9488', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6', '#14b8a6'];

export function ProgramDistribution() {
  const [view, setView] = useState<'current' | 'ytd'>('current');

  const { data, isLoading } = useQuery<ProgramDistributionResponse>({
    queryKey: ['dashboard-program-distribution'],
    queryFn: () => api.get('/dashboard/program-distribution'),
  });

  const chartData = view === 'current' ? data?.currentPeriod || [] : data?.ytd || [];
  const totalHours = chartData.reduce((s, d) => s + d.hours, 0);

  return (
    <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-[family-name:var(--font-heading)] font-semibold text-[var(--text-primary)]">
          Program Distribution
        </CardTitle>
        <div className="flex gap-1">
          <Button
            variant={view === 'current' ? 'default' : 'outline'}
            size="sm"
            className={`text-xs h-7 ${view === 'current' ? 'bg-[var(--accent-teal)] hover:bg-teal-700 text-white' : ''}`}
            onClick={() => setView('current')}
          >
            Current Period
          </Button>
          <Button
            variant={view === 'ytd' ? 'default' : 'outline'}
            size="sm"
            className={`text-xs h-7 ${view === 'ytd' ? 'bg-[var(--accent-teal)] hover:bg-teal-700 text-white' : ''}`}
            onClick={() => setView('ytd')}
          >
            YTD
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[250px] animate-pulse bg-stone-200/60 dark:bg-stone-700/60 rounded" />
        ) : chartData.length === 0 ? (
          <div className="h-[250px] flex items-center justify-center text-sm text-[var(--text-muted)]">
            No data available yet
          </div>
        ) : (
          <div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="hours"
                  nameKey="programName"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                >
                  {chartData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [
                    `${Number(value)}h (${totalHours > 0 ? Math.round((Number(value) / totalHours) * 100) : 0}%)`,
                    String(name),
                  ]}
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="mt-3 space-y-1.5">
              {chartData.map((item, index) => (
                <div key={item.programId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-[var(--text-primary)] truncate">{item.programName}</span>
                  </div>
                  <span className="text-[var(--text-secondary)] shrink-0 ml-2">
                    {item.hours}h ({item.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
