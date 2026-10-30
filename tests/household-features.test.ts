import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  amountForMonth, billsForMonth, dueDateIn, money, monthKey, monthSummary, monthTitle, parseAmount, shiftMonth,
} from '../src/lib/bills';
import { extractUrl, ingredientLines, linkSource, matchesMeal, normalizeUrl, pickMeal } from '../src/lib/meals';
import { dueLabel, groupTasks, nextDueDate, taskSection } from '../src/lib/tasks';
import type { Bill, BillMonth, Meal, Task } from '../src/lib/types';

const DAY = 86_400_000;
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d).getTime();

const bill = (id: string, over: Partial<Bill> = {}): Bill => ({
  id, name: id, repeat: 'monthly', createdBy: 'a', createdAt: at(2026, 10, 1), ...over,
});
const bm = (billId: string, month: string, over: Partial<BillMonth> = {}): BillMonth => ({
  id: `${billId}_${month}`, billId, month, ...over,
});

// --- Računi ---

test('month helpers', () => {
  assert.equal(monthKey('2026-11-05'), '2026-11');
  assert.equal(monthKey(new Date(2026, 0, 31)), '2026-01');
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(monthTitle('2026-11'), 'Studeni 2026.');
  assert.equal(dueDateIn(bill('x', { dueDay: 31 }), '2027-02'), '2027-02-28');
  assert.equal(dueDateIn(bill('x', { dueDay: 5 }), '2026-11'), '2026-11-05');
  assert.equal(dueDateIn(bill('x'), '2026-11'), null);
});

test('parseAmount and money', () => {
  assert.equal(parseAmount('12,5'), 12.5);
  assert.equal(parseAmount('12.50'), 12.5);
  assert.equal(parseAmount('1.234,56 €'), 1234.56);
  assert.ok(Number.isNaN(parseAmount('abc')));
  assert.ok(Number.isNaN(parseAmount('')));
  assert.equal(money(1234.5), '1.234,50 €');
});

test('monthly bills appear from the month they were created; one-off bills only in their month', () => {
  const bills = [
    bill('Najam', { createdAt: at(2026, 10, 20) }),
    bill('Novi', { createdAt: at(2026, 12, 3) }),
    bill('Popravak', { repeat: 'once', month: '2026-11' }),
  ];
  const names = (month: string) => billsForMonth(bills, [], month, '2026-11-10').map((r) => r.bill.name).sort();
  assert.deepEqual(names('2026-09'), []);
  assert.deepEqual(names('2026-10'), ['Najam']);
  assert.deepEqual(names('2026-11'), ['Najam', 'Popravak']);
  assert.deepEqual(names('2026-12'), ['Najam', 'Novi']);
});

test('per-month amount overrides the usual amount only in that month', () => {
  const struja = bill('Struja', { amount: 50 });
  const months = [bm('Struja', '2026-11', { amount: 63.4 })];
  assert.equal(amountForMonth(struja, months[0]), 63.4);
  assert.equal(amountForMonth(struja, undefined), 50);
  assert.equal(amountForMonth(bill('Bez'), undefined), undefined);
  assert.equal(amountForMonth(struja, bm('Struja', '2026-11', { amount: 0 })), 0);

  const [nov] = billsForMonth([struja], months, '2026-11', '2026-11-01');
  assert.equal(nov.amount, 63.4);
  assert.equal(nov.amountOverridden, true);
  const [dec] = billsForMonth([struja], months, '2026-12', '2026-11-01');
  assert.equal(dec.amount, 50);
  assert.equal(dec.amountOverridden, false);
  // A paid-only month doc keeps the usual amount.
  const [paid] = billsForMonth([struja], [bm('Struja', '2027-01', { paid: true, paidByName: 'Ana' })], '2027-01', '2027-01-20');
  assert.equal(paid.amount, 50);
  assert.equal(paid.paid, true);
  assert.equal(paid.amountOverridden, false);
});

