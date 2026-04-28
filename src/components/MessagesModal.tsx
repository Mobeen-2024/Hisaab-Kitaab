import React, { useState, useRef, useEffect } from 'react';
import { X, MessageSquare, Send, User, Sparkles, Clock, Trash2, Phone, ExternalLink, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Lang, t } from '../lib/i18n';
import { formatCurrency } from '../lib/currency';

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Lang;
  currency: string;
}

export default function MessagesModal({ isOpen, onClose, lang, currency }: MessagesModalProps) {
  const [activeChatId, setActiveChatId] = useState<string>('ai');
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = useLiveQuery(
    () => db.messages.where('chatId').equals(activeChatId).toArray(),
    [activeChatId]
  ) || [];

  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  const activeCustomer = customers.find(c => `customer-${c.id}` === activeChatId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const newMessage = {
      chatId: activeChatId,
      sender: 'user' as const,
      content: inputText.trim(),
      timestamp: new Date().toISOString()
    };

    await db.messages.add(newMessage);
    setInputText('');

    if (activeChatId === 'ai') {
      setTimeout(async () => {
        await db.messages.add({
          chatId: 'ai',
          sender: 'ai',
          content: getAIResponse(inputText),
          timestamp: new Date().toISOString()
        });
      }, 1000);
    }
  };

  const getAIResponse = (input: string) => {
    const lower = input.toLowerCase();
    if (lower.includes('balance')) return "Your current total balance across all accounts is being calculated. You can check the Dashboard for the exact breakdown.";
    if (lower.includes('hello') || lower.includes('hi')) return "Hello! I am your Hisaab-Kitab AI assistant. How can I help you today?";
    if (lower.includes('udhaar')) return "I can help you track Udhaar. Just go to the Contacts section to manage your debts and receivables.";
    return "I've noted that down. Is there anything else you'd like to track or analyze?";
  };

  const clearChat = async () => {
    const ids = messages.map(m => m.id).filter((id): id is number => id !== undefined);
    await db.messages.bulkDelete(ids);
  };

  const sendWhatsApp = (phone: string, message: string) => {
    const cleanedPhone = phone.replace(/\D/g, '');
    const url = `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="w-full max-w-6xl bg-[#0F172A] border border-white/10 h-[750px] rounded-[2.5rem] shadow-2xl relative flex overflow-hidden"
          >
            {/* Sidebar */}
            <div className="w-80 border-r border-white/10 bg-white/5 flex flex-col hidden md:flex shrink-0">
              <div className="p-6 border-b border-white/10">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <MessageSquare className="text-blue-400" size={24} /> 
                  Communications
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                <button 
                  onClick={() => setActiveChatId('ai')}
                  className={`w-full p-4 rounded-2xl border transition-all flex items-center gap-3 ${activeChatId === 'ai' ? 'bg-blue-600/20 border-blue-500/30 shadow-lg' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0">
                    <Sparkles size={20} />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-white text-sm">AI Assistant</div>
                    <div className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Always Active</div>
                  </div>
                </button>

                <div className="pt-6 pb-2 px-2 flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Recent Contacts</span>
                  <span className="text-[10px] text-slate-600">{customers.length} total</span>
                </div>

                {customers.map(customer => (
                  <button 
                    key={customer.id}
                    onClick={() => setActiveChatId(`customer-${customer.id}`)}
                    className={`w-full p-4 rounded-2xl border transition-all flex items-center gap-3 group ${activeChatId === `customer-${customer.id}` ? 'bg-emerald-500/20 border-emerald-500/30 shadow-lg' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0 transition-all ${activeChatId === `customer-${customer.id}` ? 'bg-emerald-500' : 'bg-slate-800'}`}>
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left overflow-hidden flex-1">
                      <div className="font-bold text-white text-sm truncate">{customer.name}</div>
                      <div className={`text-[10px] font-bold ${customer.balance > 0 ? 'text-rose-400' : customer.balance < 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {customer.balance === 0 ? 'Settled' : formatCurrency(Math.abs(customer.balance), currency, lang)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col relative bg-[#0F172A]">
              {/* Chat Header */}
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 backdrop-blur-xl z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-blue-400 border border-white/10">
                    {activeChatId === 'ai' ? <Sparkles size={24} /> : <User size={24} />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      {activeChatId === 'ai' ? 'AI Business Assistant' : activeCustomer?.name}
                      {activeCustomer?.type === 'supplier' && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full uppercase tracking-tighter">Supplier</span>}
                    </h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        {activeChatId === 'ai' ? 'Ready to analyze' : 'Customer Notes & Activity'}
                      </span>
                      {activeCustomer?.phone && (
                        <span className="text-xs text-slate-500 flex items-center gap-1 border-l border-white/10 pl-3">
                          <Phone size={10} /> {activeCustomer.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {activeCustomer && (
                    <button 
                      onClick={() => sendWhatsApp(activeCustomer.phone, `Assalam-o-Alaikum ${activeCustomer.name}, this is a reminder regarding your current balance of ${formatCurrency(Math.abs(activeCustomer.balance), currency, lang)}.`)}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-xl text-xs font-bold transition-all border border-emerald-500/20"
                    >
                      <Share2 size={14} /> Send WhatsApp
                    </button>
                  )}
                  <button 
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Messages Content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar relative">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                    <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-white/5 to-white/0 border border-white/10 flex items-center justify-center mb-6 shadow-2xl">
                      <MessageSquare size={32} className="text-slate-500" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">No conversation history</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {activeChatId === 'ai' 
                        ? "Ask me anything about your business, expenses, or how to use the app!" 
                        : "Record private notes, deal details, or follow-up reminders for this customer here."}
                    </p>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: msg.sender === 'user' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={msg.id || i}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[75%] space-y-1`}>
                      <div className={`rounded-[1.5rem] px-5 py-3.5 shadow-2xl relative ${
                        msg.sender === 'user' 
                          ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-none' 
                          : 'bg-white/10 text-slate-100 rounded-tl-none border border-white/10 backdrop-blur-md'
                      }`}>
                        <p className="text-sm leading-relaxed font-medium">{msg.content}</p>
                      </div>
                      <span className={`text-[9px] font-bold tracking-widest uppercase opacity-40 block ${msg.sender === 'user' ? 'text-right mr-2' : 'text-left ml-2'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Footer / Input */}
              <div className="p-8 bg-white/5 border-t border-white/10 backdrop-blur-2xl">
                {activeCustomer && activeCustomer.balance !== 0 && (
                  <div className="mb-4 flex items-center justify-between px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Quick Action</span>
                    <button 
                      onClick={() => setInputText(`Balance reminder: Total ${formatCurrency(Math.abs(activeCustomer.balance), currency, lang)} pending.`)}
                      className="text-[10px] font-bold text-blue-400 hover:text-white"
                    >
                      Insert Balance Reminder
                    </button>
                  </div>
                )}
                
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                  className="flex items-center gap-4"
                >
                  <div className="flex-1 relative group">
                    <input 
                      type="text" 
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={activeChatId === 'ai' ? "Ask the AI..." : "Write a private note..."}
                      className="w-full bg-[#0F172A] border border-white/10 rounded-2xl pl-6 pr-14 py-5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-slate-600 shadow-inner"
                    />
                    <button 
                      type="submit"
                      disabled={!inputText.trim()}
                      className="absolute right-2 top-2 bottom-2 px-5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale cursor-pointer group-hover:shadow-blue-500/40"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                  <button 
                    type="button"
                    onClick={clearChat}
                    className="p-5 text-slate-500 hover:text-rose-400 bg-white/5 border border-white/5 rounded-2xl transition-colors"
                    title="Clear Conversation"
                  >
                    <Trash2 size={20} />
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
