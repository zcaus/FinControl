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
  availableCategories: string[];
  nextMonth: () => void;
  prevMonth: () => void;
  addTransaction: (t: Omit<Transaction, 'id'>) => Promise<void>;
  editTransaction: (id: string, updated: Omit<Transaction, 'id'>, scope?: 'single' | 'all_future') => Promise<void>;
  deleteTransaction: (id: string, scope?: 'single' | 'all_future') => Promise<void>;
  toggleTransactionStatus: (id: string) => Promise<void>;
  addCard: (c: Omit<CreditCard, 'id'>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  getMostFrequentCategory: (description: string) => string | null;
  updateCategory: (oldName: string, newName: string) => Promise<void>;
  deleteCategory: (categoryName: string) => Promise<void>;
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

  // --- RECURRING LOGIC START ---
  
  // This function checks the PREVIOUS month for recurring transactions
  // and creates copies of them in the CURRENT month if they don't exist yet.
  const syncRecurringTransactions = async (targetDate: Date, currentTransactions: Transaction[]) => {
    if (!user) return;
    
    // 1. Determine Previous Month
    const prevMonthDate = new Date(targetDate);
    prevMonthDate.setMonth(targetDate.getMonth() - 1);
    
    const pMonth = prevMonthDate.getMonth();
    const pYear = prevMonthDate.getFullYear();

    const tMonth = targetDate.getMonth();
    const tYear = targetDate.getFullYear();

    // 2. Find recurring transactions in the previous month
    const prevMonthRecurring = currentTransactions.filter(t => {
        // Safe check using string split to avoid timezone shifts on simple check
        const [y, m] = t.date.split('-').map(Number);
        // split month is 1-based (01 = Jan), JS Date is 0-based. 
        // We compare m-1 === pMonth.
        return t.isRecurring && (m - 1) === pMonth && y === pYear;
    });

    if (prevMonthRecurring.length === 0) return;

    const newTransactions: Transaction[] = [];

    // 3. Check if they already exist in the target month
    for (const t of prevMonthRecurring) {
        // FIX: Use string manipulation to preserve the exact day
        // t.date is "YYYY-MM-DD"
        const dayOfMonth = parseInt(t.date.split('-')[2]);

        // Create date object in target month using local time to test overflow
        // Javascript handles overflow: e.g. Feb 31 becomes Mar 3 (or similar)
        const newDateObj = new Date(tYear, tMonth, dayOfMonth);
        
        // Check if we overflowed the month (e.g. 31st -> Feb -> Mar)
        if (newDateObj.getMonth() !== tMonth) {
            // Set to last day of the intended month
            // passing 0 as day goes to the last day of previous month relative to the object
            // The object is currently in "Month + 1", so going back 1 day puts us at end of "Month"
            newDateObj.setDate(0); 
        }
        
        // Manually construct YYYY-MM-DD string to avoid timezone shifts (toISOString issues)
        const finalYear = newDateObj.getFullYear();
        const finalMonth = String(newDateObj.getMonth() + 1).padStart(2, '0');
        const finalDay = String(newDateObj.getDate()).padStart(2, '0');
        
        const newDateStr = `${finalYear}-${finalMonth}-${finalDay}`;

        // Check if a transaction with same recurringId (or same description/amount if id missing) exists in target month
        const exists = currentTransactions.some(ct => {
            const [ctY, ctM] = ct.date.split('-').map(Number);
            const isSameMonth = (ctM - 1) === tMonth && ctY === tYear;
            
            if (!isSameMonth) return false;

            if (t.recurringId && ct.recurringId === t.recurringId) return true;
            // Fallback for legacy data without recurringId
            return ct.description === t.description && ct.amount === t.amount && ct.type === t.type;
        });

        if (!exists) {
            // Clone it
            const recurringIdToUse = t.recurringId || crypto.randomUUID();
            
            const newTrans: Transaction = {
                ...t,
                id: crypto.randomUUID(), // Temp ID
                date: newDateStr,
                isPaid: false, // Future recurring items start as unpaid
                recurringId: recurringIdToUse
            };
            
            newTransactions.push(newTrans);
        }
    }

    // 4. Batch Insert
    if (newTransactions.length > 0) {
        // Update local state immediately for UI snapiness
        setTransactions(prev => [...prev, ...newTransactions]);

        // Insert into Supabase
        const rows = newTransactions.map(t => ({
            description: t.description,
            amount: t.amount,
            type: t.type,
            date: t.date,
            is_paid: t.isPaid,
            category: t.category,
            card_id: t.cardId || null,
            is_recurring: true,
            recurring_id: t.recurringId,
            user_id: user.id // We need user id here, but context user might be null in async? handled by hook check
        }));

        // We can't use user.id directly if it's potentially stale, better get from supabase auth
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) return;

        const rowsWithUser = rows.map(r => ({ ...r, user_id: currentUser.id }));

        const { data, error } = await supabase.from('transactions').insert(rowsWithUser).select();
        
        if (error) {
            console.error("Error syncing recurring transactions", error);
        } else if (data) {
            // Update local state with real IDs from DB
            setTransactions(prev => {
                // Remove the temp ones we added
                const withoutTemps = prev.filter(p => !newTransactions.some(nt => nt.id === p.id));
                // Add the real ones
                const mappedReal = data.map((d: any) => ({
                    id: d.id,
                    description: d.description,
                    amount: parseFloat(d.amount),
                    type: d.type,
                    date: d.date,
                    isPaid: d.is_paid,
                    category: d.category,
                    cardId: d.card_id,
                    isRecurring: d.is_recurring,
                    recurringId: d.recurring_id
                }));
                return [...withoutTemps, ...mappedReal];
            });
        }
    }
  };

  // --- RECURRING LOGIC END ---

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
            isRecurring: t.is_recurring,
            recurringId: t.recurring_id
        }));
        
        setTransactions(mappedTrans);
        
        // Trigger Sync Check after fetch
        // We pass mappedTrans to avoid stale state issues
        syncRecurringTransactions(selectedDate, mappedTrans);

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
  }, [user, selectedDate]); // Refetch/Sync when month changes

  const addTransaction = async (t: Omit<Transaction, 'id'>) => {
    if (!user) return;
    
    const tempId = crypto.randomUUID();
    // If it's recurring and doesn't have an ID, generate one
    const recurringId = t.isRecurring ? (t.recurringId || crypto.randomUUID()) : undefined;

    const newTrans = { ...t, id: tempId, recurringId };
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
        recurring_id: recurringId,
        user_id: (await supabase.auth.getUser()).data.user?.id
    }).select().single();

    if (error) {
        console.error("Error adding transaction", error);
        setTransactions(prev => prev.filter(item => item.id !== tempId));
    } else if (data) {
        setTransactions(prev => prev.map(item => item.id === tempId ? { ...newTrans, id: data.id } : item));
    }
  };

  const editTransaction = async (id: string, updated: Omit<Transaction, 'id'>, scope: 'single' | 'all_future' = 'single') => {
    // Optimistic Update
    setTransactions(prev => prev.map(t => {
        if (t.id === id) return { ...updated, id };
        
        // Handle batch update for future recurring items
        if (scope === 'all_future' && t.recurringId && t.recurringId === updated.recurringId) {
             const tDate = new Date(t.date);
             const uDate = new Date(updated.date); // This is the date of the item being edited
             
             // Update if it's in the future relative to the edited item
             if (tDate > uDate) {
                 return { 
                     ...t, 
                     description: updated.description,
                     amount: updated.amount,
                     category: updated.category,
                     type: updated.type,
                     isRecurring: updated.isRecurring
                     // Keep existing date
                 };
             }
        }
        return t;
    }));

    if (scope === 'single') {
        await supabase.from('transactions').update({
            description: updated.description,
            amount: updated.amount,
            type: updated.type,
            date: updated.date,
            is_paid: updated.isPaid,
            category: updated.category,
            card_id: updated.cardId || null,
            is_recurring: updated.isRecurring,
            recurring_id: updated.recurringId
        }).eq('id', id);
    } else if (scope === 'all_future' && updated.recurringId) {
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

        await supabase.from('transactions')
            .update({
                description: updated.description,
                amount: updated.amount,
                type: updated.type,
                category: updated.category,
                is_recurring: updated.isRecurring
            })
            .eq('recurring_id', updated.recurringId)
            .gt('date', updated.date);
    }
  };

  const deleteTransaction = async (id: string, scope: 'single' | 'all_future' = 'single') => {
    const target = transactions.find(t => t.id === id);
    if (!target) return;

    if (scope === 'single') {
        setTransactions(prev => prev.filter(t => t.id !== id));
        await supabase.from('transactions').delete().eq('id', id);
    } else if (scope === 'all_future' && target.recurringId) {
        setTransactions(prev => prev.filter(t => {
            if (t.id === id) return false;
            if (t.recurringId === target.recurringId && new Date(t.date) > new Date(target.date)) return false;
            return true;
        }));

        await supabase.from('transactions').delete().eq('id', id);
        await supabase.from('transactions')
            .delete()
            .eq('recurring_id', target.recurringId)
            .gt('date', target.date);
    }
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

  // --- Category Management ---
  
  const availableCategories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [transactions]);

  const updateCategory = async (oldName: string, newName: string) => {
    if (!oldName || !newName || oldName === newName) return;

    // Optimistic
    setTransactions(prev => prev.map(t => 
        t.category === oldName ? { ...t, category: newName } : t
    ));

    await supabase.from('transactions')
        .update({ category: newName })
        .eq('category', oldName);
  };

  const deleteCategory = async (categoryName: string) => {
    // Optimistic: remove category string but keep transaction
    setTransactions(prev => prev.map(t => 
        t.category === categoryName ? { ...t, category: '' } : t
    ));

    await supabase.from('transactions')
        .update({ category: '' })
        .eq('category', categoryName);
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

    let globalBalance = 0;
    transactions.forEach(t => {
        if (t.isPaid && !t.cardId) {
            if (t.type === 'income') globalBalance += t.amount;
            else globalBalance -= t.amount;
        }
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

    filteredTransactions.forEach(t => {
      const tDate = new Date(t.date);
      let day = tDate.getDate();
      
      if (tDate.getMonth() !== sMonth) day = 1; 

      if (t.cardId) {
          if (!t.isPaid) {
            cardInvoiceTotal += t.amount;
            const card = cards.find(c => c.id === t.cardId);
            if (card) {
                const due = card.dueDay;
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

    let runningBalance = globalBalance;
    const dailyForecast: DailyBalance[] = [];

    // Project balance logic (Simplified)
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
      availableCategories,
      nextMonth,
      prevMonth,
      addTransaction,
      editTransaction, 
      deleteTransaction,
      toggleTransactionStatus,
      addCard,
      deleteCard,
      getMostFrequentCategory,
      updateCategory,
      deleteCategory
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