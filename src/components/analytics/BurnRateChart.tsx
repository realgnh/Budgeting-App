import { Area, CartesianGrid, ComposedChart, Line, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { BurnPoint } from '../../lib/analytics';
import type { Currency } from '../../types/finance';
import { formatCompact } from '../../lib/format';
import { useFinanceStore } from '../../store/useFinanceStore';
import { CHART_ANIM, chartTheme } from '../../lib/chartTheme';
import { prefersReducedMotion } from '../../lib/motion';
import { TooltipCard, type TipRow } from './ChartTooltip';

export function BurnRateChart({ data, base }: { data: BurnPoint[]; base: Currency }) {
  const ct = chartTheme(useFinanceStore((s) => s.theme));
  const anim = !prefersReducedMotion();
  // Marks the latest day with spending data (today, or the month's last day for past months).
  const todayPt = [...data].reverse().find((p) => p.actual !== null);
  return (
    <div style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="burnFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ct.expense} stopOpacity={0.18} />
              <stop offset="100%" stopColor={ct.expense} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={ct.grid} />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: ct.axis }} tick={{ fill: ct.tick, fontSize: 11 }} tickMargin={8} minTickGap={24} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: ct.tick, fontSize: 11 }} tickFormatter={formatCompact} width={44} />
          <Tooltip cursor={{ stroke: ct.axis, strokeDasharray: '4 4' }} isAnimationActive={false} offset={16} wrapperStyle={{ outline: 'none' }} content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as BurnPoint;
            const rows: TipRow[] = [];
            if (p.actual !== null) rows.push({ label: 'Spent so far', value: p.actual, color: ct.expense });
            if (p.ideal !== null) rows.push({ label: 'Ideal pace', value: p.ideal, color: ct.muted });
            if (p.actual !== null && p.ideal !== null) rows.push({ label: p.actual > p.ideal ? 'Ahead of pace' : 'Under pace', value: Math.abs(p.actual - p.ideal), strong: true });
            return rows.length ? <TooltipCard title={p.label} base={base} rows={rows} /> : null;
          }} />
          <Area type="monotone" dataKey="actual" stroke={ct.expense} strokeWidth={2} fill="url(#burnFill)" connectNulls={false} isAnimationActive={anim} {...CHART_ANIM} activeDot={{ r: 4.5, fill: ct.expense, stroke: ct.surface, strokeWidth: 2 }} />
          <Line type="linear" dataKey="ideal" stroke={ct.muted} strokeWidth={1.5} strokeDasharray="6 5" dot={false} activeDot={false} isAnimationActive={anim} {...CHART_ANIM} />
          {todayPt?.actual != null && <ReferenceDot x={todayPt.label} y={todayPt.actual} r={5} fill={ct.expense} stroke={ct.surface} strokeWidth={2} />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
