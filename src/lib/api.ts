import {
  addDoc, collection, deleteDoc, deleteField, doc, getDoc, getDocs, query, runTransaction, setDoc, updateDoc, where,
  writeBatch,
} from 'firebase/firestore';

import { billMonthId } from './bills';
import { firestore } from './firebase';
import { cleanCode, generateCode, guessCategory, historyKey } from './household';
import { recordPurchase } from './suggestions';
import { nextDueDate } from './tasks';
import type { Bill, HistoryEntry, Item, Meal, Task } from './types';

// Firestore layout (see README):
// households/{code}                      name, members {uid: name}, createdAt, shopping
// households/{code}/lists/{listId}       name, order, createdAt
// households/{code}/items/{itemId}       listId, name, note, category, done, added…/done…
// households/{code}/history/{key}        purchase history used for suggestions
// households/{code}/bills/{billId}       monthly or one-off bills
// households/{code}/billMonths/{billId}_{YYYY-MM}   a month's own amount and who paid it
// households/{code}/tasks/{taskId}       house chores, optionally repeating
// households/{code}/meals/{mealId}       meal ideas with an optional recipe link

export const householdRef = (code: string) => doc(firestore(), 'households', code);
export const listsCol = (code: string) => collection(firestore(), 'households', code, 'lists');
export const itemsCol = (code: string) => collection(firestore(), 'households', code, 'items');
export const historyCol = (code: string) => collection(firestore(), 'households', code, 'history');
export const billsCol = (code: string) => collection(firestore(), 'households', code, 'bills');
export const billMonthsCol = (code: string) => collection(firestore(), 'households', code, 'billMonths');
export const tasksCol = (code: string) => collection(firestore(), 'households', code, 'tasks');
export const mealsCol = (code: string) => collection(firestore(), 'households', code, 'meals');

/** For updates: an emptied optional field (undefined) is removed rather than kept. */
function withDeletes<T extends object>(patch: T) {
  return Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, v === undefined ? deleteField() : v]));
}

export interface Me {
  uid: string;
  name: string;
}

/** Creates a household with a fresh code and a first list; returns the code. */
export async function createHousehold(me: Me): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const ref = householdRef(code);
    if ((await getDoc(ref)).exists()) continue;
    await setDoc(ref, { name: 'Naše kućanstvo', members: { [me.uid]: me.name }, createdAt: Date.now(), shopping: null });
    await addDoc(listsCol(code), { name: 'Namirnice', order: 0, createdAt: Date.now() });
    return code;
  }
  throw new Error('Nije uspjelo napraviti jedinstveni kod. Pokušaj ponovo.');
}

/** Adds me to an existing household. Throws a readable error when the code is unknown. */
export async function joinHousehold(rawCode: string, me: Me): Promise<string> {
  const code = cleanCode(rawCode);
  const snap = await getDoc(householdRef(code));
  if (!snap.exists()) throw new Error(`Kućanstvo s kodom ${code} ne postoji. Provjeri kod.`);
  await updateDoc(householdRef(code), { [`members.${me.uid}`]: me.name });
  return code;
}

export function leaveHousehold(code: string, uid: string) {
  return updateDoc(householdRef(code), { [`members.${uid}`]: deleteField(), shopping: null });
}

export function renameMember(code: string, me: Me) {
  return updateDoc(householdRef(code), { [`members.${me.uid}`]: me.name });
}

export function renameHousehold(code: string, name: string) {
  return updateDoc(householdRef(code), { name });
}

export function setShopping(code: string, me: Me | null) {
  return updateDoc(householdRef(code), { shopping: me ? { uid: me.uid, name: me.name, since: Date.now() } : null });
}

export function addList(code: string, name: string, order: number) {
  return addDoc(listsCol(code), { name, order, createdAt: Date.now() });
}

export function renameList(code: string, listId: string, name: string) {
  return updateDoc(doc(listsCol(code), listId), { name });
}

/** Deletes a list together with its items. */
export async function deleteList(code: string, listId: string) {
  const items = await getDocs(query(itemsCol(code), where('listId', '==', listId)));
  const batch = writeBatch(firestore());
  items.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(listsCol(code), listId));
  await batch.commit();
}

export function addItem(code: string, listId: string, name: string, me: Me, category: string = guessCategory(name)) {
  return addDoc(itemsCol(code), {
    listId,
    name: name.trim(),
    category,
    done: false,
    addedBy: me.uid,
    addedByName: me.name,
    addedAt: Date.now(),
  });
}

export function updateItem(code: string, itemId: string, patch: Partial<Pick<Item, 'name' | 'note' | 'category' | 'listId'>>) {
  return updateDoc(doc(itemsCol(code), itemId), patch);
}

export function deleteItem(code: string, itemId: string) {
  return deleteDoc(doc(itemsCol(code), itemId));
}

/**
 * Checks an item off (and records the purchase for suggestions) or puts it back.
 * Un-checking does not undo the history entry; a mis-tap only adds one data point.
 */
export async function setItemDone(code: string, item: Item, done: boolean, me: Me) {
  const itemRef = doc(itemsCol(code), item.id);
  if (!done) {
    await updateDoc(itemRef, { done: false, doneBy: deleteField(), doneByName: deleteField(), doneAt: deleteField() });
    return;
  }
  const now = Date.now();
  const histRef = doc(historyCol(code), historyKey(item.name));
  await runTransaction(firestore(), async (tx) => {
    const prev = (await tx.get(histRef)).data() as Omit<HistoryEntry, 'key'> | undefined;
    const before = prev?.purchases ?? [];
    const purchases = recordPurchase(before, now);
    // recordPurchase returns the same array when this check-off belongs to the same trip.
    const newTrip = purchases !== before;
    tx.set(histRef, {
      name: item.name,
      category: item.category,
      count: (prev?.count ?? 0) + (newTrip ? 1 : 0),
      lastBought: now,
      purchases,
    });
    tx.update(itemRef, { done: true, doneBy: me.uid, doneByName: me.name, doneAt: now });
  });
}

