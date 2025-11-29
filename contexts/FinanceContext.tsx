import React, { createContext, useContext, useState, useEffect } from 'react';
import { Transaction, CreditCard, FinancialSummary } from '../types';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

interface DailyBalance {
  date: string; // DD/MM
  balance: number;
}

interface FinanceContextType {
  transactions: Transaction[];
  cards: CreditCard[];
  summary: FinancialSummary;
  dailyForecast: DailyBalance[];
  loading: boolean;
  addTransaction: (t: Omit<Transaction, 'id'>) => Promise<void>;
  editTransaction: (id: string, updated: Omit<Transaction, 'id'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  toggleTransactionStatus: (id: string) => Promise<void>;
  addCard: (c: Omit<CreditCard, 'id'>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  getMostFrequentCategory: (description: string) => string | null;
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
        setTransactions(prev => prev.filter(item => item.id !== tempId));
    } else if (data) {
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

  const getMostFrequentCategory = (description: string): string | null => {
    if (!description) return null;
    const match = transactions
        .find(t => t.description.toLowerCase() === description.toLowerCase() && t.category);
    return match ? match.category : null;
  };

  // Calculations
  const calculateFinancials = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let balance = 0;
    let income = 0;
    let expense = 0;
    let pendingIncome = 0;
    let pendingExpense = 0;
    let cardInvoiceTotal = 0;

    // Daily Forecast Data
    const dailyMap = new Map<number, number>();
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Initialize days with 0 change
    for(let i=1; i<=lastDay; i++) {
        dailyMap.set(i, 0);
    }

    // Process transactions
    transactions.forEach(t => {
      const tDate = new Date(t.date);
      const tDay = tDate.getDate();
      const isCurrentMonth = tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;

      // Handle Credit Cards Logic
      if (t.cardId) {
        const card = cards.find(c => c.id === t.cardId);
        if (card) {
            // Check if transaction falls into CURRENT month's invoice
            // Logic: A transaction belongs to current month invoice if date <= closingDay
            // If date > closingDay, it goes to NEXT month invoice.
            
            // Simplified check: Is this transaction unpaid and part of the "active" invoice period?
            // For the dashboard summary, we usually want to know "What do I have to pay THIS month?"
            
            // If today is before closing day: Current invoice includes transactions from last_closing to now.
            
            // Let's stick to simple dashboard view: 
            // cardInvoiceTotal = Sum of unpaid card transactions that are "due" this month or past due.
            
            // If transaction date is in current month:
            // AND transaction day <= closing day -> It is due THIS month.
            // If transaction day > closing day -> It is due NEXT month (skip for current liability).
            
            // If transaction is from previous months and unpaid -> Add to total.
            
            const isFutureInvoice = isCurrentMonth && tDay > card.closingDay;
            
            if (!t.isPaid && !isFutureInvoice && tDate <= now) {
                cardInvoiceTotal += t.amount;
            } else if (!t.isPaid && !isFutureInvoice && isCurrentMonth) {
                // It is in current month invoice but date is in future (e.g. scheduled)? 
                // Usually card transactions are past, but recurring ones might be future dated.
                cardInvoiceTotal += t.amount;
            }
        }
        return; // Don't subtract from cash balance directly
      }

      // Cash/Debit Transactions
      if (t.type === 'income') {
        if (t.isPaid) {
          balance += t.amount;
          income += t.amount;
        } else if (isCurrentMonth) {
          pendingIncome += t.amount;
          // Add to daily forecast map
          const val = dailyMap.get(tDay) || 0;
          dailyMap.set(tDay, val + t.amount);
        }
      } else {
        if (t.isPaid) {
          balance -= t.amount;
          expense += t.amount;
        } else if (isCurrentMonth) {
          pendingExpense += t.amount;
          // Subtract from daily forecast map
          const val = dailyMap.get(tDay) || 0;
          dailyMap.set(tDay, val - t.amount);
        }
      }
    });

    // Build Cumulative Daily Forecast
    let runningBalance = balance;
    const dailyForecast: DailyBalance[] = [];
    const todayDay = now.getDate();

    // Start from today until end of month
    for (let i = 1; i <= lastDay; i++) {
        // If day is past, just keep current balance flat or use history? 
        // For forecast, we usually start "now".
        // But for a chart, it's nice to see the whole month.
        // Simplified: The chart will show the projected path of the balance for the whole month
        // assuming Paid transactions happened in the past and Pending happen in the future.
        
        // However, to make it look like a "Forecast", let's take the current realized balance
        // and only apply pending changes from today onwards.
        
        if (i >= todayDay) {
            const dayChange = dailyMap.get(i) || 0;
            runningBalance += dayChange;
        }
        
        // Push to chart data
        if (i >= todayDay || i % 5 === 0 || i === 1) { // Optimize data points if needed, or push all
            dailyForecast.push({
                date: `${i}/${currentMonth+1}`,
                balance: runningBalance
            });
        }
    }
    
    // Sort just in case
    // dailyForecast is already sorted by loop index.

    return {
      summary: {
        balance,
        income,
        expense,
        pendingIncome,
        pendingExpense,
        cardInvoiceTotal,
        forecast: balance + pendingIncome - pendingExpense
      },
      dailyForecast
    };
  };

  const { summary, dailyForecast } = calculateFinancials();

  return (
    <FinanceContext.Provider value={{ 
      transactions, 
      cards, 
      summary,
      dailyForecast,
      loading, 
      addTransaction,
      editTransaction, 
      deleteTransaction,
      toggleTransactionStatus,
      addCard,
      deleteCard,
      getMostFrequentCategory
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