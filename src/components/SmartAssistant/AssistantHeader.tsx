import React from 'react';
import { Brain, Trash2, RefreshCw, Sparkles, TrendingUp, DollarSign, ShieldCheck } from 'lucide-react';
import { Lang } from '../../lib/i18n';
import { formatCurrency } from '../../lib/currency';

interface AssistantHeaderProps {
  activeContext: string;
  loading: boolean;
  onClearChat: () => void;
  onGenerateInsights: () => void;
  totalIncome: number;
  totalExpense: number;
  savingRate: number;
  currency: string;
  lang: Lang;
}

export default function AssistantHeader({
  activeContext,
  loading,
  onClearChat,
  onGenerateInsights,
  totalIncome,
  totalExpense,
  savingRate,
  currency,
  lang
}: AssistantHeaderProps) {
  return (
    <div className="bg-[#1e1b4b] border border-indigo-500/20 rounded-[2rem] p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <Brain className="text-indigo-400" />
            AI Financial Assistant
          </h2>
          <p className="text-indigo-200/60 mt-2 text-sm max-w-xl">
            Smart predictions, spend analysis, and tailored advice for your {activeContext} finances.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onClearChat}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-rose-400 transition-colors"
            title="Clear chat history"
          >
            <Trash2 size={18} />
          </button>
          <button
            onClick={onGenerateInsights}
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
          >
            {loading ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />}
            {loading ? 'Analyzing...' : 'Generate Insights'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-6 relative z-10">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
          <TrendingUp size={16} className="text-emerald-400 mx-auto mb-1" />
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">30d Income</p>
          <p className="text-sm font-black text-emerald-400">{formatCurrency(totalIncome, currency, lang)}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
          <DollarSign size={16} className="text-rose-400 mx-auto mb-1" />
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">30d Expense</p>
          <p className="text-sm font-black text-rose-400">{formatCurrency(totalExpense, currency, lang)}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
          <ShieldCheck size={16} className="text-blue-400 mx-auto mb-1" />
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Save Rate</p>
          <p className={`text-sm font-black ${savingRate >= 20 ? 'text-emerald-400' : savingRate >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>{savingRate}%</p>
        </div>
      </div>
    </div>
  );
}
