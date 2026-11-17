import { isLinkedCategory } from '../constants/systemCategories';
import type { Transaction } from '../types';

const FREQ_DAYS = 90;

/** Categorías de ese tipo, las más usadas en los últimos 90 días primero. */
export function sortByFrequency(
  categories: string[],
  transactions: Pick<Transaction, 'category' | 'type' | 'date'>[],
  type: Transaction['type'],
  now = new Date(),
): string[] {
  const since = new Date(now.getTime() - FREQ_DAYS * 86400000).toISOString();
  const count = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== type || t.date < since || isLinkedCategory(t.category)) continue;
    count.set(t.category, (count.get(t.category) ?? 0) + 1);
  }
  const all = Array.from(new Set([...categories, ...count.keys()]));
  return all.sort((a, b) => (count.get(b) ?? 0) - (count.get(a) ?? 0) || a.localeCompare(b));
}
