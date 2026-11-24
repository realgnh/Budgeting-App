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
    <section className="card pb-2">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="card-title">Recent activity</h2>
        <button type="button" className="btn btn-ghost btn-sm group -mr-2" onClick={() => setTab('transactions')}>All transactions<ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-0.5" /></button>
      </div>
      <ul className="grid grid-cols-2 gap-x-8">
        {recent.map((t) => {
          const c = byId.get(t.categoryId), d = new Date(t.timestampIso), inc = t.type === 'income';
          return (
            <li key={t.id} className="border-t border-line first:border-t-0 [&:nth-child(2)]:border-t-0">
              <button type="button" onClick={() => openEditTransaction(t)}
                className="-mx-2 grid w-[calc(100%+1rem)] grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-3 rounded-[7px] px-2 py-2.5 text-left transition-colors duration-200 hover:bg-surface-2">
                <span style={{ color: c?.color }}><CategoryIcon name={c?.icon ?? ''} size={16} /></span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{t.title}</span>
                  <span className="block truncate text-[12px] text-muted">{c?.name ?? 'Unknown'} · {format(d, 'MMM d, HH:mm')}</span>
                </span>
                <span className="text-right">
                  <span className={`block whitespace-nowrap font-medium ${inc ? 'text-good' : ''}`}>{inc ? '+' : '−'}{formatNumber(t.amount)} <span className="text-[11.5px] font-normal text-muted">{t.currency}</span></span>
                  {t.currency !== base && <span className="block whitespace-nowrap text-[12px] text-muted">≈ {formatMoney(transactionToBase(t, base), base)}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
