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
import { ApprovalQueue } from '@/components/approvals/ApprovalQueue';
import { Search, CheckCircle, History } from 'lucide-react';
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

interface ApprovalHistoryItem {
  id: number;
  timesheetId: string;
  action: string;
  comment: string | null;
  approvalType: string;
  approvedAt: string;
  timesheet: {
    id: string;
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
    asManager: [],
    asCCOwner: [],
  });
  const [history, setHistory] = useState<ApprovalHistoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState(() => format(new Date(), 'yyyy-MM'));
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const periodOptions = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(now, i);
      return { value: format(d, 'yyyy-MM'), label: format(d, 'MMM yyyy') };
    });
  }, []);

  const filterItems = (items: PendingTimesheet[]) => {
    let filtered = items;

    // Filter by status
    if (statusFilter === 'pending') {
      filtered = filtered.filter((t) => t.status === 'submitted');
    } else if (statusFilter === 'approved') {
      filtered = filtered.filter((t) => ['manager_approved', 'cc_approved'].includes(t.status));
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

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabs with approval queues */}
      <Tabs defaultValue="manager">
        <TabsList className="bg-stone-100 dark:bg-stone-800">
          <TabsTrigger value="manager">
            As Manager
            {pending.asManager.length > 0 && (
              <Badge variant="amber" className="ml-1.5 text-[10px]">
                {pending.asManager.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="cc_owner">
            As CC Owner
            {pending.asCCOwner.length > 0 && (
              <Badge variant="amber" className="ml-1.5 text-[10px]">
                {pending.asCCOwner.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="manager" className="mt-4">
          {loading ? (
            <ApprovalSkeleton />
          ) : (
            <ApprovalQueue
              items={filterItems(pending.asManager)}
              onRefresh={fetchData}
            />
          )}
        </TabsContent>

        <TabsContent value="cc_owner" className="mt-4">
          {loading ? (
            <ApprovalSkeleton />
          ) : (
            <ApprovalQueue
              items={filterItems(pending.asCCOwner)}
              onRefresh={fetchData}
            />
          )}
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
              <td className="px-4 py-2.5 text-[var(--text-secondary)] capitalize text-xs">
                {item.approvalType === 'charge_code' ? 'Charge Code' : 'Manager'}
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

