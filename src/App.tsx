import { useEffect } from 'react';
import { useFinanceStore } from './store/useFinanceStore';
import { useUi } from './store/useUi';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { OverviewTab } from './components/overview/OverviewTab';
import { AnalyticsTab } from './components/analytics/AnalyticsTab';
import { TransactionsTab } from './components/transactions/TransactionsTab';
import { TransactionModal } from './components/transactions/TransactionModal';
import { SettingsDrawer } from './components/settings/SettingsDrawer';
import { ToastHost } from './components/common/Toast';
import { BalanceModal } from './components/overview/BalanceModal';

export default function App() {
  const theme = useFinanceStore((s) => s.theme);
  const ensureFreshFx = useFinanceStore((s) => s.ensureFreshFx);
  const tab = useUi((s) => s.tab);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => { ensureFreshFx(); }, [ensureFreshFx]);

  // "N" opens the add form unless the user is typing or a dialog is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'n' || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const typing = !!el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable);
      const ui = useUi.getState();
      if (typing || ui.editor.open || ui.settings.open || ui.balanceOpen) return;
      e.preventDefault();
      ui.openNewTransaction();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="grid min-h-full min-w-[1024px] grid-cols-[240px_minmax(0,1fr)]">
      <Sidebar />
      <div className="flex min-h-screen min-w-0 flex-col">
        <TopBar />
        {/* Content is capped and centered horizontally; the overview also centers vertically on tall screens. */}
        <main key={tab} className="flex flex-1 flex-col px-8 py-8">
          <div className={`mx-auto flex w-full max-w-[1400px] flex-col gap-5 ${tab === 'overview' ? 'my-auto' : ''}`}>
            {tab === 'overview' && <OverviewTab />}
            {tab === 'analytics' && <AnalyticsTab />}
            {tab === 'transactions' && <TransactionsTab />}
          </div>
        </main>
      </div>
      <TransactionModal />
      <BalanceModal />
      <SettingsDrawer />
      <ToastHost />
    </div>
  );
}
