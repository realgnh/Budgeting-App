import type { Currency } from '../../types/finance';
import { formatMoney } from '../../lib/format';

export interface TipRow { label: string; value: number; color?: string; strong?: boolean }

export function TooltipCard({ title, rows, base }: { title: string; rows: TipRow[]; base: Currency }) {
  return (
    <div className="min-w-[190px] rounded-xl bg-fg px-3 py-2.5 text-[12px] text-bg shadow-xl">
      <div className="mb-1.5 font-semibold">{title}</div>
      <div className="flex flex-col gap-1">
        {rows.map((r) => (
          <div key={r.label} className={`flex items-center justify-between gap-4 ${r.strong ? 'mt-0.5 border-t border-bg/20 pt-1.5 font-bold' : ''}`}>
            <span className="flex items-center gap-1.5 opacity-85">{r.color && <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />}{r.label}</span>
            <span className="font-semibold">{formatMoney(r.value, base)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
