import { splitOccurrences } from '../src/utils/occurrences';

test('semanal: pagos pasados (incluye hoy) y el siguiente', () => {
  expect(splitOccurrences('2026-10-23', 'WEEKLY', '2026-11-13')).toEqual({
    past: ['2026-10-23', '2026-10-30', '2026-11-06', '2026-11-13'],
    next: '2026-11-20',
  });
});

test('mensual se ajusta a fin de mes sin correrse', () => {
  expect(splitOccurrences('2026-01-31', 'MONTHLY', '2026-04-15')).toEqual({
    past: ['2026-01-31', '2026-02-28', '2026-03-31'],
    next: '2026-04-30',
  });
});

test('primer pago en el futuro: nada que registrar', () => {
  expect(splitOccurrences('2026-12-01', 'BIWEEKLY', '2026-11-17')).toEqual({ past: [], next: '2026-12-01' });
});
