import { create } from 'zustand';
import type { MonthKey, Transaction } from '../types/finance';
import { monthKey } from '../lib/budgets';

export type Tab = 'overview' | 'analytics' | 'transactions';
export type SettingsSection = 'budgets' | 'categories' | 'data';

interface UiStore {
  tab: Tab;
  setTab: (t: Tab) => void;
  editor: { open: boolean; editing: Transaction | null };
  openNewTransaction: () => void;
  openEditTransaction: (t: Transaction) => void;
  closeEditor: () => void;
  settings: { open: boolean; section: SettingsSection };
  openSettings: (section?: SettingsSection) => void;
  closeSettings: () => void;
  /** Month shown in the budget panel and edited in Settings → Budgets. */
  budgetMonth: MonthKey;
  setBudgetMonth: (m: MonthKey) => void;
  balanceOpen: boolean;
  setBalanceOpen: (open: boolean) => void;
  /** The day the dashboard is pinned to ("yyyy-MM-dd", Cairo time), or null to follow today and roll over at midnight. */
  periodAnchor: string | null;
  setPeriodAnchor: (k: string | null) => void;
}

const readTab = (): Tab => {
  try { const t = localStorage.getItem('mizan_tab'); if (t === 'overview' || t === 'analytics' || t === 'transactions') return t; } catch { /* storage unavailable */ }
  return 'overview';
};

export const useUi = create<UiStore>((set) => ({
  tab: readTab(),
  setTab: (tab) => { try { localStorage.setItem('mizan_tab', tab); } catch { /* storage unavailable */ } set({ tab }); },
  editor: { open: false, editing: null },
  openNewTransaction: () => set({ editor: { open: true, editing: null } }),
  openEditTransaction: (editing) => set({ editor: { open: true, editing } }),
  closeEditor: () => set((s) => ({ editor: { ...s.editor, open: false } })),
  settings: { open: false, section: 'budgets' },
  openSettings: (section = 'budgets') => set({ settings: { open: true, section } }),
  closeSettings: () => set((s) => ({ settings: { ...s.settings, open: false } })),
  budgetMonth: monthKey(new Date()),
  setBudgetMonth: (budgetMonth) => set({ budgetMonth }),
  balanceOpen: false,
  setBalanceOpen: (balanceOpen) => set({ balanceOpen }),
  periodAnchor: null,
  setPeriodAnchor: (periodAnchor) => set({ periodAnchor }),
}));
