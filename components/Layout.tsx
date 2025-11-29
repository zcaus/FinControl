import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, CreditCard, List, LogOut, Sparkles, Moon, Sun, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useFinance } from '../contexts/FinanceContext';
import { useTheme } from '../contexts/ThemeContext';

const Layout = () => {
  const { logout, user } = useAuth();
  const { summary } = useFinance();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: Home, label: 'Início' },
    { to: '/transactions', icon: List, label: 'Lançamentos' },
    { to: '/cards', icon: CreditCard, label: 'Cartões' },
    { to: '/advisor', icon: Sparkles, label: 'Consultor' },
    { to: '/settings', icon: Settings, label: 'Ajustes' },
  ];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black transition-colors duration-300 flex flex-col md:flex-row">
      
      {/* FIXED HEADER - MOBILE & DESKTOP */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-[#111827] text-slate-800 dark:text-white pb-6 pt-4 px-6 rounded-b-[2rem] shadow-xl dark:shadow-2xl transition-colors duration-300">
         {/* Top Row: Logo & Actions */}
         <div className="flex justify-between items-center mb-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded-lg border-2 border-brand-500 text-brand-500 flex items-center justify-center font-bold text-xl">
                 <span className="text-brand-500">F</span>
               </div>
               <span className="font-bold text-lg tracking-tight">FinControl</span>
            </div>
            <div className="flex items-center gap-4">
                <button onClick={toggleTheme} className="text-slate-400 hover:text-brand-500 dark:hover:text-white transition-colors">
                   {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </button>
                <button onClick={handleLogout} className="text-slate-400 hover:text-rose-500 transition-colors">
                   <LogOut size={20} />
                </button>
            </div>
         </div>

         {/* Stats Grid */}
         <div className="grid grid-cols-2 gap-x-4 gap-y-4 max-w-5xl mx-auto">
             {/* Left Column */}
             <div className="space-y-4">
                <div>
                   <p className="text-xs font-medium text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Receitas</p>
                   <p className="text-emerald-600 dark:text-emerald-400 font-bold text-lg transition-colors">{formatCurrency(summary.income)}</p>
                </div>
                <div>
                   <p className="text-xs font-medium text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Despesas</p>
                   <p className="text-rose-600 dark:text-rose-400 font-bold text-lg transition-colors">{formatCurrency(summary.expense)}</p>
                </div>
             </div>

             {/* Right Column */}
             <div className="text-right space-y-4">
                <div>
                   <p className="text-xs font-medium text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Saldo Atual</p>
                   <p className="text-slate-900 dark:text-white font-bold text-3xl tracking-tight transition-colors">{formatCurrency(summary.balance)}</p>
                </div>
                <div>
                   <p className="text-xs font-medium text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Previsão do Mês</p>
                   <p className={`font-bold text-lg transition-colors ${summary.forecast >= 0 ? 'text-blue-600 dark:text-blue-300' : 'text-rose-500 dark:text-rose-300'}`}>
                     {formatCurrency(summary.forecast)}
                   </p>
                </div>
             </div>
         </div>
      </div>

      {/* Main Content Area - Padded top to account for fixed header */}
      <main className="flex-1 min-h-screen pt-[260px] pb-24 px-4 md:px-8 max-w-5xl mx-auto w-full">
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 px-6 py-4 flex justify-between items-center z-50 safe-area-bottom shadow-lg">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 transition-colors ${
                isActive ? 'text-brand-500' : 'text-slate-400 dark:text-slate-600'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Desktop Side Rail */}
      <aside className="hidden md:flex fixed left-0 top-[260px] bottom-0 w-24 flex-col items-center py-8 z-40">
          <div className="flex flex-col gap-6 bg-white dark:bg-zinc-900 p-4 rounded-full shadow-xl border border-slate-100 dark:border-zinc-800">
            {navItems.map((item) => (
                <NavLink
                key={item.to}
                to={item.to}
                title={item.label}
                className={({ isActive }) =>
                    `w-12 h-12 flex items-center justify-center rounded-full transition-all ${
                    isActive ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
                    }`
                }
                >
                <item.icon size={24} />
                </NavLink>
            ))}
          </div>
      </aside>

    </div>
  );
};

export default Layout;