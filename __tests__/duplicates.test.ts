import { isDuplicate } from '../src/utils/duplicates';

test('mismo monto y tipo a 3 días o menos = duplicado', () => {
  const existing = [{ amount: 120.5, type: 'EXPENSE' as const, date: '2026-10-17T12:00:00.000Z' }];
  expect(isDuplicate({ amount: 120.5, type: 'EXPENSE', date: '2026-10-19' }, existing)).toBe(true);
  expect(isDuplicate({ amount: 120.5, type: 'EXPENSE', date: '2026-10-22' }, existing)).toBe(false);
  expect(isDuplicate({ amount: 99, type: 'EXPENSE', date: '2026-10-17' }, existing)).toBe(false);
  expect(isDuplicate({ amount: 120.5, type: 'INCOME', date: '2026-10-17' }, existing)).toBe(false);
});
