'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Search, Archive, ArchiveRestore } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useCurrency } from '@/lib/currency';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ChargeCodeTree,
  type ChargeCodeNode,
} from '@/components/charge-codes/ChargeCodeTree';
import { ChargeCodeForm } from '@/components/charge-codes/ChargeCodeForm';
import { AccessManager } from '@/components/charge-codes/AccessManager';
import { BudgetDetail } from '@/components/charge-codes/BudgetDetail';

interface ChargeCodeDetail {
  id: string;
  name: string;
  level: string | null;
  parentId: string | null;
  budgetAmount: string | null;
  isBillable: boolean | null;
  costCenter: string | null;
  programName: string | null;
  validFrom: string | null;
  validTo: string | null;
  path: string | null;
  activityCategory: string | null;
  ownerId?: string | null;
  approverId?: string | null;
  ownerName?: string | null;
  approverName?: string | null;
  isArchived?: boolean;
  actualSpent?: number;
  forecastAtCompletion?: number | null;
  assignedUsers: { userId: string; email: string; fullName: string | null }[];
}

const LEVEL_BADGE: Record<string, { label: string; className: string }> = {
  program: { label: 'Program', className: 'bg-slate-600 text-white' },
  project: { label: 'Project', className: 'bg-[var(--accent-teal)] text-white' },
  activity: { label: 'Activity', className: 'bg-[var(--accent-amber)] text-white' },
  task: { label: 'Task', className: 'bg-[var(--accent-purple)] text-white' },
};


const CAN_MANAGE_ROLES = ['admin', 'charge_manager'];

