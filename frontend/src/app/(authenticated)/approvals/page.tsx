'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { format, subMonths } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ApprovalQueue } from '@/components/approvals/ApprovalQueue';
import { MultiSelectFilter } from '@/components/budget/MultiSelectFilter';
import { Search, CheckCircle, History, Palmtree, CheckIcon, XIcon, Tag } from 'lucide-react';
import { formatShortDate } from '@/lib/utils';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';

interface PendingTimesheet {
  id: string;
  userId: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  submittedAt: string | null;
  totalHours: number;
  programs: string[];
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

interface CCAccessRequest {
  id: string;
  requesterId: string;
  chargeCodeId: string;
  reason: string | null;
  status: string;
  createdAt: string;
  requesterName: string | null;
  requesterEmail: string;
  chargeCodeName: string;
}

interface PendingVacation {
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

interface ApprovalHistoryItem {
  id: number | string;
  timesheetId: string | null;
  action: string;
  comment: string | null;
  approvalType: string;
  approvedAt: string;
  timesheet: {
    id: string | null;
    periodStart: string;
    periodEnd: string;
    status: string;
  };
  employee: {
    id: string;
    fullName: string | null;
    email: string;
    department: string | null;
  };
}

export default function ApprovalsPage() {
  const [pending, setPending] = useState<PendingResponse>({
    pending: [],
  });
  const [history, setHistory] = useState<ApprovalHistoryItem[]>([]);
  const [pendingVacations, setPendingVacations] = useState<PendingVacation[]>([]);
  const [ccRequests, setCcRequests] = useState<CCAccessRequest[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState(() => format(new Date(), 'yyyy-MM'));
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('manager');

  const showTeamStatus = userRole && ['admin', 'charge_manager'].includes(userRole);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pendingData, historyData] = await Promise.all([
        api.get<PendingResponse>('/approvals/pending'),
        api.get<ApprovalHistoryItem[]>('/approvals/history'),
      ]);
      setPending(pendingData);
      setHistory(historyData);
    } catch {
      toast.error('Failed to load approvals data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVacations = useCallback(async () => {
    try {
      const data = await api.get<PendingVacation[]>('/vacations/pending');
      setPendingVacations(data);
    } catch {
      // User may not be a manager — ignore
    }
  }, []);

  const fetchCcRequests = useCallback(async () => {
    try {
      const data = await api.get<CCAccessRequest[]>('/charge-codes/access-requests/list');
      setCcRequests(data);
    } catch {
      // User may not have permission — ignore
    }
  }, []);

