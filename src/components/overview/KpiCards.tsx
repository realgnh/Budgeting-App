import { Pencil } from 'lucide-react';
import type { ReactNode } from 'react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useUi } from '../../store/useUi';
import { usePeriod } from '../../hooks/usePeriod';
import { netBalance, pctDelta, savingsRate, sumTotals } from '../../lib/analytics';
import { formatNumber, formatPct } from '../../lib/format';
import { PREV_LABEL, periodShortLabel } from '../../lib/timeframes';
import { AnimatedNumber } from '../common/AnimatedNumber';

function Delta({ d, goodWhenUp }: { d: number | null; goodWhenUp: boolean }) {
  if (d === null) return <span className="font-medium text-fg-2">New</span>;
  if (Math.abs(d) < 0.5) return <span className="font-medium text-fg-2">No change</span>;
  const up = d > 0, good = up === goodWhenUp;
  return <span className={`font-medium ${good ? 'text-good' : 'text-bad'}`}>{up ? '+' : '−'}{formatPct(Math.abs(d), Math.abs(d) < 10 ? 1 : 0)}</span>;
}

function Stat({ label, value, foot, action }: { label: string; value: ReactNode; foot: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 px-6 py-5 first:pl-5">
      <div className="flex h-5 items-center justify-between gap-2"><span className="label-caps truncate">{label}</span>{action}</div>
      <div className="figure text-[28px] leading-none">{value}</div>
      <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted">{foot}</div>
    </div>
  );
}

export function KpiCards() {
  const transactions = useFinanceStore((s) => s.transactions);
  const adjustments = useFinanceStore((s) => s.balanceAdjustments);
  const base = useFinanceStore((s) => s.baseCurrency);
  const openBalance = useUi((s) => s.setBalanceOpen);
  const { unit, period, now, current, previous } = usePeriod();
  const when = periodShortLabel(period, now);
  const balance = netBalance(transactions, adjustments, base);
  const cur = sumTotals(current, base);
  const prev = sumTotals(previous, base);
  const rate = savingsRate(cur.income, cur.expense);
  const money = (v: number) => (
    <>
      <span className="mr-1.5 align-[0.35em] text-[12px] font-medium tracking-normal text-muted">{base}</span>
      <AnimatedNumber value={v} format={(x) => `${x < 0 ? '−' : ''}${formatNumber(Math.abs(x), 0)}`} />
    </>
  );
  const compare = (d: number | null, goodWhenUp: boolean) => <><Delta d={d} goodWhenUp={goodWhenUp} /><span>{PREV_LABEL[unit]}</span></>;
  return (
    <section className="card grid grid-cols-4 p-0 divide-cols">
      <Stat label="Balance" value={<span className={balance < 0 ? 'text-bad' : ''}>{money(balance)}</span>}
        foot={adjustments.length ? 'Includes your balance corrections' : 'Income minus expenses, all time'}
        action={<button type="button" className="btn btn-ghost btn-sm -mr-2 text-accent hover:text-accent" onClick={() => openBalance(true)}><Pencil size={12} />Set balance</button>} />
      <Stat label={`Income · ${when}`} value={money(cur.income)} foot={compare(pctDelta(cur.income, prev.income), true)} />
      <Stat label={`Expenses · ${when}`} value={money(cur.expense)} foot={compare(pctDelta(cur.expense, prev.expense), false)} />
      <Stat label={`Net cash flow · ${when}`} value={<span className={cur.net < 0 ? 'text-bad' : ''}>{money(cur.net)}</span>}
        foot={<>Savings rate <span className={`font-medium ${rate !== null && rate < 0 ? 'text-bad' : 'text-fg'}`}>{rate === null ? '—' : formatPct(rate)}</span></>} />
    </section>
  );
}
