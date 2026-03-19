'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';

interface ParentOption {
  id: string;
  name: string;
  level: string;
}

interface UserOption {
  id: string;
  email: string;
  fullName: string | null;
}

interface ChargeCodeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editData?: {
    id: string;
    name: string;
    level: string | null;
    programName: string | null;
    costCenter: string | null;
    budgetAmount: string | null;
    validFrom: string | null;
    validTo: string | null;
    isBillable: boolean | null;
    activityCategory: string | null;
    ownerId?: string | null;
    approverId?: string | null;
  };
  parentId?: string;
  defaultLevel?: string;
}

const LEVELS = [
  { value: 'program', label: 'Program' },
  { value: 'project', label: 'Project' },
  { value: 'activity', label: 'Activity' },
  { value: 'task', label: 'Task' },
];

const ACTIVITY_CATEGORIES = [
  'Development',
  'Testing',
  'Design',
  'Meeting',
  'Training',
  'Support',
  'Management',
  'Infrastructure',
  'Other',
];

const PARENT_LEVEL: Record<string, string> = {
  project: 'program',
  activity: 'project',
  task: 'activity',
};

export function ChargeCodeForm({
  open,
  onOpenChange,
  onSuccess,
  editData,
  parentId: parentIdProp,
  defaultLevel,
}: ChargeCodeFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parentOptions, setParentOptions] = useState<ParentOption[]>([]);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [selectedParentId, setSelectedParentId] = useState(parentIdProp || '');

  const [chargeCodeId, setChargeCodeId] = useState(editData?.id || '');
  const [name, setName] = useState(editData?.name || '');
  const [level, setLevel] = useState(editData?.level || defaultLevel || 'program');
  const [programName, setProgramName] = useState(editData?.programName || '');
  const [costCenter, setCostCenter] = useState(editData?.costCenter || '');
  const [budgetAmount, setBudgetAmount] = useState(editData?.budgetAmount || '');
  const [validFrom, setValidFrom] = useState(editData?.validFrom || '');
  const [validTo, setValidTo] = useState(editData?.validTo || '');
  const [isBillable, setIsBillable] = useState<boolean>(editData?.isBillable ?? true);
  const [activityCategory, setActivityCategory] = useState(editData?.activityCategory || '');
  const [ownerId, setOwnerId] = useState(editData?.ownerId || '');
  const [approverId, setApproverId] = useState(editData?.approverId || '');

  const needsParent = !editData && level !== 'program';

  useEffect(() => {
    if (!needsParent) {
      setParentOptions([]);
      return;
    }
    const requiredParentLevel = PARENT_LEVEL[level];
    if (!requiredParentLevel) return;

    api
      .get<ParentOption[]>(`/charge-codes?level=${requiredParentLevel}`)
      .then((data) => setParentOptions(data))
      .catch(() => setParentOptions([]));
  }, [level, needsParent]);

  useEffect(() => {
    if (!open) return;
    api
      .get<UserOption[]>('/users')
      .then((data) => setUserOptions(data))
      .catch(() => setUserOptions([]));
  }, [open]);

  // Find user name by id for display
  const getUserLabel = (uid: string) => {
    const u = userOptions.find((o) => o.id === uid);
    return u ? (u.fullName || u.email) : '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!editData && !chargeCodeId.trim()) {
      setError('Charge Code ID is required');
      setLoading(false);
      return;
    }

    if (!name.trim()) {
      setError('Name is required');
      setLoading(false);
      return;
    }

    const resolvedParentId = parentIdProp || selectedParentId;
    if (needsParent && !resolvedParentId) {
      setError(`A ${level} must have a parent`);
      setLoading(false);
      return;
    }

    if (!ownerId) {
      setError('Owner is required');
      setLoading(false);
      return;
    }

    if (!costCenter.trim()) {
      setError('Cost Center is required');
      setLoading(false);
      return;
    }

    if (!budgetAmount || parseFloat(budgetAmount) < 0) {
      setError('Budget is required');
      setLoading(false);
      return;
    }

    if (!validFrom) {
      setError('Valid From date is required');
      setLoading(false);
      return;
    }

    if (!validTo) {
      setError('Valid To date is required');
      setLoading(false);
      return;
    }

    if (validFrom && validTo && validFrom > validTo) {
      setError('Valid From must be before Valid To');
      setLoading(false);
      return;
    }

    const body: Record<string, string | boolean | number> = {
      name,
      level,
      isBillable,
      ownerId,
      costCenter,
      budgetAmount: parseFloat(budgetAmount),
      validFrom,
      validTo,
    };
    if (!editData) body.id = chargeCodeId.trim();
    if (resolvedParentId) body.parentId = resolvedParentId;
    if (programName) body.programName = programName;
    if (activityCategory) body.activityCategory = activityCategory;
    if (approverId) body.approverId = approverId;

    try {
      if (editData) {
        await api.put(`/charge-codes/${editData.id}`, body);
      } else {
        await api.post('/charge-codes', body);
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save charge code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-heading)]">
            {editData ? 'Edit Charge Code' : 'Create Charge Code'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="rounded-md bg-[var(--accent-red-light)] px-3 py-2 text-sm text-[var(--accent-red)]">
              {error}
            </div>
          )}

          {!editData && (
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                Charge Code ID <span className="text-[var(--accent-red)]">*</span>
              </label>
              <Input
                value={chargeCodeId}
                onChange={(e) => setChargeCodeId(e.target.value)}
                placeholder="e.g. PRG-001, FY260001"
                required
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
              Name <span className="text-[var(--accent-red)]">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Charge code name"
              required
            />
          </div>

          {!editData && (
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                Level <span className="text-[var(--accent-red)]">*</span>
              </label>
              <Select value={level} onValueChange={(v) => { setLevel(v ?? 'program'); setSelectedParentId(''); }}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {needsParent && !parentIdProp && (
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                Parent ({PARENT_LEVEL[level]?.charAt(0).toUpperCase() + PARENT_LEVEL[level]?.slice(1)}) <span className="text-[var(--accent-red)]">*</span>
              </label>
              <Select value={selectedParentId} onValueChange={(v) => setSelectedParentId(v ?? '')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a parent..." />
                </SelectTrigger>
                <SelectContent>
                  {parentOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {parentOptions.length === 0 && (
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  No {PARENT_LEVEL[level]}s found. Create one first.
                </p>
              )}
            </div>
          )}

          {/* Owner & Approver */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                Owner <span className="text-[var(--accent-red)]">*</span>
              </label>
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Select owner...</option>
                {userOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName || u.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                Approver
              </label>
              <select
                value={approverId}
                onChange={(e) => setApproverId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Default to Owner</option>
                {userOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName || u.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Activity Category */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
              Activity Category
            </label>
            <select
              value={activityCategory}
              onChange={(e) => setActivityCategory(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Select category...</option>
              {ACTIVITY_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
              Program Name
            </label>
            <Input
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                Cost Center <span className="text-[var(--accent-red)]">*</span>
              </label>
              <Input
                value={costCenter}
                onChange={(e) => setCostCenter(e.target.value)}
                placeholder="e.g. CC-100"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                Budget <span className="text-[var(--accent-red)]">*</span>
              </label>
              <Input
                type="number"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                Valid From <span className="text-[var(--accent-red)]">*</span>
              </label>
              <Input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                Valid To <span className="text-[var(--accent-red)]">*</span>
              </label>
              <Input
                type="date"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="billable"
              checked={isBillable}
              onChange={(e) => setIsBillable(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-[var(--accent-teal)] focus:ring-[var(--accent-teal)]"
            />
            <label
              htmlFor="billable"
              className="text-sm font-medium text-[var(--text-primary)]"
            >
              Billable
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[var(--accent-teal)] hover:bg-teal-700 text-white"
            >
              {loading ? 'Saving...' : editData ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
