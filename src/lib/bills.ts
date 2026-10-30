// Pure helpers for the Računi tab; no Firebase imports so they can be unit tested.
import { fromDateKey } from './dates';
import type { Bill, BillMonth } from './types';

/** "2026-11" for a date key or Date. */
export function monthKey(date: string | Date): string {
  if (typeof date === 'string') return date.slice(0, 7);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
}

const MONTHS = [
  'Siječanj', 'Veljača', 'Ožujak', 'Travanj', 'Svibanj', 'Lipanj',
  'Srpanj', 'Kolovoz', 'Rujan', 'Listopad', 'Studeni', 'Prosinac',
];

/** "Studeni 2026." */
export function monthTitle(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}.`;
}

export const billMonthId = (billId: string, month: string) => `${billId}_${month}`;

/** Due date of a bill in the month, with day 31 moved to the month's last day. */
export function dueDateIn(bill: Bill, month: string): string | null {
  if (!bill.dueDay) return null;
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${month}-${String(Math.min(bill.dueDay, last)).padStart(2, '0')}`;
}

export type BillState = 'paid' | 'late' | 'open';

export interface BillRow {
  bill: Bill;
  /** Per-month document, if this month has its own amount or was paid. */
  monthDoc?: BillMonth;
  /** This month's amount, else the bill's usual amount. */
  amount?: number;
  /** True when the amount was set for this month only. */
  amountOverridden: boolean;
  paid: boolean;
  dueDate: string | null;
  state: BillState;
}

/** The amount that applies to a month: its own amount when set, otherwise the usual one. */
export function amountForMonth(bill: Bill, monthDoc: BillMonth | undefined): number | undefined {
  return monthDoc?.amount ?? bill.amount;
}

/**
 * Bills shown for a month: every monthly bill created by the end of that month
 * plus one-off bills of that month; unpaid first (by due day), then paid.
 */
export function billsForMonth(bills: Bill[], months: BillMonth[], month: string, today: string): BillRow[] {
  const [y, m] = month.split('-').map(Number);
  const monthEnd = new Date(y, m, 1).getTime();
  const rows = bills
    .filter((b) => (b.repeat === 'once' ? b.month === month : b.createdAt < monthEnd))
    .map((bill) => {
      const monthDoc = months.find((p) => p.billId === bill.id && p.month === month);
      const paid = Boolean(monthDoc?.paid);
      const dueDate = dueDateIn(bill, month);
      const state: BillState = paid ? 'paid' : dueDate && dueDate < today ? 'late' : 'open';
      return {
        bill,
        monthDoc,
        amount: amountForMonth(bill, monthDoc),
        amountOverridden: monthDoc?.amount !== undefined,
        paid,
        dueDate,
        state,
      };
    });
  const rank = (r: BillRow) => (r.state === 'paid' ? 1 : 0);
  return rows.sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') ||
      a.bill.name.localeCompare(b.bill.name, 'hr'),
  );
}

export interface MonthSummary {
  total: number;
  paid: number;
  remaining: number;
  paidCount: number;
  count: number;
  /** Paid amount per person (name), largest first. */
  byPerson: { name: string; amount: number; count: number }[];
}

/** Totals for the month, using each bill's amount for that month. */
export function monthSummary(rows: BillRow[]): MonthSummary {
  let total = 0;
  let paid = 0;
  const people = new Map<string, { amount: number; count: number }>();
  for (const r of rows) {
    const amount = r.amount ?? 0;
    total += amount;
    if (r.paid) {
      paid += amount;
      const who = r.monthDoc?.paidByName ?? '?';
      const p = people.get(who) ?? { amount: 0, count: 0 };
      p.amount += amount;
      p.count += 1;
      people.set(who, p);
    }
  }
  return {
    total,
    paid,
    remaining: total - paid,
    paidCount: rows.filter((r) => r.paid).length,
    count: rows.length,
    byPerson: [...people.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.amount - a.amount),
  };
}

/** "3.11." */
export function dayMonth(dateKey: string): string {
  const d = fromDateKey(dateKey);
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}

/** "12,50 €" */
export function money(n: number): string {
  return `${n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')} €`;
}

/** Accepts "12,5", "12.50" or "1.234,56"; NaN when not a number. */
export function parseAmount(text: string): number {
  const t = text.trim().replace(/\s|€/g, '');
  if (!t) return NaN;
  const normalized = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  return /^\d*\.?\d+$/.test(normalized) ? parseFloat(normalized) : NaN;
}
