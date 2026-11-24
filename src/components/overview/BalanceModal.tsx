import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useUi } from '../../store/useUi';
import { adjustmentToBase, netBalance } from '../../lib/analytics';
import { formatMoney, formatNumber } from '../../lib/format';
import { CURRENCIES, type Currency } from '../../types/finance';
import { Modal } from '../common/Overlay';
import { SegmentedControl } from '../common/SegmentedControl';
import { toast } from '../common/Toast';

/**
 * Lets the user type their real balance. Mizan stores the difference as a correction, so the balance
 * matches without inventing income or expenses.
 */
export function BalanceModal() {
  const open = useUi((s) => s.balanceOpen);
  const setOpen = useUi((s) => s.setBalanceOpen);
  const { transactions, balanceAdjustments, baseCurrency, setCurrentBalance, deleteBalanceAdjustment } = useFinanceStore();
  const [currency, setCurrency] = useState<Currency>(baseCurrency);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const close = () => setOpen(false);

  useEffect(() => { if (open) { setCurrency(baseCurrency); setAmount(''); setError(null); } }, [open, baseCurrency]);

  const computed = useMemo(() => netBalance(transactions, balanceAdjustments, currency), [transactions, balanceAdjustments, currency]);
  const parsed = Number(amount.replace(/,/g, ''));
  const valid = amount.trim() !== '' && Number.isFinite(parsed);
  const diff = valid ? parsed - computed : 0;

  const save = () => {
    if (!valid) return setError('Enter your current balance. Use a minus sign if it is overdrawn.');
    const d = setCurrentBalance(parsed, currency);
    toast(Math.abs(d) < 0.01 ? 'Balance already matches' : `Balance set to ${formatMoney(parsed, currency)}`);
    close();
  };

  const recent = [...balanceAdjustments].sort((a, b) => b.timestampIso.localeCompare(a.timestampIso)).slice(0, 5);
  return (
    <Modal open={open} onClose={close} title="Set current balance" width={480}
      footer={<><button type="button" className="btn" onClick={close}>Cancel</button><button type="button" className="btn btn-primary" onClick={save}>Save balance</button></>}>
      <p className="-mt-2 text-[13px] text-fg-2">Enter what you actually have right now across your accounts. Mizan records the difference as a correction. It changes your balance but never counts as income or spending.</p>
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <label className="label-caps" htmlFor="bal-amount">Current balance</label>
        <div className="flex gap-2">
          <input id="bal-amount" data-autofocus className="input h-10 flex-1 text-[18px] font-semibold" inputMode="decimal" placeholder={formatNumber(computed)}
            value={amount} onChange={(e) => { setAmount(e.target.value); setError(null); }} />
          <SegmentedControl<Currency> ariaLabel="Balance currency" options={CURRENCIES.map((c) => ({ value: c, label: c }))} value={currency} onChange={setCurrency} tone="accent" />
        </div>
        <div className="flex flex-col gap-1 rounded-[8px] bg-surface-2 px-3.5 py-3 text-[12.5px]">
          <div className="flex justify-between"><span className="text-fg-2">Mizan's current figure</span><span className="font-medium">{formatMoney(computed, currency)}</span></div>
          <div className="flex justify-between"><span className="text-fg-2">Correction to record</span>
            <span className={`font-medium ${!valid || Math.abs(diff) < 0.01 ? 'text-muted' : diff > 0 ? 'text-good' : 'text-bad'}`}>{valid ? `${diff > 0 ? '+' : ''}${formatMoney(diff, currency)}` : '—'}</span>
          </div>
        </div>
        {error && <div className="anim-fade-up rounded-[7px] bg-bad-soft px-3 py-2 text-[12.5px] font-medium text-bad" role="alert">{error}</div>}
        <button type="submit" hidden />
      </form>
      {recent.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="label-caps">Earlier corrections</span>
          <ul className="divide-y divide-line rounded-[8px] border border-line">
            {recent.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2 text-[12.5px]">
                <span className="text-fg-2">{format(new Date(a.timestampIso), 'MMM d, yyyy · HH:mm')}</span>
                <span className="ml-auto font-medium">{a.amount > 0 ? '+' : ''}{formatMoney(a.amount, a.currency)}
                  {a.currency !== baseCurrency && <span className="ml-1.5 text-muted">≈ {formatMoney(adjustmentToBase(a, baseCurrency), baseCurrency, 0)}</span>}
                </span>
                <button type="button" className="btn btn-ghost btn-icon btn-sm hover:!text-bad" aria-label="Remove correction" onClick={() => { deleteBalanceAdjustment(a.id); toast('Correction removed'); }}><Trash2 size={13} /></button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}
