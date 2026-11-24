import { Search, X } from 'lucide-react';
import type { Category, Currency, TransactionType } from '../../types/finance';
import { CURRENCIES } from '../../types/finance';

export interface Filters { q: string; type: 'all' | TransactionType; cat: string; cur: 'all' | Currency }
export const EMPTY_FILTERS: Filters = { q: '', type: 'all', cat: 'all', cur: 'all' };

export function FilterBar({ value, onChange, categories }: { value: Filters; onChange: (f: Filters) => void; categories: Category[] }) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onChange({ ...value, [k]: v });
  const cats = categories.filter((c) => value.type === 'all' || c.type === value.type);
  const dirty = JSON.stringify(value) !== JSON.stringify(EMPTY_FILTERS);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative min-w-[220px] flex-1">
        <Search size={15} className="pointer-events-none absolute left-2.5 top-2 text-muted" />
        <input className="input w-full pl-8" placeholder="Search title or notes" value={value.q} onChange={(e) => set('q', e.target.value)} aria-label="Search title or notes" />
      </label>
      <select className="input" aria-label="Type" value={value.type} onChange={(e) => onChange({ ...value, type: e.target.value as Filters['type'], cat: 'all' })}>
        <option value="all">All types</option><option value="income">Income</option><option value="expense">Expense</option>
      </select>
      <select className="input max-w-[200px]" aria-label="Category" value={value.cat} onChange={(e) => set('cat', e.target.value)}>
        <option value="all">All categories</option>
        {cats.map((c) => <option key={c.id} value={c.id}>{c.name}{value.type === 'all' ? ` (${c.type})` : ''}</option>)}
      </select>
      <select className="input" aria-label="Native currency" value={value.cur} onChange={(e) => set('cur', e.target.value as Filters['cur'])}>
        <option value="all">All currencies</option>{CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      {dirty && <button type="button" className="btn btn-ghost anim-fade-up" onClick={() => onChange(EMPTY_FILTERS)}><X size={14} />Clear filters</button>}
    </div>
  );
}
