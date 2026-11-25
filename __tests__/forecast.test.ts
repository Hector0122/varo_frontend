import { buildForecast, weeklyCashSpending } from '../src/utils/forecast';

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

test('lo que pasó desde el último saldo ya cuenta hoy; el variable solo se descuenta hacia adelante', () => {
  const f = buildForecast({
    ...base,
    balanceDate: '2026-11-10',
    weeks: 1,
    variableWeekly: 700,
    recurring: [
      { amount: 1000, type: 'INCOME', category: 'Sueldo', frequency: 'WEEKLY', startDate: '2026-11-13', isActive: true },
    ],
    cards: [],
  });
  // La semana pasada ya está anotada: no se le resta otra vez el promedio.
  expect(f.todayBalance).toBeCloseTo(7000 + 1000, 6);
  // Próxima semana: +sueldo del 20 nov, −700 de variable.
  expect(f.endBalance).toBeCloseTo(7000 + 2000 - 700, 6);
});

test('el gasto variable cuenta efectivo y débito de la cuenta, no tarjeta', () => {
  const tx = [
    { type: 'EXPENSE', date: '2026-11-03', amount: 300, category: 'Transporte' }, // efectivo
    { type: 'EXPENSE', date: '2026-11-04', amount: 900, category: 'Súper', objectiveEntry: { type: 'INCREASE' } }, // tarjeta
    { type: 'EXPENSE', date: '2026-11-05', amount: 800, category: 'Súper', objectiveEntry: { type: 'WITHDRAW' } }, // cuenta
    { type: 'EXPENSE', date: '2026-11-06', amount: 2200, category: 'Renta', note: 'Recurrente' },
    { type: 'EXPENSE', date: '2026-11-06', amount: 500, category: 'Transferencia' },
    { type: 'INCOME', date: '2026-11-06', amount: 5000, category: 'Sueldo' },
    { type: 'EXPENSE', date: '2026-10-01', amount: 999, category: 'Comida' }, // antes del periodo
  ];
  expect(weeklyCashSpending(tx, '2026-11-01', 7, c => c === 'Transferencia')).toBe(300 + 800);
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
