import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [view, setView] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [msg, setMsg] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(email);
    navigate('/');
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    register(name, email);
    navigate('/');
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('Se a conta existir, um link de recuperação foi enviado.');
    setTimeout(() => setView('login'), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-xl p-8 border border-slate-100 dark:border-zinc-800">
        <div className="text-center mb-8">
           <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">F</div>
           <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
             {view === 'login' && 'Bem-vindo de volta'}
             {view === 'register' && 'Criar Conta'}
             {view === 'forgot' && 'Recuperar Senha'}
           </h1>
           <p className="text-slate-400 text-sm">Controle suas finanças com simplicidade.</p>
        </div>

        {view === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none" placeholder="voce@exemplo.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Senha</label>
              <input type="password" required className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none" placeholder="••••••••" />
            </div>
            <button type="submit" className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-brand-500/20">Entrar</button>
            <div className="flex justify-between text-sm mt-4">
               <button type="button" onClick={() => setView('register')} className="text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400">Criar conta</button>
               <button type="button" onClick={() => setView('forgot')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">Esqueci a senha</button>
            </div>
          </form>
        )}

        {view === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
             <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Seu Nome" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none" placeholder="voce@exemplo.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Senha</label>
              <input type="password" required className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none" placeholder="••••••••" />
            </div>
            <button type="submit" className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-brand-500/20">Cadastrar</button>
            <div className="text-center text-sm mt-4">
               <button type="button" onClick={() => setView('login')} className="text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400">Já tem conta? Entrar</button>
            </div>
          </form>
        )}

        {view === 'forgot' && (
           <form onSubmit={handleForgot} className="space-y-4">
             {msg && <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm mb-2">{msg}</div>}
             <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none" placeholder="voce@exemplo.com" />
            </div>
            <button type="submit" className="w-full bg-slate-800 dark:bg-zinc-700 hover:bg-slate-900 dark:hover:bg-zinc-600 text-white font-bold py-3 rounded-xl transition-colors">Enviar Link</button>
             <div className="text-center text-sm mt-4">
               <button type="button" onClick={() => setView('login')} className="text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400">Voltar</button>
            </div>
           </form>
        )}
      </div>
    </div>
  );
};

export default Login;