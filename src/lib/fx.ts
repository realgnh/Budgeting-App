import type { Currency, FxCache, FxRates, MoneyLimit, Transaction } from '../types/finance';

export const FX_ENDPOINT = 'https://open.er-api.com/v6/latest/USD';
export const FALLBACK_RATES: FxRates = { USD: 1, EGP: 50.0, SAR: 3.75 };
export const FX_STALE_MS = 6 * 60 * 60 * 1000;

export function convertCurrency(amount: number, from: Currency, to: Currency, rates: FxRates): number {
  if (from === to) return amount;
  return amount * (rates[to] / rates[from]);
}

/** Converts a transaction to the base currency using its own snapshot, never live rates. */
export function transactionToBase(tx: Transaction, base: Currency): number {
  return convertCurrency(tx.amount, tx.currency, base, tx.fxSnapshot);
}

/** Budget limits are converted with the current cached rates. */
export function limitToBase(limit: MoneyLimit, base: Currency, rates: FxRates): number {
  return convertCurrency(limit.amount, limit.currency, base, rates);
}

export function isFxStale(cache: FxCache | null | undefined, now: Date = new Date()): boolean {
  if (!cache || !cache.lastUpdatedIso) return true;
  const t = Date.parse(cache.lastUpdatedIso);
  if (Number.isNaN(t)) return true;
  return now.getTime() - t > FX_STALE_MS;
}

export function parseRatesResponse(json: unknown): FxRates {
  const rates = (json as { rates?: Record<string, unknown> } | null)?.rates;
  const egp = rates?.EGP;
  const sar = rates?.SAR;
  if (typeof egp !== 'number' || typeof sar !== 'number' || !(egp > 0) || !(sar > 0)) {
    throw new Error('Rate response is missing EGP or SAR');
  }
  return { USD: 1, EGP: egp, SAR: sar };
}

export async function fetchLiveRates(fetchImpl: typeof fetch = fetch): Promise<FxRates> {
  const res = await fetchImpl(FX_ENDPOINT);
  if (!res.ok) throw new Error(`Rate request failed with HTTP ${res.status}`);
  return parseRatesResponse(await res.json());
}

/**
 * Decides the next cache after a refresh attempt. On failure, keeps cached live rates;
 * only falls back to static defaults when no live rates were ever cached.
 */
export function nextFxCache(prev: FxCache | null, result: { ok: true; rates: FxRates } | { ok: false }, now: Date = new Date()): FxCache {
  if (result.ok) return { rates: result.rates, lastUpdatedIso: now.toISOString(), source: 'live' };
  if (prev && prev.source === 'live') return prev;
  return { rates: { ...FALLBACK_RATES }, lastUpdatedIso: prev?.lastUpdatedIso ?? '', source: 'fallback' };
}