test('bill rows: unpaid first by due date, late state, paid last', () => {
  const bills = [
    bill('Internet', { dueDay: 20 }),
    bill('Najam', { dueDay: 1 }),
    bill('Voda', { dueDay: 15 }),
    bill('Netflix'),
  ];
  const months = [bm('Najam', '2026-11', { paid: true, paidByName: 'Ivan' })];
  const rows = billsForMonth(bills, months, '2026-11', '2026-11-16');
  assert.deepEqual(rows.map((r) => r.bill.name), ['Voda', 'Internet', 'Netflix', 'Najam']);
  assert.deepEqual(rows.map((r) => r.state), ['late', 'open', 'open', 'paid']);
});

test('month summary uses per-month amounts and groups by who paid', () => {
  const bills = [bill('Najam', { amount: 500 }), bill('Struja', { amount: 50 }), bill('Internet', { amount: 30 }), bill('X')];
  const months = [
    bm('Najam', '2026-11', { paid: true, paidByName: 'Ivan' }),
    bm('Struja', '2026-11', { amount: 70, paid: true, paidByName: 'Ana' }),
    bm('Internet', '2026-11', { paid: true, paidByName: 'Ana' }),
  ];
  const s = monthSummary(billsForMonth(bills, months, '2026-11', '2026-11-01'));
  assert.equal(s.total, 600);
  assert.equal(s.paid, 600);
  assert.equal(s.remaining, 0);
  assert.equal(s.paidCount, 3);
  assert.equal(s.count, 4);
  assert.deepEqual(s.byPerson, [
    { name: 'Ivan', amount: 500, count: 1 },
    { name: 'Ana', amount: 100, count: 2 },
  ]);
});

// --- Poslovi ---

test('nextDueDate keeps the rhythm of repeating chores', () => {
  assert.equal(nextDueDate('2026-11-02', 'daily', '2026-11-02'), '2026-11-03');
  // Weekly Monday chore done late on Wednesday is next due on Monday.
  assert.equal(nextDueDate('2026-11-02', 'weekly', '2026-11-04'), '2026-11-09');
  // Done early: next week from the due date.
  assert.equal(nextDueDate('2026-11-09', 'weekly', '2026-11-04'), '2026-11-16');
  // Several periods late skips to the first one after today.
  assert.equal(nextDueDate('2026-10-01', 'weekly', '2026-10-30'), '2026-11-05');
  assert.equal(nextDueDate('2026-01-31', 'monthly', '2026-01-31'), '2026-02-28');
  assert.equal(nextDueDate(undefined, 'weekly', '2026-11-04'), '2026-11-11');
  assert.equal(nextDueDate('2026-11-04', 'none', '2026-11-04'), '2026-11-04');
  assert.equal(nextDueDate(undefined, 'none', '2026-11-04'), undefined);
});

test('task sections and labels', () => {
  const today = '2026-11-10';
  assert.equal(taskSection(undefined, today), 'none');
  assert.equal(taskSection('2026-11-08', today), 'late');
  assert.equal(taskSection(today, today), 'today');
  assert.equal(taskSection('2026-11-17', today), 'soon');
  assert.equal(taskSection('2026-11-18', today), 'later');
  assert.equal(dueLabel(today, today), 'Danas');
  assert.equal(dueLabel('2026-11-11', today), 'Sutra');
  assert.equal(dueLabel('2026-11-09', today), 'kasni 1 dan');
  assert.equal(dueLabel('2026-11-07', today), 'kasni 3 dana');
  assert.equal(dueLabel('2026-11-13', today), 'za 3 dana');
  assert.equal(dueLabel(undefined, today), '');
});

