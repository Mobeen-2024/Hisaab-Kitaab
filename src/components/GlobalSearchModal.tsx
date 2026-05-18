import React, { useState, useEffect } from 'react';
import { TransactionService } from '../services/TransactionService';
import { CustomerService } from '../services/CustomerService';
import { InventoryService } from '../services/InventoryService';
import { CategoryService } from '../services/CategoryService';
import { Transaction, Customer, InventoryItem } from '../db';
import { Search, X, TrendingUp, TrendingDown, Users, Package } from 'lucide-react';
import { t, Lang } from '../lib/i18n';

export default function GlobalSearchModal({
  isOpen,
  onClose,
  lang,
  currency,
  activeContext
}: {
  isOpen: boolean;
  onClose: () => void;
  lang: Lang;
  currency: string;
  activeContext: 'business' | 'personal';
}) {
  const [query, setQuery] = useState('');
  const [txResults, setTxResults] = useState<(Transaction & { categoryName?: string })[]>([]);
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [inventoryResults, setInventoryResults] = useState<InventoryItem[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setTxResults([]);
      setCustomerResults([]);
      setInventoryResults([]);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    const search = async () => {
      if (!query.trim()) {
        setTxResults([]);
        setCustomerResults([]);
        setInventoryResults([]);
        return;
      }

      const matchedTxs = await TransactionService.search(query, activeContext);
      const cats = await CategoryService.getAll();

      const enrichedTxs = matchedTxs.map(tx => {
        const cat = cats.find(c => c.id === tx.categoryId);
        return { ...tx, categoryName: cat ? t(lang, cat.name) : 'Unknown' };
      });
      setTxResults(enrichedTxs.slice(0, 5));

      // Search customers
      const matchedCusts = await CustomerService.search(query);
      setCustomerResults(matchedCusts.slice(0, 5));

      // Search inventory
      if (activeContext === 'business') {
        const matchedItems = await InventoryService.search(query, activeContext);
        setInventoryResults(matchedItems.slice(0, 5));
      }
    };

    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [query, activeContext, lang]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 pt-[10vh] animate-in fade-in duration-200">
      <div className="bg-[#1E293B] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <Search className="text-slate-400" size={24} />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search transactions, customers, or items..."
            className="flex-1 bg-transparent text-white text-lg focus:outline-none placeholder:text-slate-500"
          />
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white transition-colors bg-white/5 rounded-full hover:bg-white/10 hidden-tap border border-white/10">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {!query.trim() && (
            <div className="p-8 text-center text-slate-500 text-sm">
              Start typing to search your {activeContext} records.
            </div>
          )}

          {query.trim() && txResults.length === 0 && customerResults.length === 0 && inventoryResults.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-sm">
              No results found for "{query}"
            </div>
          )}

          {customerResults.length > 0 && (
            <div className="mb-4">
              <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest bg-white/5 mx-2 rounded mt-2 mb-2">People</div>
              {customerResults.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 mx-2 rounded-xl hover:bg-white/5 cursor-pointer border border-transparent hover:border-white/10 transition-colors">
                  <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                      <Users size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${c.balance > 0 ? 'text-rose-400' : c.balance < 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {Math.abs(c.balance).toLocaleString()} {currency} {c.balance > 0 ? (c.type === 'supplier' ? 'You owe' : 'Owes you') : c.balance < 0 ? 'Advance' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {inventoryResults.length > 0 && (
            <div className="mb-4">
              <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest bg-white/5 mx-2 rounded mt-2 mb-2">Inventory</div>
              {inventoryResults.map(i => (
                <div key={i.id} className="flex items-center justify-between p-3 mx-2 rounded-xl hover:bg-white/5 cursor-pointer border border-transparent hover:border-white/10 transition-colors">
                  <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                      <Package size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{i.name}</p>
                      <p className="text-xs text-slate-400">Qty: {i.quantity}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {txResults.length > 0 && (
            <div className="mb-4">
              <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest bg-white/5 mx-2 rounded mt-2 mb-2">Transactions</div>
              {txResults.map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-3 mx-2 rounded-xl hover:bg-white/5 cursor-pointer border border-transparent hover:border-white/10 transition-colors">
                  <div className="flex gap-3 items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${tx.type === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {tx.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{tx.categoryName}</p>
                      <p className="text-xs text-slate-400">{tx.description || t(lang, 'transaction')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {tx.type === 'income' ? '+' : '-'}{tx.amount} {currency}
                    </p>
                    <p className="text-xs text-slate-500">{tx.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
