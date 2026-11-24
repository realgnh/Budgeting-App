import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SeriesPoint } from '../../lib/analytics';
import type { Currency } from '../../types/finance';
import { formatCompact } from '../../lib/format';
import { useFinanceStore } from '../../store/useFinanceStore';
import { chartTheme } from '../../lib/chartTheme';
import { prefersReducedMotion } from '../../lib/motion';
import { TooltipCard } from './ChartTooltip';

interface Props { data: SeriesPoint[]; base: Currency; view: 'bars' | 'balance'; height: number | '100%' }

export function CashFlowChart({ data, base, view, height }: Props) {
  const ct = chartTheme(useFinanceStore((s) => s.theme));
  const anim = !prefersReducedMotion();
  // Zoom the balance line to its own range so movement is visible, with a little headroom.
  const balanceDomain = ([lo, hi]: readonly number[]): [number, number] => {
    const pad = Math.max((hi - lo) * 0.15, Math.abs(hi) * 0.01, 1);
    return [Math.floor(lo - pad), Math.ceil(hi + pad)];
  };
  const axes = (
    <>
      <CartesianGrid vertical={false} stroke={ct.grid} />
      <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: ct.axis }} tick={{ fill: ct.tick, fontSize: 11 }} minTickGap={18} interval="preserveStartEnd" />
      <YAxis tickLine={false} axisLine={false} tick={{ fill: ct.tick, fontSize: 11 }} tickFormatter={formatCompact} width={48}
        domain={view === 'balance' ? balanceDomain : [0, 'auto']} />
    </>
  );
  const tooltip = (
    <Tooltip
      cursor={{ fill: ct.grid, opacity: 0.6, stroke: ct.axis }}
      content={({ active, payload }) => {
        if (!active || !payload?.length) return null;
        const p = payload[0].payload as SeriesPoint;
        return <TooltipCard title={p.label} base={base} rows={[
          { label: 'Income', value: p.income, color: ct.income },
          { label: 'Expenses', value: p.expense, color: ct.expense },
          { label: 'Net', value: p.net, strong: view === 'bars' },
          ...(view === 'balance' ? [{ label: 'Balance', value: p.balance, strong: true }] : []),
        ]} />;
      }}
    />
  );
  return (
    <div style={{ height, minHeight: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        {view === 'bars' ? (
          <BarChart data={data} barGap={2} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            {axes}{tooltip}
            <Bar dataKey="income" name="Income" fill={ct.income} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={anim} animationDuration={700} />
            <Bar dataKey="expense" name="Expenses" fill={ct.expense} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={anim} animationDuration={700} />
          </BarChart>
        ) : (
          <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="balFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ct.accent} stopOpacity={0.28} />
                <stop offset="100%" stopColor={ct.accent} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            {axes}{tooltip}
            <Area type="monotone" dataKey="balance" name="Balance" stroke={ct.accent} strokeWidth={2} fill="url(#balFill)"
              activeDot={{ r: 5, stroke: ct.surface, strokeWidth: 2 }} isAnimationActive={anim} animationDuration={800} />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
