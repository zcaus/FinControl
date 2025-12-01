import React, { useState } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { useTheme } from '../contexts/ThemeContext';
import { CreditCard as CardIcon, Plus, Trash2, X } from 'lucide-react';
import { CreditCard } from '../types';

const Cards = () => {
  const { cards, addCard, deleteCard, filteredTransactions } = useFinance();
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

  const getCardTotal = (id: string) => {
    // Uses filteredTransactions which already respects the invoice month logic
    return filteredTransactions
      .filter(t => t.cardId === id && !t.isPaid)
      .reduce((acc, curr) => acc + curr.amount, 0);
  };

  const getCardTransactions = (id: string) => {
      // Show transactions relevant to THIS month's invoice
      return filteredTransactions.filter(t => t.cardId === id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
            const total = getCardTotal(card.id);
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
       {selectedCardId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
             <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl p-6 shadow-2xl h-[80vh] flex flex-col border border-slate-100 dark:border-zinc-700">
                 <div className="flex justify-between items-center mb-4">
                     <h3 className="text-xl font-bold text-slate-800 dark:text-white">Fatura do Mês</h3>
                     <button onClick={() => setSelectedCardId(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full text-slate-500 dark:text-slate-400"><X size={20} /></button>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto no-scrollbar">
                     {getCardTransactions(selectedCardId).length > 0 ? (
                         <div className="space-y-2">
                             {getCardTransactions(selectedCardId).map(t => (
                                 <div key={t.id} className="p-3 border border-slate-100 dark:border-zinc-800 rounded-xl flex justify-between items-center hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                                     <div>
                                         <p className="font-medium text-sm text-slate-800 dark:text-slate-200">{t.description}</p>
                                         <p className="text-xs text-slate-400">{new Date(t.date).toLocaleDateString('pt-BR')}</p>
                                     </div>
                                     <span className={`font-bold text-slate-700 dark:text-slate-300 ${blurClass}`}>{formatCurrency(t.amount)}</span>
                                 </div>
                             ))}
                         </div>
                     ) : (
                         <p className="text-center text-slate-400 mt-10">Nenhuma compra nesta fatura.</p>
                     )}
                 </div>
                 
                 <div className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800">
                      <p className="text-center text-sm text-slate-500 dark:text-slate-400">Total Fatura: <span className={`font-bold text-slate-800 dark:text-white ${blurClass}`}>{formatCurrency(getCardTotal(selectedCardId))}</span></p>
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
