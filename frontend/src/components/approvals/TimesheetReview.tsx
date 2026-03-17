'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface TimesheetEntry {
  id: string;
  chargeCodeId: string;
  date: string;
  hours: string;
  description: string | null;
  chargeCode: {
    id: string;
    name: string;
  };
}

interface TimesheetDetail {
  id: string;
  periodStart: string;
  periodEnd: string;
  entries: TimesheetEntry[];
  employee: {
    id: string;
    fullName: string | null;
    email: string;
    department: string | null;
  };
}

// Mock data for when API is unavailable
const mockDetail: TimesheetDetail = {
  id: 'mock',
  periodStart: '2026-03-01',
  periodEnd: '2026-03-15',
  entries: [
    { id: 'e1', chargeCodeId: 'PRJ-042', date: '2026-03-03', hours: '4.0', description: null, chargeCode: { id: 'PRJ-042', name: 'Web Portal' } },
    { id: 'e2', chargeCodeId: 'PRJ-042', date: '2026-03-04', hours: '4.0', description: null, chargeCode: { id: 'PRJ-042', name: 'Web Portal' } },
    { id: 'e3', chargeCodeId: 'PRJ-042', date: '2026-03-05', hours: '4.0', description: null, chargeCode: { id: 'PRJ-042', name: 'Web Portal' } },
    { id: 'e4', chargeCodeId: 'PRJ-042', date: '2026-03-06', hours: '4.0', description: null, chargeCode: { id: 'PRJ-042', name: 'Web Portal' } },
    { id: 'e5', chargeCodeId: 'PRJ-042', date: '2026-03-07', hours: '4.0', description: null, chargeCode: { id: 'PRJ-042', name: 'Web Portal' } },
    { id: 'e6', chargeCodeId: 'ACT-010', date: '2026-03-03', hours: '2.0', description: null, chargeCode: { id: 'ACT-010', name: 'Code Review' } },
    { id: 'e7', chargeCodeId: 'ACT-010', date: '2026-03-04', hours: '2.0', description: null, chargeCode: { id: 'ACT-010', name: 'Code Review' } },
    { id: 'e8', chargeCodeId: 'ACT-010', date: '2026-03-05', hours: '2.0', description: null, chargeCode: { id: 'ACT-010', name: 'Code Review' } },
    { id: 'e9', chargeCodeId: 'TSK-005', date: '2026-03-03', hours: '2.0', description: null, chargeCode: { id: 'TSK-005', name: 'Meetings' } },
    { id: 'e10', chargeCodeId: 'TSK-005', date: '2026-03-04', hours: '2.0', description: null, chargeCode: { id: 'TSK-005', name: 'Meetings' } },
    { id: 'e11', chargeCodeId: 'TSK-005', date: '2026-03-05', hours: '2.0', description: null, chargeCode: { id: 'TSK-005', name: 'Meetings' } },
  ],
  employee: { id: 'u-001', fullName: 'John Doe', email: 'john@company.com', department: 'Engineering' },
};