export default function ChargeCodesPage() {
  const { formatCurrency, symbol } = useCurrency();
  const [tree, setTree] = useState<ChargeCodeNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ChargeCodeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | undefined>();
  const [createChildLevel, setCreateChildLevel] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [billableFilter, setBillableFilter] = useState('all');
  const [myCodesOnly, setMyCodesOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const canManage = userRole != null && CAN_MANAGE_ROLES.includes(userRole);
  const [myCodeIds, setMyCodeIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.get<{ role: string }>('/users/me').then((p) => {
      setUserRole(p.role);
      // Employees default to "My Codes" only
      if (!CAN_MANAGE_ROLES.includes(p.role)) {
        setMyCodesOnly(true);
      }
    }).catch(() => {});
    api.get<{ chargeCodeId: string }[]>('/timesheets/charge-codes').then((codes) => {
      setMyCodeIds(new Set(codes.map((c) => c.chargeCodeId)));
    }).catch(() => {});
  }, []);

  const loadTree = useCallback(async () => {
    try {
      const data = await api.get<ChargeCodeNode[]>('/charge-codes/tree');
      setTree(data);
    } catch {
      setTree([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSelected = useCallback(async (id: string) => {
    try {
      const data = await api.get<ChargeCodeDetail>(`/charge-codes/${id}`);
      setSelected(data);
    } catch {
      setSelected(null);
    }
  }, []);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  useEffect(() => {
    if (selectedId) {
      loadSelected(selectedId);
    } else {
      setSelected(null);
    }
  }, [selectedId, loadSelected]);

  const handleRefresh = () => {
    loadTree();
    if (selectedId) loadSelected(selectedId);
  };

  const handleArchiveToggle = async () => {
    if (!selected) return;
    const isCurrentlyArchived = !!selected.isArchived;
    const newArchived = !isCurrentlyArchived;
    setArchiving(true);
    try {
      await api.patch(`/charge-codes/${selected.id}/archive`, { archived: newArchived });
      toast.success(newArchived ? 'Charge code archived' : 'Charge code restored');
      setShowArchiveConfirm(false);
      handleRefresh();
    } catch {
      toast.error(newArchived ? 'Failed to archive charge code' : 'Failed to restore charge code');
    } finally {
      setArchiving(false);
    }
  };

  const getNodeStatus = (node: ChargeCodeNode): 'active' | 'expired' => {
    if (!node.validTo) return 'active';
    return new Date(node.validTo + 'T23:59:59') >= new Date() ? 'active' : 'expired';
  };

  const filterTree = (nodes: ChargeCodeNode[]): ChargeCodeNode[] => {
    return nodes
      .map((node) => {
        const children = filterTree(node.children);
        const matchesSearch =
          !search ||
          node.name.toLowerCase().includes(search.toLowerCase()) ||
          node.id.toLowerCase().includes(search.toLowerCase());
        const matchesLevel =
          levelFilter === 'all' || node.level === levelFilter;
        const matchesStatus =
          statusFilter === 'all' || getNodeStatus(node) === statusFilter;
        const matchesBillable =
          billableFilter === 'all' ||
          (billableFilter === 'true' && node.isBillable) ||
          (billableFilter === 'false' && !node.isBillable);
        // When user is actively searching, skip myCodesOnly filter so
        // parent nodes (e.g. program-level codes) are not excluded
        const matchesMyCodes = !myCodesOnly || !!search || myCodeIds.has(node.id);
        const matchesArchived = showArchived || !node.isArchived;
        const selfMatch = matchesSearch && matchesLevel && matchesStatus && matchesBillable && matchesMyCodes && matchesArchived;

        if (selfMatch || children.length > 0) {
          return { ...node, children };
        }
        return null;
      })
      .filter(Boolean) as ChargeCodeNode[];
  };

  const filteredTree = filterTree(tree);

  const budgetTotal = selected?.budgetAmount ? parseFloat(selected.budgetAmount) : 0;
  const actualSpent = selected?.actualSpent ?? 0;
  const budgetPercent = budgetTotal > 0 ? Math.min(100, Math.round((actualSpent / budgetTotal) * 100)) : 0;
  const budgetRemaining = budgetTotal - actualSpent;

  return (
    <div className="flex h-full gap-4">
      {/* Left Panel - Tree */}
      <div className="flex w-[40%] shrink-0 flex-col rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {/* Toolbar */}
        <div className="space-y-2 border-b border-[var(--border-default)] p-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search codes..."
                className="pl-7 h-8 text-sm"
              />
            </div>
            {canManage && (
              <Button
                size="sm"
                className="bg-[var(--accent-teal)] hover:bg-teal-700 text-white h-8"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Create New
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v ?? 'all')}>
              <SelectTrigger size="sm" className="h-7 text-xs">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="program">Program</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="activity">Activity</SelectItem>
                <SelectItem value="task">Task</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
              <SelectTrigger size="sm" className="h-7 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={billableFilter} onValueChange={(v) => setBillableFilter(v ?? 'all')}>
              <SelectTrigger size="sm" className="h-7 text-xs">
                <SelectValue placeholder="Billable" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Billable</SelectItem>
                <SelectItem value="false">Non-Billable</SelectItem>
              </SelectContent>
            </Select>
            {canManage ? (
              <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={myCodesOnly}
                  onChange={(e) => setMyCodesOnly(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-stone-300 text-[var(--accent-teal)] focus:ring-[var(--accent-teal)]"
                />
                My Codes
              </label>
            ) : (
              <span className="text-xs text-[var(--text-muted)]">My Codes</span>
            )}
            <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-stone-300 text-[var(--accent-teal)] focus:ring-[var(--accent-teal)]"
              />
              Show Archived
            </label>
          </div>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse bg-stone-100 rounded" />
              ))}
            </div>
          ) : (
            <ChargeCodeTree
              tree={filteredTree}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onAddChild={canManage ? (parentId, parentLevel) => {
                const childLevelMap: Record<string, string> = {
                  program: 'project',
                  project: 'activity',
                  activity: 'task',
                };
                setCreateParentId(parentId);
                setCreateChildLevel(childLevelMap[parentLevel]);
                setShowCreate(true);
              } : undefined}
            />
          )}
        </div>
      </div>

      {/* Right Panel - Detail */}
      <div className="flex flex-1 flex-col rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {!selected ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-stone-100 mx-auto mb-3 flex items-center justify-center">
                <Search className="w-5 h-5 text-[var(--text-muted)]" />
              </div>
              <p className="text-sm text-[var(--text-muted)]">Select a charge code to view details</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-default)] p-4">
              <div className="flex items-center gap-3">
                <span className="font-[family-name:var(--font-mono)] text-sm text-[var(--text-secondary)]">
                  {selected.id}
                </span>
                <h2 className="text-base font-[family-name:var(--font-heading)] font-semibold text-[var(--text-primary)]">
                  {selected.name}
                </h2>
                {selected.level && LEVEL_BADGE[selected.level] && (
                  <Badge
                    className={`rounded-[999px] text-[10px] font-semibold ${LEVEL_BADGE[selected.level].className}`}
                  >
                    {LEVEL_BADGE[selected.level].label}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {canManage && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowEdit(true)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-[var(--text-secondary)]"
                      onClick={() => setShowArchiveConfirm(true)}
                    >
                      {selected.isArchived ? (
                        <><ArchiveRestore className="h-3.5 w-3.5 mr-1" />Restore</>
                      ) : (
                        <><Archive className="h-3.5 w-3.5 mr-1" />Archive</>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="flex-1 overflow-hidden">
              <TabsList variant="line" className="px-4 pt-2">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="access">Access</TabsTrigger>
                <TabsTrigger value="budget">Budget</TabsTrigger>
                <TabsTrigger value="budget-detail">Budget Detail</TabsTrigger>
              </TabsList>

              <TabsContent
                value="overview"
                className="overflow-y-auto p-4"
              >
                <div className="space-y-5">
                  {/* Key-Value Pairs */}
                  <div className="grid grid-cols-2 gap-3">
                    <InfoItem label="Charge Code" value={selected.id} />
                    <InfoItem label="Level" value={selected.level ? selected.level.charAt(0).toUpperCase() + selected.level.slice(1) : '-'} />
                    <InfoItem label="Owner" value={selected.ownerName || '-'} />
                    <InfoItem label="Approver" value={selected.approverName || '-'} />
                    <InfoItem label="Cost center" value={selected.costCenter || '-'} />
                    <InfoItem label="Valid" value={
                      selected.validFrom && selected.validTo
                        ? `${formatMonthYear(selected.validFrom)} - ${formatMonthYear(selected.validTo)}`
                        : '-'
                    } />
                    <InfoItem
                      label="Billable"
                      value={selected.isBillable ? 'Yes' : 'No'}
                      valueClassName={selected.isBillable ? 'text-[var(--accent-teal)]' : 'text-[var(--text-secondary)]'}
                    />
                  </div>

                  {/* Budget Mini-bar */}
                  {selected.budgetAmount && budgetTotal > 0 && (
                    <div className="rounded-lg border border-[var(--border-default)] p-3 bg-stone-50/50 dark:bg-stone-900/50">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="text-[var(--text-secondary)] font-medium">Budget</span>
                        <span className="font-medium text-[var(--text-primary)]">
                          {formatCurrency(actualSpent)} / {formatCurrency(budgetTotal)}
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-stone-200">
                        <div
                          className={`h-full rounded-full transition-all duration-600 ${
                            budgetPercent >= 90 ? 'bg-[var(--accent-red)]' :
                            budgetPercent >= 70 ? 'bg-[var(--accent-amber)]' :
                            'bg-[var(--accent-teal)]'
                          }`}
                          style={{ width: `${budgetPercent}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                        {budgetPercent}% consumed
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent
                value="access"
                className="overflow-y-auto p-4"
              >
                <AccessManager
                  chargeCodeId={selected.id}
                  assignedUsers={selected.assignedUsers || []}
                  onUpdate={handleRefresh}
                  readOnly={!canManage}
                />
              </TabsContent>

              <TabsContent
                value="budget"
                className="overflow-y-auto p-4"
              >
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <InfoItem
                      label="Total budget"
                      value={budgetTotal > 0 ? formatCurrency(budgetTotal) : '-'}
                    />
                    <InfoItem
                      label="Actual spent"
                      value={formatCurrency(actualSpent)}
                    />
                    <InfoItem
                      label="Remaining"
                      value={budgetTotal > 0 ? formatCurrency(budgetRemaining) : '-'}
                      valueClassName={budgetRemaining < 0 ? 'text-[var(--accent-red)]' : 'text-[var(--accent-green)]'}
                    />
                    <InfoItem
                      label="Usage"
                      value={`${budgetPercent}%`}
                      valueClassName={
                        budgetPercent >= 90 ? 'text-[var(--accent-red)]' :
                        budgetPercent >= 70 ? 'text-[var(--accent-amber)]' :
                        'text-[var(--accent-teal)]'
                      }
                    />
                  </div>
                  {budgetTotal > 0 && (
                    <div>
                      <div className="mb-1 text-xs text-[var(--text-secondary)] font-medium">Budget Progress</div>
                      <div className="h-3 overflow-hidden rounded-full bg-stone-200">
                        <div
                          className={`h-full rounded-full transition-all duration-600 ${
                            budgetPercent >= 90 ? 'bg-[var(--accent-red)]' :
                            budgetPercent >= 70 ? 'bg-[var(--accent-amber)]' :
                            'bg-[var(--accent-teal)]'
                          }`}
                          style={{ width: `${budgetPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1.5 text-[11px]">
                        <span className="text-[var(--text-muted)]">{symbol}0</span>
                        <span className="text-[var(--text-muted)]">{formatCurrency(budgetTotal)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent
                value="budget-detail"
                className="overflow-y-auto p-4"
              >
                <BudgetDetail chargeCodeId={selected.id} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {/* Create Dialog */}
      <ChargeCodeForm
        key={createParentId || 'new'}
        open={showCreate}
        onOpenChange={(open) => {
          setShowCreate(open);
          if (!open) {
            setCreateParentId(undefined);
            setCreateChildLevel(undefined);
          }
        }}
        onSuccess={handleRefresh}
        parentId={createParentId}
        defaultLevel={createChildLevel}
      />

      {/* Edit Dialog */}
      {selected && (
        <ChargeCodeForm
          open={showEdit}
          onOpenChange={setShowEdit}
          onSuccess={handleRefresh}
          editData={selected}
        />
      )}

      {/* Archive Confirmation Dialog */}
      <Dialog open={showArchiveConfirm} onOpenChange={setShowArchiveConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selected?.isArchived ? 'Restore' : 'Archive'} {selected?.name}?
            </DialogTitle>
            <DialogDescription>
              {selected?.isArchived
                ? 'This will make it visible in the charge code list again.'
                : 'This will hide it from the charge code list.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowArchiveConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant={selected?.isArchived ? 'default' : 'destructive'}
              onClick={handleArchiveToggle}
              disabled={archiving}
            >
              {archiving ? 'Processing...' : selected?.isArchived ? 'Restore' : 'Archive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoItem({
  label,
  value,
  mono,
  valueClassName,
}: {
  label: string;
  value: string;
  mono?: boolean;
  valueClassName?: string;
}) {
  return (
    <div>
      <dt className="text-xs text-[var(--text-muted)] font-medium">{label}</dt>
      <dd className={`text-sm font-medium ${valueClassName || 'text-[var(--text-primary)]'} ${mono ? 'font-[family-name:var(--font-mono)]' : ''}`}>
        {value}
      </dd>
    </div>
  );
}

function formatMonthYear(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}
