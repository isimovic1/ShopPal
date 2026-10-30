import { normalizeName } from './household';
import type { HistoryEntry, Item } from './types';

const DAY = 86_400_000;

/** Purchases kept per product; enough for a stable average interval. */
export const MAX_PURCHASES = 10;

/** A product counts as due a little before its average interval is over. */
export const DUE_FACTOR = 0.9;

/** Two checks within this window are one shopping trip, not two purchases. */
const SAME_TRIP = 6 * 3600_000;

/** Appends a purchase time, merging repeated check-offs from the same trip. */
export function recordPurchase(purchases: number[], at: number): number[] {
  const last = purchases[purchases.length - 1];
  if (last !== undefined && at - last < SAME_TRIP) return purchases;
  return [...purchases, at].slice(-MAX_PURCHASES);
}

/** Average days between purchases, or null with fewer than two. */
export function averageIntervalDays(purchases: number[]): number | null {
  if (purchases.length < 2) return null;
  const sorted = [...purchases].sort((a, b) => a - b);
  return (sorted[sorted.length - 1] - sorted[0]) / (sorted.length - 1) / DAY;
}

export interface Suggestion {
  entry: HistoryEntry;
  intervalDays: number;
  daysSince: number;
  /** daysSince / intervalDays; 1 = exactly due, higher = more overdue. */
  overdue: number;
}

function onList(items: Item[], key: string): boolean {
  return items.some((i) => !i.done && normalizeName(i.name) === key);
}

/** Products that are due again by their usual rhythm and not already on the list, most overdue first. */
export function dueSuggestions(history: HistoryEntry[], items: Item[], now: number): Suggestion[] {
  const out: Suggestion[] = [];
  for (const entry of history) {
    const intervalDays = averageIntervalDays(entry.purchases);
    if (intervalDays === null || intervalDays <= 0) continue;
    const daysSince = (now - entry.lastBought) / DAY;
    const overdue = daysSince / intervalDays;
    if (overdue >= DUE_FACTOR && !onList(items, normalizeName(entry.name))) {
      out.push({ entry, intervalDays, daysSince, overdue });
    }
  }
  return out.sort((a, b) => b.overdue - a.overdue);
}

/** Most often bought products not already on the list, for quick-add chips. */
export function frequentItems(history: HistoryEntry[], items: Item[], limit = 12): HistoryEntry[] {
  return history
    .filter((h) => !onList(items, normalizeName(h.name)))
    .sort((a, b) => b.count - a.count || b.lastBought - a.lastBought)
    .slice(0, limit);
}

/** "svakih 5 dana", "svaki dan", "svakih 2 tjedna". */
export function intervalLabel(days: number): string {
  const d = Math.max(1, Math.round(days));
  if (d === 1) return 'svaki dan';
  if (d >= 14 && d % 7 === 0) return `svakih ${d / 7} tjedna`;
  return `svakih ${d} dana`;
}
