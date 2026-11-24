import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  SCHEMA_VERSION, type AppState, type BudgetConfig, type Category, type Currency, type MonthKey, type MoneyLimit, type TimeRange,
  type Transaction, type TransactionType,
} from '../types/finance';
import { netBalance } from '../lib/analytics';
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
  /** Saves a month's budget, in the current base currency. It also applies to later months until one has its own. */
  saveMonthBudget: (month: MonthKey, overall: number | null, categoryLimits: Record<string, number>) => void;
  /** Removes a month's own budget so it falls back to the previous one. */
  clearMonthBudget: (month: MonthKey) => void;
  /** Records a correction so the balance equals `amount` right now. Returns the correction in `currency`. */
  setCurrentBalance: (amount: number, currency: Currency) => number;
  deleteBalanceAdjustment: (id: string) => void;
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
    monthlyBudgets: {},
    balanceAdjustments: [],
  };
}

/** Brings data saved by older versions up to the current schema. */
export function migrateState(persisted: unknown, version: number): Partial<AppState> {
  const s = (persisted ?? {}) as Partial<AppState>;
  if (version < 2) return { ...s, schemaVersion: SCHEMA_VERSION, monthlyBudgets: s.monthlyBudgets ?? {}, balanceAdjustments: s.balanceAdjustments ?? [] };
  return s;
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

      saveMonthBudget: (month, overall, limits) => set((s) => {
        const categoryMonthlyLimits: Record<string, MoneyLimit> = {};
        for (const [id, amt] of Object.entries(limits)) if (amt > 0) categoryMonthlyLimits[id] = limit(amt, s.baseCurrency);
        const config: BudgetConfig = { overallMonthlyLimit: overall && overall > 0 ? limit(overall, s.baseCurrency) : null, categoryMonthlyLimits };
        return { monthlyBudgets: { ...s.monthlyBudgets, [month]: config } };
      }),
      clearMonthBudget: (month) => set((s) => {
        const { [month]: _gone, ...rest } = s.monthlyBudgets;
        return { monthlyBudgets: rest };
      }),

      setCurrentBalance: (amount, currency) => {
        const s = get();
        const diff = Math.round((amount - netBalance(s.transactions, s.balanceAdjustments, currency)) * 100) / 100;
        if (Math.abs(diff) >= 0.01) {
          set({ balanceAdjustments: [...s.balanceAdjustments, { id: uid('adj'), amount: diff, currency, timestampIso: new Date().toISOString(), fxSnapshot: { ...s.fx.rates } }] });
        }
        return diff;
      },
      deleteBalanceAdjustment: (id) => set((s) => ({ balanceAdjustments: s.balanceAdjustments.filter((a) => a.id !== id) })),

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
        const dropLimit = (b: BudgetConfig): BudgetConfig => {
          const { [id]: _removed, ...rest } = b.categoryMonthlyLimits;
          return { ...b, categoryMonthlyLimits: rest };
        };
        return {
          categories: s.categories.filter((c) => c.id !== id),
          transactions: linked ? s.transactions.map((t) => (t.categoryId === id ? { ...t, categoryId: reassignTo! } : t)) : s.transactions,
          budgets: dropLimit(s.budgets),
          monthlyBudgets: Object.fromEntries(Object.entries(s.monthlyBudgets).map(([k, b]) => [k, dropLimit(b)])),
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
          monthlyBudgets: {},
          balanceAdjustments: [],
        };
      }),
      resetAll: () => set((s) => ({ ...initialAppState(), fx: s.fx, baseCurrency: s.baseCurrency })),
      importState: (imported) => set({ ...imported, schemaVersion: SCHEMA_VERSION }),
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      migrate: (persisted, version) => migrateState(persisted, version) as FinanceStore,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        schemaVersion: s.schemaVersion, baseCurrency: s.baseCurrency, activeRange: s.activeRange, fx: s.fx,
        categories: s.categories, transactions: s.transactions, budgets: s.budgets, theme: s.theme,
        monthlyBudgets: s.monthlyBudgets, balanceAdjustments: s.balanceAdjustments,
      }),
    },
  ),
);

export const selectAppState = (s: FinanceStore): AppState => ({
  schemaVersion: s.schemaVersion, baseCurrency: s.baseCurrency, activeRange: s.activeRange, fx: s.fx,
  categories: s.categories, transactions: s.transactions, budgets: s.budgets,
  monthlyBudgets: s.monthlyBudgets, balanceAdjustments: s.balanceAdjustments,
});
