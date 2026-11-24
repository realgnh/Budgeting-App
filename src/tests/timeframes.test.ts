import { describe, expect, it } from 'vitest';
import { bucketIndexFor, buildBuckets, getPreviousWindow, getWindow, isInWindow } from '../lib/timeframes';
import { cashFlowSeries } from '../lib/analytics';
import type { Transaction } from '../types/finance';

// Local time throughout: these tests reason about calendar boundaries in the runner's zone.
const now = new Date(2026, 10, 24, 15, 30); // Nov 24 2026, 15:30 local
const local = (y: number, m: number, d: number, h = 0, min = 0, s = 0, ms = 0) => new Date(y, m, d, h, min, s, ms).toISOString();

describe('window boundaries and bucket counts', () => {
  it('1D covers today in 24 hourly buckets', () => {
    const w = getWindow('1D', now);
    const b = buildBuckets(w);
    expect(b).toHaveLength(24);
    expect(b[0].label).toBe('00:00');
    expect(b[23].label).toBe('23:00');
    expect(isInWindow(local(2026, 10, 24, 0, 0), w)).toBe(true);
    expect(isInWindow(local(2026, 10, 24, 23, 59, 59, 999), w)).toBe(true);
    expect(isInWindow(local(2026, 10, 23, 23, 59, 59, 999), w)).toBe(false);
    expect(isInWindow(local(2026, 10, 25, 0, 0), w)).toBe(false);
  });
  it('5D covers 5 calendar days ending today', () => {
    const w = getWindow('5D', now);
    const b = buildBuckets(w);
    expect(b.map((x) => x.label)).toEqual(['Nov 20', 'Nov 21', 'Nov 22', 'Nov 23', 'Nov 24']);
    expect(isInWindow(local(2026, 10, 20, 0, 0), w)).toBe(true);
    expect(isInWindow(local(2026, 10, 19, 23, 59), w)).toBe(false);
  });
  it('1M covers 30 calendar days ending today', () => {
    const w = getWindow('1M', now);
    const b = buildBuckets(w);
    expect(b).toHaveLength(30);
    expect(b[0].label).toBe('Oct 26');
    expect(b[29].label).toBe('Nov 24');
  });
  it('1Y covers 12 calendar months ending with the current month', () => {
    const b = buildBuckets(getWindow('1Y', now));
    expect(b).toHaveLength(12);
    expect(b[0].label).toBe('Dec 2025');
    expect(b[11].label).toBe('Nov 2026');
  });
  it('ALL falls back to the last 30 days without transactions', () => {
    const w = getWindow('ALL', now, null);
    expect(w.unit).toBe('day');
    expect(buildBuckets(w)).toHaveLength(30);
  });
  it('ALL buckets by day for spans up to 45 days', () => {
    const w = getWindow('ALL', now, new Date(2026, 9, 11, 9)); // 45 days inclusive
    expect(w.unit).toBe('day');
    expect(buildBuckets(w)).toHaveLength(45);
    const w2 = getWindow('ALL', now, new Date(2026, 9, 10, 9)); // 46 days
    expect(w2.unit).toBe('month');
  });
  it('ALL buckets by month for up to 24 months, then by quarter', () => {
    const w = getWindow('ALL', now, new Date(2024, 11, 3)); // Dec 2024 → Nov 2026 = 24 months
    expect(w.unit).toBe('month');
    expect(buildBuckets(w)).toHaveLength(24);
    const q = getWindow('ALL', now, new Date(2024, 10, 3)); // 25 months
    expect(q.unit).toBe('quarter');
    const qb = buildBuckets(q);
    expect(qb[0].label).toBe('Q4 2024');
    expect(qb[qb.length - 1].label).toBe('Q4 2026');
    expect(qb).toHaveLength(9);
  });
});

describe('previous windows', () => {
  it('shifts back by an equal length', () => {
    const w = getWindow('1M', now);
    const p = getPreviousWindow('1M', w)!;
    expect(p.end).toEqual(w.start);
    expect(buildBuckets(p)).toHaveLength(30);
    expect(buildBuckets(p)[0].label).toBe('Sep 26');
    const y = getPreviousWindow('1Y', getWindow('1Y', now))!;
    expect(buildBuckets(y)[0].label).toBe('Dec 2024');
    expect(getPreviousWindow('ALL', getWindow('ALL', now))).toBeNull();
  });
});

describe('bucketing transactions', () => {
  const mk = (iso: string, type: 'income' | 'expense', amount: number): Transaction => ({
    id: iso + type, type, amount, currency: 'USD', categoryId: 'x', title: 't', timestampIso: iso, fxSnapshot: { USD: 1, EGP: 50, SAR: 3.75 },
  });
  it('places transactions into the right hourly bucket and tracks balance', () => {
    const txs = [mk(local(2026, 10, 23, 12), 'income', 100), mk(local(2026, 10, 24, 0, 0), 'expense', 10), mk(local(2026, 10, 24, 13, 59), 'income', 5)];
    const w = getWindow('1D', now);
    const b = buildBuckets(w);
    expect(bucketIndexFor(local(2026, 10, 24, 13, 59), b)).toBe(13);
    const s = cashFlowSeries(txs, w, 'USD');
    expect(s[0].expense).toBe(10);
    expect(s[13].income).toBe(5);
    expect(s[23].balance).toBe(95);
  });
});
