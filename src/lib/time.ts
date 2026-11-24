/**
 * All calendar math runs on a fixed UTC+2 clock (no daylight saving), whatever the device's own
 * time zone is. A "day" therefore always starts at 00:00 UTC+2.
 */
export const TZ_OFFSET_MIN = 120;
export const TZ_LABEL = 'UTC+2';
const OFF = TZ_OFFSET_MIN * 60_000;
export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface ZParts { y: number; m: number; d: number; h: number; min: number; dow: number }

const ms = (t: number | Date | string) => (typeof t === 'string' ? Date.parse(t) : +t);

/** Wall-clock fields of an instant on the UTC+2 clock (month is 0-based). */
export function zparts(t: number | Date | string): ZParts {
  const d = new Date(ms(t) + OFF);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), h: d.getUTCHours(), min: d.getUTCMinutes(), dow: d.getUTCDay() };
}

/** The instant of a UTC+2 wall-clock time. Out-of-range fields roll over (e.g. month 12 → next January). */
export function zdate(y: number, m: number, d = 1, h = 0, min = 0): Date {
  return new Date(Date.UTC(y, m, d, h, min) - OFF);
}

export const startOfZDay = (t: number | Date | string) => { const p = zparts(t); return zdate(p.y, p.m, p.d); };
export const startOfZMonth = (t: number | Date | string) => { const p = zparts(t); return zdate(p.y, p.m, 1); };
export const startOfZYear = (t: number | Date | string) => zdate(zparts(t).y, 0, 1);
export const addZDays = (t: number | Date, n: number) => new Date(ms(t) + n * DAY_MS);
/** Moves a month start by n months (only meaningful for month starts). */
export const addZMonths = (t: number | Date, n: number) => { const p = zparts(t); return zdate(p.y, p.m + n, 1); };
export const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
export const daysInZMonthOf = (t: number | Date | string) => { const p = zparts(t); return daysInMonth(p.y, p.m); };

const pad = (n: number) => String(n).padStart(2, '0');
export const dayKey = (t: number | Date | string) => { const p = zparts(t); return `${p.y}-${pad(p.m + 1)}-${pad(p.d)}`; };
export const monthKeyZ = (t: number | Date | string) => { const p = zparts(t); return `${p.y}-${pad(p.m + 1)}`; };
export function parseDayKey(k: string): Date { const [y, m, d] = k.split('-').map(Number); return zdate(y, m - 1, d); }

/** Formatting on the UTC+2 clock. */
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

/** Value for <input type="datetime-local">, on the UTC+2 clock. */
export function toInputValue(t: number | Date | string): string {
  const p = zparts(t);
  return `${p.y}-${pad(p.m + 1)}-${pad(p.d)}T${pad(p.h)}:${pad(p.min)}`;
}

/** Reads a datetime-local value as UTC+2 wall time. Returns null for anything unparseable. */
export function fromInputValue(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(s);
  if (!m) return null;
  return zdate(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
}
