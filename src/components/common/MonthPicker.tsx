import { addMonths, format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { monthFromKey, monthKey } from '../../lib/budgets';
import type { MonthKey } from '../../types/finance';

const MONTHS = Array.from({ length: 12 }, (_, i) => format(new Date(2000, i, 1), 'MMMM'));

interface Props { value: MonthKey; onChange: (m: MonthKey) => void; minYear: number; maxYear: number; idPrefix: string }

/** Month and year selects with previous/next arrows and a jump back to the current month. */
export function MonthPicker({ value, onChange, minYear, maxYear, idPrefix }: Props) {
  const d = monthFromKey(value);
  const current = monthKey(new Date());
  const years: number[] = [];
  for (let y = minYear; y <= maxYear; y++) years.push(y);
  const step = (n: number) => {
    const next = addMonths(d, n);
    if (next.getFullYear() >= minYear && next.getFullYear() <= maxYear) onChange(monthKey(next));
  };
  return (
    <div className="flex items-center gap-1">
      <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="Previous month" onClick={() => step(-1)} disabled={d.getFullYear() === minYear && d.getMonth() === 0}><ChevronLeft size={15} /></button>
      <select id={`${idPrefix}-month`} aria-label="Month" className="input h-7 pr-7 text-[12.5px]" value={d.getMonth()} onChange={(e) => onChange(monthKey(new Date(d.getFullYear(), Number(e.target.value), 1)))}>
        {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
      </select>
      <select id={`${idPrefix}-year`} aria-label="Year" className="input h-7 pr-7 text-[12.5px]" value={d.getFullYear()} onChange={(e) => onChange(monthKey(new Date(Number(e.target.value), d.getMonth(), 1)))}>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="Next month" onClick={() => step(1)} disabled={d.getFullYear() === maxYear && d.getMonth() === 11}><ChevronRight size={15} /></button>
      {value !== current && <button type="button" className="btn btn-ghost btn-sm anim-fade" onClick={() => onChange(current)}>This month</button>}
    </div>
  );
}

/** Year range offered by month pickers: from the first transaction (or two years back) to next year. */
export function yearRange(earliest: Date | null, now = new Date()): { minYear: number; maxYear: number } {
  return { minYear: Math.min(earliest?.getFullYear() ?? now.getFullYear(), now.getFullYear() - 2), maxYear: now.getFullYear() + 1 };
}
