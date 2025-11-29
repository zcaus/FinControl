import React, { createContext, useContext, useState, useEffect } from 'react';
import { Transaction, CreditCard, FinancialSummary } from '../types';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

interface FinanceContextType {
  transactions: Transaction[];
  cards: CreditCard[];
  summary: FinancialSummary;
  loading: boolean;
  addTransaction: (t: Omit<Transaction, 'id'>) => Promise<void>;
  editTransaction: (id: string, updated: Omit<Transaction, 'id'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  toggleTransactionStatus: (id: string) => Promise<void>;
  addCard: (c: Omit<CreditCard, 'id'>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider = ({ children }: React.PropsWithChildren) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
        // Fetch Cards
        const { data: cardsData, error: cardsError } = await supabase
            .from('credit_cards')
            .select('*');
        
        if (cardsError) throw cardsError;

        // Map snake_case to camelCase
        const mappedCards: CreditCard[] = (cardsData || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            limit: parseFloat(c.limit),
            closingDay: c.closing_day,
            dueDay: c.due_day,
            color: c.color
        }));
        setCards(mappedCards);

        // Fetch Transactions
        const { data: transData, error: transError } = await supabase
            .from('transactions')
            .select('*');

        if (transError) throw transError;

        // Map snake_case to camelCase
        const mappedTrans: Transaction[] = (transData || []).map((t: any) => ({
            id: t.id,
            description: t.description,
            amount: parseFloat(t.amount),
            type: t.type,
            date: t.date,
            isPaid: t.is_paid,
            category: t.category,
            cardId: t.card_id,
            isRecurring: t.is_recurring
        }));
        setTransactions(mappedTrans);

    } catch (err) {
        console.error("Error fetching data:", err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
        fetchData();
    } else {
        setTransactions([]);
        setCards([]);
    }
  }, [user]);

  const addTransaction = async (t: Omit<Transaction, 'id'>) => {
    if (!user) return;
    
    // Optimistic update
    const tempId = crypto.randomUUID();
    const newTrans = { ...t, id: tempId };
    setTransactions(prev => [...prev, newTrans]);

    const { data, error } = await supabase.from('transactions').insert({
        description: t.description,
        amount: t.amount,
        type: t.type,
        date: t.date,
        is_paid: t.isPaid,
        category: t.category,
        card_id: t.cardId || null,
        is_recurring: t.isRecurring,
        user_id: (await supabase.auth.getUser()).data.user?.id
    }).select().single();

    if (error) {
        console.error("Error adding transaction", error);
        // Revert optimistic
        setTransactions(prev => prev.filter(item => item.id !== tempId));
    } else if (data) {
        // Update ID with real one
        setTransactions(prev => prev.map(item => item.id === tempId ? { ...newTrans, id: data.id } : item));
    }
  };

  const editTransaction = async (id: string, updated: Omit<Transaction, 'id'>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...updated, id } : t));

    await supabase.from('transactions').update({
        description: updated.description,
        amount: updated.amount,
        type: updated.type,
        date: updated.date,
        is_paid: updated.isPaid,
        category: updated.category,
        card_id: updated.cardId || null,
        is_recurring: updated.isRecurring
    }).eq('id', id);
  };

  const deleteTransaction = async (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    await supabase.from('transactions').delete().eq('id', id);
  };

  const toggleTransactionStatus = async (id: string) => {
    const t = transactions.find(item => item.id === id);
    if (!t) return;

    const newStatus = !t.isPaid;
    setTransactions(prev => prev.map(item => item.id === id ? { ...item, isPaid: newStatus } : item));

    await supabase.from('transactions').update({ is_paid: newStatus }).eq('id', id);
  };

  const addCard = async (c: Omit<CreditCard, 'id'>) => {
    const tempId = crypto.randomUUID();
    const newCard = { ...c, id: tempId };
    setCards(prev => [...prev, newCard]);

    const { data, error } = await supabase.from('credit_cards').insert({
        name: c.name,
        limit: c.limit,
        closing_day: c.closingDay,
        due_day: c.dueDay,
        color: c.color,
        user_id: (await supabase.auth.getUser()).data.user?.id
    }).select().single();

    if (error) {
        setCards(prev => prev.filter(item => item.id !== tempId));
    } else if (data) {
        setCards(prev => prev.map(item => item.id === tempId ? { ...newCard, id: data.id } : item));
    }
  };

  const deleteCard = async (id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
    setTransactions(prev => prev.map(t => t.cardId === id ? { ...t, cardId: undefined } : t));
    
    await supabase.from('credit_cards').delete().eq('id', id);
  };

  // Calculations (Same as before)
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

      if (t.cardId) {
        if (!t.isPaid) {
          cardInvoiceTotal += t.amount;
        }
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
      loading, 
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