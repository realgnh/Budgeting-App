import { format } from 'date-fns';
import { SlidersHorizontal } from 'lucide-react';
import { useMemo } from 'react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useUi } from '../../store/useUi';
import { useNow } from '../../hooks/useNow';
import { computeBudgetSummary, monthFromKey, resolveMonthBudget, STATUS_LABEL } from '../../lib/budgets';
import { earliestTimestamp } from '../../lib/timeframes';
import { formatMoney, formatPct } from '../../lib/format';
import { ProgressBar, StatusPill } from '../common/ProgressBar';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { MonthPicker, yearRange } from '../common/MonthPicker';

export function BudgetHealthPanel() {
  const { transactions, budgets, monthlyBudgets, categories, baseCurrency: base, fx } = useFinanceStore();
  const { openSettings, budgetMonth, setBudgetMonth } = useUi();
  const now = useNow();
  const month = useMemo(() => monthFromKey(budgetMonth), [budgetMonth]);
  const { config, from } = resolveMonthBudget(budgetMonth, monthlyBudgets, budgets);
  const s = useMemo(() => computeBudgetSummary(transactions, config, categories, base, fx.rates, now, month),
    [transactions, config, categories, base, fx.rates, now, month]);
  const years = useMemo(() => yearRange(earliestTimestamp(transactions), now), [transactions, now]);
  const byId = new Map(categories.map((c) => [c.id, c]));
  const m0 = (v: number) => formatMoney(v, base, 0);
  const hasAny = !!s.overall || s.categories.length > 0;
  const inherited = from && from !== budgetMonth ? format(monthFromKey(from), 'MMMM yyyy') : null;

  return (
    <section className="card">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <h2 className="card-title">{format(month, 'MMMM yyyy')} budget</h2>
          <span className="text-[12px] text-muted">
            {s.phase === 'past' ? 'Closed month' : s.phase === 'future' ? 'Upcoming month' : `Day ${now.getDate()} of ${s.daysInMonth}`}
            {inherited ? ` · using the budget set in ${inherited}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <MonthPicker idPrefix="panel" value={budgetMonth} onChange={setBudgetMonth} {...years} />
          <button type="button" className="btn" onClick={() => openSettings('budgets')}><SlidersHorizontal size={14} />Edit budget</button>
        </div>
      </div>

      {!hasAny && (
        <div className="flex items-center justify-between gap-3 rounded-[8px] bg-surface-2 px-4 py-3 text-fg-2">
          <span>No budget for {format(month, 'MMMM')}. Set a monthly cap or category limits to track spending against a plan.</span>
          <button type="button" className="btn btn-primary" onClick={() => openSettings('budgets')}>Set budget</button>
        </div>
      )}

      {s.overall && (
        <div className="mb-6 grid grid-cols-[minmax(0,1fr)_220px] items-end gap-8">
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="figure text-[22px]">
                <AnimatedNumber value={s.spent} format={m0} /> <span className="text-[13px] font-normal tracking-normal text-muted">of {m0(s.overall.limit)}</span>
              </div>
              <StatusPill status={s.overall.status}>{STATUS_LABEL[s.overall.status]} · {formatPct(s.overall.pct)}</StatusPill>
            </div>
            <ProgressBar pct={s.overall.pct} status={s.overall.status} />
            <div className="flex justify-between text-[12px] text-muted">
              <span>{s.phase === 'past' ? 'Final spend' : 'Spent so far'}</span>
              <span>{s.spent > s.overall.limit ? `${m0(s.spent - s.overall.limit)} over` : `${m0(s.overall.remaining)} left`}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1 border-l border-line pl-6">
            {s.overall.safePerDay !== null ? (
              <>
                <span className="label-caps">{s.phase === 'future' ? 'Daily allowance' : 'Safe to spend per day'}</span>
                <span className="figure text-[22px] text-accent"><AnimatedNumber value={s.overall.safePerDay} format={m0} /></span>
                <span className="text-[12px] text-muted">{s.phase === 'future' ? `over ${s.daysInMonth} days` : `for ${s.remainingDays} ${s.remainingDays === 1 ? 'day' : 'days'}, including today`}</span>
              </>
            ) : (
              <>
                <span className="label-caps">Result</span>
                <span className={`figure text-[22px] ${s.spent > s.overall.limit ? 'text-bad' : 'text-good'}`}>{m0(Math.abs(s.overall.limit - s.spent))}</span>
                <span className="text-[12px] text-muted">{s.spent > s.overall.limit ? 'over budget' : 'under budget'}</span>
              </>
            )}
          </div>
        </div>
      )}

      {s.categories.length > 0 && (
        <div className={`grid grid-cols-3 gap-x-8 gap-y-5 ${s.overall ? 'border-t border-line pt-5' : ''}`}>
          {s.categories.map((r) => {
            const c = byId.get(r.categoryId)!;
            return (
              <div key={r.categoryId} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="flex min-w-0 items-center gap-2 font-medium"><span className="h-2 w-2 shrink-0 rounded-[3px]" style={{ background: c.color }} /><span className="truncate">{c.name}</span></span>
                  <StatusPill status={r.status}>{formatPct(r.pct)}</StatusPill>
                </div>
                <ProgressBar pct={r.pct} status={r.status} slim />
                <div className="flex justify-between text-[12px] text-muted"><span>{m0(r.spent)}</span><span>of {m0(r.limit)}</span></div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
