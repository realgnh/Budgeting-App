import { useMemo, useState } from 'react';
import { addDays, parseISO, startOfDay } from 'date-fns';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useUi } from '../../store/useUi';
import { transactionToBase } from '../../lib/fx';
import { sumTotals } from '../../lib/analytics';
import { formatMoney } from '../../lib/format';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { EmptyState } from '../common/EmptyState';
import { toast } from '../common/Toast';
import { EMPTY_FILTERS, FilterBar, type Filters } from './FilterBar';
import { LedgerTable, type SortKey, type SortState } from './LedgerTable';

export function TransactionsTab() {
  const { transactions, categories, baseCurrency: base, deleteTransaction } = useFinanceStore();
  const openEdit = useUi((s) => s.openEditTransaction);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortState>({ key: 'date', dir: 'desc' });

  const rows = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const from = filters.from ? startOfDay(parseISO(filters.from)).getTime() : -Infinity;
    const to = filters.to ? addDays(startOfDay(parseISO(filters.to)), 1).getTime() : Infinity;
    const list = transactions.filter((t) => {
      if (filters.type !== 'all' && t.type !== filters.type) return false;
      if (filters.cat !== 'all' && t.categoryId !== filters.cat) return false;
      if (filters.cur !== 'all' && t.currency !== filters.cur) return false;
      const ts = Date.parse(t.timestampIso);
      if (ts < from || ts >= to) return false;
      return !q || t.title.toLowerCase().includes(q) || (t.notes ?? '').toLowerCase().includes(q);
    });
    const dir = sort.dir === 'asc' ? 1 : -1;
    return list.sort((a, b) => sort.key === 'date'
      ? dir * a.timestampIso.localeCompare(b.timestampIso)
      : dir * (transactionToBase(a, base) - transactionToBase(b, base)));
  }, [transactions, filters, sort, base]);

  const totals = useMemo(() => sumTotals(rows, base), [rows, base]);
  const onSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }));
  const money0 = (v: number) => formatMoney(v, base, 0);

  if (!transactions.length) return <EmptyState />;
  return (
    <div className="anim-stagger flex flex-col gap-5">
      <section className="card flex flex-col gap-3">
        <FilterBar value={filters} onChange={setFilters} categories={categories} />
        <div className="grid grid-cols-4 overflow-hidden rounded-[8px] border border-line">
          {[
            { l: 'Count', v: <AnimatedNumber value={totals.count} format={(v) => String(Math.round(v))} /> },
            { l: 'Income', v: <span className="text-good"><AnimatedNumber value={totals.income} format={money0} /></span> },
            { l: 'Expenses', v: <AnimatedNumber value={totals.expense} format={money0} /> },
            { l: 'Net', v: <span className={totals.net < 0 ? 'text-bad' : ''}><AnimatedNumber value={totals.net} format={money0} /></span> },
          ].map((x) => (
            <div key={x.l} className="border-r border-line bg-surface-2 px-4 py-2.5 last:border-r-0">
              <div className="label-caps">{x.l}</div>
              <div className="figure text-[18px]">{x.v}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="card px-2 py-1">
        <LedgerTable rows={rows} categories={categories} base={base} sort={sort} onSort={onSort} onEdit={openEdit}
          onDelete={(t) => { deleteTransaction(t.id); toast(`Deleted “${t.title}”`); }} />
      </section>
    </div>
  );
}
