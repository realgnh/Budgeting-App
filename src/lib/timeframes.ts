import type { PeriodUnit, Transaction } from '../types/finance';
import {
  DAY_MS, HOUR_MS, addZDays, addZMonths, dayKey, daysInZMonthOf, fmt, monthKeyZ, startOfZDay, startOfZMonth, startOfZYear, zdate, zparts,
} from './time';

export type BucketUnit = 'hour' | 'day' | 'month';

/** A selected stretch of the calendar: the day, month or year that contains `anchor` (UTC+2). */
export interface Period { unit: PeriodUnit; anchor: Date }

/** A half-open window [start, end). */
export interface TimeWindow { start: Date; end: Date; unit: BucketUnit; count: number }

export interface Bucket { start: Date; end: Date; label: string }

export function earliestTimestamp(transactions: Transaction[]): Date | null {
  let min = Infinity;
  for (const t of transactions) {
    const v = Date.parse(t.timestampIso);
    if (v < min) min = v;
  }
  return Number.isFinite(min) ? new Date(min) : null;
}

/** Day → 24 hourly buckets; month → one bucket per day; year → 12 monthly buckets. */
export function getWindow(p: Period): TimeWindow {
  switch (p.unit) {
    case 'day': { const start = startOfZDay(p.anchor); return { start, end: addZDays(start, 1), unit: 'hour', count: 24 }; }
    case 'month': { const start = startOfZMonth(p.anchor); return { start, end: addZMonths(start, 1), unit: 'day', count: daysInZMonthOf(start) }; }
    case 'year': { const start = startOfZYear(p.anchor); return { start, end: zdate(zparts(start).y + 1, 0, 1), unit: 'month', count: 12 }; }
  }
}

/** The same kind of period, n steps away (n = -1 is the previous day / month / year). */
export function shiftPeriod(p: Period, n: number): Period {
  const w = getWindow(p);
  if (p.unit === 'day') return { unit: 'day', anchor: addZDays(w.start, n) };
  if (p.unit === 'month') return { unit: 'month', anchor: addZMonths(w.start, n) };
  return { unit: 'year', anchor: zdate(zparts(w.start).y + n, 0, 1) };
}

export const getPreviousWindow = (p: Period): TimeWindow => getWindow(shiftPeriod(p, -1));

export function isCurrentPeriod(p: Period, now: Date): boolean {
  if (p.unit === 'day') return dayKey(p.anchor) === dayKey(now);
  if (p.unit === 'month') return monthKeyZ(p.anchor) === monthKeyZ(now);
  return zparts(p.anchor).y === zparts(now).y;
}

export function bucketLabel(d: Date, unit: BucketUnit): string {
  if (unit === 'hour') return fmt.hour(d);
  if (unit === 'day') return fmt.dayShort(d);
  return fmt.monthShort(d);
}

export function buildBuckets(w: TimeWindow): Bucket[] {
  const out: Bucket[] = [];
  for (let i = 0; i < w.count; i++) {
    const start = w.unit === 'hour' ? new Date(+w.start + i * HOUR_MS) : w.unit === 'day' ? new Date(+w.start + i * DAY_MS) : addZMonths(w.start, i);
    const end = w.unit === 'hour' ? new Date(+start + HOUR_MS) : w.unit === 'day' ? new Date(+start + DAY_MS) : addZMonths(start, 1);
    out.push({ start, end, label: bucketLabel(start, w.unit) });
  }
  return out;
}

export function isInWindow(iso: string, w: Pick<TimeWindow, 'start' | 'end'>): boolean {
  const t = Date.parse(iso);
  return t >= w.start.getTime() && t < w.end.getTime();
}

/** Index of the bucket containing the timestamp, or -1. Buckets must be contiguous and ordered. */
export function bucketIndexFor(iso: string, buckets: Bucket[]): number {
  const t = Date.parse(iso);
  let lo = 0, hi = buckets.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const b = buckets[mid];
    if (t < b.start.getTime()) hi = mid - 1;
    else if (t >= b.end.getTime()) lo = mid + 1;
    else return mid;
  }
  return -1;
}

/** "Tuesday, November 24, 2026" · "November 2026" · "2026" */
export function periodTitle(p: Period): string {
  if (p.unit === 'day') return fmt.dayLong(p.anchor);
  if (p.unit === 'month') return fmt.monthYear(p.anchor);
  return String(zparts(p.anchor).y);
}

/** Short name used inside labels: "today", "Nov 23", "this month", "October", "this year", "2025". */
export function periodShortLabel(p: Period, now: Date): string {
  const current = isCurrentPeriod(p, now);
  if (p.unit === 'day') return current ? 'today' : dayKey(p.anchor) === dayKey(addZDays(now, -1)) ? 'yesterday' : fmt.dayShort(p.anchor);
  if (p.unit === 'month') return current ? 'this month' : zparts(p.anchor).y === zparts(now).y ? fmt.month(p.anchor) : fmt.monthYearShort(p.anchor);
  return current ? 'this year' : String(zparts(p.anchor).y);
}

export const PREV_LABEL: Record<PeriodUnit, string> = { day: 'vs the day before', month: 'vs the month before', year: 'vs the year before' };
export const UNIT_NOUN: Record<PeriodUnit, string> = { day: 'day', month: 'month', year: 'year' };
