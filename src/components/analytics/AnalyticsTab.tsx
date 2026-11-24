import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useUi } from '../../store/useUi';
import { usePeriod } from '../../hooks/usePeriod';
import { breakdownByCategory, burnRateSeries, cashFlowSeries, currencyMix, periodHighlights } from '../../lib/analytics';
import { limitToBase } from '../../lib/fx';
import { monthKey, resolveMonthBudget } from '../../lib/budgets';
import { formatMoney, formatPct } from '../../lib/format';
import { periodTitle } from '../../lib/timeframes';
import { fmt } from '../../lib/time';
import { SegmentedControl } from '../common/SegmentedControl';
import { EmptyState } from '../common/EmptyState';
import { toast } from '../common/Toast';
import { CashFlowChart } from './CashFlowChart';
import { BurnRateChart } from './BurnRateChart';
import { DonutChart } from './DonutChart';
import { LedgerTable } from '../transactions/LedgerTable';
import { Legend } from '../overview/OverviewTab';

const UNIT_LABEL = { hour: 'by hour', day: 'by day', month: 'by month' } as const;

export function AnalyticsTab() {
  const { transactions, categories, baseCurrency: base, budgets, monthlyBudgets, balanceAdjustments, fx, deleteTransaction } = useFinanceStore();
  const openEdit = useUi((s) => s.openEditTransaction);
  const { period, window, current, now } = usePeriod();
  const title = periodTitle(period);
  const [view, setView] = useState<'bars' | 'balance'>('bars');
  const [selCat, setSelCat] = useState<string | null>(null);

  const expenses = useMemo(() => current.filter((t) => t.type === 'expense'), [current]);
  const incomes = useMemo(() => current.filter((t) => t.type === 'income'), [current]);
  const series = useMemo(() => cashFlowSeries(transactions, window, base, balanceAdjustments), [transactions, window, base, balanceAdjustments]);
  const expSlices = useMemo(() => breakdownByCategory(expenses, categories, base), [expenses, categories, base]);
  const incSlices = useMemo(() => breakdownByCategory(incomes, categories, base), [incomes, categories, base]);
  const curSlices = useMemo(() => currencyMix(current, base), [current, base]);
  const hl = useMemo(() => periodHighlights(expenses, categories, base, window, now), [expenses, categories, base, window, now]);
  // The burn-rate chart shows the month containing the selected period.
  const burnMonth = period.anchor;
  const monthBudget = resolveMonthBudget(monthKey(burnMonth), monthlyBudgets, budgets).config;
  const cap = monthBudget.overallMonthlyLimit ? limitToBase(monthBudget.overallMonthlyLimit, base, fx.rates) : null;
  const burn = useMemo(() => burnRateSeries(transactions, base, now, cap, burnMonth), [transactions, base, now, cap, burnMonth]);
  const activeSel = selCat && expSlices.some((s) => s.key === selCat) ? selCat : null;
  const drill = activeSel ? expenses.filter((t) => t.categoryId === activeSel) : [];
  const selName = categories.find((c) => c.id === activeSel);

  if (!transactions.length) return <EmptyState />;
  const label = `on ${title}`;
  return (
    <div className="anim-stagger flex flex-col gap-5">
      <section className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3"><h2 className="card-title">Cash-flow graph</h2><span className="text-[12px] text-muted">{title} · {UNIT_LABEL[window.unit]}</span></div>
          <div className="flex items-center gap-4">
            {view === 'bars' ? <Legend items={[['Income', 'bg-income'], ['Expenses', 'bg-expense']]} /> : <Legend items={[['Running balance', 'bg-accent']]} />}
            <SegmentedControl ariaLabel="Chart view" size="sm" value={view} onChange={setView}
              options={[{ value: 'bars', label: 'Income vs expense' }, { value: 'balance', label: 'Balance line' }]} />
          </div>
        </div>
        <CashFlowChart data={series} base={base} view={view} height={320} />
      </section>

      <section className="card grid grid-cols-3 p-0 divide-cols">
        <Highlight label="Largest expense" value={hl.largest ? formatMoney(hl.largestValue, base) : '—'}
          sub={hl.largest ? `${hl.largest.title} · ${fmt.shortDateTime(hl.largest.timestampIso)}` : `No expenses ${label}`} />
        <Highlight label="Top spending category" value={hl.topCategory?.name ?? '—'}
          sub={hl.topCategory ? `${formatMoney(hl.topCategory.value, base, 0)} · ${formatPct(hl.topCategory.share * 100)} of spend` : `No expenses ${label}`} />
        <Highlight label={period.unit === 'day' ? 'Spent this day' : 'Average daily spend'} value={formatMoney(hl.avgDaily, base, 0)}
          sub={period.unit === 'day' ? `${current.filter((t) => t.type === 'expense').length} expenses` : `across ${hl.days} ${hl.days === 1 ? 'day' : 'days'}`} />
      </section>

      <div className="grid grid-cols-3 gap-5">
        <section className="card">
          <div className="mb-3 flex items-center justify-between"><h2 className="card-title">Expenses by category</h2><span className="text-[12px] text-muted">Select a slice</span></div>
          <DonutChart slices={expSlices} base={base} totalLabel="Spent" emptyLabel={`No expenses ${label}`} selectedKey={activeSel} onSelect={setSelCat} />
        </section>
        <section className="card">
          <div className="mb-3 flex items-center justify-between"><h2 className="card-title">Income by source</h2></div>
          <DonutChart slices={incSlices} base={base} totalLabel="Earned" emptyLabel={`No income ${label}`} />
        </section>
        <section className="card">
          <div className="mb-3 flex items-center justify-between"><h2 className="card-title">Currency mix</h2><span className="text-[12px] text-muted">share of volume</span></div>
          <DonutChart slices={curSlices} base={base} totalLabel="Volume" emptyLabel={`No transactions ${label}`} />
        </section>
      </div>

      {activeSel && selName && (
        <section key={activeSel} className="card anim-fade-up">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="card-title flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: selName.color }} />{selName.name} · {drill.length} {drill.length === 1 ? 'transaction' : 'transactions'}</h2>
            <button type="button" className="btn btn-ghost" onClick={() => setSelCat(null)}><X size={14} />Clear selection</button>
          </div>
          <LedgerTable rows={drill} categories={categories} base={base} onEdit={openEdit} onDelete={(t) => { deleteTransaction(t.id); toast(`Deleted “${t.title}”`); }} />
        </section>
      )}

      <section className="card">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-baseline gap-3"><h2 className="card-title">Monthly burn-rate pace</h2><span className="text-[12px] text-muted">{fmt.monthYear(burnMonth)} · cumulative spend</span></div>
          <Legend items={cap ? [['Actual spend', 'bg-expense'], ['Ideal pace to cap (dashed)', 'bg-muted']] : [['Actual spend', 'bg-expense']]} />
        </div>
        {!cap && <p className="mb-2 text-[12px] text-muted">Set an overall monthly cap in Settings to see the ideal pace line.</p>}
        <BurnRateChart data={burn} base={base} />
      </section>
    </div>
  );
}

function Highlight({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex items-start gap-3 px-5 py-4">
      <div className="min-w-0"><div className="label-caps">{label}</div><div className="truncate figure text-[18px]">{value}</div><div className="truncate text-[12px] text-fg-2">{sub}</div></div>
    </div>
  );
}
