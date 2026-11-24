import { ChartColumn, LayoutDashboard, List, Scale, Settings2 } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useUi, type Tab } from '../../store/useUi';
import { formatNumber } from '../../lib/format';
import { format } from 'date-fns';

const NAV: { tab: Tab; label: string; Icon: typeof List }[] = [
  { tab: 'overview', label: 'Overview', Icon: LayoutDashboard },
  { tab: 'analytics', label: 'Analytics', Icon: ChartColumn },
  { tab: 'transactions', label: 'Transactions', Icon: List },
];

export function Sidebar() {
  const { tab, setTab, openSettings } = useUi();
  const fx = useFinanceStore((s) => s.fx);
  const updated = fx.lastUpdatedIso ? new Date(fx.lastUpdatedIso) : null;
  return (
    <aside className="sticky top-0 flex h-screen flex-col gap-5 border-r border-line bg-surface px-3.5 py-5">
      <div className="flex items-center gap-2.5 px-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-accent-ink"><Scale size={17} /></div>
        <div>
          <div className="font-display text-[17px] font-extrabold leading-tight tracking-tight">Mizan</div>
          <div className="text-[11px] text-muted">EGP · SAR · USD</div>
        </div>
      </div>
      <nav className="flex flex-col gap-0.5" aria-label="Main">
        {NAV.map(({ tab: t, label, Icon }) => {
          const active = t === tab;
          return (
            <button key={t} type="button" onClick={() => setTab(t)} aria-current={active ? 'page' : undefined}
              className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left font-medium transition-colors duration-200 ${active ? 'bg-accent-soft font-semibold text-accent' : 'text-fg-2 hover:bg-surface-2 hover:text-fg'}`}>
              <span className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-accent transition-all duration-300 ${active ? 'opacity-100' : 'scale-y-0 opacity-0'}`} />
              <Icon size={16} />{label}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-2.5">
        <div className="flex flex-col gap-1.5 rounded-xl border border-line bg-surface-2 p-3">
          <div className="flex items-center justify-between">
            <span className="label-caps">Exchange rates</span>
            <span className={`pill ${fx.source === 'live' ? 'bg-good-soft text-good' : 'bg-warn-soft text-warn'}`}>{fx.source === 'live' ? '● Live' : 'Offline'}</span>
          </div>
          <Row k="1 USD" v={`${formatNumber(fx.rates.EGP)} EGP`} />
          <Row k="1 USD" v={`${formatNumber(fx.rates.SAR)} SAR`} />
          <Row k="1 SAR" v={`${formatNumber(fx.rates.EGP / fx.rates.SAR)} EGP`} />
          <div className="text-[11px] text-muted">{updated ? `Updated ${format(updated, 'MMM d, HH:mm')}` : 'Using built-in default rates'}</div>
        </div>
        <button type="button" className="btn btn-ghost justify-start" onClick={() => openSettings('budgets')}><Settings2 size={16} />Settings &amp; Data</button>
      </div>
    </aside>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between text-[13px]"><span className="text-fg-2">{k}</span><b className="font-semibold">{v}</b></div>;
}
