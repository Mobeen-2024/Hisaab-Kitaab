import React, { useState, useRef, useEffect } from 'react';
import { X, MessageSquare, Send, User, Sparkles, Clock, Trash2, Phone, ExternalLink, Share2, Camera, Loader2 } from 'lucide-react';
import QrScanModal from './QrScanModal';

import { motion, AnimatePresence } from 'motion/react';

import { Lang, t } from '../lib/i18n';
import { formatCurrency } from '../lib/currency';
import { useMessages, useCustomers, useTransactions, useInventory } from '../hooks/useData';
import { MessageService } from '../services/MessageService';
import { AIService } from '../services/AIService';
import { useToast } from '../contexts/ToastContext';

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Lang;
  currency: string;
}

export default function MessagesModal({ isOpen, onClose, lang, currency }: MessagesModalProps) {
  const { showToast } = useToast();
  const [activeChatId, setActiveChatId] = useState<string>('ai');
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isQrScanOpen, setIsQrScanOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const messagesRaw = useMessages(activeChatId);
  const isLoadingMessages = messagesRaw === undefined;
  const messages = React.useMemo(() => (messagesRaw ? [...messagesRaw].reverse() : []), [messagesRaw]);
  
  const customers = useCustomers();
  const transactions = useTransactions();
  const inventory = useInventory();
  
  const activeCustomer = customers.find(c => `customer-${c.id}` === activeChatId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || isSubmitting) return;

    const userContent = inputText.trim();
    setIsSubmitting(true);
    setInputText('');

    try {
      await MessageService.add(activeChatId, 'user', userContent);
      
      if (activeChatId === 'ai') {
        const stats = {
          totalIncome: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
          totalExpense: transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
          savingRate: 0, // Simplified for now
          lowStock: inventory.filter(i => i.quantity <= i.minQuantity).map(i => i.name),
          topExpenses: [],
          transactionsCount: transactions.length
        };

        const aiResponse = await AIService.getChatResponse(
          'business', // Context could be dynamic
          stats,
          currency,
          messages.map(m => ({ sender: m.sender, content: m.content })),
          userContent
        );
        
        await MessageService.add('ai', 'ai', aiResponse);
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to send message', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearChat = async () => {
    if (window.confirm('Are you sure you want to clear this conversation?')) {
      try {
        await MessageService.clearChat(activeChatId);
        showToast('Chat cleared', 'success');
      } catch (error: any) {
        showToast('Failed to clear chat', 'error');
      }
    }
  };

  const sendWhatsApp = (phone: string, message: string) => {
    const cleanedPhone = phone.replace(/\D/g, '');
    const url = `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="messages-modal-title"
    >
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer animate-in fade-in duration-200"
      />
      
      <div 
        className="w-full max-w-6xl bg-[#0F172A] border border-white/10 h-[85vh] max-h-[800px] rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl relative flex overflow-hidden z-10 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300"
      >
              {/* Sidebar */}
              <div className="w-80 border-r border-white/10 bg-white/5 flex flex-col hidden md:flex shrink-0">
                <div className="p-6 border-b border-white/10">
                  <h3 id="messages-modal-title" className="text-xl font-bold text-white flex items-center gap-2">
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
                    {activeCustomer && activeCustomer.phone && (
                      <button 
                        onClick={() => sendWhatsApp(activeCustomer!.phone!, `Assalam-o-Alaikum ${activeCustomer!.name}, this is a reminder regarding your current balance of ${formatCurrency(Math.abs(activeCustomer!.balance), currency, lang)}.`)}
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

                  {isLoadingMessages ? (
                    <div className="h-full flex items-center justify-center">
                      <Loader2 size={32} className="text-blue-500 animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
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
                  ) : (
                    messages.map((msg, i) => (
                      <motion.div 
                        initial={{ opacity: 0, x: msg.sender === 'user' ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={msg.id ? `msg-${msg.id}` : `msg-index-${i}`}
                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[75%] space-y-1`}>
                          <div className={`rounded-[1.5rem] px-5 py-3.5 shadow-2xl relative ${
                            msg.sender === 'user' 
                              ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-none' 
                              : 'bg-white/10 text-slate-100 rounded-tl-none border border-white/10 backdrop-blur-md'
                          }`}>
                            <p className="text-sm leading-relaxed font-medium whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <span className={`text-[9px] font-bold tracking-widest uppercase opacity-40 block ${msg.sender === 'user' ? 'text-right mr-2' : 'text-left ml-2'}`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </motion.div>
                    ))
                  )}
                  {isSubmitting && activeChatId === 'ai' && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="bg-white/10 text-slate-400 rounded-[1.5rem] rounded-tl-none px-5 py-3.5 border border-white/10 backdrop-blur-md">
                        <div className="flex gap-1 items-center">
                          <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"></div>
                          <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                          <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                        </div>
                      </div>
                    </motion.div>
                  )}
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
                    onSubmit={handleSend}
                    className="flex items-center gap-4"
                  >
                    <button 
                      type="button"
                      onClick={() => setIsQrScanOpen(true)}
                      className="p-5 text-slate-400 hover:text-blue-400 bg-white/5 border border-white/5 rounded-2xl transition-all hover:bg-blue-500/10 hover:border-blue-500/20"
                      title="Scan QR or Screenshot"
                    >
                      <Camera size={20} />
                    </button>

                    <div className="flex-1 relative group">
                      <input 
                        type="text" 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        disabled={isSubmitting}
                        placeholder={activeChatId === 'ai' ? "Ask the AI..." : "Write a private note..."}
                        className="w-full bg-[#0F172A] border border-white/10 rounded-2xl pl-6 pr-14 py-5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-slate-600 shadow-inner disabled:opacity-50"
                      />
                      <button 
                        type="submit"
                        disabled={!inputText.trim() || isSubmitting}
                        className="absolute right-2 top-2 bottom-2 px-5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale cursor-pointer group-hover:shadow-blue-500/40 flex items-center justify-center"
                      >
                        {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                      </button>
                    </div>
                    <button 
                      type="button"
                      onClick={clearChat}
                      disabled={isSubmitting}
                      className="p-5 text-slate-500 hover:text-rose-400 bg-white/5 border border-white/5 rounded-2xl transition-colors disabled:opacity-50"
                      title="Clear Conversation"
                    >
                      <Trash2 size={20} />
                    </button>
                  </form>
                </div>
              </div>
            </div>

      <QrScanModal 
        isOpen={isQrScanOpen} 
        onClose={() => setIsQrScanOpen(false)} 
        lang={lang} 
        activeContext="personal" 
      />
    </div>
  );
}
