import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { Transaction } from '../types';

export type NewTransaction = Omit<Transaction, 'id' | 'userId' | 'objectiveEntry'>;
/** Con debtId se registra como compra con esa tarjeta (sube su deuda). */
type QueueItem = NewTransaction & { debtId?: string };

const QUEUE_KEY = 'pendingTransactions';
let flushing = false;

async function readQueue(): Promise<QueueItem[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(QUEUE_KEY)) ?? '[]');
  } catch {
    return [];
  }
}

export const clearQueue = () => AsyncStorage.removeItem(QUEUE_KEY);

export const pendingCount = async () => (await readQueue()).length;

function refresh(qc: QueryClient) {
  for (const key of ['transactions', 'debts', 'categories', 'monthly-spending', 'pending']) {
    qc.invalidateQueries({ queryKey: [key] });
  }
}

function post({ debtId, ...tx }: QueueItem) {
  return debtId
    ? api.post(`/objectives/${debtId}/entries`, { ...tx, type: 'INCREASE' })
    : api.post('/transactions', tx);
}

/** Sin respuesta del servidor = sin red (o Railway caído): vale la pena reintentar. */
const isNetworkError = (err: any) => !err?.response;

/**
 * Guarda un movimiento. Si no hay red lo deja en cola (AsyncStorage) y
 * devuelve 'queued'; los errores del servidor (400, etc.) sí se lanzan.
 */
export async function saveTransaction(
  tx: NewTransaction,
  qc: QueryClient,
  debtId?: string,
): Promise<'saved' | 'queued'> {
  const item: QueueItem = debtId ? { ...tx, debtId } : tx;
  try {
    await post(item);
    refresh(qc);
    flushQueue(qc);
    return 'saved';
  } catch (err) {
    if (!isNetworkError(err)) throw err;
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([...(await readQueue()), item]));
    refresh(qc);
    return 'queued';
  }
}

/** Envía lo pendiente, en orden. Se detiene al primer error de red. */
export async function flushQueue(qc: QueryClient): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    const queue = await readQueue();
    if (!queue.length) return;
    while (queue.length) {
      try {
        await post(queue[0]);
      } catch (err) {
        // ponytail: un movimiento que el servidor rechaza (400) se descarta para no bloquear la cola.
        if (isNetworkError(err)) break;
      }
      queue.shift();
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    }
    refresh(qc);
  } finally {
    flushing = false;
  }
}
