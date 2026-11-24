import { format } from 'date-fns';
import { ArrowRight } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useUi } from '../../store/useUi';
import { transactionToBase } from '../../lib/fx';
import { formatMoney, formatNumber } from '../../lib/format';
import { CategoryIcon } from '../common/CategoryIcon';

export function RecentTransactions() {
  const { transactions, categories, baseCurrency: base } = useFinanceStore();
  const { setTab, openEditTransaction } = useUi();
  const byId = new Map(categories.map((c) => [c.id, c]));
  const recent = transactions.slice(0, 6);
  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="card-title">Recent transactions</h2>
        <button type="button" className="btn btn-ghost group" onClick={() => setTab('transactions')}>View all<ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" /></button>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {recent.map((t) => {
          const c = byId.get(t.categoryId), d = new Date(t.timestampIso), inc = t.type === 'income';
          const color = c?.color ?? '#64748b';
          return (
            <button key={t.id} type="button" onClick={() => openEditTransaction(t)}
              className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl border border-line p-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card">
              <span className="grid h-9 w-9 place-items-center rounded-[10px]" style={{ background: `${color}22`, color }}><CategoryIcon name={c?.icon ?? ''} size={16} /></span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{t.title}</span>
                <span className="block truncate text-[11.5px] text-muted">{c?.name ?? 'Unknown'} · {format(d, 'MMM d, HH:mm')}</span>
              </span>
              <span className="text-right">
                <span className={`block whitespace-nowrap font-bold ${inc ? 'text-good' : ''}`}>{inc ? '+' : '−'}{formatNumber(t.amount)}<span className="ml-1 text-[10.5px] text-muted">{t.currency}</span></span>
                <span className="block whitespace-nowrap text-[11.5px] text-muted">{t.currency === base ? format(d, 'MMM d') : `≈ ${formatMoney(transactionToBase(t, base), base)}`}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
