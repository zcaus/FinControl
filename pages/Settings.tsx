import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { User, Bell, Globe, Moon, Sun, Save } from 'lucide-react';

const Settings = () => {
  const { user, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('pt-BR');
  const [notifications, setNotifications] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setLanguage(user.preferences?.language || 'pt-BR');
      setNotifications(user.preferences?.notifications ?? true);
    }
  }, [user]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name,
      preferences: {
        language,
        notifications
      }
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Ajustes</h2>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Profile Section */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-zinc-800">
           <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
             <User size={20} className="text-brand-500" />
             Perfil
           </h3>
           <div className="space-y-4">
              <div>
                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome de Usuário</label>
                 <input 
                   type="text" 
                   value={name} 
                   onChange={(e) => setName(e.target.value)} 
                   className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                 />
              </div>
              <div>
                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                 <input 
                   type="email" 
                   value={user?.email} 
                   disabled 
                   className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-900/50 text-slate-500 dark:text-slate-500 cursor-not-allowed"
                 />
              </div>
           </div>
        </div>

        {/* Preferences Section */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-zinc-800">
           <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
             <SettingsIcon size={20} className="text-brand-500" />
             Preferências
           </h3>
           
           <div className="space-y-6">
              {/* Theme */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-zinc-800">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                       {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
                    </div>
                    <div>
                       <p className="font-medium text-slate-800 dark:text-white">Tema do App</p>
                       <p className="text-xs text-slate-400">Alternar entre claro e escuro</p>
                    </div>
                 </div>
                 <button 
                   type="button"
                   onClick={toggleTheme}
                   className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                 >
                    {theme === 'light' ? 'Claro' : 'Escuro'}
                 </button>
              </div>

              {/* Notifications */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-zinc-800">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
                       <Bell size={20} />
                    </div>
                    <div>
                       <p className="font-medium text-slate-800 dark:text-white">Notificações</p>
                       <p className="text-xs text-slate-400">Alertas de despesas próximas</p>
                    </div>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={notifications} onChange={(e) => setNotifications(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                 </label>
              </div>

              {/* Language */}
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg">
                       <Globe size={20} />
                    </div>
                    <div>
                       <p className="font-medium text-slate-800 dark:text-white">Idioma</p>
                       <p className="text-xs text-slate-400">Selecione sua preferência</p>
                    </div>
                 </div>
                 <select 
                   value={language} 
                   onChange={(e) => setLanguage(e.target.value)}
                   className="bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 text-sm font-medium px-3 py-2 rounded-lg outline-none border-none cursor-pointer hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                 >
                    <option value="pt-BR">Português (BR)</option>
                    <option value="en-US">English (US)</option>
                    <option value="es">Español</option>
                 </select>
              </div>
           </div>
        </div>

        <button 
           type="submit" 
           className="w-full py-4 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-2xl shadow-xl shadow-brand-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
        >
           <Save size={20} />
           {isSaved ? 'Salvo com Sucesso!' : 'Salvar Alterações'}
        </button>
      </form>
    </div>
  );
};

const SettingsIcon = ({ size, className }: { size: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
);

export default Settings;