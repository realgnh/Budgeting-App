import { useEffect, useState } from 'react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { limitToBase } from '../../lib/fx';
import { toast } from '../common/Toast';
import { CategoryIcon } from '../common/CategoryIcon';

export function BudgetEditor() {
  const { categories, budgets, baseCurrency: base, fx, setOverallLimit, setCategoryLimits } = useFinanceStore();
  const exp = categories.filter((c) => c.type === 'expense');
  const show = (l: { amount: number; currency: typeof base } | null | undefined) => (l ? String(Math.round(limitToBase(l, base, fx.rates) * 100) / 100) : '');
  const [overall, setOverall] = useState('');
  const [cats, setCats] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOverall(show(budgets.overallMonthlyLimit));
    setCats(Object.fromEntries(exp.map((c) => [c.id, show(budgets.categoryMonthlyLimits[c.id])])));
    // Re-seed the form whenever the stored budgets, categories or base currency change.
  }, [budgets, base, categories]);

  const parse = (s: string) => (s.trim() === '' ? 0 : Number(s.replace(/,/g, '')));
  const save = () => {
    const o = parse(overall);
    const parsed = Object.fromEntries(Object.entries(cats).map(([k, v]) => [k, parse(v)]));
    if (!Number.isFinite(o) || o < 0 || Object.values(parsed).some((v) => !Number.isFinite(v) || v < 0)) {
      setError('Limits must be positive numbers. Leave a field empty to remove its limit.');
      return;
    }
    setError(null);
    setOverallLimit(o > 0 ? o : null);
    setCategoryLimits(parsed);
    toast(`Budgets saved in ${base}`);
  };
  const clearAll = () => { setOverall(''); setCats(Object.fromEntries(exp.map((c) => [c.id, '']))); };

  return (
    <section className="flex flex-col gap-3">
      <p className="text-[12.5px] text-fg-2">Limits are monthly and entered in your base currency, <b>{base}</b>. Leave a field empty for no limit.</p>
      <LimitRow label={<b>Overall monthly cap</b>} base={base} value={overall} onChange={setOverall} id="lim-overall" />
      <div className="h-px bg-line" />
      {exp.map((c) => (
        <LimitRow key={c.id} id={`lim-${c.id}`} base={base} value={cats[c.id] ?? ''} onChange={(v) => setCats((s) => ({ ...s, [c.id]: v }))}
          label={<span className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-md" style={{ background: `${c.color}22`, color: c.color }}><CategoryIcon name={c.icon} size={13} /></span>{c.name}</span>} />
      ))}
      {error && <div className="rounded-lg bg-bad-soft px-3 py-2 text-[12.5px] font-semibold text-bad" role="alert">{error}</div>}
      <div className="flex justify-between gap-2 pt-1">
        <button type="button" className="btn btn-ghost" onClick={clearAll}>Clear all fields</button>
        <button type="button" className="btn btn-primary" onClick={save}>Save budgets</button>
      </div>
    </section>
  );
}

function LimitRow({ label, base, value, onChange, id }: { label: React.ReactNode; base: string; value: string; onChange: (v: string) => void; id: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_170px] items-center gap-3 text-[13px]">
      <label htmlFor={id}>{label}</label>
      <div className="flex h-8 items-stretch overflow-hidden rounded-lg border border-line bg-surface focus-within:ring-2 focus-within:ring-accent">
        <span className="grid place-items-center border-r border-line bg-surface-2 px-2 text-[11px] font-bold text-muted">{base}</span>
        <input id={id} inputMode="decimal" className="w-full min-w-0 bg-transparent px-2 text-right outline-none" placeholder="No limit" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}
