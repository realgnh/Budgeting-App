import type { Currency } from '../types/finance';

const cache = new Map<string, Intl.NumberFormat>();
function nf(min: number, max: number): Intl.NumberFormat {
  const k = `${min}-${max}`;
  let f = cache.get(k);
  if (!f) { f = new Intl.NumberFormat('en-US', { minimumFractionDigits: min, maximumFractionDigits: max }); cache.set(k, f); }
  return f;
}

export function formatNumber(v: number, decimals = 2): string {
  return nf(decimals, decimals).format(Number.isFinite(v) ? v : 0);
}

/** "SAR 1,234.50". Negative values get a true minus sign. */
export function formatMoney(v: number, currency: Currency, decimals = 2): string {
  const s = formatNumber(Math.abs(v), decimals);
  return `${v < 0 ? '−' : ''}${currency} ${s}`;
}

export function formatCompact(v: number): string {
  const a = Math.abs(v), sign = v < 0 ? '−' : '';
  if (a >= 1e6) return `${sign}${nf(1, 1).format(a / 1e6)}M`;
  if (a >= 1e4) return `${sign}${nf(0, 0).format(a / 1e3)}k`;
  if (a >= 1e3) return `${sign}${nf(1, 1).format(a / 1e3)}k`;
  return `${sign}${nf(0, 0).format(a)}`;
}

export function formatPct(v: number, decimals = 0): string {
  if (!Number.isFinite(v)) return '—';
  return `${nf(decimals, decimals).format(v)}%`;
}
