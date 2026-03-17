'use client';

import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

interface BulkApprovalBarProps {
  count: number;
  onApprove: () => void;
  onReject: () => void;
  loading: boolean;
}

export function BulkApprovalBar({
  count,
  onApprove,
  onReject,
  loading,
}: BulkApprovalBarProps) {
  if (count === 0) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-primary)] text-white px-6 py-3 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.15)]"
      style={{ animation: 'fade-in 200ms ease-out' }}
    >
      <span className="text-sm font-medium">
        {count} selected
      </span>
      <div className="flex gap-2">
        <Button
          variant="destructive"
          size="sm"
          onClick={onReject}
          disabled={loading}
        >
          <X className="w-3.5 h-3.5 mr-1.5" />
          Reject Selected
        </Button>
        <Button
          size="sm"
          onClick={onApprove}
          disabled={loading}
          className="bg-[var(--accent-green)] hover:bg-emerald-700 text-white border-0"
        >
          <Check className="w-3.5 h-3.5 mr-1.5" />
          Approve Selected
        </Button>
      </div>
    </div>
  );
}
