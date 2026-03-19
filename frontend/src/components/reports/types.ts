export interface BudgetAlert {
  chargeCodeId: string;
  name: string;
  budget: number;
  actual: number;
  forecast: number | null;
  severity: string;
  rootCauseActivity: string | null;
}

export interface ChargeabilityAlert {
  type: 'chargeability';
  employeeId: string;
  name: string;
  billableHours: number;
  totalHours: number;
  chargeability: number;
  target: number;
  severity: string;
  costImpact: number;
}

const SEVERITY_ORDER: Record<string, number> = { red: 0, orange: 1, yellow: 2 };

export function severityColorClass(severity: string): string {
  if (severity === 'red') return 'bg-[var(--accent-red)]';
  if (severity === 'orange') return 'bg-[var(--accent-amber)]';
  if (severity === 'yellow') return 'bg-yellow-500';
  return 'bg-[var(--accent-green)]';
}

export function compareSeverity(a: string, b: string): number {
  return (SEVERITY_ORDER[a] ?? 3) - (SEVERITY_ORDER[b] ?? 3);
}
