'use client';

import { useState } from 'react';
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
  };
  parentId?: string;
}

const LEVELS = [
  { value: 'program', label: 'Program' },
  { value: 'project', label: 'Project' },
  { value: 'activity', label: 'Activity' },
  { value: 'task', label: 'Task' },
];

export function ChargeCodeForm({
  open,
  onOpenChange,
  onSuccess,
  editData,
  parentId,
}: ChargeCodeFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState(editData?.name || '');
  const [level, setLevel] = useState(editData?.level || 'program');
  const [programName, setProgramName] = useState(editData?.programName || '');
  const [costCenter, setCostCenter] = useState(editData?.costCenter || '');
  const [budgetAmount, setBudgetAmount] = useState(
    editData?.budgetAmount || '',
  );
  const [validFrom, setValidFrom] = useState(editData?.validFrom || '');
  const [validTo, setValidTo] = useState(editData?.validTo || '');
  const [isBillable, setIsBillable] = useState<boolean>(
    editData?.isBillable ?? true,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const body: Record<string, string | boolean | number> = {
      name,
      level,
      isBillable,
    };
    if (parentId) body.parentId = parentId;
    if (programName) body.programName = programName;
    if (costCenter) body.costCenter = costCenter;
    if (budgetAmount) body.budgetAmount = parseFloat(budgetAmount);
    if (validFrom) body.validFrom = validFrom;
    if (validTo) body.validTo = validTo;

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
      <DialogContent className="sm:max-w-md">
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

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
              Name
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
                Level
              </label>
              <Select value={level} onValueChange={(v) => setLevel(v ?? 'program')}>
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
                Cost Center
              </label>
              <Input
                value={costCenter}
                onChange={(e) => setCostCenter(e.target.value)}
                placeholder="e.g. CC-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                Budget
              </label>
              <Input
                type="number"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                Valid From
              </label>
              <Input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                Valid To
              </label>
              <Input
                type="date"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
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
