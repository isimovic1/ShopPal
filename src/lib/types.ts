/** ISO date without time, e.g. "2026-10-17". */
export type DateKey = string;

export interface Household {
  code: string;
  name: string;
  /** uid → display name. */
  members: Record<string, string>;
  createdAt: number;
  /** Set while someone is in the shop, so the other one sees it. */
  shopping?: { uid: string; name: string; since: number } | null;
}

export interface ShoppingList {
  id: string;
  name: string;
  icon?: string;
  order: number;
  createdAt: number;
}

export interface Item {
  id: string;
  listId: string;
  name: string;
  note?: string;
  category: string;
  done: boolean;
  addedBy: string;
  addedByName: string;
  addedAt: number;
  doneBy?: string;
  doneByName?: string;
  doneAt?: number;
}

/** Purchase history of one product, keyed by its normalized name. */
export interface HistoryEntry {
  key: string;
  name: string;
  category: string;
  count: number;
  lastBought: number;
  /** Most recent purchase times (ms), oldest first, capped at MAX_PURCHASES. */
  purchases: number[];
}

/** A household bill; "monthly" ones show up every month, "once" only in `month`. */
export interface Bill {
  id: string;
  name: string;
  /** Usual amount, used for any month without its own amount. */
  amount?: number;
  /** Day of the month it is due (1–31); clamped to the month's last day. */
  dueDay?: number;
  repeat: 'monthly' | 'once';
  /** YYYY-MM, only for one-off bills. */
  month?: string;
  note?: string;
  createdBy: string;
  createdAt: number;
}

/**
 * One month of a bill (document id `${billId}_${month}`): that month's own
 * amount (electricity differs every month) and whether and by whom it was paid.
 */
export interface BillMonth {
  id: string;
  billId: string;
  month: string;
  /** This month's amount; falls back to the bill's usual amount when missing. */
  amount?: number;
  paid?: boolean;
  paidBy?: string;
  paidByName?: string;
  paidAt?: number;
}

export type TaskRepeat = 'none' | 'daily' | 'weekly' | 'monthly';

/** A house chore or to-do. */
export interface Task {
  id: string;
  title: string;
  note?: string;
  /** uid, or null for "Bilo tko". */
  assignedTo: string | null;
  repeat: TaskRepeat;
  dueDate?: DateKey;
  done: boolean;
  doneBy?: string;
  doneByName?: string;
  doneAt?: number;
  lastDoneBy?: string;
  lastDoneByName?: string;
  lastDoneAt?: number;
  createdBy: string;
  createdAt: number;
}

/** A meal idea to cook some day, optionally with a recipe link (Instagram, TikTok…). */
export interface Meal {
  id: string;
  title: string;
  link?: string;
  /** One ingredient per line. */
  ingredients?: string;
  note?: string;
  addedBy: string;
  addedByName: string;
  createdAt: number;
  lastCooked?: number;
  cookedCount: number;
}
