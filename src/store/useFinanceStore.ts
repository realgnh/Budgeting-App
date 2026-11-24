import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  SCHEMA_VERSION, type AppState, type Category, type Currency, type MoneyLimit, type TimeRange, type Transaction, type TransactionType,
} from '../types/finance';
import { FALLBACK_RATES, fetchLiveRates, isFxStale, nextFxCache } from '../lib/fx';
import { DEFAULT_CATEGORIES, DEMO_BUDGETS, generateDemoTransactions } from '../lib/seed';

export const STORAGE_KEY = 'budget_app_state_v1';
export type Theme = 'light' | 'dark';

export type NewTransaction = Omit<Transaction, 'id' | 'fxSnapshot'>;

interface UiState {
  theme: Theme;
  fxLoading: boolean;
  fxError: string | null;
}

interface Actions {
  setBaseCurrency: (c: Currency) => void;
  setRange: (r: TimeRange) => void;
  setTheme: (t: Theme) => void;
  addTransaction: (t: NewTransaction) => Transaction;
  updateTransaction: (id: string, t: NewTransaction) => void;
  deleteTransaction: (id: string) => void;
  setOverallLimit: (amount: number | null) => void;
  setCategoryLimits: (limits: Record<string, number>) => void;
  addCategory: (c: { name: string; type: TransactionType; color: string; icon: string }) => Category;
  updateCategory: (id: string, patch: Partial<Pick<Category, 'name' | 'color' | 'icon'>>) => void;
  deleteCategory: (id: string, reassignTo?: string) => void;
  refreshFx: () => Promise<boolean>;
  ensureFreshFx: () => void;
  loadDemoData: () => void;
  resetAll: () => void;
  importState: (s: AppState) => void;
}

export type FinanceStore = AppState & UiState & Actions;

const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function systemTheme(): Theme {
  try {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'dark' || attr === 'light') return attr;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function initialAppState(): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    baseCurrency: 'SAR',
    activeRange: '1M',
    fx: { rates: { ...FALLBACK_RATES }, lastUpdatedIso: '', source: 'fallback' },
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    transactions: [],
    budgets: { overallMonthlyLimit: null, categoryMonthlyLimits: {} },
  };
}

const sortTx = (list: Transaction[]) => [...list].sort((a, b) => b.timestampIso.localeCompare(a.timestampIso));
const limit = (amount: number, currency: Currency): MoneyLimit => ({ amount, currency });

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set, get) => ({
      ...initialAppState(),
      theme: systemTheme(),
      fxLoading: false,
      fxError: null,

      setBaseCurrency: (baseCurrency) => set({ baseCurrency }),
      setRange: (activeRange) => set({ activeRange }),
      setTheme: (theme) => set({ theme }),

      addTransaction: (t) => {
        const tx: Transaction = { ...t, id: uid('tx'), fxSnapshot: { ...get().fx.rates } };
        set((s) => ({ transactions: sortTx([tx, ...s.transactions]) }));
        return tx;
      },
      // Edits keep the original snapshot so history never shifts, unless the currency itself changed.
      updateTransaction: (id, t) => set((s) => ({
        transactions: sortTx(s.transactions.map((x) => (x.id === id
          ? { ...t, id, fxSnapshot: x.currency === t.currency ? x.fxSnapshot : { ...s.fx.rates } }
          : x))),
      })),
      deleteTransaction: (id) => set((s) => ({ transactions: s.transactions.filter((x) => x.id !== id) })),

      setOverallLimit: (amount) => set((s) => ({
        budgets: { ...s.budgets, overallMonthlyLimit: amount && amount > 0 ? limit(amount, s.baseCurrency) : null },
      })),
      setCategoryLimits: (limits) => set((s) => {
        const categoryMonthlyLimits: Record<string, MoneyLimit> = {};
        for (const [id, amt] of Object.entries(limits)) if (amt > 0) categoryMonthlyLimits[id] = limit(amt, s.baseCurrency);
        return { budgets: { ...s.budgets, categoryMonthlyLimits } };
      }),

      addCategory: ({ name, type, color, icon }) => {
        const c: Category = { id: uid('cat'), name: name.trim(), type, color, icon };
        set((s) => ({ categories: [...s.categories, c] }));
        return c;
      },
      updateCategory: (id, patch) => set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteCategory: (id, reassignTo) => set((s) => {
        const target = s.categories.find((c) => c.id === id);
        if (!target) return {};
        const sameType = s.categories.filter((c) => c.type === target.type);
        if (sameType.length <= 1) throw new Error(`Keep at least one ${target.type} category.`);
        const linked = s.transactions.some((t) => t.categoryId === id);
        if (linked) {
          const dest = s.categories.find((c) => c.id === reassignTo);
          if (!dest || dest.id === id || dest.type !== target.type) throw new Error('Choose another category to move its transactions to.');
        }
        const { [id]: _removed, ...restLimits } = s.budgets.categoryMonthlyLimits;
        return {
          categories: s.categories.filter((c) => c.id !== id),
          transactions: linked ? s.transactions.map((t) => (t.categoryId === id ? { ...t, categoryId: reassignTo! } : t)) : s.transactions,
          budgets: { ...s.budgets, categoryMonthlyLimits: restLimits },
        };
      }),

      refreshFx: async () => {
        if (get().fxLoading) return false;
        set({ fxLoading: true, fxError: null });
        try {
          const rates = await fetchLiveRates();
          set({ fx: nextFxCache(get().fx, { ok: true, rates }), fxLoading: false });
          return true;
        } catch (e) {
          set({ fx: nextFxCache(get().fx, { ok: false }), fxLoading: false, fxError: e instanceof Error ? e.message : 'Could not reach the rate service' });
          return false;
        }
      },
      ensureFreshFx: () => { if (isFxStale(get().fx)) void get().refreshFx(); },

      loadDemoData: () => set((s) => {
        const keepCustom = s.categories.filter((c) => !DEFAULT_CATEGORIES.some((d) => d.id === c.id));
        return {
          categories: [...DEFAULT_CATEGORIES.map((c) => ({ ...c })), ...keepCustom],
          transactions: generateDemoTransactions(new Date(), s.fx.rates),
          budgets: structuredClone(DEMO_BUDGETS),
        };
      }),
      resetAll: () => set((s) => ({ ...initialAppState(), fx: s.fx, baseCurrency: s.baseCurrency })),
      importState: (imported) => set({ ...imported, schemaVersion: SCHEMA_VERSION }),
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        schemaVersion: s.schemaVersion, baseCurrency: s.baseCurrency, activeRange: s.activeRange, fx: s.fx,
        categories: s.categories, transactions: s.transactions, budgets: s.budgets, theme: s.theme,
      }),
    },
  ),
);

export const selectAppState = (s: FinanceStore): AppState => ({
  schemaVersion: s.schemaVersion, baseCurrency: s.baseCurrency, activeRange: s.activeRange, fx: s.fx,
  categories: s.categories, transactions: s.transactions, budgets: s.budgets,
});
