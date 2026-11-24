import { describe, expect, it } from 'vitest';
import { computeBudgetSummary, monthKey, resolveMonthBudget } from '../lib/budgets';
import { cashFlowSeries, netBalance } from '../lib/analytics';
import { getWindow } from '../lib/timeframes';
import { parseBackup } from '../lib/io';
import type { BalanceAdjustment, BudgetConfig, Category, FxRates, Transaction } from '../types/finance';

const rates: FxRates = { USD: 1, EGP: 50, SAR: 3.75 };
const cap = (amount: number): BudgetConfig => ({ overallMonthlyLimit: { amount, currency: 'USD' }, categoryMonthlyLimits: {} });
const tx = (id: string, amount: number, d: Date, type: 'income' | 'expense' = 'expense'): Transaction => ({
  id, type, amount, currency: 'USD', categoryId: 'food', title: id, timestampIso: d.toISOString(), fxSnapshot: rates,
});
const cats: Category[] = [{ id: 'food', name: 'Food', type: 'expense', color: '#000', icon: 'utensils' }];

describe('per-month budgets', () => {
  const monthly = { '2026-03': cap(300), '2026-06': cap(600) };
  const fallback = cap(100);
  it('uses a month’s own budget', () => {
    expect(resolveMonthBudget('2026-06', monthly, fallback)).toEqual({ config: cap(600), from: '2026-06' });
  });
  it('carries the closest earlier budget forward', () => {
    expect(resolveMonthBudget('2026-05', monthly, fallback).from).toBe('2026-03');
    expect(resolveMonthBudget('2027-01', monthly, fallback).from).toBe('2026-06');
  });
  it('falls back before any month-specific budget', () => {
    expect(resolveMonthBudget('2026-01', monthly, fallback)).toEqual({ config: fallback, from: null });
  });
  it('formats month keys', () => {
    expect(monthKey(new Date(2026, 0, 31))).toBe('2026-01');
  });
});

describe('budget summary for other months', () => {
  const now = new Date(2026, 10, 24, 12);
  const txs = [tx('oct', 450, new Date(2026, 9, 5)), tx('nov', 100, new Date(2026, 10, 3))];
  it('reports a closed month without safe-to-spend', () => {
    const s = computeBudgetSummary(txs, cap(400), cats, 'USD', rates, now, new Date(2026, 9, 1));
    expect(s.phase).toBe('past');
    expect(s.spent).toBe(450);
    expect(s.overall!.status).toBe('over');
    expect(s.overall!.safePerDay).toBeNull();
    expect(s.remainingDays).toBe(0);
  });
  it('gives a full-month daily allowance for an upcoming month', () => {
    const s = computeBudgetSummary(txs, cap(310), cats, 'USD', rates, now, new Date(2026, 11, 1));
    expect(s.phase).toBe('future');
    expect(s.spent).toBe(0);
    expect(s.overall!.safePerDay).toBeCloseTo(10);
  });
  it('keeps current-month behaviour by default', () => {
    const s = computeBudgetSummary(txs, cap(800), cats, 'USD', rates, now);
    expect(s.phase).toBe('current');
    expect(s.overall!.safePerDay).toBeCloseTo(700 / 7);
  });
});

describe('balance corrections', () => {
  const adj = (amount: number, d: Date, currency: 'USD' | 'EGP' = 'USD'): BalanceAdjustment => ({ id: `a${amount}`, amount, currency, timestampIso: d.toISOString(), fxSnapshot: rates });
  const txs = [tx('pay', 1000, new Date(2026, 10, 1), 'income'), tx('rent', 400, new Date(2026, 10, 2))];
  it('adds corrections to the balance without touching income or expenses', () => {
    expect(netBalance(txs, [], 'USD')).toBe(600);
    expect(netBalance(txs, [adj(250, new Date(2026, 10, 3)), adj(-5000, new Date(2026, 10, 4), 'EGP')], 'USD')).toBeCloseTo(750);
  });
  it('shows corrections in the running balance at the right time', () => {
    const now = new Date(2026, 10, 24, 12);
    const s = cashFlowSeries(txs, getWindow('1M', now), 'USD', [adj(100, new Date(2026, 9, 1)), adj(50, new Date(2026, 10, 20, 9))]);
    const nov19 = s.find((p) => p.label === 'Nov 19')!, nov20 = s.find((p) => p.label === 'Nov 20')!;
    expect(nov19.balance).toBe(700);
    expect(nov20.balance).toBe(750);
    expect(nov20.income + nov20.expense).toBe(0);
  });
});

describe('backups', () => {
  it('loads a version 1 backup and fills in the new fields', () => {
    const v1 = {
      schemaVersion: 1, baseCurrency: 'SAR', activeRange: '1M', fx: { rates, lastUpdatedIso: '', source: 'fallback' },
      categories: cats, transactions: [tx('a', 5, new Date(2026, 1, 1))], budgets: { overallMonthlyLimit: null, categoryMonthlyLimits: {} },
    };
    const s = parseBackup(JSON.stringify({ app: 'mizan', state: v1 }));
    expect(s.schemaVersion).toBe(2);
    expect(s.monthlyBudgets).toEqual({});
    expect(s.balanceAdjustments).toEqual([]);
  });
  it('rejects malformed monthly budgets', () => {
    const bad = { schemaVersion: 2, baseCurrency: 'SAR', fx: { rates, lastUpdatedIso: '', source: 'live' }, categories: cats, transactions: [],
      budgets: { overallMonthlyLimit: null, categoryMonthlyLimits: {} }, monthlyBudgets: { november: cap(5) }, balanceAdjustments: [] };
    expect(() => parseBackup(JSON.stringify(bad))).toThrow(/monthly budgets/);
  });
});
