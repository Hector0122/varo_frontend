import { sortByFrequency } from '../src/utils/frequency';

test('frecuentes primero, solo del tipo y de los últimos 90 días', () => {
  const now = new Date('2026-11-17T12:00:00Z');
  const tx = (category: string, date: string, type: 'INCOME' | 'EXPENSE' = 'EXPENSE') => ({ category, date, type });
  const result = sortByFrequency(
    ['Café', 'Comida', 'Uber'],
    [
      tx('Uber', '2026-11-10T00:00:00Z'),
      tx('Uber', '2026-11-11T00:00:00Z'),
      tx('Comida', '2026-11-12T00:00:00Z'),
      tx('Café', '2026-01-01T00:00:00Z'), // viejo: no cuenta
      tx('Sueldo', '2026-11-15T00:00:00Z', 'INCOME'), // otro tipo
      tx('Savings', '2026-11-15T00:00:00Z'), // categoría del sistema
      tx('Súper', '2026-11-13T00:00:00Z'), // usada pero sin categoría guardada
    ],
    'EXPENSE',
    now,
  );
  expect(result).toEqual(['Uber', 'Comida', 'Súper', 'Café']);
});
