jest.mock('../src/services/api', () => ({ api: { post: jest.fn(() => Promise.resolve({ data: {} })) } }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

import { api } from '../src/services/api';
import { saveTransaction } from '../src/services/transactionQueue';

const qc = { invalidateQueries: jest.fn() } as any;
const tx = { amount: 25, category: 'Telcel', type: 'EXPENSE' as const, date: '2026-11-17' };
const post = api.post as jest.Mock;

beforeEach(() => post.mockClear());

test('pagado con la cuenta: retira de la cuenta (baja su saldo)', async () => {
  await saveTransaction(tx, qc, undefined, 'acc1');
  expect(post).toHaveBeenCalledWith('/objectives/acc1/entries', { ...tx, type: 'WITHDRAW' });
});

test('pagado con tarjeta: cargo a la tarjeta (sube su deuda)', async () => {
  await saveTransaction(tx, qc, 'card1');
  expect(post).toHaveBeenCalledWith('/objectives/card1/entries', { ...tx, type: 'INCREASE' });
});

test('efectivo: movimiento normal', async () => {
  await saveTransaction(tx, qc);
  expect(post).toHaveBeenCalledWith('/transactions', tx);
});
