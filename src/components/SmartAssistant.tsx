import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { GoogleGenAI } from '@google/genai';
import { Sparkles, Brain, AlertTriangle, Lightbulb, Activity, ArrowRight, RefreshCw } from 'lucide-react';
import { format, subMonths, isAfter } from 'date-fns';

export default function SmartAssistant({ lang, currency, activeContext }: { lang: any, currency: string, activeContext: 'business' | 'personal' }) {
  const transactions = useLiveQuery(() => db.transactions.where('context').equals(activeContext).toArray()) || [];
  const categories = useLiveQuery(() => db.categories.where('context').equals(activeContext).toArray()) || [];
  const budgets = useLiveQuery(() => db.budgets.where('context').equals(activeContext).toArray()) || [];
  const inventory = useLiveQuery(() => db.inventory.where('context').equals(activeContext).toArray()) || [];
  
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const settings = await db.settings.get(1);
      const apiKey = settings?.geminiApiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API key is not configured. Please add it in App Settings.");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const oneMonthAgo = subMonths(new Date(), 1);
      const recentTxs = transactions.filter(t => isAfter(new Date(t.date), oneMonthAgo));
      
      const totalIncome = recentTxs.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
      const totalExpense = recentTxs.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
      
      const dataPayload = {
        context: activeContext,
        currency,
        lastMonthIncome: totalIncome,
        lastMonthExpense: totalExpense,
        transactionsCount: recentTxs.length,
        topExpenses: categories
          .filter(c => c.type === 'expense')
          .map(c => ({
            name: c.name,
            total: recentTxs.filter(t => t.categoryId === c.id).reduce((a, b) => a + b.amount, 0)
          }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 3)
      };

      const prompt = `
        You are a smart financial assistant for a user in Pakistan. The user's active mode is: ${activeContext}.
        Here is their recent financial data (last 30 days):
        ${JSON.stringify(dataPayload, null, 2)}
        
        Please provide 3 very concise, highly actionable bullet points. 
        - If business: predict any cash shortages, comment on top expenses, suggest improvements.
        - If personal: comment on saving rate, point out any unusually high expenses, suggest where to cut back.
        - Keep it simple, friendly, using occasional Roman Urdu terms if appropriate (like "Kharcha", "Aamdani", "Bachat").
        Return ONLY a JSON array of strings. No markdown formatting other than the brackets. Example: ["Insight 1", "Insight 2", "Insight 3"]
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      if (response.text) {
        setInsights(response.text);
      } else {
        throw new Error("Received empty response from AI.");
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // We do not auto-generate avoiding excessive API calls. User must trigger.
  }, []);

  const parsedInsights = insights ? JSON.parse(insights) : [];

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      
      {/* Header */}
      <div className="bg-[#1e1b4b] border border-indigo-500/20 rounded-[2rem] p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              <Brain className="text-indigo-400" />
               AI Financial Assistant
            </h2>
            <p className="text-indigo-200/60 mt-2 text-sm max-w-xl">
               Get smart predictions, spend analysis, and tailored advice for your {activeContext} finances.
            </p>
          </div>
          <button 
            onClick={generateInsights}
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
          >
            {loading ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />}
            {loading ? 'Analyzing...' : 'Generate Insights'}
          </button>
        </div>
      </div>

      {error ? (
         <div className="p-4 border border-rose-500/20 rounded-xl bg-rose-500/10 text-rose-400 text-sm">
           {error}
         </div>
      ) : null}

      {parsedInsights.length > 0 && (
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {parsedInsights.map((insight: string, i: number) => (
              <div key={i} className="bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 p-5 rounded-2xl relative">
                 <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500 rounded-l-2xl"></div>
                 <Lightbulb className="text-indigo-400 mb-3" size={20} />
                 <p className="text-indigo-100 text-sm leading-relaxed text-balance">{insight}</p>
              </div>
            ))}
         </div>
      )}
      
      {/* Smart Reminders */}
      <div className="bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem]">
         <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
           <Activity className="text-emerald-400" size={20} />
           Smart Reminders & Autopilot
         </h3>
         <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl">
               <div>
                 <h4 className="font-bold text-white text-sm">Low Balance Warning</h4>
                 <p className="text-xs text-slate-400 mt-1">AI predicts cash shortage based on upcoming regular bills.</p>
               </div>
               <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg uppercase tracking-widest">Active</div>
            </div>
            
            {activeContext === 'business' && (
              <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl">
                 <div>
                   <h4 className="font-bold text-white text-sm">Inventory Alerts</h4>
                   <p className="text-xs text-slate-400 mt-1">Get warned when popular items are running low.</p>
                 </div>
                 <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg uppercase tracking-widest">Active</div>
              </div>
            )}
         </div>
      </div>
      
    </div>
  );
}
