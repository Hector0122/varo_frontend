import type { Transaction } from '../types';

/** 'YYYY-MM' de una fecha local. */
export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export const shiftMonth = (key: string, delta: number) => {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
};

export const monthLabel = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

/** Movimientos de un mes ('YYYY-MM'); la fecha se guarda a mediodía, así que el prefijo ISO basta. */
export const inMonth = <T extends Pick<Transaction, 'date'>>(txs: T[], key: string) =>
  txs.filter(t => t.date.slice(0, 7) === key);

/** Gastos del mes por categoría, de mayor a menor. */
export function byCategory(txs: Pick<Transaction, 'type' | 'category' | 'amount'>[]) {
  const totals = new Map<string, number>();
  for (const t of txs) {
    if (t.type === 'EXPENSE') totals.set(t.category, (totals.get(t.category) ?? 0) + Number(t.amount));
  }
  return [...totals.entries()].map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
}
