import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Transaction, CreditCard, FinancialSummary } from '../types';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

interface DailyBalance {
  date: string; // DD/MM
  balance: number;
}

interface FinanceContextType {
  transactions: Transaction[];
  filteredTransactions: Transaction[]; // Transactions for the selected month
  cards: CreditCard[];
  summary: FinancialSummary;
  dailyForecast: DailyBalance[];
  loading: boolean;
  selectedDate: Date;
  nextMonth: () => void;
  prevMonth: () => void;
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
  const [selectedDate, setSelectedDate] = useState(new Date());

  const nextMonth = () => {
    setSelectedDate(prev => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + 1);
      return next;
    });
  };

  const prevMonth = () => {
    setSelectedDate(prev => {
      const prevDate = new Date(prev);
      prevDate.setMonth(prev.getMonth() - 1);
      return prevDate;
    });
  };

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
        // Fetch Cards
        const { data: cardsData, error: cardsError } = await supabase
            .from('credit_cards')
            .select('*');
        
        if (cardsError) throw cardsError;

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

  // --- Date & Invoice Logic ---

  // Helper: determine which invoice month a transaction belongs to
  const getInvoiceDate = (transactionDate: string | Date, closingDay: number): Date => {
    const tDate = new Date(transactionDate);
    // If transaction day > closing day, it belongs to NEXT month
    if (tDate.getDate() > closingDay) {
        tDate.setMonth(tDate.getMonth() + 1);
    }
    return tDate;
  };

  // Memoize filtered transactions based on selectedDate
  const filteredTransactions = useMemo(() => {
    const sMonth = selectedDate.getMonth();
    const sYear = selectedDate.getFullYear();

    return transactions.filter(t => {
      const tDate = new Date(t.date);

      if (t.cardId) {
        const card = cards.find(c => c.id === t.cardId);
        if (card) {
          const invoiceDate = getInvoiceDate(tDate, card.closingDay);
          return invoiceDate.getMonth() === sMonth && invoiceDate.getFullYear() === sYear;
        }
      }

      // Normal transactions (Cash/Debit)
      return tDate.getMonth() === sMonth && tDate.getFullYear() === sYear;
    });
  }, [transactions, selectedDate, cards]);

  const calculateFinancials = () => {
    const sMonth = selectedDate.getMonth();
    const sYear = selectedDate.getFullYear();

    // Global Balance (All time paid income - All time paid expense)
    // Actually, usually users want "Current Account Balance". 
    // This is sum of ALL realized transactions ever.
    let globalBalance = 0;
    transactions.forEach(t => {
        if (t.isPaid && !t.cardId) {
            if (t.type === 'income') globalBalance += t.amount;
            else globalBalance -= t.amount;
        }
        // Card payments (paying the bill) should be treated as expenses if we tracked them.
        // For this simple app, we don't explicitly track "Bill Payment" transactions yet, 
        // or we treat them as normal expenses.
        // Assuming 'cardId' transactions are liability, not immediate cash flow.
    });

    let income = 0;
    let expense = 0;
    let pendingIncome = 0;
    let pendingExpense = 0;
    let cardInvoiceTotal = 0;

    // Daily Forecast Data for the selected month
    const dailyMap = new Map<number, number>();
    const lastDay = new Date(sYear, sMonth + 1, 0).getDate();
    
    for(let i=1; i<=lastDay; i++) {
        dailyMap.set(i, 0);
    }

    // Process Filtered Transactions (Only what's in this month view)
    filteredTransactions.forEach(t => {
      const tDate = new Date(t.date);
      // For chart mapping, we use the actual date of transaction if it falls in this month,
      // OR the 1st of month if it was brought here by invoice logic?
      // Let's use the transaction day, clamped.
      let day = tDate.getDate();
      
      // If it's a card transaction from previous month appearing here due to invoice:
      if (tDate.getMonth() !== sMonth) day = 1; 

      if (t.cardId) {
          // It's a credit card expense for this month's invoice
          if (!t.isPaid) {
            cardInvoiceTotal += t.amount;
            // Card expenses don't hit cash balance immediately, so don't add to income/expense/forecast 
            // UNLESS we want to show "Projected Cash if I pay the bill".
            // Typically, Forecast = Current Balance + Income - Expenses - Bills.
            
            // Let's assume the bill is paid on Due Day.
            const card = cards.find(c => c.id === t.cardId);
            if (card) {
                const due = card.dueDay;
                // Add to daily map as an expense on the due day
                const currentVal = dailyMap.get(due) || 0;
                dailyMap.set(due, currentVal - t.amount);
            }
          }
      } else {
          // Cash/Debit
          if (t.type === 'income') {
              income += t.amount;
              if (!t.isPaid) pendingIncome += t.amount;
              
              const currentVal = dailyMap.get(day) || 0;
              dailyMap.set(day, currentVal + t.amount);
          } else {
              expense += t.amount;
              if (!t.isPaid) pendingExpense += t.amount;
              
              const currentVal = dailyMap.get(day) || 0;
              dailyMap.set(day, currentVal - t.amount);
          }
      }
    });

    // Build Forecast Curve
    // Start with global balance? Or start with 0 for "Month Flow"?
    // Users usually want "Projected End Balance".
    // So we take Global Balance (Current Real) and apply future changes.
    // BUT if we look at a FUTURE month, Global Balance includes stuff from now.
    // Simpler approach for this MVP: 
    // Start with `globalBalance`.
    // For the chart: Accumulate daily changes.
    
    let runningBalance = globalBalance;
    const dailyForecast: DailyBalance[] = [];

    // However, if we are in a past month, 'globalBalance' is the end result.
    // To show the history of that month correctly is hard without a time-machine balance.
    // Fix: Just show the "Flow" (cumulative change) for the month, OR
    // Project from TODAY.
    
    // Let's Project:
    // If selected month is Current Month: Start with Current Balance.
    // If selected month != Current Month: This is just a simulation. 
    // Let's just show the running tally of that month's operations + Current Balance as offset 
    // (though not technically accurate for past months, it's good enough for visual trend).
    
    for (let i = 1; i <= lastDay; i++) {
        const dayChange = dailyMap.get(i) || 0;
        runningBalance += dayChange;
        
        if (i % 3 === 0 || i === 1 || i === lastDay) {
            dailyForecast.push({
                date: `${i}/${sMonth+1}`,
                balance: runningBalance
            });
        }
    }

    // Forecast is the final number
    const forecast = runningBalance;

    return {
      summary: {
        balance: globalBalance,
        income,
        expense,
        pendingIncome,
        pendingExpense,
        cardInvoiceTotal,
        forecast
      },
      dailyForecast
    };
  };

  const { summary, dailyForecast } = calculateFinancials();

  return (
    <FinanceContext.Provider value={{ 
      transactions, 
      filteredTransactions,
      cards, 
      summary,
      dailyForecast,
      loading, 
      selectedDate,
      nextMonth,
      prevMonth,
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
