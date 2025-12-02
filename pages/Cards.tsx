import React, { useState } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { useTheme } from '../contexts/ThemeContext';
import { CreditCard as CardIcon, Plus, Trash2, X, CalendarArrowUp, AlertCircle } from 'lucide-react';
import { CreditCard, Transaction } from '../types';

const Cards = () => {
  const { cards, addCard, deleteCard, transactions, filteredTransactions, selectedDate } = useFinance();
  const { privacyMode } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Form
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const blurClass = privacyMode ? "blur-sm transition-all duration-300 select-none" : "transition-all duration-300";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addCard({
      name,
      limit: parseFloat(limit),
      closingDay: parseInt(closingDay),
      dueDay: parseInt(dueDay),
      color: 'bg-slate-800'
    });
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setLimit('');
    setClosingDay('');
    setDueDay('');
  };

  // --- Logic for Invoice Calculation ---

  // Helper to determine the invoice date of a transaction given the closing day
  const getInvoiceDate = (dateStr: string, closingDay: number) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    // Create date at noon to avoid timezone shifts
    const transDate = new Date(y, m - 1, d, 12, 0, 0);
    
    // If day is strictly greater than closing day, it belongs to next month's invoice
    if (d > closingDay) {
        transDate.setMonth(transDate.getMonth() + 1);
    }
    return transDate;
  };

  const getCardDetails = (cardId: string) => {
      const card = cards.find(c => c.id === cardId);
      if (!card) return { current: [], next: [], currentTotal: 0, nextTotal: 0 };

      const currentMonth = selectedDate.getMonth();
      const currentYear = selectedDate.getFullYear();

      // We look at ALL transactions to properly bucket them
      const cardTrans = transactions.filter(t => t.cardId === cardId);

      const currentInvoice: Transaction[] = [];
      const nextInvoice: Transaction[] = [];

      cardTrans.forEach(t => {
          const invoiceDate = getInvoiceDate(t.date, card.closingDay);
          
          const isCurrent = invoiceDate.getMonth() === currentMonth && invoiceDate.getFullYear() === currentYear;
          // Check specifically for the NEXT month relative to selectedDate
          const nextMonthDate = new Date(currentYear, currentMonth + 1, 1);
          const isNext = invoiceDate.getMonth() === nextMonthDate.getMonth() && invoiceDate.getFullYear() === nextMonthDate.getFullYear();

          if (isCurrent) currentInvoice.push(t);
          if (isNext) nextInvoice.push(t);
      });

      // Sort by date desc
      currentInvoice.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      nextInvoice.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const currentTotal = currentInvoice.filter(t => !t.isPaid).reduce((acc, t) => acc + t.amount, 0);
      const nextTotal = nextInvoice.filter(t => !t.isPaid).reduce((acc, t) => acc + t.amount, 0);

      return { current: currentInvoice, next: nextInvoice, currentTotal, nextTotal };
  };

  const { current: currentList, next: nextList, currentTotal, nextTotal } = selectedCardId ? getCardDetails(selectedCardId) : { current: [], next: [], currentTotal: 0, nextTotal: 0 };
  const selectedCard = cards.find(c => c.id === selectedCardId);

  // For the main card grid, we use the pre-calculated logic or simple current total
  const getCardDisplayTotal = (id: string) => {
     // Use filteredTransactions (context logic) for consistency with dashboard
     return filteredTransactions
      .filter(t => t.cardId === id && !t.isPaid)
      .reduce((acc, curr) => acc + curr.amount, 0);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Meus Cartões</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-brand-500/20 transition-all"
        >
          <Plus size={20} /> <span className="hidden sm:inline">Adicionar</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map(card => {
            const total = getCardDisplayTotal(card.id);
            const available = card.limit - total;
            const percentUsed = (total / card.limit) * 100;

            return (
                <div key={card.id} onClick={() => setSelectedCardId(card.id)} className="bg-slate-900 dark:bg-zinc-900 text-white p-6 rounded-3xl shadow-xl cursor-pointer transform transition-transform hover:-translate-y-1 relative overflow-hidden group border border-slate-700 dark:border-zinc-700">
                    <div className="flex justify-between items-start mb-8 relative z-10">
                        <CardIcon size={32} className="opacity-80" />
                        <span className="font-mono text-lg tracking-widest opacity-80">**** {card.dueDay.toString().padStart(2, '0')}</span>
                    </div>
                    
                    <div className="relative z-10">
                        <p className="text-slate-400 text-xs mb-1">Fatura do Mês (Aberto)</p>
                        <h3 className={`text-2xl font-bold mb-4 ${blurClass}`}>{formatCurrency(total)}</h3>
                        
                        <div className="flex justify-between text-xs text-slate-400 mb-2">
                             <span className={blurClass}>Disp: {formatCurrency(available)}</span>
                             <span className={blurClass}>Lim: {formatCurrency(card.limit)}</span>
                        </div>
                        <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                            <div className={`h-full ${percentUsed > 90 ? 'bg-rose-500' : 'bg-brand-400'}`} style={{ width: `${Math.min(percentUsed, 100)}%` }}></div>
                        </div>
                    </div>
                    
                    <div className="mt-6 flex justify-between items-center relative z-10">
                         <span className="font-medium uppercase tracking-wider text-sm">{card.name}</span>
                         <span className="text-xs bg-slate-700 px-2 py-1 rounded">Fecha dia {card.closingDay}</span>
                    </div>

                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors"></div>
                    <button onClick={(e) => { e.stopPropagation(); deleteCard(card.id); }} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-rose-400 z-20">
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        })}
        
        {cards.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 dark:text-slate-600 bg-white dark:bg-zinc-900 border border-dashed border-slate-300 dark:border-zinc-700 rounded-3xl">
                <p>Nenhum cartão cadastrado.</p>
            </div>
        )}
      </div>

       {/* Card Detail Modal (Transaction List) */}
       {selectedCardId && selectedCard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
             <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl shadow-2xl h-[85vh] flex flex-col border border-slate-100 dark:border-zinc-700 overflow-hidden animate-in zoom-in-95 duration-200">
                 
                 {/* Header */}
                 <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50 dark:bg-zinc-900/50">
                     <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">{selectedCard.name}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Detalhamento de Faturas</p>
                     </div>
                     <button onClick={() => setSelectedCardId(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-full text-slate-500 dark:text-slate-400 transition-colors"><X size={20} /></button>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
                     
                     {/* CURRENT INVOICE SECTION */}
                     <div>
                        <div className="flex justify-between items-end mb-3">
                            <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm uppercase tracking-wide">Fatura Atual</h4>
                            <span className={`text-lg font-bold text-slate-800 dark:text-white ${blurClass}`}>{formatCurrency(currentTotal)}</span>
                        </div>
                        
                        {currentList.length > 0 ? (
                             <div className="space-y-2">
                                 {currentList.map(t => (
                                     <div key={t.id} className="p-3 border border-slate-100 dark:border-zinc-800 rounded-xl flex justify-between items-center bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                                         <div className="flex items-center gap-3">
                                             <div className="w-1 h-8 bg-slate-200 dark:bg-zinc-700 rounded-full"></div>
                                             <div>
                                                 <p className="font-medium text-sm text-slate-800 dark:text-slate-200">{t.description}</p>
                                                 <p className="text-xs text-slate-400">{t.date.split('-').reverse().join('/')}</p>
                                             </div>
                                         </div>
                                         <span className={`font-bold text-sm text-slate-700 dark:text-slate-300 ${blurClass}`}>{formatCurrency(t.amount)}</span>
                                     </div>
                                 ))}
                             </div>
                        ) : (
                             <div className="p-6 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl text-center text-slate-400 text-sm">
                                Nenhuma compra para esta fatura.
                             </div>
                        )}
                     </div>

                     {/* NEXT INVOICE SECTION */}
                     {nextList.length > 0 && (
                        <div className="animate-in slide-in-from-bottom-2 fade-in">
                            <div className="flex justify-between items-end mb-3 mt-4">
                                <h4 className="font-bold text-indigo-600 dark:text-indigo-400 text-sm uppercase tracking-wide flex items-center gap-2">
                                    <CalendarArrowUp size={16} />
                                    Próxima Fatura
                                </h4>
                                <span className={`text-lg font-bold text-indigo-600 dark:text-indigo-400 ${blurClass}`}>{formatCurrency(nextTotal)}</span>
                            </div>
                            <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl p-4 space-y-2">
                                <div className="flex items-center gap-2 text-xs text-indigo-600/70 dark:text-indigo-400/70 mb-2 px-1">
                                    <AlertCircle size={12} />
                                    <span>Compras após o fechamento (dia {selectedCard.closingDay})</span>
                                </div>
                                {nextList.map(t => (
                                     <div key={t.id} className="p-3 bg-white/60 dark:bg-zinc-900/60 border border-indigo-100/50 dark:border-indigo-900/30 rounded-xl flex justify-between items-center">
                                         <div>
                                             <p className="font-medium text-sm text-slate-800 dark:text-slate-200">{t.description}</p>
                                             <p className="text-xs text-slate-400">{t.date.split('-').reverse().join('/')}</p>
                                         </div>
                                         <span className={`font-bold text-sm text-slate-700 dark:text-slate-300 ${blurClass}`}>{formatCurrency(t.amount)}</span>
                                     </div>
                                 ))}
                            </div>
                        </div>
                     )}

                 </div>
                 
                 <div className="p-4 bg-slate-50 dark:bg-zinc-900/50 border-t border-slate-100 dark:border-zinc-800">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500 dark:text-slate-400">Total Acumulado</span>
                        <span className={`font-bold text-xl text-slate-900 dark:text-white ${blurClass}`}>{formatCurrency(currentTotal + nextTotal)}</span>
                      </div>
                 </div>
             </div>
        </div>
       )}

      {/* Add Card Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-zinc-700 animate-in slide-in-from-bottom-10 fade-in duration-300">
            <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">Adicionar Cartão</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Apelido do Cartão</label>
                <input required value={name} onChange={e => setName(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Ex: Nubank, Visa..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Limite</label>
                <input required type="number" value={limit} onChange={e => setLimit(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="5000,00" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dia Fechamento</label>
                   <input required type="number" min="1" max="31" value={closingDay} onChange={e => setClosingDay(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="10" />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dia Vencimento</label>
                   <input required type="number" min="1" max="31" value={dueDay} onChange={e => setDueDay(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="20" />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/20">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cards;