import { useEffect, useState } from 'react';
import type { BudgetStatus } from '../../lib/budgets';

const FILL: Record<BudgetStatus, string> = { ok: 'bg-good', warn: 'bg-warn', over: 'bg-bad' };

/** Fills from zero on mount, then animates between values. */
export function ProgressBar({ pct, status, slim }: { pct: number; status: BudgetStatus; slim?: boolean }) {
  const [w, setW] = useState(0);
  useEffect(() => { const r = requestAnimationFrame(() => setW(Math.min(100, Math.max(0, Number.isFinite(pct) ? pct : 100)))); return () => cancelAnimationFrame(r); }, [pct]);
  return (
    <div className={`overflow-hidden rounded-full border border-line bg-surface-2 ${slim ? 'h-1.5' : 'h-2.5'}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`bar-fill h-full rounded-full ${FILL[status]}`} style={{ width: `${w}%` }} />
    </div>
  );
}

export function StatusPill({ status, children }: { status: BudgetStatus; children: React.ReactNode }) {
  const cls = status === 'ok' ? 'bg-good-soft text-good' : status === 'warn' ? 'bg-warn-soft text-warn' : 'bg-bad-soft text-bad';
  return <span className={`pill ${cls}`}>{children}</span>;
}
