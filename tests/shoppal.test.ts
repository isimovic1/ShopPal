import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  CODE_ALPHABET, CODE_LENGTH, cleanCode, generateCode, guessCategory, historyKey, isValidCode, normalizeName,
} from '../src/lib/household';
import {
  averageIntervalDays, dueSuggestions, frequentItems, intervalLabel, MAX_PURCHASES, recordPurchase,
} from '../src/lib/suggestions';
import type { HistoryEntry, Item } from '../src/lib/types';

const DAY = 86_400_000;
const NOW = Date.parse('2026-10-30T10:00:00Z');

test('codes are 6 unambiguous characters', () => {
  for (const ch of '01OIL') assert.ok(!CODE_ALPHABET.includes(ch), ch);
  for (let i = 0; i < 200; i++) {
    const c = generateCode();
    assert.equal(c.length, CODE_LENGTH);
    assert.ok(isValidCode(c), c);
  }
  assert.equal(generateCode(() => 0), 'AAAAAA');
  assert.equal(generateCode(() => 0.9999), '999999');
  assert.equal(cleanCode(' k7p-2qx '), 'K7P2QX');
  assert.ok(!isValidCode('K7P2Q0'));
});

test('normalizeName and historyKey', () => {
  assert.equal(normalizeName('  Čokolada   ZA kuhanje '), 'cokolada za kuhanje');
  assert.equal(normalizeName('Đumbir'), 'dumbir');
  assert.equal(historyKey('Sok 1/2 l'), 'sok 1-2 l');
});

test('guessCategory sorts common Croatian items into shop sections', () => {
  const cases: [string, string][] = [
    ['Mlijeko 2,8%', 'Mliječni proizvodi'],
    ['jogurt', 'Mliječni proizvodi'],
    ['Banane', 'Voće i povrće'],
    ['crveni luk', 'Voće i povrće'],
    ['Kruh', 'Pekara'],
    ['pileća prsa', 'Meso i riba'],
    ['Mineralna voda', 'Piće'],
    ['Pivo', 'Piće'],
    ['deterdžent za suđe', 'Kućna kemija'],
    ['Šampon', 'Higijena'],
    ['WC papir', 'Higijena'],
    ['sladoled', 'Smrznuto'],
    ['baterije AA', 'Kućna kemija'],
    ['nešto čudno', 'Ostalo'],
  ];
  for (const [name, cat] of cases) assert.equal(guessCategory(name), cat, name);
});

test('recordPurchase merges same-trip check-offs and caps history', () => {
  let p: number[] = [];
  p = recordPurchase(p, NOW);
  const same = recordPurchase(p, NOW + 3600_000);
  assert.equal(same, p); // same trip: unchanged array
  for (let i = 1; i <= 20; i++) p = recordPurchase(p, NOW + i * DAY);
  assert.equal(p.length, MAX_PURCHASES);
  assert.equal(p[p.length - 1], NOW + 20 * DAY);
});

test('averageIntervalDays', () => {
  assert.equal(averageIntervalDays([NOW]), null);
  assert.equal(averageIntervalDays([NOW, NOW + 4 * DAY, NOW + 10 * DAY]), 5);
});

const entry = (name: string, purchasesDaysAgo: number[], count = purchasesDaysAgo.length): HistoryEntry => {
  const purchases = purchasesDaysAgo.map((d) => NOW - d * DAY).sort((a, b) => a - b);
  return { key: normalizeName(name), name, category: guessCategory(name), count, lastBought: purchases[purchases.length - 1], purchases };
};
const item = (name: string, done = false): Item => ({
  id: name, listId: 'l', name, category: 'Ostalo', done, addedBy: 'u', addedByName: 'U', addedAt: NOW,
});

test('dueSuggestions picks items past their usual interval, most overdue first', () => {
  const history = [
    entry('Mlijeko', [15, 10, 5]), // every 5 days, last 5 days ago → due (1.0)
    entry('Kruh', [6, 4, 2]), // every 2 days, last 2 days ago → due (1.0)
    entry('Kava', [40, 20]), // every 20 days, last 20 days ago → due
    entry('Šampon', [30, 0.5]), // bought yesterday → not due
    entry('Sol', [100]), // only once → no interval
    entry('Jaja', [21, 14, 7]), // due but already on the list
  ];
  const s = dueSuggestions(history, [item('jaja'), item('Mlijeko', true)], NOW);
  assert.deepEqual(s.map((x) => x.entry.name).sort(), ['Kava', 'Kruh', 'Mlijeko']);
  const overdue = dueSuggestions([entry('A', [30, 20]), entry('B', [20, 10, 5])], [], NOW);
  // A: interval 10, 20 days since → 2.0; B: interval 7.5, 5 days since → 0.67 (not due)
  assert.deepEqual(overdue.map((x) => x.entry.name), ['A']);
});

test('frequentItems orders by count and skips items already on the list', () => {
  const h = [entry('Mlijeko', [1], 9), entry('Kruh', [1], 12), entry('Sol', [1], 1)];
  assert.deepEqual(frequentItems(h, [item('kruh')]).map((x) => x.name), ['Mlijeko', 'Sol']);
});

test('intervalLabel', () => {
  assert.equal(intervalLabel(0.7), 'svaki dan');
  assert.equal(intervalLabel(5.2), 'svakih 5 dana');
  assert.equal(intervalLabel(14), 'svakih 2 tjedna');
});
