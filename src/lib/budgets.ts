import { addMonths, differenceInCalendarDays, endOfMonth, startOfMonth } from 'date-fns';
import type { BudgetConfig, Category, Currency, FxRates, Transaction } from '../types/finance';
import { limitToBase, transactionToBase } from './fx';

export type BudgetStatus = 'ok' | 'warn' | 'over';

export function budgetStatus(pctUsed: number): BudgetStatus {
  if (pctUsed >= 100) return 'over';
  if (pctUsed >= 75) return 'warn';
  return 'ok';
}

export const STATUS_LABEL: Record<BudgetStatus, string> = { ok: 'On track', warn: 'Approaching limit', over: 'Over budget' };

export function currentMonthBounds(now: Date) {
  const start = startOfMonth(now);
  return { start, end: addMonths(start, 1), last: endOfMonth(now) };
}

/** Days remaining in the month, counting today. */
export function remainingDaysInMonth(now: Date): number {
  return differenceInCalendarDays(endOfMonth(now), now) + 1;
}

export function safeToSpendPerDay(limitInBase: number, spentInBase: number, now: Date): number {
  return Math.max(0, (limitInBase - spentInBase) / remainingDaysInMonth(now));
}

export function pctUsed(spent: number, limit: number): number {
  if (limit <= 0) return spent > 0 ? Infinity : 0;
  return (spent / limit) * 100;
}

export interface CategoryBudgetRow {
  categoryId: string;
  limit: number;
  spent: number;
  pct: number;
  status: BudgetStatus;
}

export interface BudgetSummary {
  monthStart: Date;
  spent: number;
  byCategory: Record<string, number>;
  overall: { limit: number; pct: number; status: BudgetStatus; safePerDay: number; remaining: number } | null;
  categories: CategoryBudgetRow[];
  remainingDays: number;
  daysInMonth: number;
}

export function currentMonthExpenses(transactions: Transaction[], base: Currency, now: Date) {
  const { start, end } = currentMonthBounds(now);
  const byCategory: Record<string, number> = {};
  let spent = 0;
  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    const ts = Date.parse(t.timestampIso);
    if (ts < start.getTime() || ts >= end.getTime()) continue;
    const v = transactionToBase(t, base);
    spent += v;
    byCategory[t.categoryId] = (byCategory[t.categoryId] ?? 0) + v;
  }
  return { spent, byCategory };
}

export function computeBudgetSummary(
  transactions: Transaction[], budgets: BudgetConfig, categories: Category[], base: Currency, rates: FxRates, now: Date,
): BudgetSummary {
  const { spent, byCategory } = currentMonthExpenses(transactions, base, now);
  const remainingDays = remainingDaysInMonth(now);
  let overall: BudgetSummary['overall'] = null;
  if (budgets.overallMonthlyLimit) {
    const limit = limitToBase(budgets.overallMonthlyLimit, base, rates);
    const pct = pctUsed(spent, limit);
    overall = { limit, pct, status: budgetStatus(pct), safePerDay: safeToSpendPerDay(limit, spent, now), remaining: Math.max(0, limit - spent) };
  }
  const known = new Set(categories.map((c) => c.id));
  const rows: CategoryBudgetRow[] = Object.entries(budgets.categoryMonthlyLimits)
    .filter(([id]) => known.has(id))
    .map(([categoryId, lim]) => {
      const limit = limitToBase(lim, base, rates);
      const s = byCategory[categoryId] ?? 0;
      const pct = pctUsed(s, limit);
      return { categoryId, limit, spent: s, pct, status: budgetStatus(pct) };
    })
    .sort((a, b) => b.pct - a.pct);
  return {
    monthStart: currentMonthBounds(now).start, spent, byCategory, overall, categories: rows, remainingDays,
    daysInMonth: endOfMonth(now).getDate(),
  };
}
