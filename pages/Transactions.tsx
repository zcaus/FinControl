import React, { useState } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { useTheme } from '../contexts/ThemeContext';
import { TransactionType, Transaction } from '../types';
import { Plus, CheckCircle2, Circle, Trash2, Filter, Layers, Pencil, CalendarClock, Search, AlertTriangle, ArrowRight, Calendar, Tag, Wallet, Info, Settings, Save, X } from 'lucide-react';

const Transactions = () => {
  const { filteredTransactions, addTransaction, editTransaction, deleteTransaction, toggleTransactionStatus, cards, getMostFrequentCategory, availableCategories, updateCategory, deleteCategory } = useFinance();
  const { privacyMode } = useTheme();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRecurConfirmOpen, setIsRecurConfirmOpen] = useState(false);
  const [isCatManagerOpen, setIsCatManagerOpen] = useState(false);
  const [recurActionType, setRecurActionType] = useState<'edit' | 'delete'>('edit');
  
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [searchTerm, setSearchTerm] = useState('');
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
  const [recurringId, setRecurringId] = useState<string | undefined>(undefined);
  
  // Installment State
  const [isInstallment, setIsInstallment] = useState(false);
  const [installments, setInstallments] = useState('2');

  // Category Manager State
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const blurClass = privacyMode ? "blur-sm transition-all duration-300 select-none" : "transition-all duration-300";

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setType('expense');
    setDate(new Date().toISOString().split('T')[0]);
    setIsPaid(false);
    setCategory('');
    setCardId('');
    setIsRecurring(false);
    setRecurringId(undefined);
    setIsInstallment(false);
    setInstallments('2');
    setEditingId(null);
  };

  const handleOpenModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleDescriptionBlur = () => {
      if (!editingId && description && !category) {
          const suggested = getMostFrequentCategory(description);
          if (suggested) {
              setCategory(suggested);
          }
      }
  };

  const handleEdit = (t: Transaction) => {
    setEditingId(t.id);
    setDescription(t.description.replace(/\s\(\d+\/\d+\)$/, '')); 
    setAmount(t.amount.toString());
    setType(t.type);
    setDate(t.date);
    setIsPaid(t.isPaid);
    setCategory(t.category);
    setCardId(t.cardId || '');
    setIsRecurring(t.isRecurring || false);
    setRecurringId(t.recurringId);
    setIsInstallment(false);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (t: Transaction) => {
    if (t.isRecurring && t.recurringId) {
        setEditingId(t.id);
        setRecurringId(t.recurringId);
        setDate(t.date); // Need date to filter future
        setRecurActionType('delete');
        setIsRecurConfirmOpen(true);
    } else {
        deleteTransaction(t.id);
    }
  };

  const handleRecurConfirm = (scope: 'single' | 'all_future') => {
      if (recurActionType === 'edit' && editingId) {
           const numericAmount = parseFloat(amount);
           editTransaction(editingId, {
            description,
            amount: numericAmount,
            type,
            date,
            isPaid: cardId ? false : isPaid,
            category,
            cardId: cardId || undefined,
            isRecurring,
            recurringId
          }, scope);
          setIsModalOpen(false);
          resetForm();
      } else if (recurActionType === 'delete' && editingId) {
          deleteTransaction(editingId, scope);
      }
      setIsRecurConfirmOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    
    if (editingId) {
      if (isRecurring && recurringId) {
          // If it's recurring, ask user for scope
          setRecurActionType('edit');
          setIsRecurConfirmOpen(true);
          // Modal will call handleRecurConfirm
      } else {
          // Normal edit
          editTransaction(editingId, {
            description,
            amount: numericAmount,
            type,
            date,
            isPaid: cardId ? false : isPaid,
            category,
            cardId: cardId || undefined,
            isRecurring,
            recurringId
          });
          setIsModalOpen(false);
          resetForm();
      }
    } else {
      if (type === 'expense' && isInstallment && parseInt(installments) > 1) {
        const numInstallments = parseInt(installments);
        const installmentAmount = numericAmount / numInstallments;
        
        const [y, m, d] = date.split('-').map(Number);
        const startDateObj = new Date(y, m - 1, d, 12, 0, 0);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < numInstallments; i++) {
          const currentInstDate = new Date(startDateObj);
          currentInstDate.setMonth(startDateObj.getMonth() + i);
          
          const comparisonDate = new Date(currentInstDate);
          comparisonDate.setHours(0,0,0,0);
          
          // If installment date is strictly before today, it's paid history.
          const shouldBePaid = comparisonDate < today;

          addTransaction({
            description: `${description} (${i + 1}/${numInstallments})`,
            amount: installmentAmount,
            type,
            date: currentInstDate.toISOString().split('T')[0],
            isPaid: shouldBePaid, 
            category,
            cardId: cardId || undefined,
            isRecurring: false
          });
        }
      } else {
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
      setIsModalOpen(false);
      resetForm();
    }
  };

  // Category Manager Helpers
  const handleEditCategory = (cat: string) => {
    setEditingCategory(cat);
    setNewCategoryName(cat);
  };

  const handleSaveCategory = async (oldName: string) => {
    if (newCategoryName && newCategoryName !== oldName) {
        await updateCategory(oldName, newCategoryName);
    }
    setEditingCategory(null);
  };

  const handleDeleteCategory = async (cat: string) => {
    if (confirm(`Remover categoria "${cat}" de todos os lançamentos?`)) {
        await deleteCategory(cat);
    }
  };

  const renderInvoiceWarning = () => {
    if (!cardId || !date) return null;
    
    const selectedCard = cards.find(c => c.id === cardId);
    if (!selectedCard) return null;

    const day = parseInt(date.split('-')[2]);
    if (day > selectedCard.closingDay) {
        return (
            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 p-3 rounded-xl text-xs flex items-start gap-2 mt-4 animate-in fade-in slide-in-from-top-1 border border-blue-100 dark:border-blue-800">
                <Info size={16} className="shrink-0 mt-0.5" />
                <div>
                    <p className="font-bold mb-1">Fatura do Mês Seguinte</p>
                    <p>
                        Como o dia <strong>{day}</strong> é após o fechamento (dia {selectedCard.closingDay}), 
                        esta transação {isInstallment ? 'e suas parcelas iniciarão' : 'entrará'} na fatura do próximo mês.
                    </p>
                </div>
            </div>
        );
    }
    return null;
  };

  const displayTransactions = filteredTransactions
    .filter(t => filter === 'all' || t.type === filter)
    .filter(t => t.description.toLowerCase().includes(searchTerm.toLowerCase()) || t.category?.toLowerCase().includes(searchTerm.toLowerCase()))
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

      {/* Controls: Search + Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                 type="text" 
                 placeholder="Buscar por nome ou categoria..." 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
            { id: 'all', label: 'Todos' }, 
            { id: 'income', label: 'Receitas' }, 
            { id: 'expense', label: 'Despesas' }
            ].map(f => (
            <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                filter === f.id 
                    ? 'bg-slate-800 dark:bg-brand-600 text-white' 
                    : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
                }`}
            >
                {f.label}
            </button>
            ))}
          </div>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-sm overflow-hidden">
        {displayTransactions.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-zinc-800">
            {displayTransactions.map(t => (
              <div key={t.id} className="p-4 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <button onClick={() => toggleTransactionStatus(t.id)} className={`transition-colors ${t.isPaid ? 'text-brand-500' : 'text-slate-300 dark:text-zinc-600 hover:text-brand-500'}`}>
                    {t.isPaid ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                  </button>
                  
                  <div>
                    <p className={`font-medium text-slate-800 dark:text-slate-200 ${t.isPaid ? '' : 'text-slate-500 dark:text-slate-500'}`}>{t.description}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-400 mt-1">
                       <span>{new Date(t.date).toLocaleDateString('pt-BR')}</span>
                       {t.cardId && <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded">Cartão</span>}
                       {t.isRecurring && <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded">Fixo</span>}
                       {t.category && <span className="bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">{t.category}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className={`font-bold ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'} ${blurClass}`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(t)} className="p-2 text-slate-300 hover:text-blue-500 transition-colors">
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => handleDeleteClick(t)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
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
            <p>Nenhum lançamento encontrado neste mês.</p>
          </div>
        )}
      </div>

      {/* Category Manager Modal */}
      {isCatManagerOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl shadow-2xl border border-slate-100 dark:border-zinc-700 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[80vh]">
                  <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white">Gerenciar Categorias</h3>
                      <button onClick={() => setIsCatManagerOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                      {availableCategories.length === 0 ? (
                          <p className="text-center text-slate-400 py-8 text-sm">Nenhuma categoria encontrada.</p>
                      ) : (
                          availableCategories.map(cat => (
                              <div key={cat} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-800 rounded-xl group">
                                  {editingCategory === cat ? (
                                      <div className="flex-1 flex gap-2 mr-2">
                                          <input 
                                            autoFocus
                                            value={newCategoryName} 
                                            onChange={e => setNewCategoryName(e.target.value)}
                                            className="flex-1 px-2 py-1 rounded bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-sm"
                                          />
                                          <button onClick={() => handleSaveCategory(cat)} className="text-emerald-500"><Save size={18}/></button>
                                      </div>
                                  ) : (
                                      <span className="text-slate-700 dark:text-slate-300 font-medium">{cat}</span>
                                  )}
                                  
                                  {editingCategory !== cat && (
                                    <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100">
                                        <button onClick={() => handleEditCategory(cat)} className="p-1.5 text-blue-400 hover:text-blue-600"><Pencil size={16}/></button>
                                        <button onClick={() => handleDeleteCategory(cat)} className="p-1.5 text-rose-400 hover:text-rose-600"><Trash2 size={16}/></button>
                                    </div>
                                  )}
                              </div>
                          ))
                      )}
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-zinc-900/50 border-t border-slate-100 dark:border-zinc-800 text-center">
                      <p className="text-xs text-slate-400">Edições alteram todo o histórico.</p>
                  </div>
              </div>
          </div>
      )}

      {/* Recurring Edit/Delete Confirmation Modal */}
      {isRecurConfirmOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
               <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-zinc-700 animate-in fade-in zoom-in duration-200">
                    <div className="text-center mb-6">
                        <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Layers size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
                            {recurActionType === 'edit' ? 'Editar Recorrência' : 'Excluir Recorrência'}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Esta é uma transação fixa. Como deseja aplicar a alteração?
                        </p>
                    </div>
                    
                    <div className="space-y-3">
                        <button onClick={() => handleRecurConfirm('single')} className="w-full py-3 px-4 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all flex items-center justify-between group">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Apenas esta</span>
                            <span className="text-xs text-slate-400">Este mês</span>
                        </button>
                        <button onClick={() => handleRecurConfirm('all_future')} className="w-full py-3 px-4 rounded-xl bg-brand-50 dark:bg-brand-500/10 hover:bg-brand-100 dark:hover:bg-brand-500/20 border border-brand-200 dark:border-brand-500/30 transition-all flex items-center justify-between">
                            <span className="text-sm font-bold text-brand-700 dark:text-brand-400">Esta e futuras</span>
                            <span className="text-xs text-brand-600/70 dark:text-brand-400/70">Daqui p/ frente</span>
                        </button>
                    </div>
                    
                    <button onClick={() => setIsRecurConfirmOpen(false)} className="w-full mt-4 py-2 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                        Cancelar
                    </button>
               </div>
          </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-300 border border-slate-100 dark:border-zinc-700 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">
              {editingId ? 'Editar Lançamento' : 'Novo Lançamento'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* DESCRIPTION */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
                <input 
                    required 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    onBlur={handleDescriptionBlur}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" 
                    placeholder="Ex: Supermercado" 
                />
              </div>
              
              {/* AMOUNT & DATE - HIGHLIGHTED */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor {isInstallment && '(Total)'}</label>
                  <input required type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-bold" placeholder="0,00" />
                </div>
                <div>
                   <label className="flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                     <Calendar size={14} /> Data
                   </label>
                   <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>

              {/* CATEGORY - FULL WIDTH WITH GEAR */}
              <div>
                 <label className="flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    <Tag size={14} /> Categoria
                 </label>
                 <div className="flex gap-2">
                    <div className="relative flex-1">
                        <input 
                            value={category} 
                            onChange={e => setCategory(e.target.value)} 
                            list="cat-suggestions"
                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" 
                            placeholder="Alimentação, Lazer..." 
                        />
                        <datalist id="cat-suggestions">
                            {availableCategories.map(cat => (
                                <option key={cat} value={cat} />
                            ))}
                        </datalist>
                    </div>
                    <button 
                        type="button" 
                        onClick={() => setIsCatManagerOpen(true)}
                        className="p-3 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-xl text-slate-500 dark:text-slate-400 transition-colors"
                        title="Gerenciar Categorias"
                    >
                        <Settings size={20} />
                    </button>
                 </div>
              </div>

              {/* TYPE & CARD - GROUPED */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
                   <select value={type} onChange={e => setType(e.target.value as TransactionType)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                     <option value="expense">Despesa</option>
                     <option value="income">Receita</option>
                   </select>
                </div>
                <div>
                   <label className="flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      <Wallet size={14} /> Carteira / Cartão
                   </label>
                   <select value={cardId} onChange={e => setCardId(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                     <option value="">Dinheiro / Débito</option>
                     {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                </div>
              </div>

              {renderInvoiceWarning()}

              {/* INSTALLMENTS */}
              {!editingId && type === 'expense' && (
                <div className="bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-slate-100 dark:border-zinc-700/50 mt-4">
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

              {/* SETTINGS (Recurring/Paid) */}
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