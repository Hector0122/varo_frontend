export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  note?: string | null;
  date: string;
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  savingAllocation: number;
  createdAt: string;
}

export interface Forecast {
  goalId: string;
  goalName: string;
  remainingAmount: number;
  avgMonthlySaving: number;
  monthlyNeeded: number;
  estimatedDays: number;
  estimatedDate: string;
  trend: 'up' | 'stable' | 'down';
  confidenceScore: number;
  savingAllocation: number;
  totalMonthlySaving: number;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: 'INCOME' | 'EXPENSE' | 'BOTH';
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
}

export interface Debt {
  id: string;
  userId: string;
  name: string;
  totalAmount: number;
  currentAmount: number;
  dueDate?: string | null;
  statementDay: number;
  createdAt: string;
}

export interface DebtPayment {
  id: string;
  debtId: string;
  amount: number;
  type: 'PAYMENT' | 'INCREASE';
  note?: string | null;
  installments?: number;
  purchaseDate?: string;
  createdAt: string;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  amount: number;
  type: 'ADD' | 'WITHDRAW';
  note?: string | null;
  date: string;
  createdAt: string;
}

export interface MonthlySpendingEntry {
  debtId: string;
  monthlySpending: number;
  periodStart: string;
  periodEnd: string;
}

export type FinancialObjectiveType = 'SAVING_GOAL' | 'DEBT_PAYOFF';

export interface FinancialObjective {
  id: string;
  userId: string;
  type: FinancialObjectiveType;
  name: string;
  targetAmount: number;
  currentAmount: number;
  savingAllocation: number | null;
  dueDate?: string | null;
  statementDay: number | null;
  createdAt: string;
}

export type ObjectiveEntryType = 'ADD' | 'WITHDRAW' | 'PAYMENT' | 'INCREASE';

export interface ObjectiveEntry {
  id: string;
  objectiveId: string;
  amount: number;
  type: ObjectiveEntryType;
  note?: string | null;
  installments?: number;
  purchaseDate: string;
  createdAt: string;
}
