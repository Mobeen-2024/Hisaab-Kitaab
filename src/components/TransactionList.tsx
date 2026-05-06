import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { t, Lang, isRTL } from '../lib/i18n';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, Trash2, Search } from 'lucide-react';
import { formatCurrency as formatSharedCurrency } from '../lib/currency';
import ConfirmDialog from './ConfirmDialog';

export default function TransactionList({ lang, currency, activeContext, hideTitle = false, compact = false }: { lang: Lang, currency: string, activeContext: 'business' | 'personal', hideTitle?: boolean, compact?: boolean }) {
  const transactionsData = useLiveQuery(() => db.transactions.where('context').equals(activeContext).toArray(), [activeContext]) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const settingsObj = useLiveQuery(() => db.settings.get(1));
  const users = useLiveQuery(() => db.appUsers.toArray()) || [];

  const activeUser = users.find(u => u.id === settingsObj?.activeUserId);
  const activeRole = activeUser?.role || 'owner';
  const canDelete = activeRole === 'owner' || activeRole === 'spouse';
  
  const [searchQuery, setSearchQuery] = useState('');
  const [now, setNow] = useState(new Date());

  // Update 'now' every minute to keep relative dates (if any) or day boundaries fresh
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const formatCurrency = (valInPKR: number) => {
    return formatSharedCurrency(valInPKR, currency, lang);
  };

  const getCategoryName = (id: number) => {
    const cat = categories.find(c => c.id === id);
    return cat ? t(lang, cat.name) : 'Unknown';
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return t(lang, 'today') || 'Today';
    } else if (d.toDateString() === yesterday.toDateString()) {
      return t(lang, 'yesterday') || 'Yesterday';
    }
    return format(d, 'MMM dd, yyyy');
  };

  const handleDelete = async () => {
    if (confirmDeleteId) {
      await db.transactions.delete(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

  const filteredTransactions = useMemo(() => {
    const filtered = transactionsData.filter(tx => {
      if (!searchQuery.trim()) return true;
      const catName = getCategoryName(tx.categoryId).toLowerCase();
      const desc = (tx.description || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      return catName.includes(query) || desc.includes(query);
    });

    // Sort by date DESC, then ID DESC (newest first)
    return filtered.sort((a, b) => {
      const dateCompare = (b.date || '').localeCompare(a.date || '');
      if (dateCompare !== 0) return dateCompare;
      return (b.id || 0) - (a.id || 0);
    }).slice(0, 20);
  }, [transactionsData, searchQuery, categories, lang]);
  
  const rtl = isRTL(lang);

  return (
    <div className={`${hideTitle ? '' : 'bg-white/5 backdrop-blur-md rounded-3xl border border-white/10'} overflow-hidden relative max-w-full`}>
      <ConfirmDialog
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
      />
      <div className="absolute top-0 right-1/4 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
      {!hideTitle && (
        <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">{t(lang, 'recentTransactions')}</h3>
          <div className="relative w-full sm:w-auto">
            <Search size={16} className={`absolute ${rtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-500`} />
            <input
              type="text"
              placeholder={t(lang, 'searchTransactions')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full bg-[#0F172A]/50 border border-white/10 text-white rounded-xl ${rtl ? 'pr-9 pl-4' : 'pl-9 pr-4'} py-2 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none placeholder:text-slate-600`}
            />
          </div>
        </div>
      )}
      
      {hideTitle && (
        <div className="p-4 border-b border-white/5 flex items-center justify-between gap-4">
          <div className="relative w-full">
            <Search size={14} className={`absolute ${rtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-500`} />
            <input
              type="text"
              placeholder={t(lang, 'searchTransactions')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full bg-white/5 border border-white/5 text-white rounded-lg ${rtl ? 'pr-8 pl-4' : 'pl-8 pr-4'} py-1.5 text-[11px] focus:ring-1 focus:ring-blue-500/50 outline-none placeholder:text-slate-600`}
            />
          </div>
        </div>
      )}
      
      <div className="divide-y divide-white/5">
        {filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No transactions found</div>
        ) : (
          filteredTransactions.map(tx => (
            <div key={tx.id} className={`${compact ? 'p-3 sm:p-4' : 'p-4 sm:p-6'} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-white/5 transition-colors group`}>
              <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto overflow-hidden">
                <div className={`${compact ? 'h-8 w-8 sm:h-10 sm:w-10' : 'h-10 w-10 sm:h-12 sm:w-12'} shrink-0 rounded-xl flex items-center justify-center border ${
                  tx.type === 'income' 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                  {tx.type === 'income' ? <ArrowDownRight size={18} className="sm:w-5 sm:h-5" /> : <ArrowUpRight size={18} className="sm:w-5 sm:h-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold text-white truncate ${compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'}`}>{getCategoryName(tx.categoryId)}</p>
                  <div className={`flex items-center gap-2 text-slate-500 mt-0.5 truncate ${compact ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm sm:mt-1'}`}>
                    <span>{formatDate(tx.date)}</span>
                    <span>•</span>
                    <span className="capitalize">{t(lang, tx.context)}</span>
                  </div>
                  {tx.description && <p className={`text-slate-400 mt-1 truncate ${compact ? 'text-[10px]' : 'text-[11px] sm:text-xs'}`}>{tx.description}</p>}
                </div>
              </div>
              
              <div className="flex items-center justify-between w-full sm:w-auto sm:flex-col sm:items-end gap-1 pl-13 sm:pl-0">
                <div className="flex flex-col items-start sm:items-end">
                   <div className={`font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-slate-300'} ${compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'}`}>
                     {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                   </div>
                   {tx.originalCurrency && tx.originalCurrency !== 'PKR' && (
                     <div className="text-[9px] sm:text-[10px] text-slate-500 font-medium bg-white/5 px-2 py-0.5 rounded border border-white/10 mt-1">
                       {tx.originalAmount} {tx.originalCurrency}
                     </div>
                   )}
                </div>
                 {canDelete && (
                   <button 
                     onClick={() => setConfirmDeleteId(tx.id!)} 
                     className="p-2 sm:p-1.5 transition-colors cursor-pointer rounded-full text-slate-500 hover:text-rose-400 hover:bg-white/10 bg-white/5 sm:bg-transparent"
                     title="Delete"
                   >
                     <Trash2 size={14} className="sm:w-4 sm:h-4" />
                   </button>
                 )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
