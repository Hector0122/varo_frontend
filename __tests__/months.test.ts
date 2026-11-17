import { byCategory, inMonth, shiftMonth } from '../src/utils/months';

test('mes, cambio de mes y gastos por categoría', () => {
  expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  const txs = [
    { date: '2026-11-03T12:00:00.000Z', type: 'EXPENSE' as const, category: 'Comida', amount: 100 },
    { date: '2026-11-10T12:00:00.000Z', type: 'EXPENSE' as const, category: 'Uber', amount: 300 },
    { date: '2026-11-11T12:00:00.000Z', type: 'EXPENSE' as const, category: 'Comida', amount: 250 },
    { date: '2026-11-15T12:00:00.000Z', type: 'INCOME' as const, category: 'Sueldo', amount: 5000 },
    { date: '2026-10-30T12:00:00.000Z', type: 'EXPENSE' as const, category: 'Comida', amount: 999 },
  ];
  expect(byCategory(inMonth(txs, '2026-11'))).toEqual([
    { category: 'Comida', total: 350 },
    { category: 'Uber', total: 300 },
  ]);
});
