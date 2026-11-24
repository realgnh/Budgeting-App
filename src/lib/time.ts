/**
 * All calendar math runs on Cairo time (Africa/Cairo: UTC+2, or UTC+3 during Egypt's summer daylight
 * saving), whatever the device's own time zone is. A "day" always starts at 00:00 Cairo time.
 */
export const TIME_ZONE = 'Africa/Cairo';
export const TZ_LABEL = 'Cairo time';
export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;

const partsFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', weekday: 'short',
});
const DOW: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Cairo's offset from UTC at an instant, in ms (2 or 3 hours). */
export function cairoOffsetMs(t: number): number {
  const p = zparts(t);
  return Date.UTC(p.y, p.m, p.d, p.h, p.min) - Math.floor(t / 60_000) * 60_000;
}

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface ZParts { y: number; m: number; d: number; h: number; min: number; dow: number }

const ms = (t: number | Date | string) => (typeof t === 'string' ? Date.parse(t) : +t);

/** Wall-clock fields of an instant in Cairo (month is 0-based). */
export function zparts(t: number | Date | string): ZParts {
  const out: Record<string, string> = {};
  for (const { type, value } of partsFmt.formatToParts(new Date(ms(t)))) out[type] = value;
  return { y: +out.year, m: +out.month - 1, d: +out.day, h: +out.hour, min: +out.minute, dow: DOW[out.weekday] ?? 0 };
}

/**
 * The instant of a Cairo wall-clock time. Out-of-range fields roll over (e.g. month 12 → next January).
 * A time skipped by the spring clock change resolves to the moment the clocks jump to.
 */
export function zdate(y: number, m: number, d = 1, h = 0, min = 0): Date {
  const wall = Date.UTC(y, m, d, h, min);
  let t = wall - cairoOffsetMs(wall - 2 * HOUR_MS);
  t = wall - cairoOffsetMs(t);
  return new Date(t);
}

export const startOfZDay = (t: number | Date | string) => { const p = zparts(t); return zdate(p.y, p.m, p.d); };
export const startOfZMonth = (t: number | Date | string) => { const p = zparts(t); return zdate(p.y, p.m, 1); };
export const startOfZYear = (t: number | Date | string) => zdate(zparts(t).y, 0, 1);
/** Same wall-clock time n calendar days later (days can be 23 or 25 hours around clock changes). */
export const addZDays = (t: number | Date, n: number) => { const p = zparts(t); return zdate(p.y, p.m, p.d + n, p.h, p.min); };
/** Moves a month start by n months (only meaningful for month starts). */
export const addZMonths = (t: number | Date, n: number) => { const p = zparts(t); return zdate(p.y, p.m + n, 1); };
export const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
export const daysInZMonthOf = (t: number | Date | string) => { const p = zparts(t); return daysInMonth(p.y, p.m); };

const pad = (n: number) => String(n).padStart(2, '0');
export const dayKey = (t: number | Date | string) => { const p = zparts(t); return `${p.y}-${pad(p.m + 1)}-${pad(p.d)}`; };
export const monthKeyZ = (t: number | Date | string) => { const p = zparts(t); return `${p.y}-${pad(p.m + 1)}`; };
export function parseDayKey(k: string): Date { const [y, m, d] = k.split('-').map(Number); return zdate(y, m - 1, d); }

/** Formatting on Cairo time. */
export const fmt = {
  time: (t: number | Date | string) => { const p = zparts(t); return `${pad(p.h)}:${pad(p.min)}`; },
  hour: (t: number | Date | string) => `${pad(zparts(t).h)}:00`,
  dayShort: (t: number | Date | string) => { const p = zparts(t); return `${MONTHS_SHORT[p.m]} ${p.d}`; },
  date: (t: number | Date | string) => { const p = zparts(t); return `${MONTHS_SHORT[p.m]} ${p.d}, ${p.y}`; },
  dayLong: (t: number | Date | string) => { const p = zparts(t); return `${WEEKDAYS[p.dow]}, ${MONTHS[p.m]} ${p.d}, ${p.y}`; },
  weekdayShort: (t: number | Date | string) => WEEKDAYS[zparts(t).dow].slice(0, 3),
  month: (t: number | Date | string) => MONTHS[zparts(t).m],
  monthShort: (t: number | Date | string) => MONTHS_SHORT[zparts(t).m],
  monthYear: (t: number | Date | string) => { const p = zparts(t); return `${MONTHS[p.m]} ${p.y}`; },
  monthYearShort: (t: number | Date | string) => { const p = zparts(t); return `${MONTHS_SHORT[p.m]} ${p.y}`; },
  dateTime: (t: number | Date | string) => `${fmt.date(t)} · ${fmt.time(t)}`,
  shortDateTime: (t: number | Date | string) => `${fmt.dayShort(t)}, ${fmt.time(t)}`,
};

/** Value for <input type="datetime-local">, in Cairo time. */
export function toInputValue(t: number | Date | string): string {
  const p = zparts(t);
  return `${p.y}-${pad(p.m + 1)}-${pad(p.d)}T${pad(p.h)}:${pad(p.min)}`;
}

/** Reads a datetime-local value as Cairo wall time. Returns null for anything unparseable. */
export function fromInputValue(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(s);
  if (!m) return null;
  return zdate(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
}
