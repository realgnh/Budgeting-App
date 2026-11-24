import { useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SeriesPoint } from '../../lib/analytics';
import type { Currency } from '../../types/finance';
import { formatCompact } from '../../lib/format';
import { useFinanceStore } from '../../store/useFinanceStore';
import { CHART_ANIM, chartTheme } from '../../lib/chartTheme';
import { prefersReducedMotion } from '../../lib/motion';
import { TooltipCard } from './ChartTooltip';

interface Props { data: SeriesPoint[]; base: Currency; view: 'bars' | 'balance'; height: number | '100%' }

export function CashFlowChart({ data, base, view, height }: Props) {
  const ct = chartTheme(useFinanceStore((s) => s.theme));
  const anim = !prefersReducedMotion();
  const [active, setActive] = useState<number | null>(null);
  // Zoom the balance line to its own range so movement is visible, with a little headroom.
  const balanceDomain = ([lo, hi]: readonly number[]): [number, number] => {
    const pad = Math.max((hi - lo) * 0.15, Math.abs(hi) * 0.01, 1);
    return [Math.floor(lo - pad), Math.ceil(hi + pad)];
  };
  const onMove = (s: { activeTooltipIndex?: number }) => setActive(typeof s?.activeTooltipIndex === 'number' ? s.activeTooltipIndex : null);
  const axes = (
    <>
      <CartesianGrid vertical={false} stroke={ct.grid} />
      <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: ct.axis }} tick={{ fill: ct.tick, fontSize: 11 }} tickMargin={8} minTickGap={24} interval="preserveStartEnd" />
      <YAxis tickLine={false} axisLine={false} tick={{ fill: ct.tick, fontSize: 11 }} tickFormatter={formatCompact} width={48}
        domain={view === 'balance' ? balanceDomain : [0, 'auto']} />
    </>
  );
  const tooltip = (cursor: object | JSX.Element) => (
    <Tooltip
      cursor={cursor}
      isAnimationActive={false}
      offset={16}
      wrapperStyle={{ outline: 'none', zIndex: 5 }}
      content={({ active: on, payload }) => {
        if (!on || !payload?.length) return null;
        const p = payload[0].payload as SeriesPoint;
        return <TooltipCard title={p.label} base={base} rows={view === 'bars' ? [
          { label: 'Income', value: p.income, color: ct.income },
          { label: 'Expenses', value: p.expense, color: ct.expense },
          { label: 'Net', value: p.net, strong: true },
        ] : [
          { label: 'Income', value: p.income, color: ct.income },
          { label: 'Expenses', value: p.expense, color: ct.expense },
          { label: 'Balance', value: p.balance, strong: true },
        ]} />;
      }}
    />
  );
  const softCursor = <Rectangle fill={ct.hover} stroke="none" radius={6} />;
  const dim = (i: number) => (active === null || active === i ? 1 : 0.35);
  return (
    <div style={{ height, minHeight: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        {view === 'bars' ? (
          <BarChart data={data} barGap={2} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} onMouseMove={onMove} onMouseLeave={() => setActive(null)}>
            {axes}{tooltip(softCursor)}
            <Bar dataKey="income" name="Income" fill={ct.income} radius={[3, 3, 0, 0]} maxBarSize={18} isAnimationActive={anim} {...CHART_ANIM}>
              {data.map((_, i) => <Cell key={i} fillOpacity={dim(i)} style={{ transition: 'fill-opacity .25s ease-out' }} />)}
            </Bar>
            <Bar dataKey="expense" name="Expenses" fill={ct.expense} radius={[3, 3, 0, 0]} maxBarSize={18} isAnimationActive={anim} {...CHART_ANIM}>
              {data.map((_, i) => <Cell key={i} fillOpacity={dim(i)} style={{ transition: 'fill-opacity .25s ease-out' }} />)}
            </Bar>
          </BarChart>
        ) : (
          <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="balFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ct.accent} stopOpacity={0.2} />
                <stop offset="100%" stopColor={ct.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            {axes}{tooltip({ stroke: ct.axis, strokeDasharray: '4 4' })}
            <Area type="monotone" dataKey="balance" name="Balance" stroke={ct.accent} strokeWidth={2} fill="url(#balFill)"
              activeDot={{ r: 4.5, fill: ct.accent, stroke: ct.surface, strokeWidth: 2 }} isAnimationActive={anim} {...CHART_ANIM} />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
