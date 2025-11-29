import React, { useState } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { TransactionType, Transaction } from '../types';
import { Plus, CheckCircle2, Circle, Trash2, Filter, Layers, Pencil, CalendarClock } from 'lucide-react';

const Transactions = () => {
  const { transactions, addTransaction, editTransaction, deleteTransaction, toggleTransactionStatus, cards } = useFinance();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isPaid, setIsPaid] = useState(false);
  const [category, setCategory] = useState('');
  const [cardId, setCardId] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  
  // Installment State
  const [isInstallment, setIsInstallment] = useState(false);
  const [installments, setInstallments] = useState('2');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setType('expense');
    setDate(new Date().toISOString().split('T')[0]);
    setIsPaid(false);
    setCategory('');
    setCardId('');
    setIsRecurring(false);
    setIsInstallment(false);
    setInstallments('2');
    setEditingId(null);
  };

  const handleOpenModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (t: Transaction) => {
    setEditingId(t.id);
    setDescription(t.description);
    setAmount(t.amount.toString());
    setType(t.type);
    setDate(t.date);
    setIsPaid(t.isPaid);
    setCategory(t.category);
    setCardId(t.cardId || '');
    setIsRecurring(t.isRecurring || false);
    setIsInstallment(false); // Can't turn existing into installments easily in edit mode
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    
    if (editingId) {
      // Edit existing
      editTransaction(editingId, {
        description,
        amount: numericAmount,
        type,
        date,
        isPaid: cardId ? false : isPaid,
        category,
        cardId: cardId || undefined,
        isRecurring
      });
    } else {
      // Create new
      if (type === 'expense' && isInstallment && parseInt(installments) > 1) {
        // Handle Installments
        const numInstallments = parseInt(installments);
        const installmentAmount = numericAmount / numInstallments;
        const startDate = new Date(date);

        for (let i = 0; i < numInstallments; i++) {
          const installmentDate = new Date(startDate);
          installmentDate.setMonth(startDate.getMonth() + i);
          
          addTransaction({
            description: `${description} (${i + 1}/${numInstallments})`,
            amount: installmentAmount,
            type,
            date: installmentDate.toISOString().split('T')[0],
            isPaid: false, // Future installments usually not paid yet
            category,
            cardId: cardId || undefined,
            isRecurring: false
          });
        }
      } else {
        // Normal single transaction
        addTransaction({
          description,
          amount: numericAmount,
          type,
          date,
          isPaid: cardId ? false : isPaid, 
          category,
          cardId: cardId || undefined,
          isRecurring
        });
      }
    }

    setIsModalOpen(false);
    resetForm();
  };

  const filteredTransactions = transactions
    .filter(t => filter === 'all' || t.type === filter)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Lançamentos</h2>
        <button
          onClick={handleOpenModal}
          className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-brand-500/20 transition-all"
        >
          <Plus size={20} /> <span className="hidden sm:inline">Novo</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
        {[
          { id: 'all', label: 'Todos' }, 
          { id: 'income', label: 'Receitas' }, 
          { id: 'expense', label: 'Despesas' }
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.id 
                ? 'bg-slate-800 dark:bg-brand-600 text-white' 
                : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-sm overflow-hidden">
        {filteredTransactions.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-zinc-800">
            {filteredTransactions.map(t => (
              <div key={t.id} className="p-4 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <button onClick={() => toggleTransactionStatus(t.id)} className={`transition-colors ${t.isPaid ? 'text-brand-500' : 'text-slate-300 dark:text-zinc-600 hover:text-brand-500'}`}>
                    {t.isPaid ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                  </button>
                  
                  <div>
                    <p className={`font-medium text-slate-800 dark:text-slate-200 ${t.isPaid ? '' : 'text-slate-500 dark:text-slate-500'}`}>{t.description}</p>
                    <div className="flex gap-2 text-xs text-slate-400">
                       <span>{new Date(t.date).toLocaleDateString('pt-BR')}</span>
                       {t.cardId && <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded">Cartão</span>}
                       {t.isRecurring && <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded">Fixo</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className={`font-bold ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(t)} className="p-2 text-slate-300 hover:text-blue-500 transition-colors">
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => deleteTransaction(t.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 dark:text-slate-600">
            <Filter size={48} className="mx-auto mb-4 opacity-20" />
            <p>Nenhum lançamento encontrado.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-300 border border-slate-100 dark:border-zinc-700 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">
              {editingId ? 'Editar Lançamento' : 'Novo Lançamento'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
                <input required value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Ex: Supermercado" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor {isInstallment && '(Total)'}</label>
                  <input required type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="0,00" />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
                   <select value={type} onChange={e => setType(e.target.value as TransactionType)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                     <option value="expense">Despesa</option>
                     <option value="income">Receita</option>
                   </select>
                </div>
              </div>

              {/* Installment Section - Only for new expenses */}
              {!editingId && type === 'expense' && (
                <div className="bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-slate-100 dark:border-zinc-700/50">
                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 text-sm font-medium cursor-pointer mb-2">
                      <input type="checkbox" checked={isInstallment} onChange={e => setIsInstallment(e.target.checked)} className="rounded text-brand-500 focus:ring-brand-500 bg-transparent border-slate-300 dark:border-zinc-600" />
                      <Layers size={16} className="text-brand-500" />
                      Parcelado?
                  </label>
                  
                  {isInstallment && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                       <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Nº de Parcelas</label>
                       <div className="flex items-center gap-2">
                          <input type="number" min="2" max="99" value={installments} onChange={e => setInstallments(e.target.value)} className="w-20 p-2 rounded-lg border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-sm" />
                          <span className="text-xs text-slate-400">
                            x {amount && parseInt(installments) > 0 ? formatCurrency(parseFloat(amount) / parseInt(installments)) : 'R$ 0,00'} /mês
                          </span>
                       </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data</label>
                   <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
                   <input value={category} onChange={e => setCategory(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Alimentação..." />
                </div>
              </div>

              {type === 'expense' && cards.length > 0 && (
                <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Pagar com Cartão (Opcional)</label>
                   <select value={cardId} onChange={e => setCardId(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                     <option value="">Nenhum (Dinheiro/Débito)</option>
                     {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                 <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors">
                    <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="rounded text-brand-500 focus:ring-brand-500 bg-transparent border-slate-300 dark:border-zinc-600" />
                    <CalendarClock size={16} />
                    Recorrente (Fixo)
                 </label>
                 {!cardId && (
                   <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors">
                      <input type="checkbox" checked={isPaid} onChange={e => setIsPaid(e.target.checked)} className="rounded text-brand-500 focus:ring-brand-500 bg-transparent border-slate-300 dark:border-zinc-600" />
                      Pago / Recebido
                   </label>
                 )}
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/20">
                  {editingId ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;