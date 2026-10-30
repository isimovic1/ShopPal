// Pure helpers for the Poslovi tab; no Firebase imports so they can be unit tested.
import { addDays, daysBetween, fromDateKey, shortDate, toDateKey } from './dates';
import type { DateKey, Task, TaskRepeat } from './types';

export const REPEAT_LABELS: Record<TaskRepeat, string> = {
  none: 'Jednom',
  daily: 'Svaki dan',
  weekly: 'Svaki tjedan',
  monthly: 'Svaki mjesec',
};

function step(date: DateKey, repeat: TaskRepeat): DateKey {
  if (repeat === 'daily') return addDays(date, 1);
  if (repeat === 'weekly') return addDays(date, 7);
  // Monthly keeps the day of month, clamped (31.1. → 28./29.2.).
  const d = fromDateKey(date);
  const target = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d.getDate(), last));
  return toDateKey(target);
}

/**
 * Next due date of a repeating task once it is done today: the first
 * occurrence after today, keeping the original rhythm (a weekly Monday chore
 * done late on Wednesday is next due on Monday, not Wednesday). Without a due
 * date the rhythm starts from today.
 */
export function nextDueDate(dueDate: DateKey | undefined, repeat: TaskRepeat, today: DateKey): DateKey | undefined {
  if (repeat === 'none') return dueDate;
  let next = step(dueDate ?? today, repeat);
  while (next <= today) next = step(next, repeat);
  return next;
}

export type TaskSection = 'late' | 'today' | 'soon' | 'later' | 'none';

export const SECTION_LABELS: Record<TaskSection, string> = {
  late: 'Kasni',
  today: 'Danas',
  soon: 'Uskoro',
  later: 'Kasnije',
  none: 'Bez roka',
};

/** Which section an open task goes in; "soon" is the next 7 days. */
export function taskSection(dueDate: DateKey | undefined, today: DateKey): TaskSection {
  if (!dueDate) return 'none';
  const d = daysBetween(today, dueDate);
  if (d < 0) return 'late';
  if (d === 0) return 'today';
  return d <= 7 ? 'soon' : 'later';
}

/** "Danas", "Sutra", "kasni 2 dana", "za 3 dana" or "14.11.". */
export function dueLabel(dueDate: DateKey | undefined, today: DateKey): string {
  if (!dueDate) return '';
  const d = daysBetween(today, dueDate);
  if (d === 0) return 'Danas';
  if (d === 1) return 'Sutra';
  if (d === -1) return 'kasni 1 dan';
  if (d < 0) return `kasni ${-d} dana`;
  if (d <= 6) return `za ${d} dana`;
  return shortDate(dueDate);
}

/** Open tasks grouped by section in display order; done tasks newest first. */
export function groupTasks(tasks: Task[], today: DateKey) {
  const order: TaskSection[] = ['late', 'today', 'soon', 'later', 'none'];
  const open = tasks.filter((t) => !t.done);
  const sections = order
    .map((s) => ({
      section: s,
      tasks: open
        .filter((t) => taskSection(t.dueDate, today) === s)
        .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '') || a.createdAt - b.createdAt),
    }))
    .filter((g) => g.tasks.length);
  const done = tasks.filter((t) => t.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));
  return { sections, done };
}
