import { useEffect, useState } from 'react';
import type { BudgetStatus } from '../../lib/budgets';

const FILL: Record<BudgetStatus, string> = { ok: 'bg-good', warn: 'bg-warn', over: 'bg-bad' };
const TEXT: Record<BudgetStatus, string> = { ok: 'text-good', warn: 'text-warn', over: 'text-bad' };

/** Fills from zero on mount, then glides between values. */
export function ProgressBar({ pct, status, slim }: { pct: number; status: BudgetStatus; slim?: boolean }) {
  const [w, setW] = useState(0);
  useEffect(() => { const r = requestAnimationFrame(() => setW(Math.min(100, Math.max(0, Number.isFinite(pct) ? pct : 100)))); return () => cancelAnimationFrame(r); }, [pct]);
  return (
    <div className={`overflow-hidden rounded-full bg-surface-2 ring-1 ring-inset ring-line/70 ${slim ? 'h-1.5' : 'h-2'}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`bar-fill h-full rounded-full ${FILL[status]}`} style={{ width: `${w}%` }} />
    </div>
  );
}

/** Status as colored text with a small dot, rather than a badge. */
export function StatusPill({ status, children }: { status: BudgetStatus; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] font-medium ${TEXT[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />{children}
    </span>
  );
}
