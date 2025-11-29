export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  date: string; // ISO String YYYY-MM-DD
  isPaid: boolean; // Concretizada
  category: string;
  cardId?: string; // If attached to a credit card
  isRecurring?: boolean;
}

export interface CreditCard {
  id: string;
  name: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  color: string;
}

export interface UserPreferences {
  language: string;
  notifications: boolean;
}

export interface User {
  email: string;
  name: string;
  preferences?: UserPreferences;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface FinancialSummary {
  balance: number; // Current realized balance
  income: number; // Total realized income
  expense: number; // Total realized expense
  pendingIncome: number;
  pendingExpense: number;
  forecast: number; // Balance + Pending Income - Pending Expense (excluding Card expenses which are separate liability)
  cardInvoiceTotal: number;
}