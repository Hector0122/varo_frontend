import { buildForecast } from '../src/utils/forecast';

const base = {
  balance: 7000,
  balanceDate: '2026-11-17',
  today: '2026-11-17',
  ratePct: 0,
  weeks: 4,
  variableWeekly: 0,
};

test('sueldo semanal, pensión, renta y pago de tarjeta', () => {
  const f = buildForecast({
    ...base,
    recurring: [
      { amount: 5471, type: 'INCOME', category: 'Sueldo', frequency: 'WEEKLY', startDate: '2026-11-20', isActive: true },
      { amount: 1600, type: 'EXPENSE', category: 'Pensión', frequency: 'WEEKLY', startDate: '2026-11-20', isActive: true },
      { amount: 2200, type: 'EXPENSE', category: 'Renta', frequency: 'MONTHLY', startDate: '2026-12-01', isActive: true },
    ],
    cards: [{ name: 'MP', dueDay: 7, nextPayment: 2260.26, estimate: 0 }],
  });
  // 4 viernes (20, 27 nov, 4, 11 dic): +4×3871; renta 1 dic; pago MP 7 dic.
  expect(f.endBalance).toBeCloseTo(7000 + 4 * 3871 - 2200 - 2260.26, 2);
  expect(f.weeks[0].events.map(e => e.label)).toEqual(['Sueldo', 'Pensión']);
  expect(f.weeks[2].events.map(e => e.label)).toEqual(['Sueldo', 'Pensión', 'Pago MP']);
});

test('lo que pasó desde el último saldo ya cuenta hoy, y el variable se descuenta', () => {
  const f = buildForecast({
    ...base,
    balanceDate: '2026-11-10',
    variableWeekly: 700,
    recurring: [
      { amount: 1000, type: 'INCOME', category: 'Sueldo', frequency: 'WEEKLY', startDate: '2026-11-13', isActive: true },
    ],
    cards: [],
  });
  expect(f.todayBalance).toBeCloseTo(7000 + 1000 - 700, 6);
});

test('rendimiento diario y saldo mínimo', () => {
  const f = buildForecast({
    ...base,
    ratePct: 12,
    weeks: 1,
    recurring: [],
    cards: [{ name: 'BBVA', dueDay: 20, nextPayment: 9000, estimate: 500 }],
  });
  expect(f.min.date).toBe('2026-11-20');
  expect(f.min.balance).toBeLessThan(0);
});
