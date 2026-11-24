import { create } from 'zustand';
import type { Transaction } from '../types/finance';

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
}));
