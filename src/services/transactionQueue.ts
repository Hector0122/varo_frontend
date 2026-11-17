import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { Transaction } from '../types';

export type NewTransaction = Omit<Transaction, 'id' | 'userId'>;

const QUEUE_KEY = 'pendingTransactions';
let flushing = false;

async function readQueue(): Promise<NewTransaction[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(QUEUE_KEY)) ?? '[]');
  } catch {
    return [];
  }
}

export const pendingCount = async () => (await readQueue()).length;

function refresh(qc: QueryClient) {
  for (const key of ['transactions', 'goals', 'forecast', 'categories', 'monthly-spending', 'pending']) {
    qc.invalidateQueries({ queryKey: [key] });
  }
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
): Promise<'saved' | 'queued'> {
  try {
    await api.post('/transactions', tx);
    refresh(qc);
    flushQueue(qc);
    return 'saved';
  } catch (err) {
    if (!isNetworkError(err)) throw err;
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([...(await readQueue()), tx]));
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
        await api.post('/transactions', queue[0]);
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
