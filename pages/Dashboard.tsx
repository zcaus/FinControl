import React from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { useTheme } from '../contexts/ThemeContext';
import { ArrowUpCircle, ArrowDownCircle, Filter, TrendingUp, CalendarClock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const { summary, transactions, dailyForecast } = useFinance();
  const { privacyMode } = useTheme();

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const blurClass = privacyMode ? "blur-sm transition-all duration-300 select-none" : "transition-all duration-300";

  // Calculate Fixed Costs (Recurring)
  const fixedCosts = transactions
    .filter(t => t.isRecurring && t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cash Flow Forecast Chart */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-zinc-800 min-h-[320px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
               <TrendingUp size={20} className="text-brand-500" />
               Fluxo de Caixa
            </h3>
            <span className="text-xs text-slate-400 bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded-full">Previsão Mês</span>
          </div>
          
          <div className="h-64 w-full">
            {dailyForecast.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyForecast}>
                    <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
                    <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#94a3b8', fontSize: 10}} 
                        dy={10}
                    />
                    <YAxis hide />
                    <Tooltip 
                        formatter={(value: number) => privacyMode ? '****' : formatCurrency(value)}
                        labelStyle={{ color: '#94a3b8' }}
                        contentStyle={{ 
                            borderRadius: '12px', 
                            border: 'none', 
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', 
                            backgroundColor: '#1e293b', 
                            color: '#fff' 
                        }}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="balance" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorBalance)" 
                    />
                </AreaChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                    <p>Adicione transações para ver o futuro.</p>
                </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-zinc-800 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Atividade Recente</h3>
          <div className="space-y-4 flex-1 overflow-hidden">
            {transactions.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400'}`}>
                    {t.type === 'income' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">{t.description}</p>
                    <p className="text-xs text-slate-400">{new Date(t.date).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <span className={`font-semibold text-sm ${blurClass} ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
            {transactions.length === 0 && (
              <div className="text-center text-slate-400 dark:text-slate-600 text-sm py-12">
                 <Filter size={32} className="mx-auto mb-3 opacity-20" />
                 <p>Nenhum lançamento ainda.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Bottom Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
             <p className="text-xs text-slate-400 mb-1">A Receber</p>
             <p className={`text-xl font-bold text-slate-700 dark:text-slate-200 ${blurClass}`}>{formatCurrency(summary.pendingIncome)}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
             <p className="text-xs text-slate-400 mb-1">A Pagar</p>
             <p className={`text-xl font-bold text-slate-700 dark:text-slate-200 ${blurClass}`}>{formatCurrency(summary.pendingExpense)}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800 col-span-2">
             <div className="flex justify-between items-center mb-1">
                 <p className="text-xs text-slate-400 flex items-center gap-1"><CalendarClock size={12}/> Custos Fixos (Assinaturas)</p>
                 <span className="text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 rounded-full">Mensal</span>
             </div>
             <p className={`text-xl font-bold text-slate-700 dark:text-slate-200 ${blurClass}`}>{formatCurrency(fixedCosts)}</p>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;