/** Removes the checked-off items of a list. */
export async function clearDone(code: string, items: Item[]) {
  const batch = writeBatch(firestore());
  for (const i of items) if (i.done) batch.delete(doc(itemsCol(code), i.id));
  await batch.commit();
}

// --- Računi ---------------------------------------------------------------

export type BillInput = Pick<Bill, 'name' | 'amount' | 'dueDay' | 'repeat' | 'month' | 'note'>;

export function addBill(code: string, bill: BillInput, me: Me) {
  return addDoc(billsCol(code), { ...bill, createdBy: me.uid, createdAt: Date.now() });
}

export function updateBill(code: string, id: string, bill: BillInput) {
  return updateDoc(doc(billsCol(code), id), withDeletes(bill));
}

/** Deletes a bill with all its per-month amounts and payments. */
export async function deleteBill(code: string, id: string) {
  const months = await getDocs(query(billMonthsCol(code), where('billId', '==', id)));
  const batch = writeBatch(firestore());
  months.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(billsCol(code), id));
  await batch.commit();
}

/** Marks a month paid or unpaid; the month's own amount (if any) is kept either way. */
export function setBillPaid(code: string, bill: Bill, month: string, paid: boolean, me: Me) {
  const ref = doc(billMonthsCol(code), billMonthId(bill.id, month));
  const who = paid
    ? { paid: true, paidBy: me.uid, paidByName: me.name, paidAt: Date.now() }
    : { paid: false, paidBy: deleteField(), paidByName: deleteField(), paidAt: deleteField() };
  return setDoc(ref, { billId: bill.id, month, ...who }, { merge: true });
}

/**
 * Sets the amount for one month only (undefined goes back to the usual
 * amount). With `asUsual` it also becomes the bill's usual amount.
 */
export async function setBillMonthAmount(code: string, bill: Bill, month: string, amount: number | undefined, asUsual = false) {
  const batch = writeBatch(firestore());
  batch.set(
    doc(billMonthsCol(code), billMonthId(bill.id, month)),
    { billId: bill.id, month, amount: amount === undefined ? deleteField() : amount },
    { merge: true },
  );
  if (asUsual) batch.update(doc(billsCol(code), bill.id), { amount: amount === undefined ? deleteField() : amount });
  await batch.commit();
}

// --- Poslovi --------------------------------------------------------------

export type TaskInput = Pick<Task, 'title' | 'note' | 'assignedTo' | 'repeat' | 'dueDate'>;

export function addTask(code: string, task: TaskInput, me: Me) {
  return addDoc(tasksCol(code), { ...task, done: false, createdBy: me.uid, createdAt: Date.now() });
}

export function updateTask(code: string, id: string, task: TaskInput) {
  return updateDoc(doc(tasksCol(code), id), withDeletes(task));
}

export function deleteTask(code: string, id: string) {
  return deleteDoc(doc(tasksCol(code), id));
}

/**
 * Ticks a chore off. A repeating chore stays open: it remembers who did it and
 * moves on to its next due date. A one-off chore is marked done.
 */
export function completeTask(code: string, task: Task, me: Me, today: string) {
  const ref = doc(tasksCol(code), task.id);
  const now = Date.now();
  if (task.repeat !== 'none') {
    return updateDoc(ref, {
      dueDate: nextDueDate(task.dueDate, task.repeat, today),
      lastDoneBy: me.uid,
      lastDoneByName: me.name,
      lastDoneAt: now,
    });
  }
  return updateDoc(ref, { done: true, doneBy: me.uid, doneByName: me.name, doneAt: now });
}

export function reopenTask(code: string, id: string) {
  return updateDoc(doc(tasksCol(code), id), { done: false, doneBy: deleteField(), doneByName: deleteField(), doneAt: deleteField() });
}

export async function clearDoneTasks(code: string, tasks: Task[]) {
  const batch = writeBatch(firestore());
  for (const t of tasks) if (t.done) batch.delete(doc(tasksCol(code), t.id));
  await batch.commit();
}

// --- Jela -----------------------------------------------------------------

export type MealInput = Pick<Meal, 'title' | 'link' | 'ingredients' | 'note'>;

export function addMeal(code: string, meal: MealInput, me: Me) {
  return addDoc(mealsCol(code), { ...meal, addedBy: me.uid, addedByName: me.name, createdAt: Date.now(), cookedCount: 0 });
}

export function updateMeal(code: string, id: string, meal: MealInput) {
  return updateDoc(doc(mealsCol(code), id), withDeletes(meal));
}

export function deleteMeal(code: string, id: string) {
  return deleteDoc(doc(mealsCol(code), id));
}

export function markCooked(code: string, meal: Meal) {
  return updateDoc(doc(mealsCol(code), meal.id), { lastCooked: Date.now(), cookedCount: (meal.cookedCount ?? 0) + 1 });
}

/** Adds every ingredient line to the shopping list in one write; returns how many. */
export async function addIngredientsToList(code: string, listId: string, lines: string[], me: Me) {
  const batch = writeBatch(firestore());
  const now = Date.now();
  lines.forEach((name, i) =>
    batch.set(doc(itemsCol(code)), {
      listId,
      name,
      category: guessCategory(name),
      done: false,
      addedBy: me.uid,
      addedByName: me.name,
      addedAt: now + i,
    }),
  );
  await batch.commit();
  return lines.length;
}
