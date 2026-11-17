import type { Transaction } from '../types';

const DAY = 86400000;

/** Mismo tipo y monto, y fecha a 3 días o menos: probablemente ya se registró a mano. */
export function isDuplicate(
  row: Pick<Transaction, 'amount' | 'type' | 'date'>,
  existing: Pick<Transaction, 'amount' | 'type' | 'date'>[],
): boolean {
  const day = Date.parse(row.date.slice(0, 10));
  return existing.some(
    t =>
      t.type === row.type &&
      Math.abs(Number(t.amount) - row.amount) < 0.01 &&
      Math.abs(Date.parse(t.date.slice(0, 10)) - day) <= 3 * DAY,
  );
}
