import React, { useState } from 'react';
import { db } from '../db';
import { Lang, t } from '../lib/i18n';
import { X, UserRound, Truck } from 'lucide-react';

export default function AddCustomerModal({
  isOpen,
  onClose,
  lang,
}: {
  isOpen: boolean;
  onClose: () => void;
  lang: Lang;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [balance, setBalance] = useState('');
  const [balanceType, setBalanceType] = useState<'advance' | 'debt'>('debt');
  const [contactType, setContactType] = useState<'customer' | 'supplier'>('customer');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let initialBalance = parseFloat(balance) || 0;
    if (balanceType === 'debt') {
      initialBalance = Math.abs(initialBalance);
    } else {
      initialBalance = -Math.abs(initialBalance);
    }

    try {
      await db.customers.add({
        name,
        phone,
        balance: initialBalance,
        type: contactType,
        createdAt: new Date().toISOString()
      });
      onClose();
      setName('');
      setPhone('');
      setBalance('');
      setBalanceType('debt');
      setContactType('customer');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className={`relative w-full max-w-md bg-[#0F172A] border-t sm:border border-white/10 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 ${lang === 'ur' ? 'ur' : ''}`} dir={lang === 'ur' ? 'rtl' : 'ltr'}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white tracking-tight">{contactType === 'customer' ? t(lang, 'addCustomer') : 'Add Supplier'}</h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="flex bg-white/5 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setContactType('customer')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-colors ${contactType === 'customer' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              <UserRound size={16} /> Customer
            </button>
            <button
              type="button"
              onClick={() => setContactType('supplier')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-colors ${contactType === 'supplier' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              <Truck size={16} /> Supplier
            </button>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
              {contactType === 'customer' ? t(lang, 'customerName') : 'Supplier Name'}
            </label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
              {t(lang, 'customerPhone')}
            </label>
            <input 
              type="text" 
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
              {t(lang, 'balancePlaceholder')}
            </label>
            <div className="flex gap-2">
              <input 
                type="number" 
                value={balance}
                onChange={e => setBalance(e.target.value)}
                placeholder="0"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <select
                value={balanceType}
                onChange={(e) => setBalanceType(e.target.value as 'advance' | 'debt')}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                 <option value="debt" className="bg-[#0F172A]">{contactType === 'customer' ? 'Udhaar (They Owe)' : 'Udhaar (We Owe)'}</option>
                 <option value="advance" className="bg-[#0F172A]">Advance</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-300 hover:bg-white/5 transition-colors border border-transparent"
            >
              {t(lang, 'cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-colors"
            >
              {t(lang, 'save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
