import { describe, expect, it } from 'vitest';
import { FALLBACK_RATES, convertCurrency, isFxStale, limitToBase, nextFxCache, parseRatesResponse, transactionToBase } from '../lib/fx';
import type { FxRates, Transaction } from '../types/finance';

const rates: FxRates = { USD: 1, EGP: 50, SAR: 3.75 };

describe('convertCurrency', () => {
  it('returns the same amount for identical currencies', () => {
    expect(convertCurrency(123.45, 'EGP', 'EGP', rates)).toBe(123.45);
  });
  it('converts USD to EGP and SAR', () => {
    expect(convertCurrency(10, 'USD', 'EGP', rates)).toBeCloseTo(500);
    expect(convertCurrency(10, 'USD', 'SAR', rates)).toBeCloseTo(37.5);
  });
  it('converts EGP and SAR to USD', () => {
    expect(convertCurrency(500, 'EGP', 'USD', rates)).toBeCloseTo(10);
    expect(convertCurrency(37.5, 'SAR', 'USD', rates)).toBeCloseTo(10);
  });
  it('converts EGP <-> SAR through USD cross rates', () => {
    expect(convertCurrency(3.75, 'SAR', 'EGP', rates)).toBeCloseTo(50);
    expect(convertCurrency(50, 'EGP', 'SAR', rates)).toBeCloseTo(3.75);
  });
  it('round-trips every pair without drift', () => {
    const cs = ['EGP', 'SAR', 'USD'] as const;
    for (const a of cs) for (const b of cs) {
      expect(convertCurrency(convertCurrency(987.65, a, b, rates), b, a, rates)).toBeCloseTo(987.65, 8);
    }
  });
});

describe('historical FX snapshots', () => {
  const tx: Transaction = {
    id: 't1', type: 'expense', amount: 1000, currency: 'EGP', categoryId: 'food', title: 'Dinner',
    timestampIso: '2026-01-10T19:00:00.000Z', fxSnapshot: { USD: 1, EGP: 47, SAR: 3.75 },
  };
  it('converts with the snapshot captured at creation', () => {
    expect(transactionToBase(tx, 'USD')).toBeCloseTo(1000 / 47);
    expect(transactionToBase(tx, 'SAR')).toBeCloseTo((1000 * 3.75) / 47);
  });
  it('does not change when live rates move', () => {
    const before = transactionToBase(tx, 'SAR');
    const liveRatesNow: FxRates = { USD: 1, EGP: 55, SAR: 3.8 };
    // Live rates are deliberately unused by transactionToBase.
    expect(convertCurrency(1000, 'EGP', 'SAR', liveRatesNow)).not.toBeCloseTo(before);
    expect(transactionToBase(tx, 'SAR')).toBe(before);
    expect(tx.fxSnapshot).toEqual({ USD: 1, EGP: 47, SAR: 3.75 });
  });
  it('converts budget limits with current rates', () => {
    expect(limitToBase({ amount: 100, currency: 'USD' }, 'EGP', rates)).toBeCloseTo(5000);
  });
});

describe('rate cache', () => {
  const now = new Date('2026-11-24T12:00:00Z');
  it('treats missing or old caches as stale', () => {
    expect(isFxStale(null, now)).toBe(true);
    expect(isFxStale({ rates, lastUpdatedIso: '', source: 'fallback' }, now)).toBe(true);
    expect(isFxStale({ rates, lastUpdatedIso: '2026-11-24T05:59:00Z', source: 'live' }, now)).toBe(true);
    expect(isFxStale({ rates, lastUpdatedIso: '2026-11-24T07:00:00Z', source: 'live' }, now)).toBe(false);
  });
  it('parses the open.er-api response', () => {
    expect(parseRatesResponse({ result: 'success', rates: { USD: 1, EGP: 48.6, SAR: 3.75, EUR: 0.9 } })).toEqual({ USD: 1, EGP: 48.6, SAR: 3.75 });
    expect(() => parseRatesResponse({ rates: { EGP: 48 } })).toThrow();
  });
  it('keeps cached live rates on failure and falls back only when none exist', () => {
    const live = { rates: { USD: 1 as const, EGP: 48, SAR: 3.75 }, lastUpdatedIso: '2026-11-20T00:00:00Z', source: 'live' as const };
    expect(nextFxCache(live, { ok: false }, now)).toBe(live);
    const fb = nextFxCache(null, { ok: false }, now);
    expect(fb.source).toBe('fallback');
    expect(fb.rates).toEqual(FALLBACK_RATES);
    const ok = nextFxCache(fb, { ok: true, rates: { USD: 1, EGP: 49, SAR: 3.75 } }, now);
    expect(ok).toEqual({ rates: { USD: 1, EGP: 49, SAR: 3.75 }, lastUpdatedIso: now.toISOString(), source: 'live' });
  });
});
