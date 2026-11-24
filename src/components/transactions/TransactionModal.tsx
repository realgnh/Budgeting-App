import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useUi } from '../../store/useUi';
import { Modal } from '../common/Overlay';
import { SegmentedControl } from '../common/SegmentedControl';
import { toast } from '../common/Toast';
import { CategoryIcon } from '../common/CategoryIcon';
import { convertCurrency } from '../../lib/fx';
import { formatMoney, formatNumber } from '../../lib/format';
import { CURRENCIES, type Currency, type TransactionType } from '../../types/finance';

interface Draft { type: TransactionType; amount: string; currency: Currency; categoryId: string; title: string; notes: string; when: string }
const toLocalInput = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm");

export function TransactionModal() {
  const { open, editing } = useUi((s) => s.editor);
  const close = useUi((s) => s.closeEditor);
  const { categories, baseCurrency: base, fx, addTransaction, updateTransaction } = useFinanceStore();
  const [d, setD] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setD({ type: editing.type, amount: String(editing.amount), currency: editing.currency, categoryId: editing.categoryId, title: editing.title, notes: editing.notes ?? '', when: toLocalInput(new Date(editing.timestampIso)) });
    } else {
      const first = categories.find((c) => c.type === 'expense');
      setD({ type: 'expense', amount: '', currency: base, categoryId: first?.id ?? '', title: '', notes: '', when: toLocalInput(new Date()) });
    }
  }, [open, editing, categories, base]);

  const cats = useMemo(() => categories.filter((c) => c.type === d?.type), [categories, d?.type]);
  if (!d) return null;
  const upd = (p: Partial<Draft>) => setD({ ...d, ...p });
  const amt = parseFloat(d.amount.replace(/,/g, ''));
  // Edits keep their original snapshot; new entries use current rates.
  const rates = editing && editing.currency === d.currency ? editing.fxSnapshot : fx.rates;
  const preview = Number.isFinite(amt) && amt > 0 ? convertCurrency(amt, d.currency, base, rates) : 0;
  const selectedCat = cats.find((c) => c.id === d.categoryId);

  const save = () => {
    if (!(amt > 0)) return setError('Enter an amount greater than 0.');
    if (!d.categoryId || !selectedCat) return setError('Pick a category.');
    if (!d.title.trim()) return setError('Add a short title, such as the merchant or source.');
    const when = new Date(d.when);
    if (Number.isNaN(when.getTime())) return setError('Pick a valid date and time.');
    const payload = { type: d.type, amount: Math.round(amt * 100) / 100, currency: d.currency, categoryId: d.categoryId, title: d.title.trim(), ...(d.notes.trim() ? { notes: d.notes.trim() } : {}), timestampIso: when.toISOString() };
    if (editing) { updateTransaction(editing.id, payload); toast('Transaction updated'); }
    else { addTransaction(payload); toast(`${d.type === 'income' ? 'Income' : 'Expense'} added`); }
    close();
  };

  return (
    <Modal open={open} onClose={close} title={editing ? 'Edit transaction' : 'Add transaction'}
      footer={<><button type="button" className="btn" onClick={close}>Cancel</button><button type="button" className="btn btn-primary" onClick={save}>{editing ? 'Save changes' : 'Add transaction'}</button></>}>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <SegmentedControl<TransactionType> ariaLabel="Type" value={d.type}
          options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]}
          onChange={(type) => upd({ type, categoryId: categories.find((c) => c.type === type)?.id ?? '' })} />
        <div className="flex flex-col gap-1.5">
          <label className="label-caps" htmlFor="tx-amount">Amount</label>
          <div className="flex gap-2">
            <input id="tx-amount" data-autofocus className="input h-10 flex-1 text-[18px] font-bold" inputMode="decimal" placeholder="0.00" value={d.amount} onChange={(e) => upd({ amount: e.target.value })} />
            <SegmentedControl<Currency> ariaLabel="Currency" options={CURRENCIES.map((c) => ({ value: c, label: c }))} value={d.currency} onChange={(currency) => upd({ currency })} tone="accent" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="label-caps" htmlFor="tx-cat">Category</label>
            <div className="relative">
              {selectedCat && <span className="pointer-events-none absolute left-2.5 top-2" style={{ color: selectedCat.color }}><CategoryIcon name={selectedCat.icon} size={15} /></span>}
              <select id="tx-cat" className="input w-full pl-8" value={d.categoryId} onChange={(e) => upd({ categoryId: e.target.value })}>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="label-caps" htmlFor="tx-when">Date &amp; time</label>
            <input id="tx-when" type="datetime-local" className="input w-full" value={d.when} onChange={(e) => upd({ when: e.target.value })} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label-caps" htmlFor="tx-title">Title</label>
          <input id="tx-title" className="input w-full" maxLength={80} placeholder={d.type === 'expense' ? 'e.g. Carrefour groceries' : 'e.g. Monthly salary'} value={d.title} onChange={(e) => upd({ title: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label-caps" htmlFor="tx-notes">Notes (optional)</label>
          <textarea id="tx-notes" className="input h-16 w-full resize-y py-2" maxLength={240} value={d.notes} onChange={(e) => upd({ notes: e.target.value })} />
        </div>
        <div className="flex items-center justify-between rounded-[8px] border border-line bg-surface-2 px-3.5 py-2.5 text-[12.5px] text-fg-2">
          <span>{d.currency === base ? 'Recorded in your base currency' : `≈ in ${base} at 1 ${d.currency} = ${formatNumber(convertCurrency(1, d.currency, base, rates), 4)} ${base}`}</span>
          <b className="figure text-[17px] text-fg">{formatMoney(preview, base)}</b>
        </div>
        {error && <div className="anim-fade-up rounded-lg bg-bad-soft px-3 py-2 text-[12.5px] font-semibold text-bad" role="alert">{error}</div>}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
