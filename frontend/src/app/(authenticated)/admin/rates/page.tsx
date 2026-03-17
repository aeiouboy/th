'use client';

import { useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DollarSignIcon,
  TrendingUpIcon,
  Loader2Icon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Rate {
  id: number;
  jobGrade: string;
  hourlyRate: string;
  effectiveFrom: string;
  effectiveTo: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-[var(--accent-green-light)] text-[var(--accent-green)] border-[var(--accent-green)]/20',
  expired: 'bg-stone-100 text-[var(--text-muted)] border-stone-200 dark:bg-stone-800 dark:border-stone-700',
  upcoming: 'bg-[var(--accent-amber-light)] text-[var(--accent-amber)] border-[var(--accent-amber)]/20',
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getRateStatus(rate: Rate): 'active' | 'expired' | 'upcoming' {
  const today = new Date().toISOString().split('T')[0];
  if (rate.effectiveFrom > today) return 'upcoming';
  if (rate.effectiveTo && rate.effectiveTo < today) return 'expired';
  return 'active';
}

export default function AdminRatesPage() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<Rate | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(false);

  // Form state
  const [formJobGrade, setFormJobGrade] = useState('');
  const [formHourlyRate, setFormHourlyRate] = useState('');
  const [formEffectiveFrom, setFormEffectiveFrom] = useState('');
  const [formEffectiveTo, setFormEffectiveTo] = useState('');

  const fetchRates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Rate[]>('/cost-rates');
      setRates(data);
    } catch (e) {
      console.error('Failed to fetch rates:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const ratesWithStatus = rates.map((r) => ({ ...r, status: getRateStatus(r) }));
  const filtered = ratesWithStatus.filter((r) => statusFilter === 'all' || r.status === statusFilter);

  const activeRates = ratesWithStatus.filter((r) => r.status === 'active');
  const avgRate = activeRates.length
    ? activeRates.reduce((sum, r) => sum + parseFloat(r.hourlyRate), 0) / activeRates.length
    : 0;

  function openEdit(rate: Rate) {
    setEditingRate(rate);
    setFormJobGrade(rate.jobGrade);
    setFormHourlyRate(rate.hourlyRate);
    setFormEffectiveFrom(rate.effectiveFrom);
    setFormEffectiveTo(rate.effectiveTo || '');
    setEditDialogOpen(true);
  }

  function openAdd() {
    setEditingRate(null);
    setFormJobGrade('');
    setFormHourlyRate('');
    setFormEffectiveFrom('');
    setFormEffectiveTo('');
    setEditDialogOpen(true);
  }

  async function handleSave() {
    setActionLoading(true);
    try {
      const payload = {
        jobGrade: formJobGrade,
        hourlyRate: formHourlyRate,
        effectiveFrom: formEffectiveFrom,
        effectiveTo: formEffectiveTo || null,
      };
      if (editingRate) {
        await api.put(`/cost-rates/${editingRate.id}`, payload);
      } else {
        await api.post('/cost-rates', payload);
      }
      setEditDialogOpen(false);
      await fetchRates();
    } catch (e) {
      console.error('Failed to save rate:', e);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(id: number) {
    setActionLoading(true);
    try {
      await api.delete(`/cost-rates/${id}`);
      await fetchRates();
    } catch (e) {
      console.error('Failed to delete rate:', e);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="hover:translate-y-0 hover:shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <CardContent className="flex items-center gap-3 pt-0">
            <div className="w-10 h-10 rounded-lg bg-[var(--accent-teal-light)] flex items-center justify-center">
              <DollarSignIcon className="w-5 h-5 text-[var(--accent-teal)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)] font-[family-name:var(--font-mono)]">
                {activeRates.length}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">Active Rates</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:translate-y-0 hover:shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <CardContent className="flex items-center gap-3 pt-0">
            <div className="w-10 h-10 rounded-lg bg-[var(--accent-amber-light)] flex items-center justify-center">
              <TrendingUpIcon className="w-5 h-5 text-[var(--accent-amber)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)] font-[family-name:var(--font-mono)]">
                {formatCurrency(avgRate, 'USD')}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">Avg Hourly Rate</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:translate-y-0 hover:shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <CardContent className="flex items-center gap-3 pt-0">
            <div className="w-10 h-10 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
              <DollarSignIcon className="w-5 h-5 text-[var(--text-muted)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)] font-[family-name:var(--font-mono)]">
                {rates.length}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">Total Rate Records</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rate table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cost Rates</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={openAdd}>
              <PlusIcon className="w-4 h-4" />
              Add Rate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2Icon className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm text-[var(--text-muted)]">No rates found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Grade</TableHead>
                  <TableHead>Hourly Rate</TableHead>
                  <TableHead>Effective From</TableHead>
                  <TableHead>Effective To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell className="font-medium text-[var(--text-primary)]">
                      <Badge variant="outline" className="font-[family-name:var(--font-mono)]">
                        {rate.jobGrade}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-[family-name:var(--font-mono)] font-semibold text-[var(--text-primary)]">
                      {formatCurrency(parseFloat(rate.hourlyRate), 'USD')}
                    </TableCell>
                    <TableCell className="font-[family-name:var(--font-mono)] text-[var(--text-secondary)]">
                      {formatDate(rate.effectiveFrom)}
                    </TableCell>
                    <TableCell className="font-[family-name:var(--font-mono)] text-[var(--text-secondary)]">
                      {rate.effectiveTo ? formatDate(rate.effectiveTo) : '--'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_STYLES[rate.status]}>
                        {rate.status.charAt(0).toUpperCase() + rate.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-xs" onClick={() => openEdit(rate)}>
                          <PencilIcon className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon-xs"
                          onClick={() => handleDelete(rate.id)}
                          disabled={actionLoading}
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit/Add Rate Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRate ? 'Edit Rate' : 'Add New Rate'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">Job Grade</label>
              <Input
                value={formJobGrade}
                onChange={(e) => setFormJobGrade(e.target.value)}
                placeholder="e.g., L3"
                className="font-[family-name:var(--font-mono)]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">Hourly Rate (USD)</label>
              <Input
                type="number"
                step="0.01"
                value={formHourlyRate}
                onChange={(e) => setFormHourlyRate(e.target.value)}
                placeholder="0.00"
                className="font-[family-name:var(--font-mono)]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">Effective From</label>
              <Input
                type="date"
                value={formEffectiveFrom}
                onChange={(e) => setFormEffectiveFrom(e.target.value)}
                className="font-[family-name:var(--font-mono)]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">Effective To (optional)</label>
              <Input
                type="date"
                value={formEffectiveTo}
                onChange={(e) => setFormEffectiveTo(e.target.value)}
                className="font-[family-name:var(--font-mono)]"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              onClick={handleSave}
              disabled={!formJobGrade || !formHourlyRate || !formEffectiveFrom || actionLoading}
            >
              {actionLoading && <Loader2Icon className="w-4 h-4 animate-spin mr-1" />}
              {editingRate ? 'Update' : 'Add'} Rate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
