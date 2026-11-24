import {
  addDays, addHours, addMonths, addQuarters, differenceInCalendarDays, differenceInCalendarMonths,
  format, startOfDay, startOfMonth, startOfQuarter,
} from 'date-fns';
import type { TimeRange, Transaction } from '../types/finance';

export type BucketUnit = 'hour' | 'day' | 'month' | 'quarter';

/** A half-open window [start, end). */
export interface TimeWindow {
  start: Date;
  end: Date;
  unit: BucketUnit;
  count: number;
}

export interface Bucket {
  start: Date;
  end: Date;
  label: string;
}

function stepFor(unit: BucketUnit) {
  switch (unit) {
    case 'hour': return (d: Date, n: number) => addHours(d, n);
    case 'day': return (d: Date, n: number) => addDays(d, n);
    case 'month': return (d: Date, n: number) => addMonths(d, n);
    case 'quarter': return (d: Date, n: number) => addQuarters(d, n);
  }
}

export function earliestTimestamp(transactions: Transaction[]): Date | null {
  let min = Infinity;
  for (const t of transactions) {
    const v = Date.parse(t.timestampIso);
    if (v < min) min = v;
  }
  return Number.isFinite(min) ? new Date(min) : null;
}

export function getWindow(range: TimeRange, now: Date, earliest: Date | null = null): TimeWindow {
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  switch (range) {
    case '1D': return { start: today, end: tomorrow, unit: 'hour', count: 24 };
    case '5D': return { start: addDays(today, -4), end: tomorrow, unit: 'day', count: 5 };
    case '1M': return { start: addDays(today, -29), end: tomorrow, unit: 'day', count: 30 };
    case '1Y': {
      const start = addMonths(startOfMonth(now), -11);
      return { start, end: addMonths(startOfMonth(now), 1), unit: 'month', count: 12 };
    }
    case 'ALL': {
      if (!earliest || earliest > now) return { start: addDays(today, -29), end: tomorrow, unit: 'day', count: 30 };
      const first = startOfDay(earliest);
      const days = differenceInCalendarDays(today, first) + 1;
      if (days <= 45) return { start: first, end: tomorrow, unit: 'day', count: days };
      const months = differenceInCalendarMonths(now, first) + 1;
      if (months <= 24) return { start: startOfMonth(first), end: addMonths(startOfMonth(now), 1), unit: 'month', count: months };
      const qStart = startOfQuarter(first);
      const lastQ = startOfQuarter(now);
      const quarters = Math.round(differenceInCalendarMonths(lastQ, qStart) / 3) + 1;
      return { start: qStart, end: addQuarters(qStart, quarters), unit: 'quarter', count: quarters };
    }
  }
}

/** The immediately preceding window of equal length. Returns null for ALL. */
export function getPreviousWindow(range: TimeRange, w: TimeWindow): TimeWindow | null {
  if (range === 'ALL') return null;
  const step = stepFor(w.unit);
  return { ...w, start: step(w.start, -w.count), end: w.start };
}

export function bucketLabel(d: Date, unit: BucketUnit): string {
  switch (unit) {
    case 'hour': return format(d, 'HH:mm');
    case 'day': return format(d, 'MMM d');
    case 'month': return format(d, 'MMM yyyy');
    case 'quarter': return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
  }
}

export function buildBuckets(w: TimeWindow): Bucket[] {
  const step = stepFor(w.unit);
  const out: Bucket[] = [];
  for (let i = 0; i < w.count; i++) {
    const start = step(w.start, i);
    out.push({ start, end: step(w.start, i + 1), label: bucketLabel(start, w.unit) });
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

export const RANGE_LABEL: Record<TimeRange, string> = {
  '1D': 'Today', '5D': 'Last 5 days', '1M': 'Last 30 days', '1Y': 'Last 12 months', ALL: 'All time',
};
export const PREV_LABEL: Record<TimeRange, string> = {
  '1D': 'vs yesterday', '5D': 'vs prior 5 days', '1M': 'vs prior 30 days', '1Y': 'vs prior 12 months', ALL: '',
};
