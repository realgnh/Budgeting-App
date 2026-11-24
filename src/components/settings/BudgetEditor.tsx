import { useEffect, useMemo, useState } from 'react';
import { fmt } from '../../lib/time';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useUi } from '../../store/useUi';
import { limitToBase } from '../../lib/fx';
import { monthFromKey, resolveMonthBudget } from '../../lib/budgets';
import { earliestTimestamp } from '../../lib/timeframes';
import type { Currency, MoneyLimit } from '../../types/finance';
import { toast } from '../common/Toast';
import { CategoryIcon } from '../common/CategoryIcon';
import { MonthPicker, yearRange } from '../common/MonthPicker';

export function BudgetEditor() {
  const { categories, budgets, monthlyBudgets, transactions, baseCurrency: base, fx, saveMonthBudget, clearMonthBudget } = useFinanceStore();
  const { budgetMonth, setBudgetMonth } = useUi();
  const exp = categories.filter((c) => c.type === 'expense');
  const { config, from } = resolveMonthBudget(budgetMonth, monthlyBudgets, budgets);
  const monthName = fmt.monthYear(monthFromKey(budgetMonth));
  const years = useMemo(() => yearRange(earliestTimestamp(transactions)), [transactions]);
  const show = (l: MoneyLimit | null | undefined, cur: Currency) => (l ? String(Math.round(limitToBase(l, cur, fx.rates) * 100) / 100) : '');
  const [overall, setOverall] = useState('');
  const [cats, setCats] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  // Re-seed the form when the month, its budget, the categories or the base currency change.
  useEffect(() => {
    setOverall(show(config.overallMonthlyLimit, base));
    setCats(Object.fromEntries(exp.map((c) => [c.id, show(config.categoryMonthlyLimits[c.id], base)])));
    setError(null);
  }, [config, base, categories, budgetMonth]);

  const parse = (s: string) => (s.trim() === '' ? 0 : Number(s.replace(/,/g, '')));
  const save = () => {
    const o = parse(overall);
    const parsed = Object.fromEntries(Object.entries(cats).map(([k, v]) => [k, parse(v)]));
    if (!Number.isFinite(o) || o < 0 || Object.values(parsed).some((v) => !Number.isFinite(v) || v < 0)) {
      setError('Limits must be positive numbers. Leave a field empty to remove its limit.');
      return;
    }
    setError(null);
    saveMonthBudget(budgetMonth, o > 0 ? o : null, parsed);
    toast(`Saved the ${monthName} budget in ${base}`);
  };
  const clearFields = () => { setOverall(''); setCats(Object.fromEntries(exp.map((c) => [c.id, '']))); };
  const ownBudget = from === budgetMonth;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-[8px] bg-surface-2 px-4 py-3">
        <span className="label-caps">Budget month</span>
        <MonthPicker idPrefix="editor" value={budgetMonth} onChange={setBudgetMonth} {...years} />
        <p className="text-[12.5px] text-fg-2">
          {ownBudget ? `${monthName} has its own budget.`
            : from ? `${monthName} uses the budget set for ${fmt.monthYear(monthFromKey(from))}.`
              : `${monthName} has no budget yet.`}
          {' '}Saving applies to {monthName} and later months, until a later month gets its own budget.
        </p>
      </div>
      <p className="text-[12.5px] text-fg-2">Amounts are in your base currency, <span className="font-medium text-fg">{base}</span>. Leave a field empty for no limit.</p>
      <LimitRow label={<span className="font-medium">Overall monthly cap</span>} base={base} value={overall} onChange={setOverall} id="lim-overall" />
      <div className="h-px bg-line" />
      {exp.map((c) => (
        <LimitRow key={c.id} id={`lim-${c.id}`} base={base} value={cats[c.id] ?? ''} onChange={(v) => setCats((s) => ({ ...s, [c.id]: v }))}
          label={<span className="flex items-center gap-2.5"><span style={{ color: c.color }}><CategoryIcon name={c.icon} size={15} /></span>{c.name}</span>} />
      ))}
      {error && <div className="rounded-[7px] bg-bad-soft px-3 py-2 text-[12.5px] font-medium text-bad" role="alert">{error}</div>}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex gap-1">
          <button type="button" className="btn btn-ghost" onClick={clearFields}>Clear fields</button>
          {ownBudget && <button type="button" className="btn btn-ghost text-bad" onClick={() => { clearMonthBudget(budgetMonth); toast(`Removed the ${monthName} budget`); }}>Remove this month's budget</button>}
        </div>
        <button type="button" className="btn btn-primary" onClick={save}>Save {fmt.month(monthFromKey(budgetMonth))} budget</button>
      </div>
    </section>
  );
}

function LimitRow({ label, base, value, onChange, id }: { label: React.ReactNode; base: string; value: string; onChange: (v: string) => void; id: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_170px] items-center gap-3 text-[13px]">
      <label htmlFor={id}>{label}</label>
      <div className="flex h-8 items-stretch overflow-hidden rounded-[7px] border border-line bg-surface transition-[border-color,box-shadow] duration-200 focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent/15">
        <span className="grid place-items-center border-r border-line bg-surface-2 px-2 text-[11px] font-medium text-muted">{base}</span>
        <input id={id} inputMode="decimal" className="w-full min-w-0 bg-transparent px-2 text-right outline-none" placeholder="No limit" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}
