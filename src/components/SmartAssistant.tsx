import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { getGeminiInstance } from '../lib/ai';
import { AlertTriangle } from 'lucide-react';
import { format, subMonths, isAfter } from 'date-fns';
import { useSettings } from '../contexts/SettingsContext';

// Sub-components
import AssistantHeader from './SmartAssistant/AssistantHeader';
import AssistantInsights from './SmartAssistant/AssistantInsights';
import AssistantChat from './SmartAssistant/AssistantChat';
import AssistantReminders from './SmartAssistant/AssistantReminders';

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

  const stats = useMemo(() => {
    const oneMonthAgo = subMonths(new Date(), 1);
    const recentTxs = transactions.filter(t => isAfter(new Date(t.date), oneMonthAgo));
    const totalIncome = recentTxs.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
    const totalExpense = recentTxs.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
    const savingRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;
    const lowStock = inventory.filter(i => i.quantity <= i.minQuantity).map(i => i.name);
    const topExpenses = categories
      .filter(c => c.type === 'expense')
      .map(c => ({ name: c.name, total: recentTxs.filter(t => t.categoryId === c.id).reduce((a, b) => a + b.amount, 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);

    return { totalIncome, totalExpense, savingRate, lowStock, topExpenses, transactionsCount: recentTxs.length };
  }, [transactions, categories, inventory]);

  const generateInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const ai = await getGeminiInstance();
      const prompt = `User context: ${activeContext}. Recent data: ${JSON.stringify(stats)}. Provide 3 concise, actionable financial insights. Return ONLY a JSON array of strings.`;
      const response = await ai.models.generateContent({ model: 'gemini-1.5-flash', contents: prompt });
      const fullText = response.text || '';
      const jsonMatch = fullText.match(/\[[\s\S]*\]/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(fullText);
      setInsights(Array.isArray(parsed) ? parsed : [fullText]);
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
      const ai = await getGeminiInstance();
      const systemContext = `Financial advisor for ${activeContext} mode. Data: ${JSON.stringify(stats)}. Currency: ${currency}.`;
      const contents = [
        { role: 'user', parts: [{ text: `System Context: ${systemContext}` }] },
        { role: 'model', parts: [{ text: "Understood." }] },
        ...messages.slice().reverse().map(m => ({ role: m.sender === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
        { role: 'user', parts: [{ text: userMsg }] }
      ];
      const response = await ai.models.generateContent({ model: 'gemini-1.5-flash', contents: contents as any });
      await db.messages.add({ chatId: 'ai', sender: 'ai', content: (response.text || 'Error').trim(), timestamp: new Date().toISOString() });
    } catch (err: any) {
      await db.messages.add({ chatId: 'ai', sender: 'ai', content: `Error: ${err.message}`, timestamp: new Date().toISOString() });
    } finally { setChatLoading(false); }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      <AssistantHeader
        activeContext={activeContext}
        loading={loading}
        onClearChat={async () => {
          const ids = (await db.messages.where('chatId').equals('ai').toArray()).map(m => m.id).filter((id): id is number => id !== undefined);
          if (ids.length > 0) await db.messages.bulkDelete(ids);
          setInsights(null);
        }}
        onGenerateInsights={generateInsights}
        totalIncome={stats.totalIncome}
        totalExpense={stats.totalExpense}
        savingRate={stats.savingRate}
        currency={currency}
        lang={lang}
      />

      {error && (
        <div className="p-4 border border-rose-500/20 rounded-xl bg-rose-500/10 text-rose-400 text-sm flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <AssistantInsights insights={insights} loading={loading} />

      <AssistantChat
        messages={messages}
        chatInput={chatInput}
        setChatInput={setChatInput}
        chatLoading={chatLoading}
        onSendMessage={sendChatMessage}
        chatEndRef={chatEndRef}
      />

      <AssistantReminders
        activeContext={activeContext}
        lowStockItemsCount={stats.lowStock.length}
      />
    </div>
  );
}
