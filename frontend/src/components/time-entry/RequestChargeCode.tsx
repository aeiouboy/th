'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ChargeCodeResult {
  id: string;
  name: string;
  level: string | null;
  programName: string | null;
  isBillable: boolean | null;
  ownerId: string | null;
}

export function RequestChargeCode() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCode, setSelectedCode] = useState<ChargeCodeResult | null>(null);
  const [reason, setReason] = useState('');

  const { data: searchResults = [] } = useQuery<ChargeCodeResult[]>({
    queryKey: ['charge-codes-search', search],
    queryFn: ({ signal }) => {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      return api.get(`/charge-codes${params}`, signal);
    },
    enabled: open && search.length >= 2,
  });

  const requestMutation = useMutation({
    mutationFn: (chargeCodeId: string) =>
      api.post(`/charge-codes/${chargeCodeId}/request-access`, { reason }),
    onSuccess: () => {
      toast.success(`Request sent for ${selectedCode?.name || selectedCode?.id}`);
      setOpen(false);
      setSearch('');
      setSelectedCode(null);
      setReason('');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to send request');
    },
  });

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-xs border-dashed"
        onClick={() => setOpen(true)}
      >
        + Request New CC
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSelectedCode(null); setSearch(''); setReason(''); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Charge Code Access</DialogTitle>
          </DialogHeader>

          {!selectedCode ? (
            <div className="space-y-3">
              <Input
                placeholder="Search charge codes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
              {search.length >= 2 && (
                <div className="max-h-[240px] overflow-y-auto space-y-1">
                  {searchResults.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)] text-center py-4">
                      No charge codes found
                    </p>
                  ) : (
                    searchResults.slice(0, 20).map((cc) => (
                      <button
                        key={cc.id}
                        type="button"
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                        onClick={() => setSelectedCode(cc)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--text-secondary)]">
                            {cc.id}
                          </span>
                          <span className="text-sm text-[var(--text-primary)]">{cc.name}</span>
                          <Badge
                            className={`text-[10px] ${
                              cc.isBillable
                                ? 'bg-[var(--accent-teal-light)] text-[var(--accent-teal)]'
                                : 'bg-[var(--accent-amber-light)] text-[var(--accent-amber)]'
                            }`}
                          >
                            {cc.isBillable ? 'Billable' : 'Non-billable'}
                          </Badge>
                        </div>
                        {cc.programName && (
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">
                            {cc.programName}
                          </p>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800">
                <div className="flex items-center gap-2">
                  <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--text-secondary)]">
                    {selectedCode.id}
                  </span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {selectedCode.name}
                  </span>
                </div>
                {selectedCode.programName && (
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {selectedCode.programName}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">
                  Reason for access <span className="text-[var(--accent-red)]">*</span>
                </label>
                <textarea
                  className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:border-transparent"
                  placeholder="Why do you need access to this charge code?"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {selectedCode && (
              <>
                <Button variant="outline" onClick={() => setSelectedCode(null)}>
                  Back
                </Button>
                <Button
                  className="bg-[var(--accent-teal)] hover:bg-teal-700 text-white"
                  onClick={() => requestMutation.mutate(selectedCode.id)}
                  disabled={!reason.trim() || requestMutation.isPending}
                >
                  {requestMutation.isPending ? 'Sending...' : 'Send Request'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
