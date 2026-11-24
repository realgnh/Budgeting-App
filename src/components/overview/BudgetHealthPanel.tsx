import { format } from 'date-fns';
import { SlidersHorizontal, Target } from 'lucide-react';
import { useMemo } from 'react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useUi } from '../../store/useUi';
import { useNow } from '../../hooks/useNow';
import { computeBudgetSummary, STATUS_LABEL } from '../../lib/budgets';
import { formatMoney, formatPct } from '../../lib/format';
import { ProgressBar, StatusPill } from '../common/ProgressBar';
import { AnimatedNumber } from '../common/AnimatedNumber';

const ICON = { ok: '✓', warn: '!', over: '✕' } as const;

export function BudgetHealthPanel() {
  const { transactions, budgets, categories, baseCurrency: base, fx } = useFinanceStore();
  const openSettings = useUi((s) => s.openSettings);
  const now = useNow();
  const s = useMemo(() => computeBudgetSummary(transactions, budgets, categories, base, fx.rates, now), [transactions, budgets, categories, base, fx.rates, now]);
  const byId = new Map(categories.map((c) => [c.id, c]));
  const m0 = (v: number) => formatMoney(v, base, 0);
  const hasAny = !!s.overall || s.categories.length > 0;

  return (
    <section className="card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="card-title">{format(now, 'MMMM yyyy')} Budget</h2>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-muted">Current calendar month · not affected by the timeframe</span>
          <button type="button" className="btn" onClick={() => openSettings('budgets')}><SlidersHorizontal size={14} />Edit budgets</button>
        </div>
      </div>
      {!hasAny && (
        <div className="flex items-center gap-3 rounded-xl bg-surface-2 px-4 py-3 text-fg-2">
          <Target size={18} className="text-accent" />
          <span className="flex-1">Set a monthly cap or category limits to track spending against a plan.</span>
          <button type="button" className="btn btn-primary" onClick={() => openSettings('budgets')}>Set budgets</button>
        </div>
      )}
      {s.overall && (
        <div className="mb-4 grid grid-cols-[minmax(0,1fr)_230px] items-center gap-5 border-b border-line pb-4">
          <div>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <div className="font-display text-[21px] font-extrabold tracking-tight">
                <AnimatedNumber value={s.spent} format={m0} /> <span className="text-[14px] font-semibold text-muted">of {m0(s.overall.limit)} cap</span>
              </div>
              <StatusPill status={s.overall.status}>{ICON[s.overall.status]} {STATUS_LABEL[s.overall.status]} · {formatPct(s.overall.pct)}</StatusPill>
            </div>
            <ProgressBar pct={s.overall.pct} status={s.overall.status} />
            <div className="mt-1.5 flex justify-between text-[11.5px] text-muted">
              <span>Day {now.getDate()} of {s.daysInMonth}</span><span>{m0(s.overall.remaining)} left</span>
            </div>
          </div>
          <div className="flex flex-col gap-0.5 rounded-xl bg-accent-soft px-4 py-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-accent">Safe to spend / day</span>
            <span className="font-display text-[22px] font-extrabold"><AnimatedNumber value={s.overall.safePerDay} format={m0} /></span>
            <span className="text-[11.5px] text-fg-2">for the next {s.remainingDays} {s.remainingDays === 1 ? 'day' : 'days'}, including today</span>
          </div>
        </div>
      )}
      {s.categories.length > 0 && (
        <div className="grid grid-cols-3 gap-x-6 gap-y-4">
          {s.categories.map((r) => {
            const c = byId.get(r.categoryId)!;
            return (
              <div key={r.categoryId} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2 text-[12.5px]">
                  <span className="flex min-w-0 items-center gap-2 font-semibold"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.color }} /><span className="truncate">{c.name}</span></span>
                  <StatusPill status={r.status}>{formatPct(r.pct)}</StatusPill>
                </div>
                <ProgressBar pct={r.pct} status={r.status} slim />
                <div className="flex justify-between text-[11.5px] text-muted"><span>{m0(r.spent)}</span><span>of {m0(r.limit)}</span></div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
