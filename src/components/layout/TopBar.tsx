import { flushSync } from 'react-dom';
import { Moon, Plus, RefreshCw, Sun, WifiOff } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useUi } from '../../store/useUi';
import { SegmentedControl } from '../common/SegmentedControl';
import { toast } from '../common/Toast';
import { CURRENCIES, type Currency } from '../../types/finance';
import { fmt } from '../../lib/time';
import { PeriodPicker } from './PeriodPicker';
import { formatNumber } from '../../lib/format';

const CUR_OPTS = CURRENCIES.map((c) => ({ value: c, label: c }));
const TITLES = { overview: 'Overview', analytics: 'Analytics', transactions: 'Transactions' } as const;

export function TopBar() {
  const tab = useUi((s) => s.tab);
  const openNew = useUi((s) => s.openNewTransaction);
  const { baseCurrency, setBaseCurrency, fx, fxLoading, refreshFx, theme, setTheme } = useFinanceStore();
  const updated = fx.lastUpdatedIso ? `Last updated ${fmt.date(fx.lastUpdatedIso)}, ${fmt.time(fx.lastUpdatedIso)} Cairo time` : 'Not updated yet';

  const onRefresh = async () => {
    const ok = await refreshFx();
    const r = useFinanceStore.getState().fx.rates;
    if (ok) toast(`Rates updated · 1 USD = ${formatNumber(r.EGP)} EGP · ${formatNumber(r.SAR)} SAR`);
    else toast(useFinanceStore.getState().fx.source === 'live' ? 'Could not reach the rate service. Keeping your last live rates.' : 'Could not reach the rate service. Using offline rates.', 'error');
  };
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    const apply = () => {
      document.documentElement.classList.toggle('dark', next === 'dark');
      setTheme(next);
    };
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (doc.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) { doc.startViewTransition(() => flushSync(apply)); return; }
    const root = document.documentElement;
    root.classList.add('theme-anim');
    apply();
    setTimeout(() => root.classList.remove('theme-anim'), 350);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1464px] flex-wrap items-center gap-2.5 px-8 py-3">
      <h1 key={tab} className="anim-fade mr-auto text-[18px] font-semibold tracking-[-0.02em]">{TITLES[tab]}</h1>
      {fx.source === 'fallback' && (
        <span className="pill text-warn" title="The live rate service could not be reached. Amounts use default rates until the next successful refresh.">
          <WifiOff size={12} />Offline rates
        </span>
      )}
      <PeriodPicker />
      <SegmentedControl<Currency> ariaLabel="Base currency" options={CUR_OPTS} value={baseCurrency} onChange={setBaseCurrency} tone="accent" />
      <button type="button" className="btn btn-icon group relative" onClick={onRefresh} aria-label={`Refresh rates. ${updated}`} disabled={fxLoading}>
        <RefreshCw size={15} className={fxLoading ? 'anim-spin' : 'transition-transform duration-700 ease-out group-hover:rotate-180'} />
        <span className="pointer-events-none absolute right-0 top-[calc(100%+6px)] z-40 translate-y-1 whitespace-nowrap rounded-[6px] bg-fg px-2 py-1 text-[11.5px] font-medium text-bg opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">{updated}</span>
      </button>
      <button type="button" className="btn btn-icon overflow-hidden" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
        <span key={theme} className="anim-icon">{theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}</span>
      </button>
      <button type="button" className="btn btn-primary" onClick={openNew} title="Shortcut: N">
        <Plus size={15} />New transaction
      </button>
      </div>
    </header>
  );
}