test('groupTasks orders sections and keeps done tasks apart', () => {
  const t = (id: string, dueDate: string | undefined, over: Partial<Task> = {}): Task => ({
    id, title: id, assignedTo: null, repeat: 'none', dueDate, done: false, createdBy: 'a', createdAt: 0, ...over,
  });
  const { sections, done } = groupTasks(
    [
      t('usisati', undefined),
      t('kupaonica', '2026-11-09'),
      t('smece', '2026-11-10'),
      t('prozori', '2026-11-12'),
      t('staro', '2026-11-01', { done: true, doneAt: 1 }),
      t('novo', '2026-11-01', { done: true, doneAt: 2 }),
    ],
    '2026-11-10',
  );
  assert.deepEqual(sections.map((s) => [s.section, s.tasks.map((x) => x.id)]), [
    ['late', ['kupaonica']],
    ['today', ['smece']],
    ['soon', ['prozori']],
    ['none', ['usisati']],
  ]);
  assert.deepEqual(done.map((x) => x.id), ['novo', 'staro']);
});

// --- Jela ---

test('links: normalize, extract from shared text, recognise the source', () => {
  assert.equal(normalizeUrl('instagram.com/reel/abc'), 'https://instagram.com/reel/abc');
  assert.equal(normalizeUrl('javascript:alert(1)'), null);
  assert.equal(normalizeUrl('ftp://x.com/a'), null);
  assert.equal(normalizeUrl('nije link'), null);
  assert.equal(
    extractUrl('Pogledaj ovo 😍 https://www.instagram.com/reel/C1x2y3/?igsh=abc'),
    'https://www.instagram.com/reel/C1x2y3/?igsh=abc',
  );
  assert.equal(extractUrl('www.coolinarika.com/recept/sarma'), 'https://www.coolinarika.com/recept/sarma');
  assert.equal(extractUrl('bez linka'), null);
  assert.equal(linkSource('https://www.instagram.com/p/x'), 'Instagram');
  assert.equal(linkSource('https://vm.tiktok.com/x'), 'TikTok');
  assert.equal(linkSource('https://youtu.be/x'), 'YouTube');
  assert.equal(linkSource('https://pin.it/x'), 'Pinterest');
  assert.equal(linkSource('https://www.coolinarika.com/recept/1'), 'coolinarika.com');
  assert.equal(linkSource(undefined), null);
});

test('ingredient lines drop bullets and blanks', () => {
  assert.deepEqual(ingredientLines('- 500 g mljevenog mesa\n\n• luk\n1. rajčica\n2) bosiljak\n  sol  '), [
    '500 g mljevenog mesa', 'luk', 'rajčica', 'bosiljak', 'sol',
  ]);
  assert.deepEqual(ingredientLines(undefined), []);
});

test('pickMeal favours meals not cooked for a while', () => {
  const now = Date.parse('2026-10-30T12:00:00Z');
  const meal = (id: string, lastCooked?: number): Meal => ({
    id, title: id, addedBy: 'a', addedByName: 'A', createdAt: 0, cookedCount: lastCooked ? 1 : 0, lastCooked,
  });
  const meals = [meal('jucer', now - DAY), meal('davno', now - 60 * DAY), meal('nikad')];
  assert.equal(pickMeal([], now), null);
  // Weights: 1, 60, 30 → total 91.
  assert.equal(pickMeal(meals, now, () => 0)?.id, 'jucer');
  assert.equal(pickMeal(meals, now, () => 0.5)?.id, 'davno');
  assert.equal(pickMeal(meals, now, () => 0.99)?.id, 'nikad');
  let recent = 0;
  let seed = 1;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 2000; i++) if (pickMeal(meals, now, rnd)?.id === 'jucer') recent++;
  assert.ok(recent < 100, `recently cooked meal picked ${recent} times`);
  assert.equal(pickMeal(meals, now, () => 0, 'jucer')?.id, 'davno');
  assert.equal(pickMeal([meals[0]], now, () => 0, 'jucer')?.id, 'jucer');
});

test('meal search ignores case and accents', () => {
  const m: Meal = {
    id: '1', title: 'Pašticada', ingredients: 'junetina\nsuhe šljive', addedBy: 'a', addedByName: 'A', createdAt: 0, cookedCount: 0,
  };
  assert.ok(matchesMeal(m, 'pasticada'));
  assert.ok(matchesMeal(m, 'SLJIVE junet'));
  assert.ok(!matchesMeal(m, 'piletina'));
  assert.ok(matchesMeal(m, '  '));
});
