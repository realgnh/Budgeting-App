import { useMemo } from 'react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useUi, type DonutKind } from '../../store/useUi';
import { usePeriod } from '../../hooks/usePeriod';
import { breakdownByCategory, cashFlowSeries } from '../../lib/analytics';
import { periodTitle } from '../../lib/timeframes';
import { CashFlowChart } from '../analytics/CashFlowChart';
import { DonutChart } from '../analytics/DonutChart';
import { EmptyState } from '../common/EmptyState';
import { SegmentedControl } from '../common/SegmentedControl';
import { KpiCards } from './KpiCards';
import { BudgetHealthPanel } from './BudgetHealthPanel';
import { RecentTransactions } from './RecentTransactions';

const DONUT_OPTS = [{ value: 'expense', label: 'Expenses' }, { value: 'income', label: 'Income' }] as const;
const DONUT_COPY: Record<DonutKind, { heading: string; total: string; empty: string }> = {
  expense: { heading: 'Where the money went', total: 'Spent', empty: 'No expenses' },
  income: { heading: 'Where the money came from', total: 'Earned', empty: 'No income' },
};

export function OverviewTab() {
  const { transactions, categories, baseCurrency: base, balanceAdjustments } = useFinanceStore();
  const { period, window, current } = usePeriod();
  const title = periodTitle(period);
  const series = useMemo(() => cashFlowSeries(transactions, window, base, balanceAdjustments), [transactions, window, base, balanceAdjustments]);
  const donut = useUi((s) => s.overviewDonut);
  const setDonut = useUi((s) => s.setOverviewDonut);
  const slices = useMemo(() => breakdownByCategory(current.filter((t) => t.type === donut), categories, base), [current, categories, base, donut]);
  const copy = DONUT_COPY[donut];
  return (
    <div className="anim-stagger flex flex-col gap-5">
      {!transactions.length && <EmptyState />}
      <KpiCards />
      <BudgetHealthPanel />
      <div className="grid grid-cols-[minmax(0,6fr)_minmax(0,5fr)] gap-5">
        <section className="card flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex flex-col"><h2 className="card-title">Cash flow</h2><span className="text-[12px] text-muted">{title}</span></div>
            <Legend items={[['Income', 'bg-income'], ['Expenses', 'bg-expense']]} />
          </div>
          <div className="min-h-[260px] flex-1"><CashFlowChart data={series} base={base} view="bars" height="100%" /></div>
        </section>
        <section className="card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col"><h2 className="card-title truncate">{copy.heading}</h2><span className="text-[12px] text-muted">{title}</span></div>
            <SegmentedControl ariaLabel="Breakdown" size="sm" value={donut} onChange={setDonut} options={DONUT_OPTS} />
          </div>
          {/* Keyed so the slices animate in afresh and hover state resets when switching. */}
          <div key={donut} className="anim-fade-up">
            <DonutChart slices={slices} base={base} totalLabel={copy.total} emptyLabel={`${copy.empty} on ${title}`} layout="row" size={210} />
          </div>
        </section>
      </div>
      {transactions.length > 0 && <RecentTransactions />}
    </div>
  );
}

export function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="flex flex-wrap gap-4 text-[12px] text-fg-2">
      {items.map(([l, c]) => <span key={l} className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-[3px] ${c}`} />{l}</span>)}
    </div>
  );
}
