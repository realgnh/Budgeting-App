import { describe, expect, it } from 'vitest';
import { budgetStatus, computeBudgetSummary, remainingDaysInMonth, safeToSpendPerDay } from '../lib/budgets';
import type { BudgetConfig, Category, FxRates, Transaction } from '../types/finance';

const rates: FxRates = { USD: 1, EGP: 50, SAR: 3.75 };
const now = new Date(2026, 10, 24, 10); // Nov 24 → 7 days left incl. today

describe('budget status thresholds', () => {
  it('is green below 75%', () => {
    expect(budgetStatus(0)).toBe('ok');
    expect(budgetStatus(74.99)).toBe('ok');
  });
  it('is amber from 75% to just under 100%', () => {
    expect(budgetStatus(75)).toBe('warn');
    expect(budgetStatus(99.9)).toBe('warn');
  });
  it('is red at or above 100%', () => {
    expect(budgetStatus(100)).toBe('over');
    expect(budgetStatus(180)).toBe('over');
  });
});

describe('safe to spend', () => {
  it('counts today as a remaining day', () => {
    expect(remainingDaysInMonth(now)).toBe(7);
    expect(remainingDaysInMonth(new Date(2026, 10, 30, 23))).toBe(1);
    expect(remainingDaysInMonth(new Date(2026, 1, 1))).toBe(28);
  });
  it('divides what is left by the remaining days', () => {
    expect(safeToSpendPerDay(1000, 300, now)).toBeCloseTo(100);
  });
  it('never goes negative', () => {
    expect(safeToSpendPerDay(1000, 1500, now)).toBe(0);
  });
});

describe('computeBudgetSummary', () => {
  const categories: Category[] = [
    { id: 'food', name: 'Food', type: 'expense', color: '#000', icon: 'utensils' },
    { id: 'rent', name: 'Rent', type: 'expense', color: '#000', icon: 'house' },
  ];
  const tx = (id: string, cat: string, amount: number, cur: 'USD' | 'SAR' | 'EGP', d: Date, type: 'expense' | 'income' = 'expense'): Transaction => ({
    id, type, amount, currency: cur, categoryId: cat, title: id, timestampIso: d.toISOString(), fxSnapshot: rates,
  });
  const txs = [
    tx('a', 'food', 750, 'SAR', new Date(2026, 10, 2)), // 200 USD
    tx('b', 'rent', 500, 'USD', new Date(2026, 10, 1, 0, 0)),
    tx('c', 'food', 999, 'USD', new Date(2026, 9, 31, 23, 59)), // previous month: excluded
    tx('d', 'food', 5000, 'EGP', new Date(2026, 10, 20), 'income'), // income: excluded
  ];
  const budgets: BudgetConfig = {
    overallMonthlyLimit: { amount: 3750, currency: 'SAR' }, // 1000 USD
    categoryMonthlyLimits: { food: { amount: 250, currency: 'USD' }, rent: { amount: 500, currency: 'USD' }, ghost: { amount: 1, currency: 'USD' } },
  };
  const s = computeBudgetSummary(txs, budgets, categories, 'USD', rates, now);

  it('only counts current-month expenses', () => {
    expect(s.spent).toBeCloseTo(700);
  });
  it('converts the overall cap and derives status and safe-to-spend', () => {
    expect(s.overall!.limit).toBeCloseTo(1000);
    expect(s.overall!.pct).toBeCloseTo(70);
    expect(s.overall!.status).toBe('ok');
    expect(s.overall!.safePerDay).toBeCloseTo(300 / 7);
  });
  it('sorts category rows by % used and drops unknown categories', () => {
    expect(s.categories.map((r) => r.categoryId)).toEqual(['rent', 'food']);
    expect(s.categories[0].status).toBe('over');
    expect(s.categories[1].pct).toBeCloseTo(80);
    expect(s.categories[1].status).toBe('warn');
  });
  it('reports no overall block when no cap is set', () => {
    expect(computeBudgetSummary(txs, { ...budgets, overallMonthlyLimit: null }, categories, 'USD', rates, now).overall).toBeNull();
  });
});
