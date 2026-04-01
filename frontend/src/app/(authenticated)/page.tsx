'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { format, startOfWeek, addDays, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { formatCurrencyStatic } from '@/lib/currency';
import { StatCard } from '@/components/shared/StatCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { Clock, Percent, ClipboardCheck, Tag, CheckCircle, Users, Bell, AlertTriangle } from 'lucide-react';
import { ChargeabilityTrend } from '@/components/dashboard/ChargeabilityTrend';
import { ProgramDistribution } from '@/components/dashboard/ProgramDistribution';

// --- Types ---

interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  department: string | null;
  jobGrade: string | null;
}

interface Timesheet {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  submittedAt: string | null;
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
}

interface PendingTimesheet {
  id: string;
  userId: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  submittedAt: string | null;
  totalHours: number;
  employee: {
    id: string;
    fullName: string | null;
    email: string;
    department: string | null;
  };
}

interface PendingResponse {
  pending: PendingTimesheet[];
}

interface BudgetAlert {
  chargeCodeId: string;
  name: string;
  budget: number;
  actual: number;
  forecast: number | null;
  severity: string;
  rootCauseActivity: string | null;
}

interface TeamStatusResponse {
  periodStart: string;
  periodEnd: string;
  workingDayCount: number;
  targetHours: number;
  members: {
    id: string;
    fullName: string;
    email: string;
    department: string | null;
    status: string;
    totalHours: number;
    targetHours: number;
    incompleteDays: number;
    workingDayCount: number;
  }[];
}

// --- Constants ---

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-stone-100 text-stone-600',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  manager_approved: 'bg-emerald-100 text-emerald-700',
  cc_approved: 'bg-emerald-100 text-emerald-700',
  locked: 'bg-purple-100 text-purple-700',
  rejected: 'bg-red-100 text-red-700',
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

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const TARGET_WEEKLY = 40;
const TARGET_DAILY = 8;

