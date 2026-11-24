export type Currency = 'EGP' | 'SAR' | 'USD';

export type TransactionType = 'income' | 'expense';

export type TimeRange = '1D' | '5D' | '1M' | '1Y' | 'ALL';

/** Exchange rates expressed as units of currency per 1 USD (USD is always 1). */
export interface FxRates {
  USD: 1;
  EGP: number;
  SAR: number;
}

export interface FxCache {
  rates: FxRates;
  lastUpdatedIso: string;
  source: 'live' | 'fallback';
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string; // Hex color used consistently across charts and badges
  icon: string; // Lucide icon name
  isDefault?: boolean;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number; // Strictly positive number in native currency
  currency: Currency; // Native currency entered by user
  categoryId: string;
  title: string; // Short merchant/source description
  notes?: string;
  timestampIso: string; // ISO-8601 timestamp (supports 1D hourly charting)
  fxSnapshot: FxRates; // Rates captured when transaction was created
}

export interface MoneyLimit {
  amount: number; // Positive cap
  currency: Currency; // Base currency active when limit was saved
}

export interface BudgetConfig {
  overallMonthlyLimit: MoneyLimit | null;
  categoryMonthlyLimits: Record<string, MoneyLimit>; // keyed by categoryId
}

export interface AppState {
  schemaVersion: number;
  baseCurrency: Currency;
  activeRange: TimeRange;
  fx: FxCache;
  categories: Category[];
  transactions: Transaction[];
  budgets: BudgetConfig;
}

export const CURRENCIES: readonly Currency[] = ['EGP', 'SAR', 'USD'] as const;
export const TIME_RANGES: readonly TimeRange[] = ['1D', '5D', '1M', '1Y', 'ALL'] as const;
export const SCHEMA_VERSION = 1;
