import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useUi } from '../../store/useUi';
import { usePeriod } from '../../hooks/usePeriod';
import { earliestTimestamp, isCurrentPeriod, shiftPeriod, type Period } from '../../lib/timeframes';
import { MONTHS, TZ_LABEL, dayKey, parseDayKey, zdate, zparts } from '../../lib/time';
import type { PeriodUnit } from '../../types/finance';
import { SegmentedControl } from '../common/SegmentedControl';

const UNIT_OPTS: { value: PeriodUnit; label: string }[] = [{ value: 'day', label: 'Day' }, { value: 'month', label: 'Month' }, { value: 'year', label: 'Year' }];
const BACK_LABEL: Record<PeriodUnit, string> = { day: 'Today', month: 'This month', year: 'This year' };

/** Chooses which day, month or year the dashboard shows. */
export function PeriodPicker() {
  const transactions = useFinanceStore((s) => s.transactions);
  const setUnit = useFinanceStore((s) => s.setPeriodUnit);
  const setAnchorKey = useUi((s) => s.setPeriodAnchor);
  const { unit, period, now, isCurrent } = usePeriod();
  const p = zparts(period.anchor);
  const nowY = zparts(now).y;
  const minYear = useMemo(() => Math.min(zparts(earliestTimestamp(transactions) ?? now).y, nowY - 2), [transactions, now, nowY]);
  const years: number[] = [];
  for (let y = minYear; y <= nowY + 1; y++) years.push(y);

  /** Pin to a date, or follow "now" again when the choice is the current period. */
  const go = (next: Period) => setAnchorKey(isCurrentPeriod(next, now) ? null : dayKey(next.anchor));
  const changeUnit = (u: PeriodUnit) => { setUnit(u); go({ unit: u, anchor: period.anchor }); };
  const canStep = (n: number) => { const y = zparts(shiftPeriod(period, n).anchor).y; return y >= minYear && y <= nowY + 1; };

  return (
    <div className="flex items-center gap-2">
      <SegmentedControl ariaLabel="Period length" options={UNIT_OPTS} value={unit} onChange={changeUnit} />
      <div className="flex items-center gap-1" role="group" aria-label={`Choose the ${unit} (${TZ_LABEL})`}>
        <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label={`Previous ${unit}`} disabled={!canStep(-1)} onClick={() => go(shiftPeriod(period, -1))}><ChevronLeft size={15} /></button>
        {unit === 'day' && (
          <input type="date" aria-label="Day" className="input h-7 w-[138px] text-[12.5px]" value={dayKey(period.anchor)}
            min={`${minYear}-01-01`} max={`${nowY + 1}-12-31`}
            onChange={(e) => { if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) go({ unit, anchor: parseDayKey(e.target.value) }); }} />
        )}
        {unit === 'month' && (
          <select aria-label="Month" className="input h-7 pr-7 text-[12.5px]" value={p.m} onChange={(e) => go({ unit, anchor: zdate(p.y, Number(e.target.value), 1) })}>
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
        )}
        {unit !== 'day' && (
          <select aria-label="Year" className="input h-7 pr-7 text-[12.5px]" value={p.y} onChange={(e) => go({ unit, anchor: zdate(Number(e.target.value), unit === 'month' ? p.m : 0, 1) })}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
        <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label={`Next ${unit}`} disabled={!canStep(1)} onClick={() => go(shiftPeriod(period, 1))}><ChevronRight size={15} /></button>
        {!isCurrent && <button type="button" className="btn btn-ghost btn-sm anim-fade" onClick={() => setAnchorKey(null)}>{BACK_LABEL[unit]}</button>}
      </div>
    </div>
  );
}
