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
