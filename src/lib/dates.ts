import type { DateKey } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): DateKey {
  return toDateKey(new Date());
}

export function addDays(key: DateKey, days: number): DateKey {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

export function daysBetween(a: DateKey, b: DateKey): number {
  return Math.round((fromDateKey(b).getTime() - fromDateKey(a).getTime()) / 86_400_000);
}

/** Inclusive list of date keys from start to end. */
export function dateRange(start: DateKey, end: DateKey): DateKey[] {
  const out: DateKey[] = [];
  for (let k = start; k <= end; k = addDays(k, 1)) out.push(k);
  return out;
}

/** Monday of the week containing the date. */
export function startOfWeek(key: DateKey): DateKey {
  const d = fromDateKey(key);
  const offset = (d.getDay() + 6) % 7;
  return addDays(key, -offset);
}

export function startOfMonth(key: DateKey): DateKey {
  return key.slice(0, 8) + '01';
}

export function endOfMonth(key: DateKey): DateKey {
  const d = fromDateKey(startOfMonth(key));
  return toDateKey(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export function addMonths(key: DateKey, months: number): DateKey {
  const d = fromDateKey(startOfMonth(key));
  return toDateKey(new Date(d.getFullYear(), d.getMonth() + months, 1));
}

const WEEKDAYS = ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub'];
const MONTHS = [
  'siječanj', 'veljača', 'ožujak', 'travanj', 'svibanj', 'lipanj',
  'srpanj', 'kolovoz', 'rujan', 'listopad', 'studeni', 'prosinac',
];

export function weekdayShort(key: DateKey): string {
  return WEEKDAYS[fromDateKey(key).getDay()];
}

export function monthName(key: DateKey): string {
  return MONTHS[fromDateKey(key).getMonth()];
}

/** "17.10." */
export function shortDate(key: DateKey): string {
  const d = fromDateKey(key);
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}

/** "Danas", "Jučer", or "Pet 17.10.2026." */
export function friendlyDate(key: DateKey): string {
  const today = todayKey();
  if (key === today) return 'Danas';
  if (key === addDays(today, -1)) return 'Jučer';
  if (key === addDays(today, 1)) return 'Sutra';
  return `${weekdayShort(key)} ${shortDate(key)}${fromDateKey(key).getFullYear()}.`;
}
