'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  Loader2Icon,
  CalendarDays,
  Palmtree,
} from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';

interface CalendarEntry {
  id: number;
  date: string;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName: string | null;
  countryCode: string;
}

interface VacationRequest {
  id: number;
  userId: string;
  startDate: string;
  endDate: string;
  status: string;
  approvedBy: string | null;
  createdAt: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getVacationDatesSet(vacations: VacationRequest[]): Set<string> {
  const set = new Set<string>();
  for (const v of vacations) {
    if (v.status !== 'approved') continue;
    const start = new Date(v.startDate + 'T00:00:00');
    const end = new Date(v.endDate + 'T00:00:00');
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      set.add(d.toISOString().split('T')[0]);
    }
  }
  return set;
}

const STATUS_BADGE: Record<string, 'amber' | 'green' | 'destructive' | 'secondary'> = {
  pending: 'amber',
  approved: 'green',
  rejected: 'destructive',
};

export default function CalendarPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [vacations, setVacations] = useState<VacationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [vacationDialogOpen, setVacationDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<CalendarEntry[]>(`/calendar?year=${year}`);
      setEntries(data);
    } catch {
      // handled by api wrapper
    } finally {
      setLoading(false);
    }
  }, [year]);

  const fetchVacations = useCallback(async () => {
    try {
      const data = await api.get<VacationRequest[]>('/vacations/me');
      setVacations(data);
    } catch {
      // handled by api wrapper
    }
  }, []);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  useEffect(() => {
    fetchVacations();
  }, [fetchVacations]);

  const dateMap = new Map<string, CalendarEntry>();
  for (const entry of entries) {
    dateMap.set(entry.date, entry);
  }

  const vacationDates = getVacationDatesSet(vacations);
  const today = new Date().toISOString().split('T')[0];

  async function handleRequestVacation() {
    if (!startDate || !endDate) return;
    setSubmitting(true);
    try {
      await api.post('/vacations', { startDate, endDate });
      toast.success('Vacation request submitted');
      setVacationDialogOpen(false);
      setStartDate('');
      setEndDate('');
      await fetchVacations();
    } catch {
      // handled by api wrapper
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="View holidays, weekends, and manage your vacation requests"
      />

      {/* Year navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setYear((y) => y - 1)}>
            <ChevronLeftIcon className="w-4 h-4" />
          </Button>
          <span className="text-2xl font-bold text-[var(--text-primary)] min-w-[80px] text-center font-[family-name:var(--font-heading)]">
            {year}
          </span>
          <Button variant="outline" size="icon" onClick={() => setYear((y) => y + 1)}>
            <ChevronRightIcon className="w-4 h-4" />
          </Button>
        </div>

        <Button onClick={() => setVacationDialogOpen(true)}>
          <PlusIcon className="w-4 h-4" />
          Request Vacation
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[var(--accent-red-light)] border border-[var(--accent-red)]/20" />
          <span>Holiday</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-stone-200 dark:bg-stone-700 border border-stone-300 dark:border-stone-600" />
          <span>Weekend</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700" />
          <span>My Vacation</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm ring-2 ring-[var(--accent-teal)] ring-inset bg-white dark:bg-stone-800" />
          <span>Today</span>
        </div>
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2Icon className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }, (_, monthIdx) => (
            <MiniMonth
              key={monthIdx}
              year={year}
              month={monthIdx}
              dateMap={dateMap}
              vacationDates={vacationDates}
              today={today}
            />
          ))}
        </div>
      )}

      {/* My Vacation Requests */}
      <Card>
        <CardHeader>
          <CardTitle>My Vacation Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {vacations.length === 0 ? (
            <EmptyState
              icon={Palmtree}
              title="No vacation requests"
              description="Click 'Request Vacation' to submit a new request"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vacations.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>{formatDate(v.startDate)}</TableCell>
                    <TableCell>{formatDate(v.endDate)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[v.status] ?? 'secondary'}>
                        {v.status.charAt(0).toUpperCase() + v.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[var(--text-secondary)]">
                      {formatDate(v.createdAt.split('T')[0])}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Request Vacation Dialog */}
      <Dialog open={vacationDialogOpen} onOpenChange={setVacationDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Vacation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="font-[family-name:var(--font-mono)]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="font-[family-name:var(--font-mono)]"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" />}
            >
              Cancel
            </DialogClose>
            <Button
              onClick={handleRequestVacation}
              disabled={!startDate || !endDate || submitting}
            >
              {submitting && <Loader2Icon className="w-4 h-4 animate-spin mr-1" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MiniMonth({
  year,
  month,
  dateMap,
  vacationDates,
  today,
}: {
  year: number;
  month: number;
  dateMap: Map<string, CalendarEntry>;
  vacationDates: Set<string>;
  today: string;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <Card size="sm" className="hover:translate-y-0 hover:shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-semibold text-[var(--text-secondary)] tracking-wider">
          {MONTH_NAMES[month]}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-7 mb-1">
          {DAY_HEADERS.map((d, i) => (
            <div
              key={i}
              className={`text-center text-[10px] font-medium py-0.5 ${
                i >= 5 ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'
              }`}
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px">
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} className="aspect-square" />;
            }

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const entry = dateMap.get(dateStr);
            const isToday = dateStr === today;
            const isWeekend = entry?.isWeekend ?? false;
            const isHoliday = entry?.isHoliday ?? false;
            const isVacation = vacationDates.has(dateStr);

            let cellClass = 'aspect-square flex items-center justify-center text-[11px] rounded-md font-[family-name:var(--font-mono)] cursor-default ';

            if (isHoliday) {
              cellClass += 'bg-[var(--accent-red-light)] text-[var(--accent-red)] font-medium ';
            } else if (isVacation) {
              cellClass += 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium ';
            } else if (isWeekend) {
              cellClass += 'bg-stone-100 dark:bg-stone-800 text-[var(--text-muted)] ';
            } else {
              cellClass += 'text-[var(--text-primary)] ';
            }

            if (isToday) {
              cellClass += 'ring-2 ring-[var(--accent-teal)] ring-inset font-bold ';
            }

            const title = entry?.holidayName || (isVacation ? 'Vacation' : undefined);

            return (
              <div
                key={dateStr}
                className={cellClass}
                title={title}
              >
                {day}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
