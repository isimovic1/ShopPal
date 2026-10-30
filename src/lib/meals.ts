// Pure helpers for the Jela tab; no Firebase imports so they can be unit tested.
import type { Meal } from './types';

/** Adds https:// when missing; null when it does not look like a web address. */
export function normalizeUrl(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(withScheme);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.')) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Pulls the first link out of shared text like "Pogledaj ovo! https://www.instagram.com/reel/…". */
export function extractUrl(text: string): string | null {
  const m = text.match(/https?:\/\/\S+/i) ?? text.match(/\b(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+\/\S*/i);
  return m ? normalizeUrl(m[0]) : null;
}

const SOURCES: [RegExp, string][] = [
  [/(^|\.)instagram\.com$|(^|\.)instagr\.am$/, 'Instagram'],
  [/(^|\.)tiktok\.com$/, 'TikTok'],
  [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, 'YouTube'],
  [/(^|\.)facebook\.com$|(^|\.)fb\.watch$/, 'Facebook'],
  [/(^|\.)pinterest\.[a-z.]+$|(^|\.)pin\.it$/, 'Pinterest'],
];

/** "Instagram", "TikTok"…, or the bare domain ("coolinarika.com") for other sites. */
export function linkSource(link: string | undefined): string | null {
  const url = link ? normalizeUrl(link) : null;
  if (!url) return null;
  const host = new URL(url).hostname.replace(/^www\.|^m\./, '');
  return SOURCES.find(([re]) => re.test(host))?.[1] ?? host;
}

/** Non-empty ingredient lines, without leading bullets ("- ", "• ", "1. "). */
export function ingredientLines(text: string | undefined): string[] {
  return (text ?? '')
    .split('\n')
    .map((l) => l.replace(/^\s*(?:[-*•·]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);
}

const DAY = 86_400_000;

/**
 * Random meal for "Što danas kuhamo?". The weight grows with days since it was
 * last cooked (never cooked counts as a month), so recent meals are rarely
 * picked again but nothing is excluded.
 */
export function pickMeal(meals: Meal[], now: number, random: () => number = Math.random, excludeId?: string): Meal | null {
  const pool = meals.filter((m) => m.id !== excludeId);
  const candidates = pool.length ? pool : meals;
  if (!candidates.length) return null;
  const weights = candidates.map((m) => {
    const days = m.lastCooked ? (now - m.lastCooked) / DAY : 30;
    return Math.max(0.5, Math.min(days, 60));
  });
  let r = random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r < 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

/** Case- and accent-insensitive search over title, ingredients and note. */
export function matchesMeal(meal: Meal, query: string): boolean {
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  const q = norm(query.trim());
  if (!q) return true;
  const hay = norm(`${meal.title} ${meal.ingredients ?? ''} ${meal.note ?? ''}`);
  return q.split(/\s+/).every((w) => hay.includes(w));
}
