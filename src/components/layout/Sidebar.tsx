import { ChartColumn, LayoutDashboard, List, Scale, Settings2 } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useUi, type Tab } from '../../store/useUi';
import { formatNumber } from '../../lib/format';
import { fmt } from '../../lib/time';

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
    <aside className="sticky top-0 flex h-screen flex-col gap-6 border-r border-line bg-surface px-3 py-5">
      <div className="flex items-center gap-2 px-2.5">
        <Scale size={18} strokeWidth={1.8} className="text-accent" />
        <span className="text-[16px] font-semibold tracking-[-0.02em]">Mizan</span>
      </div>
      <nav className="flex flex-col gap-0.5" aria-label="Main">
        {NAV.map(({ tab: t, label, Icon }) => {
          const active = t === tab;
          return (
            <button key={t} type="button" onClick={() => setTab(t)} aria-current={active ? 'page' : undefined}
              className={`flex h-8 items-center gap-2.5 rounded-[7px] px-2.5 text-left font-medium transition-colors duration-200 ${active ? 'bg-surface-2 text-fg' : 'text-muted hover:bg-surface-2/60 hover:text-fg'}`}>
              <Icon size={16} strokeWidth={1.8} />{label}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-2.5">
        <div className="flex flex-col gap-1.5 border-t border-line px-2.5 pt-4">
          <div className="flex items-center justify-between">
            <span className="label-caps">Exchange rates</span>
            <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-medium ${fx.source === 'live' ? 'text-good' : 'text-warn'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{fx.source === 'live' ? 'Live' : 'Offline'}</span>
          </div>
          <Row k="1 USD" v={`${formatNumber(fx.rates.EGP)} EGP`} />
          <Row k="1 USD" v={`${formatNumber(fx.rates.SAR)} SAR`} />
          <Row k="1 SAR" v={`${formatNumber(fx.rates.EGP / fx.rates.SAR)} EGP`} />
          <div className="text-[11px] text-muted">{updated ? `Updated ${fmt.shortDateTime(updated)} UTC+2` : 'Using built-in default rates'}</div>
        </div>
        <button type="button" className="btn btn-ghost justify-start px-2.5 text-muted" onClick={() => openSettings('budgets')}><Settings2 size={16} strokeWidth={1.8} />Settings &amp; data</button>
      </div>
    </aside>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between text-[12.5px]"><span className="text-muted">{k}</span><span className="font-medium">{v}</span></div>;
}
