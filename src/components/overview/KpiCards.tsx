import { Landmark, PiggyBank, TrendingDown, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { usePeriod } from '../../hooks/usePeriod';
import { pctDelta, savingsRate, sumTotals } from '../../lib/analytics';
import { formatNumber, formatPct } from '../../lib/format';
import { PREV_LABEL, RANGE_LABEL } from '../../lib/timeframes';
import { AnimatedNumber } from '../common/AnimatedNumber';

function Delta({ d, goodWhenUp, show }: { d: number | null; goodWhenUp: boolean; show: boolean }) {
  if (!show) return null;
  if (d === null) return <span className="pill bg-surface-2 text-muted">new</span>;
  if (Math.abs(d) < 0.5) return <span className="pill bg-surface-2 text-muted">± 0%</span>;
  const up = d > 0, good = up === goodWhenUp;
  return <span className={`pill ${good ? 'bg-good-soft text-good' : 'bg-bad-soft text-bad'}`}>{up ? '▲' : '▼'} {formatPct(Math.abs(d), Math.abs(d) < 10 ? 1 : 0)}</span>;
}

function Kpi({ icon, label, value, foot }: { icon: ReactNode; label: string; value: ReactNode; foot: ReactNode }) {
  return (
    <div className="card flex flex-col gap-1.5 transition-transform duration-200 hover:-translate-y-0.5">
      <div className="label-caps flex items-center gap-1.5">{icon}{label}</div>
      <div className="font-display text-[26px] font-extrabold leading-tight tracking-tight">{value}</div>
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted">{foot}</div>
    </div>
  );
}

export function KpiCards() {
  const transactions = useFinanceStore((s) => s.transactions);
  const base = useFinanceStore((s) => s.baseCurrency);
  const { range, current, previous } = usePeriod();
  const all = sumTotals(transactions, base);
  const cur = sumTotals(current, base);
  const prev = sumTotals(previous, base);
  const rate = savingsRate(cur.income, cur.expense);
  const showDelta = range !== 'ALL';
  const money = (v: number) => <><span className="mr-1 text-[13px] font-bold text-muted">{base}</span><AnimatedNumber value={v} format={(x) => `${x < 0 ? '−' : ''}${formatNumber(Math.abs(x), 0)}`} /></>;
  return (
    <div className="grid grid-cols-4 gap-4">
      <Kpi icon={<Landmark size={14} />} label="Net balance" value={<span className={all.net < 0 ? 'text-bad' : ''}>{money(all.net)}</span>} foot="All-time income − expenses" />
      <Kpi icon={<TrendingUp size={14} className="text-income" />} label={`Income · ${RANGE_LABEL[range]}`} value={money(cur.income)}
        foot={<><Delta d={pctDelta(cur.income, prev.income)} goodWhenUp show={showDelta} /><span>{PREV_LABEL[range] || 'Since first transaction'}</span></>} />
      <Kpi icon={<TrendingDown size={14} className="text-expense" />} label={`Expenses · ${RANGE_LABEL[range]}`} value={money(cur.expense)}
        foot={<><Delta d={pctDelta(cur.expense, prev.expense)} goodWhenUp={false} show={showDelta} /><span>{PREV_LABEL[range] || 'Since first transaction'}</span></>} />
      <Kpi icon={<PiggyBank size={14} />} label="Net cash flow" value={<span className={cur.net < 0 ? 'text-bad' : ''}>{money(cur.net)}</span>}
        foot={<>Savings rate <b className={rate !== null && rate < 0 ? 'text-bad' : 'text-fg'}>{rate === null ? '—' : formatPct(rate)}</b></>} />
    </div>
  );
}
