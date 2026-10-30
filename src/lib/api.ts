import {
  addDoc, collection, deleteDoc, deleteField, doc, getDoc, getDocs, query, runTransaction, setDoc, updateDoc, where,
  writeBatch,
} from 'firebase/firestore';

import { firestore } from './firebase';
import { cleanCode, generateCode, guessCategory, historyKey } from './household';
import { recordPurchase } from './suggestions';
import type { HistoryEntry, Item } from './types';

// Firestore layout (see README):
// households/{code}                      name, members {uid: name}, createdAt, shopping
// households/{code}/lists/{listId}       name, order, createdAt
// households/{code}/items/{itemId}       listId, name, note, category, done, added…/done…
// households/{code}/history/{key}        purchase history used for suggestions

export const householdRef = (code: string) => doc(firestore(), 'households', code);
export const listsCol = (code: string) => collection(firestore(), 'households', code, 'lists');
export const itemsCol = (code: string) => collection(firestore(), 'households', code, 'items');
export const historyCol = (code: string) => collection(firestore(), 'households', code, 'history');

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
