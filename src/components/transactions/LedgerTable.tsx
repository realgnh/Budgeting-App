import { useState } from 'react';
import { format } from 'date-fns';
import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';
import type { Category, Currency, Transaction } from '../../types/finance';
import { transactionToBase } from '../../lib/fx';
import { formatNumber } from '../../lib/format';
import { CategoryBadge } from '../common/CategoryIcon';

export type SortKey = 'date' | 'amount';
export interface SortState { key: SortKey; dir: 'asc' | 'desc' }

interface Props {
  rows: Transaction[];
  categories: Category[];
  base: Currency;
  sort?: SortState;
  onSort?: (k: SortKey) => void;
  onEdit?: (t: Transaction) => void;
  onDelete?: (t: Transaction) => void;
  emptyLabel?: string;
}

export function LedgerTable({ rows, categories, base, sort, onSort, onEdit, onDelete, emptyLabel = 'No transactions match these filters.' }: Props) {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const actions = !!(onEdit || onDelete);
  const SortHead = ({ k, children, right }: { k: SortKey; children: string; right?: boolean }) => {
    const active = sort?.key === k;
    const Icon = sort?.dir === 'asc' ? ArrowUp : ArrowDown;
    return (
      <th className={`px-3 py-2 ${right ? 'text-right' : 'text-left'}`} aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
        {onSort ? (
          <button type="button" onClick={() => onSort(k)} className={`label-caps inline-flex items-center gap-1 hover:text-fg ${active ? 'text-fg' : ''}`}>
            {children}{active && <Icon size={12} />}
          </button>
        ) : <span className="label-caps">{children}</span>}
      </th>
    );
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-line">
            <SortHead k="date">Date &amp; time</SortHead>
            <th className="label-caps px-3 py-2 text-left">Title &amp; notes</th>
            <th className="label-caps px-3 py-2 text-left">Category</th>
            <th className="label-caps px-3 py-2 text-right">Native amount</th>
            <SortHead k="amount" right>{`In ${base}`}</SortHead>
            {actions && <th className="label-caps px-3 py-2 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => {
            const d = new Date(t.timestampIso), inc = t.type === 'income', c = byId.get(t.categoryId);
            const sign = inc ? '+' : '−';
            return (
              <tr key={t.id} className="group border-b border-line transition-colors last:border-0 hover:bg-surface-2">
                <td className="whitespace-nowrap px-3 py-2.5 text-fg-2">{format(d, 'MMM d, yyyy')}<span className="block text-[11.5px] text-muted">{format(d, 'HH:mm')}</span></td>
                <td className="px-3 py-2.5"><div className="font-semibold">{t.title}</div>{t.notes && <div className="text-[12px] text-muted">{t.notes}</div>}</td>
                <td className="px-3 py-2.5">{c ? <CategoryBadge name={c.name} color={c.color} /> : <span className="text-muted">Unknown</span>}</td>
                <td className={`whitespace-nowrap px-3 py-2.5 text-right font-semibold ${inc ? 'text-good' : ''}`}>{sign}{formatNumber(t.amount)}<span className="ml-1 text-[10.5px] font-bold tracking-wide text-muted">{t.currency}</span></td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right text-fg-2">{t.currency === base ? <span className="text-muted">same</span> : `${sign}${formatNumber(transactionToBase(t, base))}`}</td>
                {actions && (
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    {confirmId === t.id ? (
                      <span className="anim-fade-up inline-flex gap-1">
                        <button type="button" className="btn btn-danger" onClick={() => { onDelete?.(t); setConfirmId(null); }}>Delete</button>
                        <button type="button" className="btn btn-ghost" onClick={() => setConfirmId(null)}>Keep</button>
                      </span>
                    ) : (
                      <span className="inline-flex gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                        {onEdit && <button type="button" className="btn btn-ghost btn-icon" aria-label={`Edit ${t.title}`} onClick={() => onEdit(t)}><Pencil size={14} /></button>}
                        {onDelete && <button type="button" className="btn btn-ghost btn-icon hover:!text-bad" aria-label={`Delete ${t.title}`} onClick={() => setConfirmId(t.id)}><Trash2 size={14} /></button>}
                      </span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
          {!rows.length && <tr><td colSpan={actions ? 6 : 5} className="px-3 py-8 text-center text-muted">{emptyLabel}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
