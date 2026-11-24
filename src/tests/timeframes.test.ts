import { describe, expect, it } from 'vitest';
import { bucketIndexFor, buildBuckets, getPreviousWindow, getWindow, isCurrentPeriod, isInWindow, periodShortLabel, periodTitle, shiftPeriod } from '../lib/timeframes';
import { cashFlowSeries } from '../lib/analytics';
import { dayKey, fmt, fromInputValue, toInputValue, zdate } from '../lib/time';
import type { Transaction } from '../types/finance';

// zdate(y, m, d, h, min) builds an instant from a Cairo wall-clock time, independent of the machine's zone.
const now = zdate(2026, 10, 24, 15, 30); // Tue Nov 24 2026, 15:30 Cairo (UTC+2 in winter)
const iso = (y: number, m: number, d: number, h = 0, min = 0) => zdate(y, m, d, h, min).toISOString();

describe('Cairo clock in winter (UTC+2)', () => {
  it('starts the day at 22:00 UTC the evening before', () => {
    expect(getWindow({ unit: 'day', anchor: now }).start.toISOString()).toBe('2026-11-23T22:00:00.000Z');
  });
  it('rolls the day over at midnight UTC+2', () => {
    const before = new Date('2026-11-24T21:59:59Z'); // 23:59:59 UTC+2
    const after = new Date('2026-11-24T22:00:00Z');  // 00:00 UTC+2 next day
    expect(dayKey(before)).toBe('2026-11-24');
    expect(dayKey(after)).toBe('2026-11-25');
    expect(isCurrentPeriod({ unit: 'day', anchor: before }, after)).toBe(false);
  });
  it('round-trips datetime-local values as UTC+2', () => {
    expect(toInputValue('2026-11-24T22:30:00Z')).toBe('2026-11-25T00:30');
    expect(fromInputValue('2026-11-25T00:30')!.toISOString()).toBe('2026-11-24T22:30:00.000Z');
    expect(fromInputValue('nope')).toBeNull();
  });
  it('formats on the UTC+2 clock', () => {
    expect(fmt.dateTime('2026-11-24T22:30:00Z')).toBe('Nov 25, 2026 · 00:30');
    expect(fmt.dayLong(now)).toBe('Tuesday, November 24, 2026');
  });
});

describe('Cairo clock with daylight saving (UTC+3 in summer)', () => {
  const H = 3_600_000;
  it('starts a summer day at 21:00 UTC the evening before', () => {
    expect(getWindow({ unit: 'day', anchor: zdate(2026, 6, 1, 12) }).start.toISOString()).toBe('2026-06-30T21:00:00.000Z');
    expect(toInputValue('2026-07-01T09:00:00Z')).toBe('2026-07-01T12:00');
    expect(dayKey(new Date('2026-07-14T20:59:59Z'))).toBe('2026-07-14');
    expect(dayKey(new Date('2026-07-14T21:00:00Z'))).toBe('2026-07-15');
  });
  it('gives the spring-forward day (last Friday of April) 23 hours', () => {
    const w = getWindow({ unit: 'day', anchor: zdate(2026, 3, 24, 12) });
    expect(+w.end - +w.start).toBe(23 * H);
    const b = buildBuckets(w);
    expect(b).toHaveLength(24);
    expect(b[13].start.toISOString()).toBe('2026-04-24T10:00:00.000Z');
    expect(bucketIndexFor('2026-04-24T10:30:00Z', b)).toBe(13);
  });
  it('gives the fall-back day (last Thursday of October) 25 hours', () => {
    const w = getWindow({ unit: 'day', anchor: zdate(2026, 9, 29, 12) });
    expect(+w.end - +w.start).toBe(25 * H);
    expect(dayKey(new Date('2026-10-29T21:30:00Z'))).toBe('2026-10-29'); // the repeated 23:00 hour
    expect(buildBuckets(getWindow({ unit: 'month', anchor: zdate(2026, 9, 5) }))).toHaveLength(31);
  });
  it('steps across clock changes by calendar day', () => {
    expect(dayKey(shiftPeriod({ unit: 'day', anchor: zdate(2026, 3, 23, 23, 30) }, 1).anchor)).toBe('2026-04-24');
    expect(dayKey(shiftPeriod({ unit: 'day', anchor: zdate(2026, 9, 30, 0, 30) }, -1).anchor)).toBe('2026-10-29');
  });
});

