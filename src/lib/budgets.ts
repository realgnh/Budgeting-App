import { addZMonths, daysInZMonthOf, monthKeyZ, startOfZMonth, zdate, zparts } from './time';
import type { BudgetConfig, Category, Currency, FxRates, MonthKey, Transaction } from '../types/finance';
import { limitToBase, transactionToBase } from './fx';

export type BudgetStatus = 'ok' | 'warn' | 'over';

export function budgetStatus(pctUsed: number): BudgetStatus {
  if (pctUsed >= 100) return 'over';
  if (pctUsed >= 75) return 'warn';
  return 'ok';
}

export const STATUS_LABEL: Record<BudgetStatus, string> = { ok: 'On track', warn: 'Approaching limit', over: 'Over budget' };

/** Month key ("yyyy-MM") on the Cairo calendar. */
export const monthKey = (d: Date): MonthKey => monthKeyZ(d);
/** The instant a month starts (00:00 Cairo time on the 1st). */
export const monthFromKey = (k: MonthKey): Date => { const [y, m] = k.split('-').map(Number); return zdate(y, m - 1, 1); };

export function currentMonthBounds(now: Date) {
  const start = startOfZMonth(now);
  return { start, end: addZMonths(start, 1), days: daysInZMonthOf(now) };
}

/** Days remaining in the month on the Cairo calendar, counting today. */
export function remainingDaysInMonth(now: Date): number {
  return daysInZMonthOf(now) - zparts(now).d + 1;
}

export function safeToSpendPerDay(limitInBase: number, spentInBase: number, now: Date): number {
  return Math.max(0, (limitInBase - spentInBase) / remainingDaysInMonth(now));
}

export function pctUsed(spent: number, limit: number): number {
  if (limit <= 0) return spent > 0 ? Infinity : 0;
  return (spent / limit) * 100;
}

const EMPTY: BudgetConfig = { overallMonthlyLimit: null, categoryMonthlyLimits: {} };

/**
 * The budget in force for a month: that month's own budget, else the closest earlier month that has
 * one, else the fallback. Returns which month it came from (null = fallback).
 */
export function resolveMonthBudget(month: MonthKey, monthly: Record<MonthKey, BudgetConfig>, fallback: BudgetConfig = EMPTY): { config: BudgetConfig; from: MonthKey | null } {
  if (monthly[month]) return { config: monthly[month], from: month };
  const earlier = Object.keys(monthly).filter((k) => k < month).sort();
  const k = earlier[earlier.length - 1];
  return k ? { config: monthly[k], from: k } : { config: fallback, from: null };
}

export interface CategoryBudgetRow { categoryId: string; limit: number; spent: number; pct: number; status: BudgetStatus }

export type MonthPhase = 'past' | 'current' | 'future';

export interface BudgetSummary {
  monthStart: Date;
  phase: MonthPhase;
  spent: number;
  byCategory: Record<string, number>;
  overall: { limit: number; pct: number; status: BudgetStatus; safePerDay: number | null; remaining: number } | null;
  categories: CategoryBudgetRow[];
  remainingDays: number;
  daysInMonth: number;
}

export function monthExpenses(transactions: Transaction[], base: Currency, month: Date) {
  const start = startOfZMonth(month), end = addZMonths(start, 1);
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

/** Kept for callers that only care about the current month. */
export const currentMonthExpenses = (transactions: Transaction[], base: Currency, now: Date) => monthExpenses(transactions, base, now);

/**
 * Budget progress for `month` (defaults to the month containing `now`). Safe-to-spend is only
 * defined for the current month; past months have no days left and future months have not started.
 */
export function computeBudgetSummary(
  transactions: Transaction[], budgets: BudgetConfig, categories: Category[], base: Currency, rates: FxRates, now: Date, month: Date = now,
): BudgetSummary {
  const monthStart = startOfZMonth(month);
  const phase: MonthPhase = monthKeyZ(monthStart) === monthKeyZ(now) ? 'current' : monthStart < now ? 'past' : 'future';
  const daysInMonth = daysInZMonthOf(monthStart);
  const remainingDays = phase === 'current' ? remainingDaysInMonth(now) : phase === 'future' ? daysInMonth : 0;
  const { spent, byCategory } = monthExpenses(transactions, base, monthStart);
  let overall: BudgetSummary['overall'] = null;
  if (budgets.overallMonthlyLimit) {
    const limit = limitToBase(budgets.overallMonthlyLimit, base, rates);
    const pct = pctUsed(spent, limit);
    const safePerDay = phase === 'past' ? null : Math.max(0, (limit - spent) / Math.max(1, remainingDays));
    overall = { limit, pct, status: budgetStatus(pct), safePerDay, remaining: Math.max(0, limit - spent) };
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
  return { monthStart, phase, spent, byCategory, overall, categories: rows, remainingDays, daysInMonth };
}
