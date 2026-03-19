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
import { useCurrency } from '@/lib/currency';
import { StatCard } from '@/components/shared/StatCard';
import { EmptyState } from '@/components/shared/EmptyState';

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
  const { currency, formatCurrency } = useCurrency();
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

  // Company billing rate state
  const [billingRatePerDay, setBillingRatePerDay] = useState('');
  const [editingBillingRate, setEditingBillingRate] = useState(false);
  const [billingRateLoading, setBillingRateLoading] = useState(false);
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

  const fetchBillingRate = useCallback(async () => {
    try {
      const data = await api.get<{ key: string; value: string }>('/company-settings/billing_rate_per_day');
      setBillingRatePerDay(data.value || '0');
    } catch (e) {
      console.error('Failed to fetch billing rate:', e);
    }
  }, []);

  useEffect(() => {
    fetchRates();
    fetchBillingRate();
  }, [fetchRates, fetchBillingRate]);

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

  async function handleSaveBillingRate() {
    setBillingRateLoading(true);
    try {
      await api.put('/company-settings/billing_rate_per_day', { value: billingRatePerDay });
      setEditingBillingRate(false);
    } catch (e) {
      console.error('Failed to save billing rate:', e);
    } finally {
      setBillingRateLoading(false);
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
        <StatCard
          label="Active rates"
          value={activeRates.length}
          icon={DollarSignIcon}
          accent="var(--accent-teal)"
        />
        <StatCard
          label="Avg hourly rate"
          value={formatCurrency(avgRate)}
          icon={TrendingUpIcon}
          accent="var(--accent-amber)"
        />
        <StatCard
          label="Total rate records"
          value={rates.length}
          icon={DollarSignIcon}
        />
      </div>

      {/* Company Billing Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Company Billing Rate</CardTitle>
          {!editingBillingRate && (
            <Button variant="ghost" size="icon-xs" onClick={() => setEditingBillingRate(true)}>
              <PencilIcon className="w-3.5 h-3.5" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingBillingRate ? (
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">
                  Billing Rate per Day ({currency})
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={billingRatePerDay}
                  onChange={(e) => setBillingRatePerDay(e.target.value)}
                  className="font-[family-name:var(--font-mono)]"
                />
              </div>
              <div className="text-sm text-[var(--text-muted)] pb-2">
                = {formatCurrency(Number(billingRatePerDay || 0) / 8)}/hr
              </div>
              <Button size="sm" onClick={handleSaveBillingRate} disabled={billingRateLoading}>
                {billingRateLoading && <Loader2Icon className="w-4 h-4 animate-spin mr-1" />}
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setEditingBillingRate(false); fetchBillingRate(); }}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-baseline gap-4">
              <span className="text-2xl font-bold font-[family-name:var(--font-mono)] text-[var(--text-primary)]">
                {formatCurrency(Number(billingRatePerDay || 0))}/day
              </span>
              <span className="text-sm text-[var(--text-muted)]">
                ({formatCurrency(Number(billingRatePerDay || 0) / 8)}/hr)
              </span>
            </div>
          )}
        </CardContent>
      </Card>

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
            <EmptyState
              icon={DollarSignIcon}
              title="No rates found"
              description="No rate records match your current filter criteria"
            />
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
                    <TableCell className="font-semibold text-[var(--text-primary)]">
                      {formatCurrency(parseFloat(rate.hourlyRate))}
                    </TableCell>
                    <TableCell className="text-[var(--text-secondary)]">
                      {formatDate(rate.effectiveFrom)}
                    </TableCell>
                    <TableCell className="text-[var(--text-secondary)]">
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
              <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">Hourly Rate ({currency})</label>
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
