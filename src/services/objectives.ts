import { api } from './api';
import type {
  FinancialObjective,
  FinancialObjectiveType,
  ObjectiveEntry,
  ObjectiveEntryType,
  Forecast,
  MonthlySpendingEntry,
} from '../types';

export interface CreateObjectivePayload {
  type: FinancialObjectiveType;
  name: string;
  targetAmount: number;
  savingAllocation?: number;
  dueDate?: string;
  statementDay?: number;
}

export interface UpdateObjectivePayload {
  name?: string;
  targetAmount?: number;
  currentAmount?: number;
  savingAllocation?: number;
  dueDate?: string | null;
  statementDay?: number;
}

export interface CreateObjectiveEntryPayload {
  type: ObjectiveEntryType;
  amount: number;
  note?: string;
  installments?: number;
  date?: string;
}

export const objectivesApi = {
  list: async (type?: FinancialObjectiveType) => {
    const res = await api.get<FinancialObjective[]>('/objectives', {
      params: type ? { type } : undefined,
    });
    return res.data;
  },

  get: async (id: string) => {
    const res = await api.get<FinancialObjective>(`/objectives/${id}`);
    return res.data;
  },

  create: async (payload: CreateObjectivePayload) => {
    const res = await api.post<FinancialObjective>('/objectives', payload);
    return res.data;
  },

  update: async (id: string, payload: UpdateObjectivePayload) => {
    const res = await api.patch<FinancialObjective>(
      `/objectives/${id}`,
      payload,
    );
    return res.data;
  },

  remove: async (id: string) => {
    await api.delete(`/objectives/${id}`);
  },

  addEntry: async (id: string, payload: CreateObjectiveEntryPayload) => {
    const res = await api.post<FinancialObjective>(
      `/objectives/${id}/entries`,
      payload,
    );
    return res.data;
  },

  getEntries: async (id: string) => {
    const res = await api.get<ObjectiveEntry[]>(`/objectives/${id}/entries`);
    return res.data;
  },

  getForecast: async (id: string) => {
    const res = await api.get<Forecast>(`/objectives/${id}/forecast`);
    return res.data;
  },

  getMonthlySpending: async () => {
    const res = await api.get<MonthlySpendingEntry[]>(
      '/objectives/spending/monthly',
    );
    return res.data;
  },
};
