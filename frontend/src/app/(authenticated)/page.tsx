'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { format, startOfWeek, addDays } from 'date-fns';
import { toast } from 'sonner';

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
  asManager: PendingTimesheet[];
  asCCOwner: PendingTimesheet[];
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

// --- Constants ---

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-stone-100 text-stone-600',
  submitted: 'bg-blue-100 text-blue-700',
  manager_approved: 'bg-teal-100 text-teal-700',
  cc_approved: 'bg-emerald-100 text-emerald-700',
  locked: 'bg-purple-100 text-purple-700',
  rejected: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  manager_approved: 'Manager Approved',
  cc_approved: 'CC Approved',
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

  const { data: budgetAlerts = [] } = useQuery<BudgetAlert[]>({
    queryKey: ['budget-alerts'],
    queryFn: () => api.get('/budgets/alerts'),
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
    ? pending.asManager.length + pending.asCCOwner.length
    : 0;
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
              <h2 className="text-xl font-[family-name:var(--font-heading)] font-bold text-[var(--text-primary)]">
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
              <span className="font-[family-name:var(--font-mono)] font-medium">
                {weeklyHours.toFixed(1)}h / {TARGET_WEEKLY}h logged
              </span>
              <span>
                {progressPct >= 100 ? (
                  <span className="text-[var(--accent-green)] font-medium">Complete</span>
                ) : (
                  <span className="font-[family-name:var(--font-mono)]">{Math.round(progressPct)}%</span>
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
                    className={`flex-1 text-center py-1.5 rounded text-xs font-[family-name:var(--font-mono)] ${
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
                  {DAYS[dailyHours.findIndex(h => h === 0)] ? `${DAYS[dailyHours.findIndex(h => h === 0)]} missing` : ''} &mdash; {missingHours.toFixed(1)}h required
                </p>
              )}
          </div>
        </div>
      )}

      {/* ROW 2: Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))
        ) : (
          <>
            <MetricCard
              label="Hours This Period"
              value={`${weeklyHours.toFixed(0)}`}
              valueDetail={`/ ${TARGET_WEEKLY}`}
              subtext={weeklyHours >= TARGET_WEEKLY ? 'Target met' : `${missingHours.toFixed(0)}h remaining`}
              delta={weeklyHours > 0 ? '+4h vs last period' : undefined}
              accent={weeklyHours >= TARGET_WEEKLY ? 'teal' : weeklyHours > 0 ? 'amber' : 'stone'}
            />
            <MetricCard
              label="Chargeability"
              value={`${chargeability}%`}
              subtext={`target 80%`}
              delta={chargeability >= 80 ? '+2% vs prior' : `${chargeability - 80}%`}
              accent={chargeability >= 80 ? 'emerald' : chargeability > 0 ? 'amber' : 'stone'}
            />
            <MetricCard
              label="Pending Approvals"
              value={String(pendingCount)}
              subtext={pendingCount > 0 ? 'awaiting your review' : 'All clear'}
              accent={pendingCount > 0 ? 'amber' : 'stone'}
              href={pendingCount > 0 ? '/approvals' : undefined}
            />
            <MetricCard
              label="Active Charge Codes"
              value={String(chargeCodes.length)}
              subtext={`${chargeCodes.filter((c) => c.isBillable).length} billable`}
              accent="stone"
              href="/charge-codes"
            />
          </>
        )}
      </div>

      {/* ROW 3: Employee -- Recent Entries + Alerts | Manager -- 3-column */}
      {isManager ? (
        <ManagerRow3
          pending={pending}
          pendingCount={pendingCount}
          budgetAlerts={budgetAlerts}
          chargeability={chargeability}
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
                <div className="text-center py-8">
                  <p className="text-[var(--text-muted)] text-sm">No time entries this week</p>
                  <Link href="/time-entry">
                    <Button variant="outline" size="sm" className="mt-3">
                      Start Logging
                    </Button>
                  </Link>
                </div>
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
                            <span className="font-[family-name:var(--font-mono)] text-sm font-medium text-[var(--text-primary)]">
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
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ROW 4: Quick Actions */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link href="/time-entry">
          <Button className="bg-[var(--accent-teal)] hover:bg-teal-700 text-white gap-1.5">
            <PlusIcon /> Log Time
          </Button>
        </Link>
        {timesheet?.status === 'draft' && timesheet?.id && (
          <Link href="/time-entry">
            <Button variant="outline" className="gap-1.5">
              <SendIcon /> Submit Sheet
            </Button>
          </Link>
        )}
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
    </div>
  );
}

// --- Manager ROW 3 ---

function ManagerRow3({
  pending,
  pendingCount,
  budgetAlerts,
  chargeability,
}: {
  pending?: PendingResponse;
  pendingCount: number;
  budgetAlerts: BudgetAlert[];
  chargeability: number;
}) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allPending = [
    ...(pending?.asManager || []),
    ...(pending?.asCCOwner || []),
  ];

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

  const teamMembers = getUniqueTeamMembers(allPending);

  const completedCount = teamMembers.filter(m => m.totalHours >= TARGET_WEEKLY).length;

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
            <p className="text-sm text-[var(--text-muted)] py-4 text-center">
              No pending approvals
            </p>
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
                      <span className="font-[family-name:var(--font-mono)]">{item.totalHours}h</span>
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
        <CardHeader>
          <CardTitle className="text-base font-[family-name:var(--font-heading)] font-semibold text-[var(--text-primary)]">
            Team Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {teamMembers.slice(0, 8).map((member) => {
              const hours = member.totalHours;
              const pct = Math.min((hours / TARGET_WEEKLY) * 100, 100);
              const status =
                hours >= TARGET_WEEKLY
                  ? 'complete'
                  : hours > 0
                    ? 'partial'
                    : 'empty';
              return (
                <div key={member.id} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-primary)] truncate">
                      {member.fullName || member.email}
                    </p>
                  </div>
                  <div className="w-20 h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-600 ${
                        status === 'complete'
                          ? 'bg-[var(--accent-green)]'
                          : status === 'partial'
                            ? 'bg-[var(--accent-amber)]'
                            : 'bg-stone-200'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-[family-name:var(--font-mono)] w-12 text-right shrink-0 text-[var(--text-secondary)]">
                    {hours}/{TARGET_WEEKLY}
                  </span>
                  <span className="text-sm shrink-0">
                    {status === 'complete' ? (
                      <span className="text-[var(--accent-green)]">&#10003;</span>
                    ) : status === 'partial' ? (
                      <span className="text-[var(--accent-amber)]">&#9888;</span>
                    ) : (
                      <span className="text-[var(--accent-red)]">&#10007;</span>
                    )}
                  </span>
                </div>
              );
            })}
            <p className="text-xs text-[var(--text-muted)] mt-2 pt-2 border-t border-[var(--border-default)]">
              {completedCount}/{teamMembers.length} complete
            </p>
            <Button variant="outline" size="sm" className="w-full text-xs">
              Send Reminders
            </Button>
          </div>
        </CardContent>
      </Card>

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
              <p className="text-sm text-[var(--text-muted)] py-4 text-center">
                No alerts
              </p>
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
                      detail={alert.forecast ? `forecast overrun $${Math.round((alert.forecast - alert.budget) / 1000)}K` : alert.name}
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
}: {
  chargeability: number;
  missingHours: number;
  timesheetStatus?: string;
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

  if (timesheetStatus === 'draft') {
    alerts.push({
      level: 'info',
      title: 'Timesheet due in 2 days',
      detail: 'Period closes Mar 31',
    });
  }

  if (alerts.length === 0) {
    return (
      <p className="text-sm text-[var(--text-muted)] py-4 text-center">
        No alerts &mdash; you&apos;re all set!
      </p>
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

function MetricCard({
  label,
  value,
  valueDetail,
  subtext,
  delta,
  accent,
  href,
}: {
  label: string;
  value: string;
  valueDetail?: string;
  subtext: string;
  delta?: string;
  accent: 'emerald' | 'amber' | 'stone' | 'teal';
  href?: string;
}) {
  const topBorderColors = {
    emerald: 'border-t-[var(--accent-green)]',
    amber: 'border-t-[var(--accent-amber)]',
    stone: 'border-t-stone-300',
    teal: 'border-t-[var(--accent-teal)]',
  };

  const content = (
    <div
      className={`bg-[var(--bg-card)] rounded-lg border border-[var(--border-default)] border-t-[3px] ${topBorderColors[accent]} p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-px hover:shadow-md ${href ? 'cursor-pointer' : ''}`}
    >
      <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide font-[family-name:var(--font-heading)]">
        {label}
      </p>
      <p className="text-2xl font-bold text-[var(--text-primary)] mt-1 font-[family-name:var(--font-mono)]">
        {value}
        {valueDetail && (
          <span className="text-base font-normal text-[var(--text-muted)] ml-1">{valueDetail}</span>
        )}
      </p>
      <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtext}</p>
      {delta && (
        <p className={`text-[11px] mt-1 font-[family-name:var(--font-mono)] ${
          delta.startsWith('+')
            ? 'text-[var(--accent-green)]'
            : delta.startsWith('-')
              ? 'text-[var(--accent-red)]'
              : 'text-[var(--text-muted)]'
        }`}>
          {delta.startsWith('+') ? <span>&#9650; </span> : delta.startsWith('-') ? <span>&#9660; </span> : null}
          {delta}
        </p>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-stone-200/60 dark:bg-stone-700/60 ${className || ''}`}
    />
  );
}

// --- Utilities ---

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

function getUniqueTeamMembers(items: PendingTimesheet[]) {
  const map = new Map<
    string,
    { id: string; fullName: string | null; email: string; totalHours: number }
  >();
  for (const item of items) {
    const existing = map.get(item.employee.id);
    if (existing) {
      existing.totalHours += item.totalHours;
    } else {
      map.set(item.employee.id, {
        id: item.employee.id,
        fullName: item.employee.fullName,
        email: item.employee.email,
        totalHours: item.totalHours,
      });
    }
  }
  return Array.from(map.values());
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
