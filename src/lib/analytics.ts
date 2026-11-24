import type { BalanceAdjustment, Category, Currency, Transaction } from '../types/finance';
import { convertCurrency, transactionToBase } from './fx';
import { bucketIndexFor, buildBuckets, isInWindow, type TimeWindow } from './timeframes';
import { addZDays, daysInZMonthOf, fmt, startOfZMonth, zparts } from './time';

export interface Totals { income: number; expense: number; net: number; count: number }

export function sumTotals(transactions: Transaction[], base: Currency): Totals {
  let income = 0, expense = 0;
  for (const t of transactions) {
    const v = transactionToBase(t, base);
    if (t.type === 'income') income += v; else expense += v;
  }
  return { income, expense, net: income - expense, count: transactions.length };
}

export const adjustmentToBase = (a: BalanceAdjustment, base: Currency) => convertCurrency(a.amount, a.currency, base, a.fxSnapshot);

/** All-time income − expenses, plus any balance corrections the user entered. */
export function netBalance(transactions: Transaction[], adjustments: BalanceAdjustment[], base: Currency): number {
  return sumTotals(transactions, base).net + adjustments.reduce((s, a) => s + adjustmentToBase(a, base), 0);
}

export function inWindow(transactions: Transaction[], w: Pick<TimeWindow, 'start' | 'end'>): Transaction[] {
  return transactions.filter((t) => isInWindow(t.timestampIso, w));
}

/** Percentage change; null when the previous period was zero but the current is not. */
export function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function savingsRate(income: number, expense: number): number | null {
  if (income <= 0) return null;
  return ((income - expense) / income) * 100;
}

export interface SeriesPoint { label: string; start: Date; income: number; expense: number; net: number; balance: number }

/** Income/expense per bucket plus the running all-time balance (with corrections) at each bucket's end. */
export function cashFlowSeries(transactions: Transaction[], w: TimeWindow, base: Currency, adjustments: BalanceAdjustment[] = []): SeriesPoint[] {
  const buckets = buildBuckets(w);
  const pts: SeriesPoint[] = buckets.map((b) => ({ label: b.label, start: b.start, income: 0, expense: 0, net: 0, balance: 0 }));
  let opening = 0;
  for (const t of transactions) {
    const v = transactionToBase(t, base) * (t.type === 'income' ? 1 : -1);
    if (Date.parse(t.timestampIso) < w.start.getTime()) { opening += v; continue; }
    const i = bucketIndexFor(t.timestampIso, buckets);
    if (i < 0) continue;
    if (v >= 0) pts[i].income += v; else pts[i].expense -= v;
  }
  const adjByBucket = new Array<number>(pts.length).fill(0);
  for (const adj of adjustments) {
    const v = adjustmentToBase(adj, base);
    if (Date.parse(adj.timestampIso) < w.start.getTime()) { opening += v; continue; }
    const i = bucketIndexFor(adj.timestampIso, buckets);
    if (i >= 0) adjByBucket[i] += v;
  }
  let run = opening;
  pts.forEach((p, i) => { p.net = p.income - p.expense; run += p.net + adjByBucket[i]; p.balance = run; });
  return pts;
}

export interface Slice { key: string; name: string; color: string; value: number; share: number }

export function breakdownByCategory(transactions: Transaction[], categories: Category[], base: Currency): Slice[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const agg = new Map<string, number>();
  for (const t of transactions) agg.set(t.categoryId, (agg.get(t.categoryId) ?? 0) + transactionToBase(t, base));
  const total = [...agg.values()].reduce((s, v) => s + v, 0);
  return [...agg.entries()]
    .map(([key, value]) => {
      const c = byId.get(key);
      return { key, name: c?.name ?? 'Unknown', color: c?.color ?? '#8f9893', value, share: total ? value / total : 0 };
    })
    .sort((a, b) => b.value - a.value);
}

export const CURRENCY_COLORS: Record<Currency, string> = { EGP: '#2a78d6', SAR: '#eb6834', USD: '#1baf7a' };

export function currencyMix(transactions: Transaction[], base: Currency): Slice[] {
  const agg: Record<Currency, number> = { EGP: 0, SAR: 0, USD: 0 };
  for (const t of transactions) agg[t.currency] += transactionToBase(t, base);
  const total = agg.EGP + agg.SAR + agg.USD;
  return (Object.keys(agg) as Currency[])
    .filter((k) => agg[k] > 0)
    .map((k) => ({ key: k, name: k, color: CURRENCY_COLORS[k], value: agg[k], share: total ? agg[k] / total : 0 }))
    .sort((a, b) => b.value - a.value);
}

export interface BurnPoint { day: number; label: string; actual: number | null; ideal: number | null }

/**
 * Cumulative spend through a month (Cairo time) against an even pace to the cap. For the current month,
 * days after today have no actual value; past months are complete; future months are empty.
 */
export function burnRateSeries(transactions: Transaction[], base: Currency, now: Date, limitInBase: number | null, month: Date = now): BurnPoint[] {
  const start = startOfZMonth(month);
  const sp = zparts(start), np = zparts(now);
  const days = daysInZMonthOf(start);
  const daily = new Array<number>(days).fill(0);
  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    const p = zparts(t.timestampIso);
    if (p.y !== sp.y || p.m !== sp.m) continue;
    daily[p.d - 1] += transactionToBase(t, base);
  }
  const monthIdx = (y: number, m: number) => y * 12 + m;
  const lastDay = monthIdx(sp.y, sp.m) < monthIdx(np.y, np.m) ? days : monthIdx(sp.y, sp.m) > monthIdx(np.y, np.m) ? 0 : np.d;
  let run = 0;
  return daily.map((v, i) => {
    run += v;
    return {
      day: i + 1,
      label: fmt.dayShort(addZDays(start, i)),
      actual: i + 1 <= lastDay ? run : null,
      ideal: limitInBase ? (limitInBase * (i + 1)) / days : null,
    };
  });
}

export interface Highlights { largest: Transaction | null; largestValue: number; topCategory: Slice | null; avgDaily: number; days: number }

export function periodHighlights(expenses: Transaction[], categories: Category[], base: Currency, w: TimeWindow, now: Date): Highlights {
  let largest: Transaction | null = null, largestValue = 0, total = 0;
  for (const t of expenses) {
    const v = transactionToBase(t, base);
    total += v;
    if (v > largestValue) { largest = t; largestValue = v; }
  }
  const endMs = Math.min(w.end.getTime(), now.getTime());
  const days = Math.max(1, Math.ceil((endMs - w.start.getTime()) / 86_400_000));
  return { largest, largestValue, topCategory: breakdownByCategory(expenses, categories, base)[0] ?? null, avgDaily: total / days, days };
}
