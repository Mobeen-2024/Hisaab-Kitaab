import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { GoogleGenAI } from '@google/genai';
import { Sparkles, Brain, AlertTriangle, Lightbulb, Activity, RefreshCw, MessageSquare, Send, Bot, User, Trash2, TrendingUp, DollarSign, ShieldCheck } from 'lucide-react';
import { format, subMonths, isAfter } from 'date-fns';
import { useSettings } from '../contexts/SettingsContext';
import { formatCurrency } from '../lib/currency';

export default function SmartAssistant() {
  const { lang, currency, activeContext } = useSettings();
  const transactions = useLiveQuery(() => db.transactions.where('context').equals(activeContext).toArray()) || [];
  const categories = useLiveQuery(() => db.categories.where('context').equals(activeContext).toArray()) || [];
  const inventory = useLiveQuery(() => db.inventory.where('context').equals(activeContext).toArray()) || [];
  const messages = useLiveQuery(() => db.messages.where('chatId').equals('ai').reverse().limit(50).toArray()) || [];

  const [insights, setInsights] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getAI = async () => {
    const settings = await db.settings.get(1);
    const apiKey = settings?.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error('Gemini API key is not configured. Please add it in App Settings.');
    const cleanKey = apiKey.replace(/[^\x20-\x7E]/g, '').trim();
    if (!cleanKey) throw new Error('API key is invalid. Please re-paste it in Settings.');
    return new GoogleGenAI({ apiKey: cleanKey });
  };

  const getSummaryPayload = () => {
    const oneMonthAgo = subMonths(new Date(), 1);
    const recentTxs = transactions.filter(t => isAfter(new Date(t.date), oneMonthAgo));
    const totalIncome = recentTxs.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
    const totalExpense = recentTxs.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
    const lowStock = inventory.filter(i => i.quantity <= i.minQuantity).map(i => i.name);
    const topExpenses = categories
      .filter(c => c.type === 'expense')
      .map(c => ({ name: c.name, total: recentTxs.filter(t => t.categoryId === c.id).reduce((a, b) => a + b.amount, 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
    return { context: activeContext, currency, lastMonthIncome: totalIncome, lastMonthExpense: totalExpense, transactionsCount: recentTxs.length, topExpenses, lowStockItems: lowStock };
  };

  const generateInsights = async () => {
    setLoading(true);
    setError(null);
    setInsights(null);
    try {
      const ai = await getAI();
      const dataPayload = getSummaryPayload();
      const prompt = `You are a smart financial assistant for a user in Pakistan. The user's active mode is: ${activeContext}.
Here is their recent financial data (last 30 days): ${JSON.stringify(dataPayload, null, 2)}
Provide 3 very concise, highly actionable bullet points.
- If business: predict cash shortages, comment on top expenses, suggest improvements.
- If personal: comment on saving rate, point out unusually high expenses, suggest where to cut back.
- Keep it simple and friendly. Occasional Roman Urdu is fine (like "Kharcha", "Aamdani", "Bachat").
Return ONLY a valid JSON array of strings, nothing else. Example: ["Insight 1", "Insight 2", "Insight 3"]`;
      
      const response = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt });
      const fullText = response.text || '';
      
      let rawJson = fullText.trim();
      const jsonMatch = fullText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        rawJson = jsonMatch[0];
      }
      
      try {
        const parsed = JSON.parse(rawJson);
        if (Array.isArray(parsed)) {
          setInsights(parsed.map(i => String(i)));
        } else {
          setInsights([String(fullText)]);
        }
      } catch {
        const lines = fullText.split('\n')
          .map(l => l.replace(/^[-*•\d.]+\s*/, '').trim())
          .filter(l => l.length > 5);
        setInsights(lines.length > 0 ? lines.slice(0, 3) : [fullText]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate insights');
    } finally {
      setLoading(false);
    }
  };
  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatLoading(true);
    await db.messages.add({ chatId: 'ai', sender: 'user', content: userMsg, timestamp: new Date().toISOString() });
    try {
      const ai = await getAI();
      const dataPayload = getSummaryPayload();
      const systemContext = `You are a smart financial advisor for a Pakistani user. Their ${activeContext} finances: ${JSON.stringify(dataPayload)}. Today: ${format(new Date(), 'dd MMM yyyy')}. Currency: ${currency}. Be concise, helpful, and occasionally use Roman Urdu if appropriate.`;
      const prompt = `${systemContext}\n\nUser question: ${userMsg}`;
      const response = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt });
      const aiReply = (response.text || 'I could not generate a response. Please try again.').trim();
      await db.messages.add({ chatId: 'ai', sender: 'ai', content: aiReply, timestamp: new Date().toISOString() });
    } catch (err: any) {
      await db.messages.add({ chatId: 'ai', sender: 'ai', content: `Error: ${err.message || 'Failed to get response'}`, timestamp: new Date().toISOString() });
    } finally { setChatLoading(false); }
  };

  const clearChat = async () => {
    const ids = (await db.messages.where('chatId').equals('ai').toArray()).map(m => m.id).filter((id): id is number => id !== undefined);
    if (ids.length > 0) await db.messages.bulkDelete(ids);
    setInsights(null);
  };

  const sortedMessages = [...messages].reverse();

  // Quick stats
  const oneMonthAgo = subMonths(new Date(), 1);
  const recentTxs = transactions.filter(t => isAfter(new Date(t.date), oneMonthAgo));
  const totalIncome = recentTxs.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
  const totalExpense = recentTxs.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
  const savingRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      {/* Header */}
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
              onClick={clearChat}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-rose-400 transition-colors"
              title="Clear chat history"
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={generateInsights}
              disabled={loading}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
            >
              {loading ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />}
              {loading ? 'Analyzing...' : 'Generate Insights'}
            </button>
          </div>
        </div>

        {/* Quick KPIs */}
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

      {/* Error Banner */}
      {error && (
        <div className="p-4 border border-rose-500/20 rounded-xl bg-rose-500/10 text-rose-400 text-sm flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* AI Insights Cards */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="bg-white/5 border border-white/10 p-5 rounded-2xl animate-pulse">
              <div className="w-6 h-6 bg-white/10 rounded-lg mb-3" />
              <div className="h-3 bg-white/10 rounded mb-2 w-full" />
              <div className="h-3 bg-white/10 rounded mb-2 w-4/5" />
              <div className="h-3 bg-white/10 rounded w-3/5" />
            </div>
          ))}
        </div>
      )}

      {!loading && insights && insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.map((insight, i) => (
            <div key={i} className="bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 p-5 rounded-2xl relative">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500 rounded-l-2xl" />
              <Lightbulb className="text-indigo-400 mb-3" size={20} />
              <p className="text-indigo-100 text-sm leading-relaxed">{insight}</p>
            </div>
          ))}
        </div>
      )}

      {/* AI Chat */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <MessageSquare className="text-indigo-400" size={18} />
            Chat with AI Advisor
          </h3>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{sortedMessages.length} messages</span>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-80 custom-scrollbar">
          {sortedMessages.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <Bot size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Ask me anything about your finances.</p>
              <p className="text-xs mt-1 text-slate-600">e.g., "How much did I spend this month?" or "Am I saving enough?"</p>
            </div>
          )}
          {sortedMessages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${msg.sender === 'user' ? 'bg-indigo-600' : 'bg-white/10'}`}>
                {msg.sender === 'user' ? <User size={14} /> : <Bot size={14} className="text-indigo-400" />}
              </div>
              <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${msg.sender === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white/10 text-slate-200 rounded-tl-sm'}`}>
                {msg.content}
                <p className={`text-[10px] mt-1 ${msg.sender === 'user' ? 'text-indigo-300' : 'text-slate-500'}`}>
                  {format(new Date(msg.timestamp), 'HH:mm')}
                </p>
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                <Bot size={14} className="text-indigo-400" />
              </div>
              <div className="bg-white/10 p-3 rounded-2xl rounded-tl-sm">
                <div className="flex gap-1 items-center h-4">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 border-t border-white/10">
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
              placeholder="Ask about your finances..."
              className="flex-1 bg-[#0F172A]/80 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none placeholder:text-slate-600"
            />
            <button
              onClick={sendChatMessage}
              disabled={chatLoading || !chatInput.trim()}
              className="w-12 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
            >
              {chatLoading ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>

          {/* Quick prompts */}
          <div className="flex flex-wrap gap-2 mt-3">
            {['Summarize my finances', 'Where should I cut costs?', 'Am I on track with savings?'].map(prompt => (
              <button
                key={prompt}
                onClick={() => { setChatInput(prompt); }}
                className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 px-3 py-1.5 rounded-lg transition-colors uppercase tracking-wider"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Smart Reminders */}
      <div className="bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem]">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Activity className="text-emerald-400" size={20} />
          Smart Reminders & Autopilot
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl">
            <div>
              <h4 className="font-bold text-white text-sm">Low Balance Warning</h4>
              <p className="text-xs text-slate-400 mt-1">AI predicts cash shortage based on your spending pattern.</p>
            </div>
            <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg uppercase tracking-widest">Active</div>
          </div>
          {activeContext === 'business' && (
            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl">
              <div>
                <h4 className="font-bold text-white text-sm">Inventory Alerts</h4>
                <p className="text-xs text-slate-400 mt-1">
                  {inventory.filter(i => i.quantity <= i.minQuantity).length > 0
                    ? `${inventory.filter(i => i.quantity <= i.minQuantity).length} item(s) are below minimum stock.`
                    : 'All items are sufficiently stocked.'}
                </p>
              </div>
              <div className={`px-3 py-1 text-xs font-bold rounded-lg uppercase tracking-widest ${inventory.filter(i => i.quantity <= i.minQuantity).length > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                {inventory.filter(i => i.quantity <= i.minQuantity).length > 0 ? 'Alert' : 'OK'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
