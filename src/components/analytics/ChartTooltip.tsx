import type { Currency } from '../../types/finance';
import { formatMoney } from '../../lib/format';

export interface TipRow { label: string; value: number; color?: string; strong?: boolean }

/** Compact light card used by every chart tooltip. */
export function TooltipCard({ title, rows, base }: { title: string; rows: TipRow[]; base: Currency }) {
  return (
    <div className="pointer-events-none min-w-[180px] rounded-[9px] border border-line bg-surface/95 px-3 py-2.5 text-[12px] shadow-pop backdrop-blur-sm">
      <div className="mb-1.5 font-medium text-fg">{title}</div>
      <div className="flex flex-col gap-1">
        {rows.map((r) => (
          <div key={r.label} className={`flex items-center justify-between gap-5 ${r.strong ? 'mt-1 border-t border-line pt-1.5' : ''}`}>
            <span className="flex items-center gap-1.5 text-fg-2">{r.color && <span className="h-2 w-2 rounded-[3px]" style={{ background: r.color }} />}{r.label}</span>
            <span className={`font-medium ${r.strong ? 'text-fg' : 'text-fg'}`}>{formatMoney(r.value, base)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
