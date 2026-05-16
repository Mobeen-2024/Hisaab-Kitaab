import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTransactions, useCategories, useInventory, useMessages } from '../hooks/useData';
import { useSettings } from '../contexts/SettingsContext';
import { AIService } from '../services/AIService';
import { MessageService } from '../services/MessageService';
import { AlertTriangle } from 'lucide-react';
import { format, subMonths, isAfter } from 'date-fns';

// Sub-components
import AssistantHeader from './SmartAssistant/AssistantHeader';
import AssistantInsights from './SmartAssistant/AssistantInsights';
import AssistantChat from './SmartAssistant/AssistantChat';
import AssistantReminders from './SmartAssistant/AssistantReminders';

export default function SmartAssistant() {
  const { lang, currency, activeContext } = useSettings();
  const transactions = useTransactions(activeContext);
  const categories = useCategories(activeContext);
  const inventory = useInventory(activeContext);
  const messages = useMessages('ai');

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
      const result = await AIService.generateInsights(activeContext, stats);
      setInsights(result);
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
    await MessageService.add('ai', 'user', userMsg);
    try {
      const content = await AIService.getChatResponse(activeContext, stats, currency, messages, userMsg);
      await MessageService.add('ai', 'ai', content);
    } catch (err: any) {
      await MessageService.add('ai', 'ai', `Error: ${err.message}`);
    } finally { setChatLoading(false); }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      <AssistantHeader
        activeContext={activeContext}
        loading={loading}
        onClearChat={async () => {
          await MessageService.clearChat('ai');
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
