import { MONTHS, addZMonths, zparts } from '../../lib/time';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { monthFromKey, monthKey } from '../../lib/budgets';
import type { MonthKey } from '../../types/finance';


interface Props { value: MonthKey; onChange: (m: MonthKey) => void; minYear: number; maxYear: number; idPrefix: string }

/** Month and year selects with previous/next arrows and a jump back to the current month. */
export function MonthPicker({ value, onChange, minYear, maxYear, idPrefix }: Props) {
  const p = zparts(monthFromKey(value));
  const current = monthKey(new Date());
  const at = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}`;
  const years: number[] = [];
  for (let y = minYear; y <= maxYear; y++) years.push(y);
  const step = (n: number) => {
    const next = zparts(addZMonths(monthFromKey(value), n));
    if (next.y >= minYear && next.y <= maxYear) onChange(at(next.y, next.m));
  };
  return (
    <div className="flex items-center gap-1">
      <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="Previous month" onClick={() => step(-1)} disabled={p.y === minYear && p.m === 0}><ChevronLeft size={15} /></button>
      <select id={`${idPrefix}-month`} aria-label="Month" className="input h-7 pr-7 text-[12.5px]" value={p.m} onChange={(e) => onChange(at(p.y, Number(e.target.value)))}>
        {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
      </select>
      <select id={`${idPrefix}-year`} aria-label="Year" className="input h-7 pr-7 text-[12.5px]" value={p.y} onChange={(e) => onChange(at(Number(e.target.value), p.m))}>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="Next month" onClick={() => step(1)} disabled={p.y === maxYear && p.m === 11}><ChevronRight size={15} /></button>
      {value !== current && <button type="button" className="btn btn-ghost btn-sm anim-fade" onClick={() => onChange(current)}>This month</button>}
    </div>
  );
}

/** Year range offered by month pickers: from the first transaction (or two years back) to next year. */
export function yearRange(earliest: Date | null, now = new Date()): { minYear: number; maxYear: number } {
  const y = zparts(now).y;
  return { minYear: Math.min(earliest ? zparts(earliest).y : y, y - 2), maxYear: y + 1 };
}
