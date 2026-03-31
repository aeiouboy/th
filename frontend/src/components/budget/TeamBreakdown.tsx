'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Users } from 'lucide-react';

interface TeamData {
  team: string;
  hours: number;
  cost: number;
  percentage: number;
}

interface TeamBreakdownResponse {
  chargeCodeId: string;
  topTeams: TeamData[];
}

export function TeamBreakdown({ chargeCodeId }: { chargeCodeId: string }) {
  const { data, isLoading } = useQuery<TeamBreakdownResponse>({
    queryKey: ['budget-team-breakdown', chargeCodeId],
    queryFn: () => api.get(`/budgets/${encodeURIComponent(chargeCodeId)}/team-breakdown`),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="w-3.5 h-3.5 border-2 border-[var(--accent-teal)] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-[var(--text-muted)]">Loading team breakdown...</span>
      </div>
    );
  }

  const teams = data?.topTeams ?? [];
  if (teams.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 text-xs text-[var(--text-muted)]">
        <Users className="w-3.5 h-3.5" />
        No team data available
      </div>
    );
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-1.5 mb-2.5">
        <Users className="w-3.5 h-3.5 text-[var(--text-muted)]" />
        <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          Team Breakdown (Top {teams.length})
        </span>
      </div>
      <div className="space-y-2">
        {teams.map((team) => (
          <div key={team.team} className="flex items-center gap-3">
            <span className="text-xs text-[var(--text-primary)] w-28 truncate font-medium" title={team.team}>
              {team.team}
            </span>
            <div className="flex-1 h-2 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--accent-teal)] transition-all duration-500"
                style={{ width: `${Math.min(team.percentage, 100)}%` }}
              />
            </div>
            <span className="text-[11px] text-[var(--text-secondary)] tabular-nums w-10 text-right font-medium">
              {team.percentage}%
            </span>
            <span className="text-[11px] text-[var(--text-muted)] tabular-nums w-14 text-right">
              {team.hours}h
            </span>
            <span className="text-[11px] text-[var(--text-muted)] tabular-nums w-20 text-right">
              {formatCurrency(team.cost)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