  const fetchUserRole = useCallback(async () => {
    try {
      const profile = await api.get<{ role: string }>('/users/me');
      setUserRole(profile.role);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchVacations();
    fetchUserRole();
  }, [fetchData, fetchVacations, fetchUserRole]);

  useEffect(() => {
    if (showTeamStatus) {
      fetchCcRequests();
    }
  }, [showTeamStatus, fetchCcRequests]);

  const periodOptions = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(now, i);
      return { value: format(d, 'yyyy-MM'), label: format(d, 'MMM yyyy') };
    });
  }, []);

  const programOptions = useMemo(() => {
    const programSet = new Set<string>();
    for (const t of pending.pending) {
      for (const p of t.programs || []) {
        programSet.add(p);
      }
    }
    return Array.from(programSet)
      .sort()
      .map((p) => ({ id: p, label: p }));
  }, [pending.pending]);

  const filterItems = (items: PendingTimesheet[]) => {
    let filtered = items;

    // Filter by status
    if (statusFilter === 'pending') {
      filtered = filtered.filter((t) => t.status === 'submitted');
    } else if (statusFilter === 'approved') {
      filtered = filtered.filter((t) => t.status === 'locked');
    }

    // Filter by selected programs
    if (selectedPrograms.length > 0) {
      filtered = filtered.filter((t) =>
        (t.programs || []).some((p) => selectedPrograms.includes(p)),
      );
    }

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          (t.employee.fullName || '').toLowerCase().includes(q) ||
          t.employee.email.toLowerCase().includes(q) ||
          (t.employee.department || '').toLowerCase().includes(q),
      );
    }

    return filtered;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals"
        description="Review and approve submitted timesheets"
      />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <Select value={period} onValueChange={(v) => v && setPeriod(v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
          </SelectContent>
        </Select>

        {programOptions.length > 0 && (
          <MultiSelectFilter
            options={programOptions}
            selected={selectedPrograms}
            onChange={setSelectedPrograms}
            label="Programs"
          />
        )}

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <Input
            placeholder="Search by name, email, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabs with approval queues */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-stone-100 dark:bg-stone-800">
          <TabsTrigger value="manager">
            Pending Approvals
            {(pending.pending.length + ccRequests.length) > 0 && (
              <Badge variant="amber" className="ml-1.5 text-[10px]">
                {pending.pending.length}{ccRequests.length > 0 ? ` + ${ccRequests.length} CC` : ''}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="vacations">
            Vacations
            {pendingVacations.length > 0 && (
              <Badge variant="amber" className="ml-1.5 text-[10px]">
                {pendingVacations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="manager" className="mt-4 space-y-6">
          {/* Timesheet Approvals */}
          {loading ? (
            <ApprovalSkeleton />
          ) : (
            <ApprovalQueue
              items={filterItems(pending.pending)}
              onRefresh={fetchData}
            />
          )}

          {/* CC Access Requests */}
          {showTeamStatus && ccRequests.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                Charge Code Access Requests
              </h3>
              <CCRequestList requests={ccRequests} onRefresh={fetchCcRequests} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="vacations" className="mt-4">
          <VacationApprovalList
            items={pendingVacations}
            onRefresh={fetchVacations}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <HistoryTable items={history} />
        </TabsContent>

      </Tabs>
    </div>
  );
}

function ApprovalSkeleton() {
  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-6 animate-pulse space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="w-4 h-4 bg-stone-200 dark:bg-stone-700 rounded" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-48" />
            <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-32" />
          </div>
          <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-20" />
          <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-16" />
        </div>
      ))}
    </div>
  );
}

function HistoryTable({ items }: { items: ApprovalHistoryItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <EmptyState
          icon={History}
          title="No approval history"
          description="Your past approval actions will appear here"
        />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border-default)] bg-stone-50 dark:bg-stone-900 sticky top-0">
            <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs tracking-wider">
              Employee
            </th>
            <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs tracking-wider">
              Period
            </th>
            <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs tracking-wider">
              Action
            </th>
            <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs tracking-wider">
              Type
            </th>
            <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs tracking-wider">
              Comment
            </th>
            <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs tracking-wider">
              Date
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr
              key={item.id}
              className={`border-b border-[var(--border-default)] transition-colors hover:bg-[var(--bg-card-hover)] ${
                idx % 2 === 0 ? 'bg-[var(--bg-card)]' : 'bg-stone-50 dark:bg-stone-900/50'
              }`}
            >
              <td className="px-4 py-2.5">
                <div className="font-medium text-[var(--text-primary)]">
                  {item.employee.fullName || item.employee.email}
                </div>
                {item.employee.department && (
                  <div className="text-xs text-[var(--text-muted)]">
                    {item.employee.department}
                  </div>
                )}
              </td>
              <td className="px-4 py-2.5 text-[var(--text-secondary)] text-xs">
                {formatShortDate(item.timesheet.periodStart)} -{' '}
                {formatShortDate(item.timesheet.periodEnd)}
              </td>
              <td className="px-4 py-2.5">
                <Badge variant={item.action === 'approve' ? 'green' : 'destructive'}>
                  {item.action === 'approve' ? 'Approved' : 'Rejected'}
                </Badge>
              </td>
              <td className="px-4 py-2.5 text-xs">
                {item.approvalType === 'vacation' ? (
                  <Badge variant="outline" className="border-teal-500 text-teal-600 dark:text-teal-400">
                    Vacation
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-blue-500 text-blue-600 dark:text-blue-400">
                    Timesheet
                  </Badge>
                )}
              </td>
              <td className="px-4 py-2.5 text-[var(--text-secondary)] max-w-[200px] truncate text-xs">
                {item.comment || '-'}
              </td>
              <td className="px-4 py-2.5 text-[var(--text-muted)] text-xs">
                {new Date(item.approvedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VacationApprovalList({
  items,
  onRefresh,
}: {
  items: PendingVacation[];
  onRefresh: () => void;
}) {
  async function handleApprove(id: number) {
    try {
      await api.post(`/vacations/${id}/approve`, {});
      toast.success('Vacation approved');
      onRefresh();
    } catch {
      // handled by api wrapper
    }
  }

  async function handleReject(id: number) {
    try {
      await api.post(`/vacations/${id}/reject`, {});
      toast.success('Vacation rejected');
      onRefresh();
    } catch {
      // handled by api wrapper
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <EmptyState
          icon={Palmtree}
          title="No pending vacation requests"
          description="Vacation requests from your reports will appear here"
        />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border-default)] bg-stone-50 dark:bg-stone-900 sticky top-0">
            <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs tracking-wider">
              Employee
            </th>
            <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs tracking-wider">
              Start Date
            </th>
            <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs tracking-wider">
              End Date
            </th>
            <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs tracking-wider">
              Submitted
            </th>
            <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((v, idx) => (
            <tr
              key={v.vacation.id}
              className={`border-b border-[var(--border-default)] transition-colors hover:bg-[var(--bg-card-hover)] ${
                idx % 2 === 0 ? 'bg-[var(--bg-card)]' : 'bg-stone-50 dark:bg-stone-900/50'
              }`}
            >
              <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">
                {v.user.fullName || v.user.email}
              </td>
              <td className="px-4 py-2.5 text-[var(--text-secondary)] text-xs">
                {formatShortDate(v.vacation.startDate)}
              </td>
              <td className="px-4 py-2.5 text-[var(--text-secondary)] text-xs">
                {formatShortDate(v.vacation.endDate)}
              </td>
              <td className="px-4 py-2.5 text-[var(--text-muted)] text-xs">
                {new Date(v.vacation.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </td>
              <td className="px-4 py-2.5 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => handleApprove(v.vacation.id)}
                    className="text-[var(--accent-green)] hover:text-[var(--accent-green)]"
                  >
                    <CheckIcon className="w-3.5 h-3.5 mr-1" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    size="xs"
                    onClick={() => handleReject(v.vacation.id)}
                  >
                    <XIcon className="w-3.5 h-3.5 mr-1" />
                    Reject
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const STATUS_BADGE_MAP: Record<string, { label: string; variant: 'default' | 'amber' | 'green' | 'destructive' | 'outline' }> = {
  not_started: { label: 'Not Started', variant: 'outline' },
  draft: { label: 'Draft', variant: 'default' },
  submitted: { label: 'Submitted', variant: 'amber' },
  approved: { label: 'Approved', variant: 'green' },
  manager_approved: { label: 'Approved', variant: 'green' },
  cc_approved: { label: 'Approved', variant: 'green' },
  locked: { label: 'Locked', variant: 'green' },
  rejected: { label: 'Rejected', variant: 'destructive' },
};

/* ── CC Access Request List ─────────────────────── */

function CCRequestList({ requests, onRefresh }: { requests: CCAccessRequest[]; onRefresh: () => void }) {
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const handleReview = async (id: string, status: 'approved' | 'rejected') => {
    setReviewingId(id);
    try {
      await api.patch(`/charge-codes/access-requests/${id}`, { status });
      toast.success(status === 'approved' ? 'Request approved' : 'Request rejected');
      onRefresh();
    } catch {
      toast.error('Failed to update request');
    } finally {
      setReviewingId(null);
    }
  };

  if (requests.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <EmptyState
          icon={Tag}
          title="No pending requests"
          description="No charge code access requests awaiting your review"
        />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border-default)] bg-stone-50 dark:bg-stone-900">
            <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs tracking-wider">Requester</th>
            <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs tracking-wider">Charge Code</th>
            <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs tracking-wider">Reason</th>
            <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs tracking-wider">Request Date</th>
            <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)] text-xs tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req, idx) => (
            <tr
              key={req.id}
              className={`border-b border-[var(--border-default)] transition-colors hover:bg-[var(--bg-card-hover)] ${
                idx % 2 === 0 ? 'bg-[var(--bg-card)]' : 'bg-stone-50 dark:bg-stone-900/50'
              }`}
            >
              <td className="px-4 py-3">
                <div className="font-medium text-[var(--text-primary)]">{req.requesterName || 'Unknown'}</div>
                <div className="text-xs text-[var(--text-muted)]">{req.requesterEmail}</div>
              </td>
              <td className="px-4 py-3">
                <span className="font-medium text-[var(--text-primary)]">{req.chargeCodeName}</span>
                <div className="text-xs text-[var(--text-muted)]">{req.chargeCodeId}</div>
              </td>
              <td className="px-4 py-3 text-[var(--text-secondary)] max-w-[200px] truncate">
                {req.reason || '-'}
              </td>
              <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                {new Date(req.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-[var(--accent-green)] hover:bg-[var(--accent-green-light)]"
                    onClick={() => handleReview(req.id, 'approved')}
                    disabled={reviewingId === req.id}
                    title="Approve"
                  >
                    <CheckIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-[var(--accent-red)] hover:bg-[var(--accent-red-light)]"
                    onClick={() => handleReview(req.id, 'rejected')}
                    disabled={reviewingId === req.id}
                    title="Reject"
                  >
                    <XIcon className="w-4 h-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
