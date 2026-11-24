import { useMemo } from 'react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { usePeriod } from '../../hooks/usePeriod';
import { breakdownByCategory, cashFlowSeries } from '../../lib/analytics';
import { RANGE_LABEL } from '../../lib/timeframes';
import { CashFlowChart } from '../analytics/CashFlowChart';
import { DonutChart } from '../analytics/DonutChart';
import { EmptyState } from '../common/EmptyState';
import { KpiCards } from './KpiCards';
import { BudgetHealthPanel } from './BudgetHealthPanel';
import { RecentTransactions } from './RecentTransactions';

export function OverviewTab() {
  const { transactions, categories, baseCurrency: base, balanceAdjustments } = useFinanceStore();
  const { range, window, current } = usePeriod();
  const series = useMemo(() => cashFlowSeries(transactions, window, base, balanceAdjustments), [transactions, window, base, balanceAdjustments]);
  const slices = useMemo(() => breakdownByCategory(current.filter((t) => t.type === 'expense'), categories, base), [current, categories, base]);
  return (
    <div className="anim-stagger flex flex-col gap-5">
      {!transactions.length && <EmptyState />}
      <KpiCards />
      <BudgetHealthPanel />
      <div className="grid grid-cols-[minmax(0,6fr)_minmax(0,5fr)] gap-5">
        <section className="card flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex flex-col"><h2 className="card-title">Cash flow</h2><span className="text-[12px] text-muted">{RANGE_LABEL[range]}</span></div>
            <Legend items={[['Income', 'bg-income'], ['Expenses', 'bg-expense']]} />
          </div>
          <div className="min-h-[260px] flex-1"><CashFlowChart data={series} base={base} view="bars" height="100%" /></div>
        </section>
        <section className="card">
          <div className="mb-4 flex flex-col"><h2 className="card-title">Where the money went</h2><span className="text-[12px] text-muted">{RANGE_LABEL[range]}</span></div>
          <DonutChart slices={slices} base={base} totalLabel="Spent" emptyLabel={`No expenses · ${RANGE_LABEL[range].toLowerCase()}`} layout="row" size={210} />
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
