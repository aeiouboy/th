'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TimesheetGrid, type GridData } from '@/components/timesheet/TimesheetGrid';
import { ChargeCodeSelector } from '@/components/timesheet/ChargeCodeSelector';
import {
  addDays,
  subDays,
  startOfWeek,
  format,
} from 'date-fns';
import { toast } from 'sonner';

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

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-stone-100 text-stone-600',
  submitted: 'bg-blue-100 text-blue-700',
  manager_approved: 'bg-[var(--accent-teal-light)] text-[var(--accent-teal)]',
  cc_approved: 'bg-[var(--accent-green-light)] text-[var(--accent-green)]',
  locked: 'bg-purple-100 text-purple-700',
  rejected: 'bg-[var(--accent-red-light)] text-[var(--accent-red)]',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  manager_approved: 'Manager Approved',
  cc_approved: 'CC Approved',
  locked: 'Locked',
  rejected: 'Rejected',
};


export default function TimeEntryPage() {
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [gridData, setGridData] = useState<GridData>({});
  const [activeRows, setActiveRows] = useState<
    { chargeCodeId: string; name: string; isBillable: boolean | null }[]
  >([]);
  const [isDirty, setIsDirty] = useState(false);
  const [viewMode, setViewMode] = useState<'week' | 'biweek'>('week');
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const periodStr = format(weekStart, 'yyyy-MM-dd');

  // Fetch charge codes assigned to user
  const { data: rawChargeCodes = [] } = useQuery<ChargeCode[]>({
    queryKey: ['timesheet-charge-codes'],
    queryFn: () => api.get('/timesheets/charge-codes'),
  });

  const chargeCodes = rawChargeCodes;

  // Fetch or create timesheet for the period
  const { data: rawTimesheet, isLoading: timesheetLoading } = useQuery<Timesheet | null>({
    queryKey: ['timesheet', periodStr],
    queryFn: async () => {
      const existing = await api.get<Timesheet | null>(
        `/timesheets?period=${periodStr}`,
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
    queryFn: () => api.get(`/timesheets/${timesheet!.id}/entries`),
    enabled: !!timesheet?.id,
  });

  // Populate grid from entries
  useEffect(() => {
    const entries = entriesData ?? [];

    const newGrid: GridData = {};
    const rowMap = new Map<
      string,
      { chargeCodeId: string; name: string; isBillable: boolean | null }
    >();

    for (const entry of entries) {
      if (!newGrid[entry.chargeCodeId]) {
        newGrid[entry.chargeCodeId] = {};
      }
      newGrid[entry.chargeCodeId][entry.date] = parseFloat(entry.hours);

      if (!rowMap.has(entry.chargeCodeId)) {
        rowMap.set(entry.chargeCodeId, {
          chargeCodeId: entry.chargeCodeId,
          name: entry.chargeCodeName || entry.chargeCodeId,
          isBillable: entry.isBillable ?? null,
        });
      }
    }

    setGridData(newGrid);
    setActiveRows(Array.from(rowMap.values()));
    setIsDirty(false);
  }, [entriesData, weekStart]);

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
        const rowData = gridData[row.chargeCodeId] || {};
        for (const [date, hours] of Object.entries(rowData)) {
          if (hours > 0) {
            entries.push({
              charge_code_id: row.chargeCodeId,
              date,
              hours,
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
  }, [isDirty, timesheet?.id]);

  const canEdit =
    !timesheet?.status || timesheet.status === 'draft' || timesheet.status === 'rejected';

  const handleCellChange = useCallback(
    (chargeCodeId: string, date: string, hours: number) => {
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
                Semi-monthly period 2 of 2
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              className="h-8 w-8 p-0"
            >
              <ChevronRightIcon />
            </Button>
          </div>
          <div className="flex items-center gap-3">
            {timesheet?.status && (
              <Badge className={`${STATUS_COLORS[timesheet.status] || ''} font-medium`}>
                {STATUS_LABELS[timesheet.status] || timesheet.status}
              </Badge>
            )}
            {isDirty && (
              <span className="text-xs text-[var(--accent-amber)] font-medium font-[family-name:var(--font-mono)]">
                Unsaved
              </span>
            )}
            {/* Week/Bi-week toggle */}
            <div className="flex rounded-md border border-[var(--border-default)] overflow-hidden">
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  viewMode === 'week'
                    ? 'bg-[var(--accent-teal)] text-white'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-stone-50 dark:hover:bg-stone-800'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('biweek')}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  viewMode === 'biweek'
                    ? 'bg-[var(--accent-teal)] text-white'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-stone-50 dark:hover:bg-stone-800'
                }`}
              >
                Bi-week
              </button>
            </div>
          </div>
        </div>
      </div>

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
            onCellChange={handleCellChange}
            disabled={!canEdit}
            onRemoveRow={handleRemoveRow}
          />
        )}
      </Card>

      {/* Actions bar (sticky bottom) */}
      <div className="sticky bottom-0 z-20 bg-[var(--bg-card)]/95 backdrop-blur-sm border border-[var(--border-default)] rounded-xl shadow-lg p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {canEdit && (
            <ChargeCodeSelector
              availableCodes={chargeCodes}
              usedCodeIds={usedCodeIds}
              onSelect={handleAddCode}
            />
          )}
          <span className="text-[11px] text-[var(--text-muted)] font-[family-name:var(--font-mono)]">
            Auto-saves every 30s
          </span>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              <Button
                variant="outline"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !timesheet?.id}
              >
                {saveMutation.isPending ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button
                className="bg-[var(--accent-teal)] hover:bg-teal-700 text-white"
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending || !timesheet?.id}
              >
                {submitMutation.isPending ? 'Submitting...' : 'Submit'}
                {!submitMutation.isPending && <span className="ml-1">&rarr;</span>}
              </Button>
            </>
          )}
          {!canEdit && (
            <span className="text-sm text-[var(--text-secondary)]">
              This timesheet is {timesheet?.status} and cannot be edited.
            </span>
          )}
        </div>
      </div>
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
