'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XIcon,
  Loader2Icon,
} from 'lucide-react';

interface CalendarEntry {
  id: number;
  date: string;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName: string | null;
  countryCode: string;
}

interface VacationRequest {
  vacation: {
    id: number;
    userId: string;
    startDate: string;
    endDate: string;
    status: string;
    createdAt: string;
  };
  user: {
    id: string;
    fullName: string | null;
    email: string;
  };
}

const COUNTRY_CODES = [
  { value: 'TH', label: 'Thailand' },
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'JP', label: 'Japan' },
  { value: 'SG', label: 'Singapore' },
];

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

export default function CalendarManagementPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [countryCode, setCountryCode] = useState('TH');
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingVacations, setPendingVacations] = useState<VacationRequest[]>([]);

  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<CalendarEntry | null>(null);
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<CalendarEntry[]>(
        `/calendar?year=${year}&country_code=${countryCode}`,
      );
      setEntries(data);
    } catch (e) {
      console.error('Failed to fetch calendar:', e);
    } finally {
      setLoading(false);
    }
  }, [year, countryCode]);

  const fetchPendingVacations = useCallback(async () => {
    try {
      const data = await api.get<VacationRequest[]>('/vacations/pending');
      setPendingVacations(data);
    } catch {
      // User may not be a manager, ignore
    }
  }, []);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  useEffect(() => {
    fetchPendingVacations();
  }, [fetchPendingVacations]);

  const dateMap = new Map<string, CalendarEntry>();
  for (const entry of entries) {
    dateMap.set(entry.date, entry);
  }

  const holidays = entries.filter((e) => e.isHoliday);
  const today = new Date().toISOString().split('T')[0];

  async function handlePopulateWeekends() {
    setActionLoading(true);
    try {
      await api.post('/calendar/populate-weekends', { year });
      await fetchCalendar();
    } catch (e) {
      console.error('Failed to populate weekends:', e);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSaveHoliday() {
    setActionLoading(true);
    try {
      if (editingHoliday) {
        await api.put(`/calendar/holidays/${editingHoliday.id}`, {
          date: holidayDate,
          holidayName: holidayName,
          countryCode,
        });
      } else {
        await api.post('/calendar/holidays', {
          date: holidayDate,
          holidayName: holidayName,
          countryCode,
        });
      }
      setHolidayDialogOpen(false);
      setEditingHoliday(null);
      setHolidayDate('');
      setHolidayName('');
      await fetchCalendar();
    } catch (e) {
      console.error('Failed to save holiday:', e);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteHoliday(id: number) {
    setActionLoading(true);
    try {
      await api.delete(`/calendar/holidays/${id}`);
      await fetchCalendar();
    } catch (e) {
      console.error('Failed to delete holiday:', e);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleApproveVacation(id: number) {
    try {
      await api.post(`/vacations/${id}/approve`, {});
      await fetchPendingVacations();
    } catch (e) {
      console.error('Failed to approve vacation:', e);
    }
  }

  async function handleRejectVacation(id: number) {
    try {
      await api.post(`/vacations/${id}/reject`, {});
      await fetchPendingVacations();
    } catch (e) {
      console.error('Failed to reject vacation:', e);
    }
  }

  function openAddHoliday() {
    setEditingHoliday(null);
    setHolidayDate('');
    setHolidayName('');
    setHolidayDialogOpen(true);
  }

  function openEditHoliday(holiday: CalendarEntry) {
    setEditingHoliday(holiday);
    setHolidayDate(holiday.date);
    setHolidayName(holiday.holidayName || '');
    setHolidayDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Year navigation and controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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

          <Select value={countryCode} onValueChange={(v) => v && setCountryCode(v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNTRY_CODES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" onClick={handlePopulateWeekends} disabled={actionLoading}>
          {actionLoading && <Loader2Icon className="w-4 h-4 animate-spin mr-1" />}
          Populate Weekends
        </Button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[var(--accent-red-light)] border border-[var(--accent-red)]/20" />
          <span>Holiday</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-stone-200 dark:bg-stone-700 border border-stone-300 dark:border-stone-600" />
          <span>Weekend</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm ring-2 ring-[var(--accent-teal)] ring-inset bg-white dark:bg-stone-800" />
          <span>Today</span>
        </div>
      </div>

      {/* Calendar grid: 3x4 layout */}
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
              today={today}
            />
          ))}
        </div>
      )}

      {/* Holiday list table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Holidays ({year})</CardTitle>
          <Button onClick={openAddHoliday} size="sm">
            <PlusIcon className="w-4 h-4" />
            Add Holiday
          </Button>
          <Dialog open={holidayDialogOpen} onOpenChange={setHolidayDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">Date</label>
                  <Input
                    type="date"
                    value={holidayDate}
                    onChange={(e) => setHolidayDate(e.target.value)}
                    className="font-[family-name:var(--font-mono)]"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">
                    Holiday Name
                  </label>
                  <Input
                    value={holidayName}
                    onChange={(e) => setHolidayName(e.target.value)}
                    placeholder="e.g., New Year's Day"
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
                  onClick={handleSaveHoliday}
                  disabled={!holidayDate || !holidayName || actionLoading}
                >
                  {actionLoading && <Loader2Icon className="w-4 h-4 animate-spin mr-1" />}
                  {editingHoliday ? 'Update' : 'Add'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {holidays.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] py-8 text-center">
              No holidays configured for {year}. Add holidays or populate weekends to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Holiday Name</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-[family-name:var(--font-mono)]">
                      {formatDate(h.date)}
                    </TableCell>
                    <TableCell className="font-medium text-[var(--text-primary)]">
                      {h.holidayName}
                    </TableCell>
                    <TableCell className="text-[var(--text-secondary)]">{h.countryCode}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openEditHoliday(h)}
                        >
                          <PencilIcon className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon-xs"
                          onClick={() => handleDeleteHoliday(h.id)}
                          disabled={actionLoading}
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pending Vacation Requests */}
      {pendingVacations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Vacation Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingVacations.map((v) => (
                  <TableRow key={v.vacation.id}>
                    <TableCell className="font-medium text-[var(--text-primary)]">
                      {v.user.fullName || v.user.email}
                    </TableCell>
                    <TableCell className="font-[family-name:var(--font-mono)]">
                      {formatDate(v.vacation.startDate)}
                    </TableCell>
                    <TableCell className="font-[family-name:var(--font-mono)]">
                      {formatDate(v.vacation.endDate)}
                    </TableCell>
                    <TableCell className="font-[family-name:var(--font-mono)] text-[var(--text-secondary)]">
                      {formatDate(v.vacation.createdAt.split('T')[0])}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleApproveVacation(v.vacation.id)}
                          className="text-[var(--accent-green)] hover:text-[var(--accent-green)]"
                        >
                          <CheckIcon className="w-3.5 h-3.5 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="xs"
                          onClick={() => handleRejectVacation(v.vacation.id)}
                        >
                          <XIcon className="w-3.5 h-3.5 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MiniMonth({
  year,
  month,
  dateMap,
  today,
}: {
  year: number;
  month: number;
  dateMap: Map<string, CalendarEntry>;
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
        <CardTitle className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          {MONTH_NAMES[month]}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Day headers */}
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
        {/* Day cells */}
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

            let cellClass = 'aspect-square flex items-center justify-center text-[11px] rounded-md font-[family-name:var(--font-mono)] cursor-default ';

            if (isHoliday) {
              cellClass += 'bg-[var(--accent-red-light)] text-[var(--accent-red)] font-medium ';
            } else if (isWeekend) {
              cellClass += 'bg-stone-100 dark:bg-stone-800 text-[var(--text-muted)] ';
            } else {
              cellClass += 'text-[var(--text-primary)] ';
            }

            if (isToday) {
              cellClass += 'ring-2 ring-[var(--accent-teal)] ring-inset font-bold ';
            }

            return (
              <div
                key={dateStr}
                className={cellClass}
                title={entry?.holidayName || undefined}
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
