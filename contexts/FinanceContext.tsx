import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Transaction, CreditCard, FinancialSummary } from '../types';
import { storage } from '../services/storage';

interface FinanceContextType {
  transactions: Transaction[];
  cards: CreditCard[];
  summary: FinancialSummary;
  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  editTransaction: (id: string, updated: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  toggleTransactionStatus: (id: string) => void;
  addCard: (c: Omit<CreditCard, 'id'>) => void;
  deleteCard: (id: string) => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider = ({ children }: React.PropsWithChildren) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);

  useEffect(() => {
    setTransactions(storage.getTransactions());
    setCards(storage.getCards());
  }, []);

  useEffect(() => {
    storage.saveTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    storage.saveCards(cards);
  }, [cards]);

  const addTransaction = (t: Omit<Transaction, 'id'>) => {
    const newTransaction = { ...t, id: crypto.randomUUID() };
    setTransactions(prev => [...prev, newTransaction]);
  };

  const editTransaction = (id: string, updated: Omit<Transaction, 'id'>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...updated, id } : t));
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const toggleTransactionStatus = (id: string) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, isPaid: !t.isPaid } : t));
  };

  const addCard = (c: Omit<CreditCard, 'id'>) => {
    const newCard = { ...c, id: crypto.randomUUID() };
    setCards(prev => [...prev, newCard]);
  };

  const deleteCard = (id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
    // Remove card association from transactions
    setTransactions(prev => prev.map(t => t.cardId === id ? { ...t, cardId: undefined } : t));
  };

  // Calculations
  const calculateSummary = (): FinancialSummary => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let balance = 0;
    let income = 0;
    let expense = 0;
    let pendingIncome = 0;
    let pendingExpense = 0;
    let cardInvoiceTotal = 0;

    transactions.forEach(t => {
      const tDate = new Date(t.date);
      const isCurrentMonth = tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;

      // Card transactions don't affect main balance directly until paid, but we track them
      if (t.cardId) {
        if (!t.isPaid) {
          cardInvoiceTotal += t.amount;
        }
        // If a card transaction is marked paid, it means the bill including it was paid, 
        // or user manually cleared it. For simplicity in this app:
        // Card expenses are separate.
        return; 
      }

      if (t.type === 'income') {
        if (t.isPaid) {
          balance += t.amount;
          income += t.amount;
        } else if (isCurrentMonth) {
          pendingIncome += t.amount;
        }
      } else {
        if (t.isPaid) {
          balance -= t.amount;
          expense += t.amount;
        } else if (isCurrentMonth) {
          pendingExpense += t.amount;
        }
      }
    });

    return {
      balance,
      income,
      expense,
      pendingIncome,
      pendingExpense,
      cardInvoiceTotal,
      forecast: balance + pendingIncome - pendingExpense
    };
  };

  return (
    <FinanceContext.Provider value={{ 
      transactions, 
      cards, 
      summary: calculateSummary(), 
      addTransaction,
      editTransaction, 
      deleteTransaction,
      toggleTransactionStatus,
      addCard,
      deleteCard 
    }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('useFinance must be used within FinanceProvider');
  return context;
};