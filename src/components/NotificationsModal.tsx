import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { X, Bell, AlertTriangle, Package, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Lang, t } from '../lib/i18n';
import { formatCurrency } from '../lib/currency';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Lang;
  currency: string;
}

export default function NotificationsModal({ isOpen, onClose, lang, currency }: NotificationsModalProps) {
  const inventory = useLiveQuery(() => db.inventory.toArray()) || [];
  const customers = useLiveQuery(() => db.customers.toArray()) || [];

  const lowStockItems = inventory.filter(item => item.quantity <= item.minQuantity);
  const outstandingDebts = customers.filter(c => c.balance > 0 && c.type !== 'supplier');
  const outstandingPayables = customers.filter(c => c.balance > 0 && c.type === 'supplier');

  const hasNotifications = lowStockItems.length > 0 || outstandingDebts.length > 0 || outstandingPayables.length > 0;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-full max-w-md bg-[#0F172A] border-l border-white/10 h-full shadow-2xl relative flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <Bell size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white">Notifications</h2>
                  <p className="text-xs text-slate-400">Your alerts & reminders</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors relative z-10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative">
              
              {!hasNotifications && (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                  <Bell size={48} className="mb-4 text-slate-600/50" />
                  <p className="text-sm font-medium">No new notifications</p>
                </div>
              )}

              {lowStockItems.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <Package size={14} className="text-orange-400" /> Low Stock Alerts
                  </h3>
                  {lowStockItems.map(item => (
                    <div key={item.id} className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex gap-3">
                      <AlertTriangle size={18} className="text-orange-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-orange-200">{item.name} is running low!</p>
                        <p className="text-xs text-orange-400/80 mt-1">
                          Current stock: <strong className="text-orange-300">{item.quantity}</strong> (Min: {item.minQuantity})
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {outstandingDebts.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <Users size={14} className="text-emerald-400" /> Outstanding Receivables
                  </h3>
                  {outstandingDebts.map(c => (
                    <div key={c.id} className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-emerald-200">{c.name} owes you money.</p>
                        <p className="text-xs text-emerald-400/80 mt-1">
                          Amount: <strong className="text-emerald-300">{formatCurrency(c.balance, currency, lang)}</strong>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {outstandingPayables.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <Users size={14} className="text-rose-400" /> Outstanding Payables
                  </h3>
                  {outstandingPayables.map(c => (
                    <div key={c.id} className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 font-bold shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-rose-200">You owe {c.name} money.</p>
                        <p className="text-xs text-rose-400/80 mt-1">
                          Amount: <strong className="text-rose-300">{formatCurrency(c.balance, currency, lang)}</strong>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
