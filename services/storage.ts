import { Transaction, CreditCard, User } from '../types';

const KEYS = {
  TRANSACTIONS: 'fincontrol_transactions',
  CARDS: 'fincontrol_cards',
  USER: 'fincontrol_user',
};

export const storage = {
  getTransactions: (): Transaction[] => {
    const data = localStorage.getItem(KEYS.TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  },
  saveTransactions: (data: Transaction[]) => {
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(data));
  },
  getCards: (): CreditCard[] => {
    const data = localStorage.getItem(KEYS.CARDS);
    return data ? JSON.parse(data) : [];
  },
  saveCards: (data: CreditCard[]) => {
    localStorage.setItem(KEYS.CARDS, JSON.stringify(data));
  },
  getUser: (): User | null => {
    const data = localStorage.getItem(KEYS.USER);
    return data ? JSON.parse(data) : null;
  },
  saveUser: (user: User) => {
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
  },
  clearUser: () => {
    localStorage.removeItem(KEYS.USER);
  }
};