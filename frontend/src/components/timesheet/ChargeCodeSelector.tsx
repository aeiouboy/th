'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface ChargeCode {
  chargeCodeId: string;
  name: string;
  isBillable: boolean | null;
}

interface ChargeCodeSelectorProps {
  availableCodes: ChargeCode[];
  usedCodeIds: Set<string>;
  onSelect: (code: ChargeCode) => void;
}

export function ChargeCodeSelector({
  availableCodes,
  usedCodeIds,
  onSelect,
}: ChargeCodeSelectorProps) {
  const unusedCodes = availableCodes.filter(
    (c) => !usedCodeIds.has(c.chargeCodeId),
  );

  if (unusedCodes.length === 0) {
    return (
      <span className="text-sm text-[var(--text-muted)]">
        All assigned charge codes are in use
      </span>
    );
  }

  return (
    <Select
      value=""
      onValueChange={(val) => {
        const code = unusedCodes.find((c) => c.chargeCodeId === val);
        if (code) onSelect(code);
      }}
    >
      <SelectTrigger className="w-[220px] border-dashed border-[var(--accent-teal)] text-[var(--accent-teal)]">
        <SelectValue placeholder="+ Add Charge Code" />
      </SelectTrigger>
      <SelectContent>
        {unusedCodes.map((code) => (
          <SelectItem key={code.chargeCodeId} value={code.chargeCodeId}>
            <span className="flex items-center gap-2">
              <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--text-secondary)]">
                {code.chargeCodeId}
              </span>
              <span className="text-[var(--text-primary)]">{code.name}</span>
              <Badge
                className={`text-[10px] rounded-[999px] ${
                  code.isBillable
                    ? 'bg-[var(--accent-teal-light)] text-[var(--accent-teal)]'
                    : 'bg-[var(--accent-amber-light)] text-[var(--accent-amber)]'
                }`}
              >
                {code.isBillable ? 'Billable' : 'Non-billable'}
              </Badge>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
