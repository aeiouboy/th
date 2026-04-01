'use client';

import { useCallback, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { EntryCell } from './EntryCell';
import { EntryNoteDialog } from './EntryNoteDialog';
import { format, addDays, parseISO } from 'date-fns';

interface ChargeCodeRow {
  chargeCodeId: string;
  name: string;
  isBillable: boolean | null;
}

const SYSTEM_CHARGE_CODES = new Set(['LEAVE-001']);

export interface GridData {
  [chargeCodeId: string]: {
    [date: string]: number;
  };
}

export interface DescriptionData {
  [chargeCodeId: string]: {
    [date: string]: string;
  };
}

interface TimesheetGridProps {
  weekStart: Date;
  rows: ChargeCodeRow[];
  data: GridData;
  descriptions?: DescriptionData;
  onCellChange: (chargeCodeId: string, date: string, hours: number) => void;
  onDescriptionChange?: (chargeCodeId: string, date: string, description: string) => void;
  disabled?: boolean;
  onRemoveRow?: (chargeCodeId: string) => void;
  vacationDates?: Set<string>;
  halfDayDates?: Set<string>;
  holidayDates?: Set<string>;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TARGET_HOURS = 8;

export function TimesheetGrid({
  weekStart,
  rows,
  data,
  descriptions,
  onCellChange,
  onDescriptionChange,
  disabled,
  onRemoveRow,
  vacationDates,
  halfDayDates,
  holidayDates,
}: TimesheetGridProps) {
  const [activeNote, setActiveNote] = useState<{ chargeCodeId: string; date: string } | null>(null);

  const dates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekStart, i);
      return format(d, 'yyyy-MM-dd');
    });
  }, [weekStart]);

  const isWeekend = useCallback((idx: number) => idx >= 5, []);

  const isVacation = useCallback(
    (dateStr: string) => vacationDates?.has(dateStr) ?? false,
    [vacationDates],
  );

  const isHoliday = useCallback(
    (dateStr: string) => holidayDates?.has(dateStr) ?? false,
    [holidayDates],
  );

  const isHalfDayVacation = useCallback(
    (dateStr: string) => halfDayDates?.has(dateStr) ?? false,
    [halfDayDates],
  );

  const isNonWorking = useCallback(
    (idx: number) => isWeekend(idx) || isVacation(dates[idx]) || isHoliday(dates[idx]),
    [isWeekend, isVacation, isHoliday, dates],
  );

  const dailyTotals = useMemo(() => {
    return dates.map((date) => {
      let total = 0;
      for (const row of rows) {
        total += data[row.chargeCodeId]?.[date] || 0;
      }
      return Math.round(total * 100) / 100;
    });
  }, [dates, rows, data]);

  const rowTotals = useMemo(() => {
    return rows.map((row) => {
      let total = 0;
      for (const date of dates) {
        total += data[row.chargeCodeId]?.[date] || 0;
      }
      return Math.round(total * 100) / 100;
    });
  }, [dates, rows, data]);

  const grandTotal = useMemo(
    () => Math.round(dailyTotals.reduce((s, v) => s + v, 0) * 100) / 100,
    [dailyTotals],
  );

  const variances = useMemo(
    () => dailyTotals.map((t, i) => (isNonWorking(i) ? null : Math.round((t - TARGET_HOURS) * 100) / 100)),
    [dailyTotals, isNonWorking],
  );

  const activeNoteRow = activeNote
    ? rows.find((r) => r.chargeCodeId === activeNote.chargeCodeId)
    : null;

  return (
    <div className="overflow-x-auto">
      <EntryNoteDialog
        open={activeNote !== null}
        onOpenChange={(open) => { if (!open) setActiveNote(null); }}
        chargeCodeName={activeNoteRow?.name ?? ''}
        date={activeNote?.date ?? ''}
        description={activeNote ? (descriptions?.[activeNote.chargeCodeId]?.[activeNote.date] ?? '') : ''}
        onSave={(desc) => {
          if (activeNote && onDescriptionChange) {
            onDescriptionChange(activeNote.chargeCodeId, activeNote.date, desc);
          }
        }}
      />
      <table className="w-full border-collapse min-w-[800px]">
        <thead>
          <tr className="border-b border-[var(--border-default)]">
            <th className="text-left px-3 py-2.5 font-[family-name:var(--font-heading)] font-semibold text-sm text-[var(--text-primary)] w-56 sticky left-0 bg-[var(--bg-card)] z-10">
              Charge Code
            </th>
            {dates.map((date, i) => (
              <th
                key={date}
                className={`text-center px-2 py-2.5 font-[family-name:var(--font-heading)] font-semibold text-xs w-24 ${
                  isNonWorking(i) ? 'bg-stone-50 text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
                }`}
              >
                <div>{DAYS[i]}</div>
                <div className="font-[family-name:var(--font-mono)] font-normal text-[var(--text-muted)] mt-0.5 text-[11px]">
                  {format(parseISO(date), 'd')}{isHalfDayVacation(date) && ' (½)'}
                </div>
                {isVacation(date) && !isHalfDayVacation(date) && (
                  <div className="text-[10px] text-purple-500 font-medium mt-0.5">Vacation</div>
                )}
                {isHalfDayVacation(date) && (
                  <div className="text-[10px] text-purple-500 font-medium mt-0.5">Half-day</div>
                )}
                {isHoliday(date) && !isVacation(date) && (
                  <div className="text-[10px] text-orange-500 font-medium mt-0.5">Holiday</div>
                )}
              </th>
            ))}
            <th className="text-center px-2 py-2.5 font-[family-name:var(--font-heading)] font-semibold text-xs text-[var(--text-primary)] w-20 bg-stone-50/50">
              TOTAL
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr
              key={row.chargeCodeId}
              className={`border-b border-stone-100 transition-colors ${
                SYSTEM_CHARGE_CODES.has(row.chargeCodeId)
                  ? 'bg-purple-50/50 dark:bg-purple-950/20'
                  : 'hover:bg-stone-50/30'
              }`}
            >
              <td className="px-3 py-2 sticky left-0 bg-[var(--bg-card)] z-10">
                <div className="flex items-center gap-2">
                  <div className="min-w-0">
                    <div className="font-[family-name:var(--font-mono)] text-xs text-[var(--text-secondary)]">
                      {row.chargeCodeId}
                    </div>
                    <div className="text-sm font-medium text-[var(--text-primary)] truncate max-w-36">
                      {row.name}
                    </div>
                  </div>
                  <Badge
                    className={`shrink-0 text-[10px] rounded-[999px] ${
                      SYSTEM_CHARGE_CODES.has(row.chargeCodeId)
                        ? 'bg-purple-100 text-purple-600 border-purple-200'
                        : row.isBillable
                          ? 'bg-[var(--accent-teal-light)] text-[var(--accent-teal)] border-teal-200'
                          : 'bg-[var(--accent-amber-light)] text-[var(--accent-amber)] border-amber-200'
                    }`}
                  >
                    {SYSTEM_CHARGE_CODES.has(row.chargeCodeId) ? 'System - Leave' : row.isBillable ? 'billable' : 'non-billable'}
                  </Badge>
                  {onRemoveRow && !disabled && !SYSTEM_CHARGE_CODES.has(row.chargeCodeId) && (
                    <button
                      type="button"
                      onClick={() => onRemoveRow(row.chargeCodeId)}
                      className="ml-auto text-stone-300 hover:text-[var(--accent-red)] text-xs transition-colors"
                      title="Remove row"
                    >
                      &times;
                    </button>
                  )}
                </div>
              </td>
              {dates.map((date, colIdx) => (
                <td
                  key={date}
                  className={`px-1.5 py-1.5 ${isNonWorking(colIdx) ? 'bg-stone-50' : ''}`}
                >
                  <EntryCell
                    value={data[row.chargeCodeId]?.[date] || 0}
                    onChange={(v) => onCellChange(row.chargeCodeId, date, v)}
                    disabled={
                      disabled ||
                      SYSTEM_CHARGE_CODES.has(row.chargeCodeId) ||
                      isWeekend(colIdx) ||
                      isHoliday(date) ||
                      (isVacation(date) && !isHalfDayVacation(date))
                    }
                    maxHours={isHalfDayVacation(date) && !SYSTEM_CHARGE_CODES.has(row.chargeCodeId) ? 4 : undefined}
                    isBillable={row.isBillable ?? false}
                    description={descriptions?.[row.chargeCodeId]?.[date]}
                    onNoteClick={() => setActiveNote({ chargeCodeId: row.chargeCodeId, date })}
                  />
                </td>
              ))}
              <td className="px-2 py-1.5 text-center font-[family-name:var(--font-mono)] text-sm font-medium text-[var(--text-primary)] bg-stone-50/50">
                {rowTotals[rowIdx].toFixed(2)}
              </td>
            </tr>
          ))}

          {rows.length === 0 && (
            <tr>
              <td
                colSpan={9}
                className="text-center py-12 text-[var(--text-muted)] text-sm"
              >
                No charge codes added. Use the button below to add one.
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          {/* Daily totals */}
          <tr className="border-t-2 border-stone-300 bg-stone-50/70">
            <td className="px-3 py-2 text-sm font-semibold text-[var(--text-primary)] font-[family-name:var(--font-heading)] sticky left-0 bg-stone-50 z-10">
              Daily Total
            </td>
            {dailyTotals.map((total, i) => (
              <td
                key={i}
                className={`text-center py-2 font-[family-name:var(--font-mono)] text-sm font-semibold text-[var(--text-primary)] ${isNonWorking(i) ? 'bg-stone-100/50' : ''}`}
              >
                {total.toFixed(2)}
              </td>
            ))}
            <td className="text-center py-2 font-[family-name:var(--font-mono)] text-sm font-bold text-[var(--text-primary)] bg-stone-50">
              {grandTotal.toFixed(2)}
            </td>
          </tr>

          {/* Required row */}
          <tr className="bg-stone-50/30">
            <td className="px-3 py-1.5 text-xs text-[var(--text-muted)] font-[family-name:var(--font-heading)] font-medium sticky left-0 bg-[var(--bg-card)] z-10">
              Required
            </td>
            {dates.map((_, i) => (
              <td
                key={i}
                className="text-center py-1.5 font-[family-name:var(--font-mono)] text-xs text-[var(--text-muted)]"
              >
                {isNonWorking(i) ? '-' : `${TARGET_HOURS}.00`}
              </td>
            ))}
            <td className="text-center py-1.5 font-[family-name:var(--font-mono)] text-xs text-[var(--text-muted)]">
              {(dates.filter((_, i) => !isNonWorking(i)).length * TARGET_HOURS).toFixed(2)}
            </td>
          </tr>

          {/* Variance row */}
          <tr>
            <td className="px-3 py-1.5 text-xs text-[var(--text-muted)] font-[family-name:var(--font-heading)] font-medium sticky left-0 bg-[var(--bg-card)] z-10">
              Variance
            </td>
            {variances.map((v, i) => {
              if (v === null) {
                return (
                  <td
                    key={i}
                    className="text-center py-1.5 font-[family-name:var(--font-mono)] text-xs text-stone-300"
                  >
                    -
                  </td>
                );
              }
              const met = v >= 0;
              return (
                <td
                  key={i}
                  className={`text-center py-1.5 font-[family-name:var(--font-mono)] text-xs font-medium ${
                    met
                      ? 'text-[var(--accent-green)]'
                      : 'text-[var(--accent-red)] bg-[var(--accent-red-light)]/30'
                  }`}
                >
                  {met ? (
                    <span>&#10003;</span>
                  ) : (
                    v.toFixed(1)
                  )}
                </td>
              );
            })}
            <td className="text-center py-1.5 font-[family-name:var(--font-mono)] text-xs font-medium">
              {(() => {
                const weekdayTotal = variances
                  .filter((v): v is number => v !== null)
                  .reduce((s, v) => s + v, 0);
                const val = Math.round(weekdayTotal * 100) / 100;
                return (
                  <span className={val >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}>
                    {val >= 0 ? <>&#10003;</> : val.toFixed(1)}
                  </span>
                );
              })()}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