describe('day / month / year windows', () => {
  it('a day has 24 hourly buckets and includes both ends correctly', () => {
    const w = getWindow({ unit: 'day', anchor: now });
    const b = buildBuckets(w);
    expect(b).toHaveLength(24);
    expect(b[0].label).toBe('00:00');
    expect(b[23].label).toBe('23:00');
    expect(isInWindow(iso(2026, 10, 24, 0, 0), w)).toBe(true);
    expect(isInWindow(new Date(+zdate(2026, 10, 25) - 1).toISOString(), w)).toBe(true);
    expect(isInWindow(iso(2026, 10, 25, 0, 0), w)).toBe(false);
    expect(isInWindow(new Date(+zdate(2026, 10, 24) - 1).toISOString(), w)).toBe(false);
  });
  it('a month has one bucket per calendar day', () => {
    expect(buildBuckets(getWindow({ unit: 'month', anchor: now }))).toHaveLength(30);
    expect(buildBuckets(getWindow({ unit: 'month', anchor: zdate(2028, 1, 10) }))).toHaveLength(29); // leap February
    const b = buildBuckets(getWindow({ unit: 'month', anchor: now }));
    expect(b[0].label).toBe('Nov 1');
    expect(b[29].label).toBe('Nov 30');
  });
  it('a year has 12 monthly buckets', () => {
    const w = getWindow({ unit: 'year', anchor: now });
    const b = buildBuckets(w);
    expect(b.map((x) => x.label)).toEqual(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
    expect(isInWindow(iso(2026, 0, 1), w)).toBe(true);
    expect(isInWindow(iso(2027, 0, 1), w)).toBe(false);
  });
});

describe('moving between periods', () => {
  it('steps by one day, month or year', () => {
    expect(dayKey(shiftPeriod({ unit: 'day', anchor: now }, -1).anchor)).toBe('2026-11-23');
    expect(dayKey(shiftPeriod({ unit: 'day', anchor: zdate(2026, 0, 1) }, -1).anchor)).toBe('2025-12-31');
    expect(dayKey(shiftPeriod({ unit: 'month', anchor: zdate(2026, 0, 31) }, -1).anchor)).toBe('2025-12-01');
    expect(dayKey(shiftPeriod({ unit: 'year', anchor: now }, 1).anchor)).toBe('2027-01-01');
  });
  it('compares against the period right before', () => {
    const w = getWindow({ unit: 'day', anchor: now });
    const p = getPreviousWindow({ unit: 'day', anchor: now });
    expect(p.end).toEqual(w.start);
    expect(buildBuckets(getPreviousWindow({ unit: 'month', anchor: zdate(2026, 2, 15) }))).toHaveLength(28);
  });
  it('labels periods', () => {
    expect(periodTitle({ unit: 'month', anchor: now })).toBe('November 2026');
    expect(periodShortLabel({ unit: 'day', anchor: now }, now)).toBe('today');
    expect(periodShortLabel({ unit: 'day', anchor: zdate(2026, 10, 23, 12) }, now)).toBe('yesterday');
    expect(periodShortLabel({ unit: 'day', anchor: zdate(2026, 10, 2) }, now)).toBe('Nov 2');
    expect(periodShortLabel({ unit: 'month', anchor: zdate(2026, 9, 2) }, now)).toBe('October');
    expect(periodShortLabel({ unit: 'year', anchor: zdate(2025, 9, 2) }, now)).toBe('2025');
  });
});

describe('bucketing transactions', () => {
  const mk = (when: string, type: 'income' | 'expense', amount: number): Transaction => ({
    id: when + type, type, amount, currency: 'USD', categoryId: 'x', title: 't', timestampIso: when, fxSnapshot: { USD: 1, EGP: 50, SAR: 3.75 },
  });
  it('places transactions in the right UTC+2 hour and tracks the balance', () => {
    const txs = [mk(iso(2026, 10, 23, 12), 'income', 100), mk(iso(2026, 10, 24, 0, 0), 'expense', 10), mk(iso(2026, 10, 24, 13, 59), 'income', 5)];
    const w = getWindow({ unit: 'day', anchor: now });
    expect(bucketIndexFor(iso(2026, 10, 24, 13, 59), buildBuckets(w))).toBe(13);
    const s = cashFlowSeries(txs, w, 'USD');
    expect(s[0].expense).toBe(10);
    expect(s[13].income).toBe(5);
    expect(s[23].balance).toBe(95);
  });
});