function getWeekPeriod() {
  return format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

// --- Main Component ---

export default function DashboardPage() {
  const period = getWeekPeriod();
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);

  const { data: user, isLoading: userLoading } = useQuery<UserProfile>({
    queryKey: ['me'],
    queryFn: () => api.get('/users/me'),
  });

  const { data: timesheet, isLoading: timesheetLoading } = useQuery<Timesheet | null>({
    queryKey: ['timesheet', period],
    queryFn: () => api.get(`/timesheets?period=${period}`),
  });

  const { data: entries = [], isLoading: entriesLoading } = useQuery<Entry[]>({
    queryKey: ['timesheet-entries-dashboard', timesheet?.id],
    queryFn: () => api.get(`/timesheets/${timesheet!.id}/entries`),
    enabled: !!timesheet?.id,
  });

  const prevPeriod = format(addDays(weekStart, -7), 'yyyy-MM-dd');

  const { data: prevTimesheet } = useQuery<Timesheet | null>({
    queryKey: ['timesheet', prevPeriod],
    queryFn: () => api.get(`/timesheets?period=${prevPeriod}`),
  });

  const { data: prevEntries = [] } = useQuery<Entry[]>({
    queryKey: ['timesheet-entries-prev', prevTimesheet?.id],
    queryFn: () => api.get(`/timesheets/${prevTimesheet!.id}/entries`),
    enabled: !!prevTimesheet?.id,
  });

  const { data: chargeCodes = [] } = useQuery<ChargeCode[]>({
    queryKey: ['timesheet-charge-codes'],
    queryFn: () => api.get('/timesheets/charge-codes'),
  });

  const isManager = isManagerRole(user?.role);

  const { data: pending } = useQuery<PendingResponse>({
    queryKey: ['pending-approvals'],
    queryFn: () => api.get('/approvals/pending'),
    enabled: isManager,
  });

  const hasBudgetAccess = canViewBudgets(user?.role);

  const { data: budgetAlerts = [] } = useQuery<BudgetAlert[]>({
    queryKey: ['budget-alerts'],
    queryFn: () => api.get('/budgets/alerts'),
    enabled: hasBudgetAccess,
  });

  const showTeamStatus = user?.role === 'admin' || user?.role === 'charge_manager';

  const { data: teamStatus, isLoading: teamStatusLoading } = useQuery<TeamStatusResponse>({
    queryKey: ['team-status'],
    queryFn: () => api.get('/approvals/team-status'),
    enabled: showTeamStatus,
  });

  const { data: chargeabilityYtd } = useQuery<{ ytdChargeability: number }>({
    queryKey: ['dashboard-chargeability-ytd'],
    queryFn: () => api.get('/dashboard/chargeability-ytd'),
  });

  const { data: myCcRequests = [] } = useQuery<{ id: string; chargeCodeId: string; chargeCodeName: string; status: string; createdAt: string }[]>({
    queryKey: ['my-cc-requests'],
    queryFn: () => api.get('/charge-codes/my-requests'),
  });

  const { data: pendingCcRequests = [] } = useQuery<{ id: string; requesterId: string; chargeCodeId: string; chargeCodeName: string; requesterName: string | null; requesterEmail: string; reason: string | null; status: string; createdAt: string }[]>({
    queryKey: ['pending-cc-requests'],
    queryFn: () => api.get('/charge-codes/access-requests/list'),
    enabled: isManager,
  });

  // Compute metrics
  const dates = useMemo(
    () => Array.from({ length: 5 }, (_, i) => format(addDays(weekStart, i), 'yyyy-MM-dd')),
    [weekStart],
  );

  const dailyHours = useMemo(() => {
    return dates.map((date) =>
      entries
        .filter((e) => e.date === date)
        .reduce((s, e) => s + parseFloat(e.hours), 0),
    );
  }, [dates, entries]);

  const weeklyHours = dailyHours.reduce((s, h) => s + h, 0);
  const billableHours = entries
    .filter((e) => e.isBillable)
    .reduce((s, e) => s + parseFloat(e.hours), 0);
  const chargeability =
    weeklyHours > 0 ? Math.round((billableHours / weeklyHours) * 100) : 0;
  const pendingCount = pending
    ? pending.pending.length
    : 0;
  const prevWeeklyHours = prevEntries.reduce((s, e) => s + parseFloat(e.hours), 0);
  const prevBillableHours = prevEntries
    .filter((e) => e.isBillable)
    .reduce((s, e) => s + parseFloat(e.hours), 0);
  const prevChargeability =
    prevWeeklyHours > 0 ? Math.round((prevBillableHours / prevWeeklyHours) * 100) : 0;

  const hoursDelta = prevTimesheet ? weeklyHours - prevWeeklyHours : undefined;
  const chargeabilityDelta = prevTimesheet ? chargeability - prevChargeability : undefined;

  const progressPct = Math.min((weeklyHours / TARGET_WEEKLY) * 100, 100);
  const missingHours = Math.max(TARGET_WEEKLY - weeklyHours, 0);

  const weekLabel = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
  const loading = userLoading;

  // Recent entries grouped by date
  const recentEntries = useMemo(() => {
    const grouped: Record<string, Entry[]> = {};
    for (const entry of [...entries].sort((a, b) => b.date.localeCompare(a.date))) {
      if (!grouped[entry.date]) grouped[entry.date] = [];
      grouped[entry.date].push(entry);
    }
    return Object.entries(grouped).slice(0, 5);
  }, [entries]);

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      {/* ROW 1: Status Banner */}
      {loading ? (
        <Skeleton className="h-36 rounded-xl" />
      ) : (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-px hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-[family-name:var(--font-heading)] font-bold text-[var(--text-primary)]">
                {getGreeting()}, {user?.fullName || 'there'}
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5 flex items-center gap-2">
                Week of {weekLabel}
                {timesheet?.status && (
                  <Badge className={STATUS_COLORS[timesheet.status] || ''}>
                    {STATUS_LABELS[timesheet.status] || timesheet.status}
                  </Badge>
                )}
              </p>
            </div>
            <Link href="/time-entry">
              <Button className="bg-[var(--accent-teal)] hover:bg-teal-700 text-white">
                Open Timesheet &rarr;
              </Button>
            </Link>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span className="font-medium">
                {weeklyHours.toFixed(1)}h / {TARGET_WEEKLY}h logged
              </span>
              <span>
                {progressPct >= 100 ? (
                  <span className="text-[var(--accent-green)] font-medium">Complete</span>
                ) : (
                  <span>{Math.round(progressPct)}%</span>
                )}
              </span>
            </div>
            <div className="h-3 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progressPct >= 100
                    ? 'bg-[var(--accent-green)]'
                    : progressPct >= 50
                      ? 'bg-[var(--accent-teal)]'
                      : 'bg-[var(--accent-amber)]'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {/* Daily breakdown */}
            <div className="flex gap-1 mt-2">
              {DAYS.map((day, i) => {
                const h = dailyHours[i] || 0;
                const met = h >= TARGET_DAILY;
                return (
                  <div
                    key={day}
                    className={`flex-1 text-center py-1.5 rounded text-xs ${
                      met
                        ? 'bg-[var(--accent-teal-light)] text-[var(--accent-teal)]'
                        : h > 0
                          ? 'bg-[var(--accent-amber-light)] text-[var(--accent-amber)]'
                          : 'bg-stone-50 dark:bg-stone-800 text-[var(--text-muted)]'
                    }`}
                  >
                    <div className="text-[10px] font-[family-name:var(--font-heading)] font-medium opacity-60">
                      {day}
                    </div>
                    <div className="font-medium">{h > 0 ? h.toFixed(1) : '-'}</div>
                  </div>
                );
              })}
            </div>

            {/* Missing hours warning */}
            {missingHours > 0 &&
              timesheet?.status === 'draft' &&
              weeklyHours > 0 && (
                <p className="text-xs text-[var(--accent-amber)] mt-1 flex items-center gap-1">
                  <WarningIcon />
                  {missingHours.toFixed(1)}h remaining this week &mdash; {dailyHours.filter(h => h === 0).length > 0 ? `${dailyHours.filter((h, i) => h === 0 && i < 5).length} weekday(s) with no entries` : 'some days incomplete'}
                </p>
              )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/charge-codes">
          <Button variant="outline" className="gap-1.5">
            <TagIcon /> My Codes
          </Button>
        </Link>
        {isManager && (
          <Link href="/approvals">
            <Button variant="outline" className="gap-1.5">
              <CheckIcon /> Approvals
              {pendingCount > 0 && (
                <Badge className="ml-1 bg-[var(--accent-amber-light)] text-[var(--accent-amber)] text-[10px]">
                  {pendingCount}
                </Badge>
              )}
            </Button>
          </Link>
        )}
      </div>

      {/* ROW 2: Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))
        ) : (
          <>
            <StatCard
              label="Hours this period"
              value={`${weeklyHours.toFixed(0)} / ${TARGET_WEEKLY}`}
              subtext={weeklyHours >= TARGET_WEEKLY ? 'Target met' : `${missingHours.toFixed(0)}h remaining`}
              icon={Clock}
              accent={weeklyHours >= TARGET_WEEKLY ? 'var(--accent-teal)' : weeklyHours > 0 ? 'var(--accent-amber)' : undefined}
              trend={hoursDelta !== undefined ? { value: `${hoursDelta >= 0 ? '+' : ''}${hoursDelta.toFixed(0)}h vs last period`, direction: hoursDelta >= 0 ? 'up' : 'down' } : undefined}
            />
            <StatCard
              label="Chargeability"
              value={`${chargeability}%`}
              subtext={chargeabilityYtd ? `${chargeabilityYtd.ytdChargeability}% YTD` : 'Target 80%'}
              icon={Percent}
              accent={chargeability >= 80 ? 'var(--accent-green)' : chargeability > 0 ? 'var(--accent-amber)' : undefined}
              trend={chargeabilityDelta !== undefined ? { value: `${chargeabilityDelta >= 0 ? '+' : ''}${chargeabilityDelta}% vs prior`, direction: chargeabilityDelta >= 0 ? 'up' : 'down' } : undefined}
            />
            <StatCard
              label="Pending approvals"
              value={String(pendingCount)}
              subtext={pendingCount > 0 ? 'Awaiting your review' : 'All clear'}
              icon={ClipboardCheck}
              accent={pendingCount > 0 ? 'var(--accent-amber)' : undefined}
            />
            <StatCard
              label="Active charge codes"
              value={String(chargeCodes.length)}
              subtext={`${chargeCodes.filter((c) => c.isBillable).length} billable`}
              icon={Tag}
            />
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChargeabilityTrend />
        <ProgramDistribution />
      </div>

      {/* ROW 3: Employee -- Recent Entries + Alerts | Manager -- 3-column */}
      {isManager ? (
        <ManagerRow3
          pending={pending}
          pendingCount={pendingCount}
          budgetAlerts={budgetAlerts}
          chargeability={chargeability}
          teamStatus={teamStatus}
          teamStatusLoading={teamStatusLoading}
          pendingCcRequests={pendingCcRequests}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent Entries */}
          <Card className="lg:col-span-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <CardHeader>
              <CardTitle className="text-base font-[family-name:var(--font-heading)] font-semibold text-[var(--text-primary)]">
                My Recent Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {entriesLoading && entries.length === 0 ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded" />
                  ))}
                </div>
              ) : recentEntries.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  title="No time entries this week"
                  description="Start logging your hours to track progress"
                  action={{ label: 'Start Logging', href: '/time-entry' }}
                />
              ) : (
                <div className="space-y-4">
                  {recentEntries.map(([date, dateEntries]) => (
                    <div key={date}>
                      <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1.5">
                        {format(new Date(date + 'T00:00:00'), 'EEEE, MMM d')}
                      </p>
                      <div className="space-y-1">
                        {dateEntries.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-[var(--bg-card-hover)] transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Badge
                                className={`text-[10px] ${
                                  entry.isBillable
                                    ? 'bg-[var(--accent-teal-light)] text-[var(--accent-teal)]'
                                    : 'bg-[var(--accent-amber-light)] text-[var(--accent-amber)]'
                                }`}
                              >
                                {entry.isBillable ? 'B' : 'NB'}
                              </Badge>
                              <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--text-secondary)]">
                                {entry.chargeCodeId}
                              </span>
                              <span className="text-sm text-[var(--text-primary)]">
                                {entry.chargeCodeName || entry.chargeCodeId}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-[var(--text-primary)]">
                              {parseFloat(entry.hours).toFixed(1)}h
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <Link
                    href="/time-entry"
                    className="text-xs text-[var(--accent-teal)] hover:underline block text-right pt-1"
                  >
                    View Full Timesheet &rarr;
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alerts & Notifications */}
          <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <CardHeader>
              <CardTitle className="text-base font-[family-name:var(--font-heading)] font-semibold text-[var(--text-primary)]">
                Alerts &amp; Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EmployeeAlerts
                chargeability={chargeability}
                missingHours={missingHours}
                timesheetStatus={timesheet?.status}
                periodEnd={timesheet?.periodEnd}
              />
            </CardContent>
          </Card>

          {/* My CC Requests */}
          {myCcRequests.length > 0 && (
            <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base font-[family-name:var(--font-heading)] font-semibold text-[var(--text-primary)]">
                  My CC Requests
                </CardTitle>
                {myCcRequests.filter((r) => r.status === 'pending').length > 0 && (
                  <Badge className="bg-[var(--accent-amber-light)] text-[var(--accent-amber)]">
                    {myCcRequests.filter((r) => r.status === 'pending').length} pending
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {myCcRequests.slice(0, 5).map((req) => (
                    <div key={req.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-[var(--bg-card-hover)] transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm text-[var(--text-primary)] truncate">{req.chargeCodeName || req.chargeCodeId}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">{req.chargeCodeId}</p>
                      </div>
                      <Badge className={`text-[10px] shrink-0 ${
                        req.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                        req.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {req.status === 'approved' ? 'Approved' : req.status === 'rejected' ? 'Rejected' : 'Pending'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

    </div>
  );
}

// --- Manager ROW 3 ---

function ManagerRow3({
  pending,
  pendingCount,
  budgetAlerts,
  chargeability,
  teamStatus,
  teamStatusLoading,
  pendingCcRequests = [],
}: {
  pending?: PendingResponse;
  pendingCount: number;
  budgetAlerts: BudgetAlert[];
  chargeability: number;
  teamStatus?: TeamStatusResponse;
  teamStatusLoading: boolean;
  pendingCcRequests?: { id: string; requesterName: string | null; requesterEmail: string; chargeCodeName: string; chargeCodeId: string; reason: string | null }[];
}) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allPending = pending?.pending || [];

  const bulkApproveMutation = useMutation({
    mutationFn: (ids: string[]) =>
      api.post('/approvals/bulk-approve', { timesheet_ids: ids }),
    onSuccess: () => {
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      toast.success('Timesheets approved');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === allPending.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allPending.map((p) => p.id)));
    }
  };

  const incompleteCount = teamStatus
    ? teamStatus.members.filter((m) => m.incompleteDays > 0).length
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Pending Approvals with bulk */}
      <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-[family-name:var(--font-heading)] font-semibold text-[var(--text-primary)]">
            Pending Approvals
          </CardTitle>
          {pendingCount > 0 && (
            <Badge className="bg-[var(--accent-amber-light)] text-[var(--accent-amber)]">{pendingCount}</Badge>
          )}
        </CardHeader>
        <CardContent>
          {allPending.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="No pending approvals"
              description="Timesheets submitted by your team will appear here"
            />
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={toggleAll}
                  className="text-xs text-[var(--accent-teal)] hover:underline"
                >
                  {selected.size === allPending.length
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
                {selected.size > 0 && (
                  <Button
                    size="sm"
                    className="bg-[var(--accent-teal)] hover:bg-teal-700 text-white text-xs h-7"
                    onClick={() => bulkApproveMutation.mutate(Array.from(selected))}
                    disabled={bulkApproveMutation.isPending}
                  >
                    {bulkApproveMutation.isPending
                      ? 'Approving...'
                      : `Bulk Approve (${selected.size})`}
                  </Button>
                )}
              </div>
              {allPending.slice(0, 8).map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-2 py-1.5 px-1 rounded hover:bg-[var(--bg-card-hover)] cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    className="rounded border-stone-300 text-[var(--accent-teal)] focus:ring-[var(--accent-teal)]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {item.employee.fullName || item.employee.email}
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      {formatPeriod(item.periodStart, item.periodEnd)} &middot;{' '}
                      <span>{item.totalHours}h</span>
                    </p>
                  </div>
                </label>
              ))}
              {allPending.length > 8 && (
                <Link
                  href="/approvals"
                  className="text-xs text-[var(--accent-teal)] hover:underline block text-center pt-1"
                >
                  View all {allPending.length} &rarr;
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Status */}
      <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-[family-name:var(--font-heading)] font-semibold text-[var(--text-primary)]">
            Team Status
          </CardTitle>
          {incompleteCount > 0 && (
            <Badge className="bg-[var(--accent-amber-light)] text-[var(--accent-amber)]">
              {incompleteCount} incomplete
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {teamStatusLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 rounded" />
              ))}
            </div>
          ) : !teamStatus || teamStatus.members.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No team members"
              description="Direct reports will appear here"
            />
          ) : (
            <div className="space-y-2">
              {teamStatus.members.slice(0, 8).map((member) => {
                const pct = member.targetHours > 0
                  ? Math.min(100, Math.round((member.totalHours / member.targetHours) * 100))
                  : 0;
                const isComplete = member.incompleteDays === 0;
                return (
                  <div key={member.id} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--text-primary)] truncate">
                        {member.fullName || member.email}
                      </p>
                    </div>
                    <div className="w-20 h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          pct >= 100
                            ? 'bg-[var(--accent-green)]'
                            : pct >= 50
                              ? 'bg-[var(--accent-amber)]'
                              : 'bg-[var(--accent-red)]'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs w-16 text-right shrink-0 text-[var(--text-secondary)]">
                      {member.totalHours}/{member.targetHours}h
                    </span>
                    <span className="text-sm shrink-0">
                      {isComplete ? (
                        <span className="text-[var(--accent-green)]">&#10003;</span>
                      ) : (
                        <span className="text-[var(--accent-amber)]">
                          <AlertTriangle className="w-3.5 h-3.5 inline" />
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
              <p className="text-xs text-[var(--text-muted)] mt-2 pt-2 border-t border-[var(--border-default)]">
                {teamStatus.members.filter((m) => m.incompleteDays === 0).length}/{teamStatus.members.length} complete
                {teamStatus.members.length > 8 && (
                  <> &middot; showing 8 of {teamStatus.members.length}</>
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CC Requests */}
      {pendingCcRequests.length > 0 && (
        <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-[family-name:var(--font-heading)] font-semibold text-[var(--text-primary)]">
              CC Requests
            </CardTitle>
            <Badge className="bg-[var(--accent-amber-light)] text-[var(--accent-amber)]">
              {pendingCcRequests.length}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingCcRequests.slice(0, 5).map((req) => (
                <div key={req.id} className="flex items-center gap-2 py-1.5 px-1 rounded hover:bg-[var(--bg-card-hover)] transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {req.requesterName || req.requesterEmail}
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      {req.chargeCodeName} &middot; {req.chargeCodeId}
                    </p>
                  </div>
                </div>
              ))}
              <Link
                href="/approvals"
                className="text-xs text-[var(--accent-teal)] hover:underline block text-center pt-1"
              >
                Review in Approvals &rarr;
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-[family-name:var(--font-heading)] font-semibold text-[var(--text-primary)]">
            Alerts
          </CardTitle>
          {budgetAlerts.length > 0 && (
            <Link href="/budget">
              <Button variant="link" size="sm" className="text-xs text-[var(--accent-teal)]">
                View All &rarr;
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {budgetAlerts.length === 0 && chargeability >= 80 ? (
              <EmptyState
                icon={Bell}
                title="No alerts"
                description="All budgets and chargeability targets are on track"
              />
            ) : (
              <>
                {chargeability < 80 && chargeability > 0 && (
                  <AlertItem
                    level="warning"
                    title={`Team chargeability ${chargeability}%`}
                    detail="below 80% target"
                    linkHref="/reports"
                    linkText="View Report"
                  />
                )}
                {budgetAlerts.slice(0, 4).map((alert) => {
                  const percentUsed = alert.budget > 0
                    ? Math.round((alert.actual / alert.budget) * 100)
                    : 0;
                  const alertLevel: 'critical' | 'warning' | 'info' =
                    alert.severity === 'red' ? 'critical' :
                    alert.severity === 'orange' ? 'warning' : 'info';
                  return (
                    <AlertItem
                      key={alert.chargeCodeId}
                      level={alertLevel}
                      title={`${alert.chargeCodeId} budget ${percentUsed}%`}
                      detail={alert.forecast ? `forecast overrun ${formatCurrencyStatic(alert.forecast - alert.budget)}` : alert.name}
                      linkHref="/budget"
                      linkText="View Budget"
                    />
                  );
                })}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Employee Alerts ---

function EmployeeAlerts({
  chargeability,
  missingHours,
  timesheetStatus,
  periodEnd,
}: {
  chargeability: number;
  missingHours: number;
  timesheetStatus?: string;
  periodEnd?: string;
}) {
  const alerts: { level: 'critical' | 'warning' | 'info'; title: string; detail: string; linkHref?: string; linkText?: string }[] =
    [];

  if (missingHours > 0 && timesheetStatus === 'draft') {
    alerts.push({
      level: missingHours > 20 ? 'critical' : 'warning',
      title: 'Missing Hours',
      detail: `${missingHours.toFixed(1)}h needed to meet 40h target`,
    });
  }

  if (chargeability > 0 && chargeability < 80) {
    alerts.push({
      level: 'warning',
      title: `Chargeability ${chargeability}%`,
      detail: 'below 80% target',
      linkHref: '/reports',
      linkText: 'View Report',
    });
  }

  if (timesheetStatus === 'rejected') {
    alerts.push({
      level: 'critical',
      title: 'Timesheet Rejected',
      detail: 'Please review and resubmit your timesheet',
    });
  }

  if (timesheetStatus === 'draft' && periodEnd) {
    // Cutoff: 15th or end of month (per PRD)
    const pe = new Date(periodEnd + 'T00:00:00Z');
    const peDay = pe.getUTCDate();
    const peMonth = pe.getUTCMonth();
    const peYear = pe.getUTCFullYear();
    const lastDay = new Date(Date.UTC(peYear, peMonth + 1, 0)).getUTCDate();
    const cutoffDate = peDay <= 15
      ? new Date(Date.UTC(peYear, peMonth, 15))
      : new Date(Date.UTC(peYear, peMonth, lastDay));
    const today = new Date(new Date().toISOString().split('T')[0] + 'T00:00:00');
    const daysUntilCutoff = differenceInDays(cutoffDate, today);
    const cutoffLabel = format(cutoffDate, 'MMM d');

    if (daysUntilCutoff < 0) {
      alerts.push({
        level: 'critical',
        title: 'Submission period closed',
        detail: `Cutoff was ${cutoffLabel}. Contact your manager for late submission.`,
      });
    } else if (daysUntilCutoff === 0) {
      alerts.push({
        level: 'critical',
        title: 'Timesheet due today',
        detail: `Cutoff is today (${cutoffLabel})`,
      });
    } else {
      alerts.push({
        level: daysUntilCutoff <= 2 ? 'warning' : 'info',
        title: `Timesheet due in ${daysUntilCutoff} day${daysUntilCutoff === 1 ? '' : 's'}`,
        detail: `Cutoff: ${cutoffLabel}`,
      });
    }
  }

  if (alerts.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle}
        title="All clear"
        description="No alerts -- you're all set!"
      />
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <AlertItem key={i} {...alert} />
      ))}
    </div>
  );
}

// --- Shared Components ---

function AlertItem({
  level,
  title,
  detail,
  linkHref,
  linkText,
}: {
  level: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  linkHref?: string;
  linkText?: string;
}) {
  const colors = {
    critical: 'border-l-[var(--accent-red)] bg-[var(--accent-red-light)]/50',
    warning: 'border-l-[var(--accent-amber)] bg-[var(--accent-amber-light)]/50',
    info: 'border-l-blue-400 bg-blue-50/50 dark:bg-blue-950/30',
  };
  const dotColors = {
    critical: 'bg-[var(--accent-red)]',
    warning: 'bg-[var(--accent-amber)]',
    info: 'bg-blue-400',
  };

  return (
    <div className={`border-l-2 rounded-r px-3 py-2 ${colors[level]}`}>
      <div className="flex items-start gap-2">
        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${dotColors[level]}`} />
        <div className="flex-1">
          <p className="text-sm font-medium text-[var(--text-primary)]">{title}</p>
          <p className="text-xs text-[var(--text-secondary)]">{detail}</p>
          {linkHref && linkText && (
            <Link href={linkHref} className="text-xs text-[var(--accent-teal)] hover:underline mt-0.5 inline-block">
              {linkText} &rarr;
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-stone-200/60 dark:bg-stone-700/60 ${className || ''}`}
    />
  );
}

// --- Utilities ---

function canViewBudgets(role?: string) {
  return role === 'admin' || role === 'pmo' || role === 'finance';
}

function isManagerRole(role?: string) {
  return (
    role === 'admin' ||
    role === 'charge_manager' ||
    role === 'pmo' ||
    role === 'finance'
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatPeriod(start: string, end: string) {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  return `${format(s, 'MMM d')} - ${format(e, 'MMM d')}`;
}

// --- Icons ---

function PlusIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" /><circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className="w-3.5 h-3.5 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" />
    </svg>
  );
}
