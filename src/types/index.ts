export interface User {
  id: string;
  email: string;
}

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
  createdAt: string;
}

export interface DebtPayment {
  id: string;
  debtId: string;
  amount: number;
  type: 'PAYMENT' | 'INCREASE';
  createdAt: string;
}
