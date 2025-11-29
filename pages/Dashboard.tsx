import React from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { ArrowUpCircle, ArrowDownCircle, Filter } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const Dashboard = () => {
  const { summary, transactions } = useFinance();

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const pieData = [
    { name: 'Receitas', value: summary.income, color: '#10b981' },
    { name: 'Despesas', value: summary.expense, color: '#f43f5e' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Since stats are in the fixed header, we focus on Analysis here */}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Charts Section */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-zinc-800 min-h-[300px]">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Receitas vs Despesas</h3>
          {pieData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: '#1e293b', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6 mt-4">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
             <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
               <PieChart size={48} className="mb-2 opacity-20" />
               <p>Sem dados para exibir</p>
             </div>
          )}
        </div>

        {/* Quick Recent Transactions */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-zinc-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Atividade Recente</h3>
          <div className="space-y-4">
            {transactions.slice(-5).reverse().map((t) => (
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
                <span className={`font-semibold text-sm ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
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
      
      {/* Pending Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
             <p className="text-xs text-slate-400 mb-1">A Receber (Pendente)</p>
             <p className="text-xl font-bold text-slate-700 dark:text-slate-200">{formatCurrency(summary.pendingIncome)}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
             <p className="text-xs text-slate-400 mb-1">A Pagar (Pendente)</p>
             <p className="text-xl font-bold text-slate-700 dark:text-slate-200">{formatCurrency(summary.pendingExpense)}</p>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;