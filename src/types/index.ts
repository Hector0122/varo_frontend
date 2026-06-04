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
