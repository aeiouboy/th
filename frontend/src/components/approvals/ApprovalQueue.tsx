'use client';

import { useState, useCallback, Fragment } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { TimesheetReview } from './TimesheetReview';
import { BulkApprovalBar } from './BulkApprovalBar';
import { Eye, Check, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatShortDate } from '@/lib/utils';
import { EmptyState } from '@/components/shared/EmptyState';

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

interface ApprovalQueueProps {
  items: PendingTimesheet[];
  onRefresh: () => void;
}

export function ApprovalQueue({ items, onRefresh }: ApprovalQueueProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((t) => t.id)));
    }
  };

  const handleApprove = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        await api.post(`/approvals/${id}/approve`, {});
        toast.success('Timesheet approved');
        onRefresh();
      } catch {
        // Error toast shown by api.ts
      } finally {
        setLoading(false);
      }
    },
    [onRefresh],
  );

  const handleReject = useCallback(async () => {
    if (!rejectId || !rejectComment.trim()) return;
    setLoading(true);
    try {
      await api.post(`/approvals/${rejectId}/reject`, {
        comment: rejectComment,
      });
      toast.success('Timesheet rejected');
      setRejectId(null);
      setRejectComment('');
      onRefresh();
    } catch {
      // Error toast shown by api.ts
    } finally {
      setLoading(false);
    }
  }, [rejectId, rejectComment, onRefresh]);

  const handleBulkApprove = useCallback(async () => {
    if (selected.size === 0) return;
    setLoading(true);
    try {
      await api.post('/approvals/bulk-approve', {
        timesheet_ids: Array.from(selected),
      });
      toast.success(`${selected.size} timesheet(s) approved`);
      setSelected(new Set());
      onRefresh();
    } catch {
      // Error toast shown by api.ts
    } finally {
      setLoading(false);
    }
  }, [selected, onRefresh]);

  const handleBulkReject = useCallback(async () => {
    if (selected.size === 0 || !rejectComment.trim()) return;
    setLoading(true);
    try {
      for (const id of selected) {
        await api.post(`/approvals/${id}/reject`, {
          comment: rejectComment,
        });
      }
      toast.success(`${selected.size} timesheet(s) rejected`);
      setSelected(new Set());
      setRejectComment('');
      setBulkRejectOpen(false);
      onRefresh();
    } catch {
      // Error toast shown by api.ts
    } finally {
      setLoading(false);
    }
  }, [selected, rejectComment, onRefresh]);

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <EmptyState
          icon={CheckCircle}
          title="No pending approvals"
          description="Timesheets submitted by your team will appear here"
        />
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <Table>
          <TableHeader>
            <TableRow className="bg-stone-50 dark:bg-stone-900 sticky top-0 z-10 border-b border-[var(--border-default)]">
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={selected.size === items.length && items.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-stone-300 accent-[var(--accent-teal)]"
                />
              </TableHead>
              <TableHead className="text-xs tracking-wider font-medium text-[var(--text-secondary)]">Employee</TableHead>
              <TableHead className="text-xs tracking-wider font-medium text-[var(--text-secondary)]">Period</TableHead>
              <TableHead className="text-right text-xs tracking-wider font-medium text-[var(--text-secondary)]">Hours</TableHead>
              <TableHead className="text-xs tracking-wider font-medium text-[var(--text-secondary)]">Status</TableHead>
              <TableHead className="text-right text-xs tracking-wider font-medium text-[var(--text-secondary)]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((ts, idx) => (
              <Fragment key={ts.id}>
                <TableRow
                  className={`transition-colors hover:bg-[var(--bg-card-hover)] ${
                    idx % 2 === 0 ? 'bg-[var(--bg-card)]' : 'bg-stone-50 dark:bg-stone-900/50'
                  }`}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selected.has(ts.id)}
                      onChange={() => toggleSelect(ts.id)}
                      className="rounded border-stone-300 accent-[var(--accent-teal)]"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-[var(--text-primary)]">
                      {ts.employee.fullName || ts.employee.email}
                    </div>
                    {ts.employee.department && (
                      <div className="text-xs text-[var(--text-muted)]">{ts.employee.department}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-[var(--text-secondary)]">
                    {formatShortDate(ts.periodStart)} - {formatShortDate(ts.periodEnd)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`text-sm ${
                        ts.totalHours < 40
                          ? 'text-[var(--accent-amber)] font-medium'
                          : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {ts.totalHours < 40 && (
                        <AlertTriangle className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                      )}
                      {ts.totalHours.toFixed(1)}h
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={ts.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setExpandedId(expandedId === ts.id ? null : ts.id)}
                        title="View details"
                        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleApprove(ts.id)}
                        disabled={loading}
                        title="Approve"
                        className="text-[var(--accent-green)] hover:text-emerald-700 hover:bg-[var(--accent-green-light)]"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => { setRejectId(ts.id); setRejectComment(''); }}
                        disabled={loading}
                        title="Reject"
                        className="text-[var(--accent-red)] hover:text-red-700 hover:bg-[var(--accent-red-light)]"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                {expandedId === ts.id && (
                  <TableRow>
                    <TableCell colSpan={6} className="bg-stone-50 dark:bg-stone-900/50 p-0">
                      <div className="p-4" style={{ animation: 'fade-in 200ms ease-out' }}>
                        <TimesheetReview timesheetId={ts.id} />
                        <div className="mt-3 flex gap-2 justify-end">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => { setRejectId(ts.id); setRejectComment(''); }}
                            disabled={loading}
                          >
                            Reject with Comment...
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(ts.id)}
                            disabled={loading}
                          >
                            Approve
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Rejection Dialog */}
      <Dialog
        open={rejectId !== null}
        onOpenChange={(open) => {
          if (!open) { setRejectId(null); setRejectComment(''); }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-[family-name:var(--font-heading)]">Reject Timesheet</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Rejection Reason</label>
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Please provide a reason for rejection..."
              rows={4}
              className="w-full rounded-lg border border-[var(--border-default)] px-3 py-2 text-sm focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--border-focus)]/30 outline-none resize-none bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectId(null); setRejectComment(''); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectComment.trim() || loading}>Confirm Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Rejection Dialog */}
      <Dialog open={bulkRejectOpen} onOpenChange={setBulkRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-[family-name:var(--font-heading)]">Reject {selected.size} Timesheets</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Rejection Reason</label>
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Please provide a reason for rejection..."
              rows={4}
              className="w-full rounded-lg border border-[var(--border-default)] px-3 py-2 text-sm focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--border-focus)]/30 outline-none resize-none bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBulkRejectOpen(false); setRejectComment(''); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleBulkReject} disabled={!rejectComment.trim() || loading}>Confirm Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkApprovalBar
        count={selected.size}
        onApprove={handleBulkApprove}
        onReject={() => { setRejectComment(''); setBulkRejectOpen(true); }}
        loading={loading}
      />
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { variant: 'amber' | 'green' | 'destructive' | 'slate' | 'secondary'; label: string }> = {
    submitted: { variant: 'amber', label: 'Pending' },
    manager_approved: { variant: 'green', label: 'Manager Approved' },
    cc_approved: { variant: 'green', label: 'CC Approved' },
    locked: { variant: 'slate', label: 'Locked' },
    rejected: { variant: 'destructive', label: 'Rejected' },
    draft: { variant: 'secondary', label: 'Draft' },
  };
  const config = configs[status] || { variant: 'secondary' as const, label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

