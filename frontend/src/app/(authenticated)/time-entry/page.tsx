'use client';

import { useState, useCallback, useEffect, useRef, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TimesheetGrid, type GridData, type DescriptionData } from '@/components/timesheet/TimesheetGrid';
import { ChargeCodeSelector } from '@/components/timesheet/ChargeCodeSelector';
import {
  addDays,
  subDays,
  startOfWeek,
  format,
} from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { PeriodSelector } from '@/components/time-entry/PeriodSelector';
import { RequestChargeCode } from '@/components/time-entry/RequestChargeCode';

interface Timesheet {
  id: string;
  userId: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  submittedAt: string | null;
  entries?: Entry[];
}

interface Entry {
  id: string;
  chargeCodeId: string;
  date: string;
  hours: string;
  description: string | null;
  chargeCodeName?: string;
  isBillable?: boolean | null;
}

interface ChargeCode {
  chargeCodeId: string;
  name: string;
  isBillable: boolean | null;
  programName: string | null;
  activityCategory: string | null;
}

interface VacationRequest {
  id: number;
  userId: string;
  startDate: string;
  endDate: string;
  leaveType: 'full_day' | 'half_am' | 'half_pm';
  status: 'pending' | 'approved' | 'rejected';
}

interface CalendarDay {
  id: number;
  date: string;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName: string | null;
  countryCode: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-stone-100 text-stone-600',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-[var(--accent-green-light)] text-[var(--accent-green)]',
  manager_approved: 'bg-[var(--accent-green-light)] text-[var(--accent-green)]',
  cc_approved: 'bg-[var(--accent-green-light)] text-[var(--accent-green)]',
  locked: 'bg-purple-100 text-purple-700',
  rejected: 'bg-[var(--accent-red-light)] text-[var(--accent-red)]',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  manager_approved: 'Approved',
  cc_approved: 'Approved',
  locked: 'Locked',
  rejected: 'Rejected',
};


export default function TimeEntryPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20 text-[var(--text-muted)]">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-[var(--accent-teal)] border-t-transparent rounded-full animate-spin" />
          Loading timesheet...
        </div>
      </div>
    }>
      <TimeEntryContent />
    </Suspense>
  );
}

function TimeEntryContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Sync weekStart with URL ?week=yyyy-MM-dd — survives page reload
  const [weekStart, setWeekStartState] = useState(() => {
    const weekParam = searchParams.get('week');
    if (weekParam) {
      const parsed = new Date(weekParam + 'T00:00:00');
      if (!isNaN(parsed.getTime())) return startOfWeek(parsed, { weekStartsOn: 1 });
    }
    return startOfWeek(new Date(), { weekStartsOn: 1 });
  });

  const setWeekStart = useCallback((date: Date) => {
    setWeekStartState(date);
    const params = new URLSearchParams(searchParams.toString());
    params.set('week', format(date, 'yyyy-MM-dd'));
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);
  const [gridData, setGridData] = useState<GridData>({});
  const [activeRows, setActiveRows] = useState<
    { chargeCodeId: string; name: string; isBillable: boolean | null }[]
  >([]);
  const [descriptions, setDescriptions] = useState<DescriptionData>({});
  const [isDirty, setIsDirty] = useState(false);
  const [minHoursWarning, setMinHoursWarning] = useState<{ day: string; hours: number }[] | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const periodStr = format(weekStart, 'yyyy-MM-dd');

  // Fetch charge codes assigned to user
  const { data: rawChargeCodes = [], isPending: chargeCodesLoading, isError: chargeCodesError } = useQuery<ChargeCode[]>({
    queryKey: ['timesheet-charge-codes'],
    queryFn: ({ signal }) => api.get('/timesheets/charge-codes', signal),
    retry: 3,
  });

  // Filter out LEAVE-001 from the selector dropdown — it's managed as a system row
  const chargeCodes = rawChargeCodes.filter((c) => !c.chargeCodeId.startsWith('LEAVE-'));

  // Fetch user's approved vacations
  const { data: vacations = [] } = useQuery<VacationRequest[]>({
    queryKey: ['my-vacations'],
    queryFn: ({ signal }) => api.get('/vacations/me', signal),
  });

  // Fetch holidays from calendar API for the year of the current week
  const calendarYear = weekStart.getFullYear();
  const { data: calendarDays = [] } = useQuery<CalendarDay[]>({
    queryKey: ['calendar', calendarYear],
    queryFn: ({ signal }) => api.get(`/calendar?year=${calendarYear}`, signal),
  });

  // Build sets of full-day and half-day vacation dates for the current week
  const { vacationDates, halfDayDates } = useMemo(() => {
    const fullSet = new Set<string>();
    const halfSet = new Set<string>();
    const weekEndDate = addDays(weekStart, 6);
    for (const v of vacations) {
      if (v.status !== 'approved') continue;
      const leaveType = v.leaveType || 'full_day';
      const vStart = new Date(Math.max(new Date(v.startDate).getTime(), weekStart.getTime()));
      const vEnd = new Date(Math.min(new Date(v.endDate).getTime(), weekEndDate.getTime()));
      for (let d = new Date(vStart); d <= vEnd; d.setDate(d.getDate() + 1)) {
        const dateStr = format(d, 'yyyy-MM-dd');
        if (leaveType === 'full_day') {
          fullSet.add(dateStr);
        } else {
          halfSet.add(dateStr);
        }
      }
    }
    return { vacationDates: fullSet, halfDayDates: halfSet };
  }, [vacations, weekStart]);

  // Build a set of holiday dates for the current week
  const holidayDates = useMemo(() => {
    const set = new Set<string>();
    const weekEndStr = format(addDays(weekStart, 6), 'yyyy-MM-dd');
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    for (const day of calendarDays) {
      if (day.isHoliday && day.date >= weekStartStr && day.date <= weekEndStr) {
        set.add(day.date);
      }
    }
    return set;
  }, [calendarDays, weekStart]);

  // Fetch or create timesheet for the period
  const { data: rawTimesheet, isLoading: timesheetLoading } = useQuery<Timesheet | null>({
    queryKey: ['timesheet', periodStr],
    queryFn: async ({ signal }) => {
      const existing = await api.get<Timesheet | null>(
        `/timesheets?period=${periodStr}`,
        signal,
      );
      if (existing) return existing;
      return api.post<Timesheet>('/timesheets', {
        period_start: periodStr,
        period_end: format(addDays(weekStart, 6), 'yyyy-MM-dd'),
      });
    },
  });

  const timesheet = rawTimesheet ?? null;

  // Fetch entries when we have a timesheet
  const { data: entriesData } = useQuery<Entry[]>({
    queryKey: ['timesheet-entries', timesheet?.id],
    queryFn: ({ signal }) => api.get(`/timesheets/${timesheet!.id}/entries`, signal),
    enabled: !!timesheet?.id,
  });

  // Populate grid from entries
  useEffect(() => {
    const entries = entriesData ?? [];

    const newGrid: GridData = {};
    const newDescriptions: DescriptionData = {};
    const rowMap = new Map<
      string,
      { chargeCodeId: string; name: string; isBillable: boolean | null }
    >();

    for (const entry of entries) {
      if (!newGrid[entry.chargeCodeId]) {
        newGrid[entry.chargeCodeId] = {};
      }
      newGrid[entry.chargeCodeId][entry.date] = parseFloat(entry.hours);

      if (entry.description) {
        if (!newDescriptions[entry.chargeCodeId]) {
          newDescriptions[entry.chargeCodeId] = {};
        }
        newDescriptions[entry.chargeCodeId][entry.date] = entry.description;
      }

      if (!rowMap.has(entry.chargeCodeId)) {
        rowMap.set(entry.chargeCodeId, {
          chargeCodeId: entry.chargeCodeId,
          name: entry.chargeCodeName || entry.chargeCodeId,
          isBillable: entry.isBillable ?? null,
        });
      }
    }

    // Auto-add LEAVE-001 row when user has approved vacations in the current week
    if ((vacationDates.size > 0 || halfDayDates.size > 0) && !rowMap.has('LEAVE-001')) {
      rowMap.set('LEAVE-001', { chargeCodeId: 'LEAVE-001', name: 'Annual Leave', isBillable: null });
      newGrid['LEAVE-001'] = {};
      for (const dateStr of vacationDates) {
        newGrid['LEAVE-001'][dateStr] = 8;
      }
      for (const dateStr of halfDayDates) {
        newGrid['LEAVE-001'][dateStr] = 4;
      }
    }

    setGridData(newGrid);
    setDescriptions(newDescriptions);
    setActiveRows(Array.from(rowMap.values()));
    setIsDirty(false);
  }, [entriesData, weekStart, vacationDates, halfDayDates]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!timesheet?.id) return;
      const entries: {
        charge_code_id: string;
        date: string;
        hours: number;
        description?: string;
      }[] = [];

      for (const row of activeRows) {
        // Skip system charge codes — they are managed by the backend
        if (row.chargeCodeId === 'LEAVE-001') continue;
        const rowData = gridData[row.chargeCodeId] || {};
        for (const [date, hours] of Object.entries(rowData)) {
          if (hours > 0) {
            const desc = descriptions[row.chargeCodeId]?.[date];
            entries.push({
              charge_code_id: row.chargeCodeId,
              date,
              hours,
              ...(desc ? { description: desc } : {}),
            });
          }
        }
      }

      return api.put(`/timesheets/${timesheet.id}/entries`, { entries });
    },
    onSuccess: () => {
      setIsDirty(false);
      queryClient.invalidateQueries({
        queryKey: ['timesheet', periodStr],
      });
      queryClient.invalidateQueries({
        queryKey: ['timesheet-entries', timesheet?.id],
      });
      toast.success('Timesheet saved');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to save');
    },
  });

  // Copy from previous period mutation
  const copyMutation = useMutation({
    mutationFn: async () => {
      if (!timesheet?.id) return;
      return api.post(`/timesheets/${timesheet.id}/copy-from-previous`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['timesheet-entries', timesheet?.id],
      });
      toast.success('Charge codes copied from previous period');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to copy');
    },
  });

  const canCopyFromPrevious = timesheet?.status === 'draft' && activeRows.filter(r => r.chargeCodeId !== 'LEAVE-001').length === 0;

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!timesheet?.id) return;
      await saveMutation.mutateAsync();
      return api.post(`/timesheets/${timesheet.id}/submit`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['timesheet', periodStr],
      });
      toast.success('Timesheet submitted for approval');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to submit');
    },
  });

  // Check min hours before submitting
  const checkMinHoursAndSubmit = useCallback(() => {
    const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const incompleteDays: { day: string; hours: number }[] = [];

    for (let i = 0; i < 5; i++) {
      const date = format(addDays(weekStart, i), 'yyyy-MM-dd');
      // Skip approved vacation days and holidays
      if (vacationDates.has(date) || holidayDates.has(date)) continue;
      let total = 0;
      for (const row of activeRows) {
        total += gridData[row.chargeCodeId]?.[date] || 0;
      }
      total = Math.round(total * 100) / 100;
      // Only validate days that have entries — allow submitting without filling every day
      if (total > 0 && total < 8) {
        incompleteDays.push({ day: `${DAYS[i]} (${format(addDays(weekStart, i), 'MMM d')})`, hours: total });
      }
    }

    if (incompleteDays.length > 0) {
      setMinHoursWarning(incompleteDays);
    } else {
      submitMutation.mutate();
    }
  }, [weekStart, activeRows, gridData, submitMutation, vacationDates, holidayDates]);

  const canEdit =
    !timesheet?.status || ['draft', 'rejected'].includes(timesheet.status);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setInterval(() => {
      if (isDirty && timesheet?.id && canEdit) {
        saveMutation.mutate();
      }
    }, 30000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [isDirty, timesheet?.id, canEdit, saveMutation]);

  const handleCellChange = useCallback(
    (chargeCodeId: string, date: string, hours: number) => {
      // Prevent editing system charge codes
      if (chargeCodeId === 'LEAVE-001') return;
      setGridData((prev) => ({
        ...prev,
        [chargeCodeId]: {
          ...prev[chargeCodeId],
          [date]: hours,
        },
      }));
      setIsDirty(true);
    },
    [],
  );

  const handleDescriptionChange = useCallback(
    (chargeCodeId: string, date: string, description: string) => {
      setDescriptions((prev) => ({
        ...prev,
        [chargeCodeId]: {
          ...prev[chargeCodeId],
          [date]: description,
        },
      }));
      setIsDirty(true);
    },
    [],
  );

  const handleAddCode = useCallback(
    (code: { chargeCodeId: string; name: string; isBillable: boolean | null }) => {
      setActiveRows((prev) => {
        if (prev.find((r) => r.chargeCodeId === code.chargeCodeId)) return prev;
        return [...prev, code];
      });
    },
    [],
  );

  const handleRemoveRow = useCallback((chargeCodeId: string) => {
    // Prevent removing system charge codes like LEAVE-001
    if (chargeCodeId === 'LEAVE-001') return;
    setActiveRows((prev) => prev.filter((r) => r.chargeCodeId !== chargeCodeId));
    setGridData((prev) => {
      const next = { ...prev };
      delete next[chargeCodeId];
      return next;
    });
    setIsDirty(true);
  }, []);

  const usedCodeIds = useMemo(
    () => new Set(activeRows.map((r) => r.chargeCodeId)),
    [activeRows],
  );

  const weekEnd = addDays(weekStart, 6);
  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const isCurrentOrFutureWeek = weekStart >= currentWeekStart;

  // Cutoff warning: 3 day grace period after period end
  // Cutoff: 15th or end of month (per PRD)
  const cutoffInfo = useMemo(() => {
    if (!timesheet?.periodEnd) return null;
    const periodEnd = new Date(timesheet.periodEnd + 'T00:00:00Z');
    const year = periodEnd.getUTCFullYear();
    const month = periodEnd.getUTCMonth();
    const day = periodEnd.getUTCDate();
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const cutoff = day <= 15
      ? new Date(Date.UTC(year, month, 15))
      : new Date(Date.UTC(year, month, lastDay));

    const today = new Date(new Date().toISOString().split('T')[0] + 'T00:00:00Z');
    const diffMs = cutoff.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { status: 'closed' as const, cutoffDate: format(cutoff, 'MMM d, yyyy'), daysLeft: 0 };
    if (diffDays <= 3) return { status: 'warning' as const, cutoffDate: format(cutoff, 'MMM d, yyyy'), daysLeft: diffDays };
    return null;
  }, [timesheet?.periodEnd]);

  return (
    <div className="max-w-[1200px] mx-auto space-y-4">
      {/* Period navigator */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekStart(subDays(weekStart, 7))}
              className="h-8 w-8 p-0"
            >
              <ChevronLeftIcon />
            </Button>
            <div>
              <h2 className="text-lg font-[family-name:var(--font-heading)] font-semibold text-[var(--text-primary)]">
                Week of {format(weekStart, 'MMM d')} &ndash;{' '}
                {format(weekEnd, 'd, yyyy')}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                {format(weekStart, 'MMMM yyyy')}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              disabled={isCurrentOrFutureWeek}
              className="h-8 w-8 p-0"
              title={isCurrentOrFutureWeek ? 'Cannot navigate to future weeks' : undefined}
            >
              <ChevronRightIcon />
            </Button>
            <PeriodSelector
              currentWeekStart={weekStart}
              onSelect={(d) => setWeekStart(d)}
            />
          </div>
          <div className="flex items-center gap-3">
            {timesheet?.status && (
              <Badge className={`${STATUS_COLORS[timesheet.status] || ''} font-medium`}>
                {STATUS_LABELS[timesheet.status] || timesheet.status}
              </Badge>
            )}
            {isDirty && (
              <span className="text-xs text-[var(--accent-amber)] font-medium">
                Unsaved
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Cutoff warning banner */}
      {cutoffInfo?.status === 'warning' && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" /><path d="M12 17h.01" />
          </svg>
          <span>
            Submission closes in <strong>{cutoffInfo.daysLeft} day{cutoffInfo.daysLeft !== 1 ? 's' : ''}</strong> (cutoff: {cutoffInfo.cutoffDate})
          </span>
        </div>
      )}
      {cutoffInfo?.status === 'closed' && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm dark:bg-red-950/30 dark:border-red-800 dark:text-red-200">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" />
          </svg>
          <span>
            Submission period closed (cutoff was {cutoffInfo.cutoffDate}). Contact your manager for late submission.
          </span>
        </div>
      )}

      {/* Grid card */}
      <Card className="p-0 overflow-hidden border border-[var(--border-default)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {timesheetLoading && !timesheet ? (
          <div className="flex items-center justify-center py-20 text-[var(--text-muted)]">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-[var(--accent-teal)] border-t-transparent rounded-full animate-spin" />
              Loading timesheet...
            </div>
          </div>
        ) : (
          <TimesheetGrid
            weekStart={weekStart}
            rows={activeRows}
            data={gridData}
            descriptions={descriptions}
            onCellChange={handleCellChange}
            onDescriptionChange={handleDescriptionChange}
            disabled={!canEdit}
            onRemoveRow={handleRemoveRow}
            vacationDates={vacationDates}
            halfDayDates={halfDayDates}
            holidayDates={holidayDates}
          />
        )}
      </Card>

      {/* Actions bar (sticky bottom) */}
      <div className="sticky bottom-0 z-20 bg-[var(--bg-card)]/95 backdrop-blur-sm border border-[var(--border-default)] rounded-xl shadow-lg p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {canEdit && !chargeCodesLoading && !chargeCodesError && (
            <ChargeCodeSelector
              availableCodes={chargeCodes}
              usedCodeIds={usedCodeIds}
              onSelect={handleAddCode}
            />
          )}
          {canEdit && <RequestChargeCode />}
          {canEdit && canCopyFromPrevious && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => copyMutation.mutate()}
              disabled={copyMutation.isPending}
            >
              {copyMutation.isPending ? 'Copying...' : 'Copy from Last Period'}
            </Button>
          )}
          <span className="text-[11px] text-[var(--text-muted)]">
            Auto-saves every 30s
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => saveMutation.mutate()}
            disabled={!canEdit || saveMutation.isPending || !timesheet?.id}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Draft'}
          </Button>
          {canEdit ? (
            <Button
              className="bg-[var(--accent-teal)] hover:bg-teal-700 text-white"
              onClick={checkMinHoursAndSubmit}
              disabled={submitMutation.isPending || !timesheet?.id || cutoffInfo?.status === 'closed'}
              title={cutoffInfo?.status === 'closed' ? 'Submission period closed' : undefined}
            >
              {submitMutation.isPending ? 'Submitting...' : 'Submit'}
              {!submitMutation.isPending && <span className="ml-1">&rarr;</span>}
            </Button>
          ) : (
            <span className="text-sm text-[var(--text-secondary)]">
              This timesheet is {STATUS_LABELS[timesheet?.status || ''] || timesheet?.status} and cannot be edited.
            </span>
          )}
        </div>
      </div>

      {/* Min hours warning dialog */}
      <Dialog open={minHoursWarning !== null} onOpenChange={(open) => { if (!open) setMinHoursWarning(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Incomplete Hours</DialogTitle>
            <DialogDescription>
              The following days have less than 8 hours logged:
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-1.5 text-sm">
            {minHoursWarning?.map(({ day, hours }) => (
              <li key={day} className="flex items-center justify-between px-3 py-1.5 rounded-md bg-[var(--accent-red-light)]/30">
                <span className="font-medium text-[var(--text-primary)]">{day}</span>
                <span className="font-[family-name:var(--font-mono)] text-[var(--accent-red)] font-medium">
                  {hours.toFixed(1)}h / 8h
                </span>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button
              className="bg-[var(--accent-teal)] hover:bg-teal-700 text-white"
              onClick={() => setMinHoursWarning(null)}
            >
              OK, Got It
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Icons ---

function ChevronLeftIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
