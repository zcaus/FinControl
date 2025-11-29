import React, { useState } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { getFinancialAdvice } from '../services/gemini';
import { Sparkles, Bot, AlertTriangle, Key } from 'lucide-react';

const Advisor = () => {
  const { transactions, summary } = useFinance();
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasKey = !!process.env.API_KEY;

  const handleGenerateAdvice = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getFinancialAdvice(transactions, summary.balance);
      setAdvice(result);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8 text-center">
        <div className="w-16 h-16 bg-gradient-to-tr from-brand-400 to-indigo-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-brand-500/30">
          <Sparkles size={32} />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Consultor IA</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Receba insights personalizados sobre suas finanças.</p>
      </header>

      {!hasKey ? (
         <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-900/50 rounded-xl p-6 text-center text-orange-800 dark:text-orange-300">
             <Key className="mx-auto mb-2 opacity-50" />
             <p className="font-medium">Chave de API Ausente</p>
             <p className="text-sm mt-1">Para usar o Consultor IA, configure a API Key no ambiente.</p>
         </div>
      ) : (
        <>
            {!advice && !loading && (
                <div className="text-center py-10">
                    <button 
                        onClick={handleGenerateAdvice}
                        className="bg-slate-900 dark:bg-brand-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl hover:scale-105 transition-transform flex items-center gap-3 mx-auto"
                    >
                        <Bot size={24} />
                        Analisar Minhas Finanças
                    </button>
                    <p className="text-xs text-slate-400 mt-4">Powered by Gemini 2.5 Flash</p>
                </div>
            )}

            {loading && (
                <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-500 dark:text-slate-400 animate-pulse">Pensando...</p>
                </div>
            )}

            {error && (
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/50 rounded-xl p-4 flex items-center gap-3 text-rose-700 dark:text-rose-300 mb-6">
                    <AlertTriangle size={20} />
                    <p>{error}</p>
                </div>
            )}

            {advice && (
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 border border-slate-100 dark:border-zinc-800 shadow-xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-500">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-400 via-indigo-500 to-rose-400"></div>
                    <div className="prose prose-slate dark:prose-invert max-w-none">
                        <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-white mb-4">
                            <Bot className="text-brand-500" /> 
                            Insights do Consultor
                        </h3>
                        <div className="whitespace-pre-line text-slate-600 dark:text-slate-300 leading-relaxed">
                            {advice}
                        </div>
                    </div>
                    <button onClick={() => setAdvice(null)} className="mt-8 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline">Limpar Análise</button>
                </div>
            )}
        </>
      )}
    </div>
  );
};

export default Advisor;