export function TimesheetReview({ timesheetId }: { timesheetId: string }) {
  const [detail, setDetail] = useState<TimesheetDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<TimesheetDetail>(`/approvals/${timesheetId}/detail`)
      .then(setDetail)
      .catch(() => {
        // Use mock data on failure
        setDetail({ ...mockDetail, id: timesheetId });
      })
      .finally(() => setLoading(false));
  }, [timesheetId]);

  if (loading) {
    return (
      <div className="py-4 animate-pulse space-y-2">
        <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-48" />
        <div className="h-32 bg-stone-100 dark:bg-stone-800 rounded" />
      </div>
    );
  }

  if (!detail || detail.entries.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-[var(--text-muted)]">
        No entries found
      </div>
    );
  }

  // Group entries by charge code
  const grouped: Record<
    string,
    { chargeCode: { id: string; name: string }; entries: TimesheetEntry[] }
  > = {};
  for (const entry of detail.entries) {
    if (!grouped[entry.chargeCodeId]) {
      grouped[entry.chargeCodeId] = {
        chargeCode: entry.chargeCode,
        entries: [],
      };
    }
    grouped[entry.chargeCodeId].entries.push(entry);
  }

  // Build date columns from periodStart to periodEnd
  const dates: string[] = [];
  const start = new Date(detail.periodStart);
  const end = new Date(detail.periodEnd);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }

  // Compute daily totals
  const dailyTotals: Record<string, number> = {};
  for (const date of dates) {
    dailyTotals[date] = 0;
  }
  for (const group of Object.values(grouped)) {
    for (const entry of group.entries) {
      dailyTotals[entry.date] = (dailyTotals[entry.date] || 0) + parseFloat(entry.hours);
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border-default)]">
      <Table>
        <TableHeader>
          <TableRow className="bg-stone-100 dark:bg-stone-800 border-b border-[var(--border-default)]">
            <TableHead className="sticky left-0 bg-stone-100 dark:bg-stone-800 min-w-[180px] text-xs uppercase tracking-wider font-medium text-[var(--text-secondary)]">
              Charge Code
            </TableHead>
            {dates.map((d) => {
              const dayOfWeek = new Date(d + 'T00:00:00').getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              return (
                <TableHead
                  key={d}
                  className={`text-center min-w-[52px] text-xs font-medium ${
                    isWeekend ? 'bg-stone-200 dark:bg-stone-700 text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {formatShortDate(d)}
                </TableHead>
              );
            })}
            <TableHead className="text-center font-semibold text-xs uppercase tracking-wider text-[var(--text-primary)]">
              Total
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.values(grouped).map((group) => {
            const hoursByDate: Record<string, number> = {};
            let rowTotal = 0;
            for (const entry of group.entries) {
              const h = parseFloat(entry.hours);
              hoursByDate[entry.date] = (hoursByDate[entry.date] || 0) + h;
              rowTotal += h;
            }
            return (
              <TableRow key={group.chargeCode.id} className="border-b border-[var(--border-default)]">
                <TableCell className="sticky left-0 bg-[var(--bg-card)] font-medium">
                  <span className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-mono)]">
                    {group.chargeCode.id}
                  </span>
                  <br />
                  <span className="text-sm text-[var(--text-primary)]">{group.chargeCode.name}</span>
                </TableCell>
                {dates.map((d) => {
                  const dayOfWeek = new Date(d + 'T00:00:00').getDay();
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                  return (
                    <TableCell
                      key={d}
                      className={`text-center font-[family-name:var(--font-mono)] text-sm ${
                        isWeekend ? 'bg-stone-100 dark:bg-stone-800/50 text-[var(--text-muted)]' : ''
                      } ${hoursByDate[d] ? 'text-[var(--accent-teal)] font-medium' : 'text-[var(--text-muted)]'}`}
                    >
                      {hoursByDate[d] ? hoursByDate[d].toFixed(1) : '-'}
                    </TableCell>
                  );
                })}
                <TableCell className="text-center font-semibold font-[family-name:var(--font-mono)] text-[var(--text-primary)]">
                  {rowTotal.toFixed(1)}
                </TableCell>
              </TableRow>
            );
          })}
          {/* Daily totals row */}
          <TableRow className="bg-stone-50 dark:bg-stone-900/50 border-t-2 border-[var(--border-default)]">
            <TableCell className="sticky left-0 bg-stone-50 dark:bg-stone-900/50 font-semibold text-xs uppercase text-[var(--text-secondary)]">
              Daily Total
            </TableCell>
            {dates.map((d) => (
              <TableCell key={d} className="text-center font-[family-name:var(--font-mono)] text-xs font-semibold text-[var(--text-primary)]">
                {dailyTotals[d] ? dailyTotals[d].toFixed(1) : '-'}
              </TableCell>
            ))}
            <TableCell className="text-center font-bold font-[family-name:var(--font-mono)] text-[var(--text-primary)]">
              {Object.values(dailyTotals).reduce((a, b) => a + b, 0).toFixed(1)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${days[d.getDay()]}\n${d.getDate()}`;
}
