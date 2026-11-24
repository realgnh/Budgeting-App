import { useState } from 'react';
import { Cell, Pie, PieChart, Sector, type PieProps } from 'recharts';
import type { Currency } from '../../types/finance';
import type { Slice } from '../../lib/analytics';
import { formatCompact, formatMoney, formatPct } from '../../lib/format';
import { useFinanceStore } from '../../store/useFinanceStore';
import { chartTheme } from '../../lib/chartTheme';
import { prefersReducedMotion } from '../../lib/motion';
import { ChartEmpty } from '../common/EmptyState';

interface Props {
  slices: Slice[];
  base: Currency;
  totalLabel: string;
  emptyLabel: string;
  layout?: 'row' | 'stack';
  selectedKey?: string | null;
  onSelect?: (key: string | null) => void;
  size?: number;
}

type ActiveShapeProps = Parameters<Extract<NonNullable<PieProps['activeShape']>, (...a: never[]) => unknown>>[0];

export function DonutChart({ slices, base, totalLabel, emptyLabel, layout = 'stack', selectedKey = null, onSelect, size = 236 }: Props) {
  const theme = useFinanceStore((s) => s.theme);
  const ct = chartTheme(theme);
  const [hover, setHover] = useState<number | null>(null);
  if (!slices.length) return <ChartEmpty label={emptyLabel} height={size} />;

  const total = slices.reduce((s, x) => s + x.value, 0);
  const selIdx = selectedKey ? slices.findIndex((s) => s.key === selectedKey) : -1;
  const activeIdx = hover ?? (selIdx >= 0 ? selIdx : undefined);
  const focus = activeIdx !== undefined ? slices[activeIdx] : null;
  const outer = size / 2 - 16;
  const inner = outer - 30;

  const renderActive = (p: ActiveShapeProps) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = p as unknown as {
      cx: number; cy: number; innerRadius: number; outerRadius: number; startAngle: number; endAngle: number; fill: string;
    };
    return (
      <g>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius - 2} outerRadius={outerRadius + 7} startAngle={startAngle} endAngle={endAngle} fill={fill} cornerRadius={7} />
        <Sector cx={cx} cy={cy} innerRadius={outerRadius + 10} outerRadius={outerRadius + 13} startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.35} cornerRadius={2} />
      </g>
    );
  };

  const interactive = !!onSelect;
  return (
    <div className={layout === 'row' ? 'grid grid-cols-[auto_minmax(0,1fr)] items-center gap-5' : 'flex flex-col items-stretch gap-4'}>
      <div className="relative mx-auto" style={{ width: size, height: size }}>
        <PieChart width={size} height={size}>
          {/* Faint track ring behind the slices */}
          <Pie data={[{ v: 1 }]} dataKey="v" cx="50%" cy="50%" innerRadius={inner} outerRadius={outer} fill={ct.grid} stroke="none" isAnimationActive={false} />
          <Pie
            data={slices} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={inner} outerRadius={outer}
            paddingAngle={slices.length > 1 ? 2.5 : 0} cornerRadius={5} stroke="none" startAngle={90} endAngle={-270}
            activeIndex={activeIdx} activeShape={renderActive}
            isAnimationActive={!prefersReducedMotion()} animationDuration={800} animationEasing="ease-out"
            onMouseEnter={(_, i) => setHover(i)} onMouseLeave={() => setHover(null)}
            onClick={interactive ? (_, i) => onSelect!(slices[i].key === selectedKey ? null : slices[i].key) : undefined}
            style={{ cursor: interactive ? 'pointer' : 'default', outline: 'none' }}
          >
            {slices.map((s, i) => (
              <Cell key={s.key} fill={s.color} fillOpacity={selIdx >= 0 && i !== selIdx && hover !== i ? 0.28 : 1} style={{ transition: 'fill-opacity .25s ease' }} />
            ))}
          </Pie>
        </PieChart>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div key={focus?.key ?? 'total'} className="anim-fade-up flex max-w-[60%] flex-col items-center">
            {focus ? (
              <>
                <span className="truncate text-[11.5px] font-semibold" style={{ color: focus.color }}>{focus.name}</span>
                <b className="font-display text-[20px] font-extrabold leading-tight">{formatCompact(focus.value)}</b>
                <span className="text-[11.5px] text-muted">{formatPct(focus.share * 100, 1)} of total</span>
              </>
            ) : (
              <>
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">{totalLabel}</span>
                <b className="font-display text-[22px] font-extrabold leading-tight">{formatCompact(total)}</b>
                <span className="text-[11.5px] text-muted">{base}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <ul className="flex min-w-0 flex-col gap-0.5">
        {slices.map((s, i) => {
          const sel = s.key === selectedKey;
          const dim = selIdx >= 0 && !sel;
          const content = (
            <>
              <span className="h-2.5 w-2.5 shrink-0 rounded-[4px]" style={{ background: s.color }} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-fg">{s.name}</span>
                  <span className="shrink-0 text-fg-2" title={formatMoney(s.value, base)}>{formatCompact(s.value)} <span className="inline-block w-9 text-right text-muted">{formatPct(s.share * 100)}</span></span>
                </span>
                <span className="mt-1 block h-1 overflow-hidden rounded-full bg-surface-2">
                  <span className="bar-fill block h-full rounded-full" style={{ width: `${s.share * 100}%`, background: s.color }} />
                </span>
              </span>
            </>
          );
          const cls = `flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[12.5px] transition-all duration-200 ${sel ? 'bg-accent-soft' : hover === i ? 'bg-surface-2' : ''} ${dim ? 'opacity-50' : ''}`;
          return (
            <li key={s.key} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {interactive
                ? <button type="button" className={`${cls} hover:bg-surface-2`} aria-pressed={sel} onClick={() => onSelect!(sel ? null : s.key)}>{content}</button>
                : <div className={cls}>{content}</div>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
