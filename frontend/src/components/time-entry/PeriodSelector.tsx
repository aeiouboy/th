'use client';

import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { startOfWeek, addDays, format, subWeeks } from 'date-fns';

interface PeriodSelectorProps {
  currentWeekStart: Date;
  onSelect: (weekStart: Date) => void;
}

export function PeriodSelector({ currentWeekStart, onSelect }: PeriodSelectorProps) {
  const weeks = useMemo(() => {
    const now = new Date();
    const thisMonday = startOfWeek(now, { weekStartsOn: 1 });
    const result: { value: string; label: string; date: Date }[] = [];

    // Generate 104 weeks: current + 103 past weeks
    for (let i = 0; i < 104; i++) {
      const monday = subWeeks(thisMonday, i);
      const friday = addDays(monday, 4);
      const weekNum = getISOWeekNumber(monday);
      const label = `Week ${weekNum} (${format(monday, 'MMM d')}\u2013${format(friday, 'd, yyyy')})`;
      result.push({
        value: format(monday, 'yyyy-MM-dd'),
        label,
        date: monday,
      });
    }

    return result;
  }, []);

  const currentValue = format(currentWeekStart, 'yyyy-MM-dd');

  return (
    <Select
      value={currentValue}
      onValueChange={(val) => {
        const week = weeks.find((w) => w.value === val);
        if (week) onSelect(week.date);
      }}
    >
      <SelectTrigger className="w-[280px] text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {weeks.map((week) => (
          <SelectItem key={week.value} value={week.value}>
            {week.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
