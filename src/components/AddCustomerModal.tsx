import React, { useState, useEffect, useRef } from 'react';
import { Lang, t } from '../lib/i18n';
import { CustomerService } from '../services/CustomerService';
import { X, UserRound, Truck, Loader2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { CustomerSchema } from '../models';

export default function AddCustomerModal({
  isOpen,
  onClose,
  lang,
}: {
  isOpen: boolean;
  onClose: () => void;
  lang: Lang;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [balance, setBalance] = useState('');
  const [balanceType, setBalanceType] = useState<'advance' | 'debt'>('debt');
  const [contactType, setContactType] = useState<'customer' | 'supplier'>('customer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    let initialBalance = parseFloat(balance) || 0;
    if (balanceType === 'debt') {
      initialBalance = Math.abs(initialBalance);
    } else {
      initialBalance = -Math.abs(initialBalance);
    }

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      type: contactType,
      balance: initialBalance,
      createdAt: new Date().toISOString(),
    };

    // Validation using Zod
    const result = CustomerSchema.safeParse(payload);
    if (!result.success) {
      const firstError = result.error.errors[0]?.message || 'Invalid input';
      showToast(firstError, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await CustomerService.add(payload);
      
      showToast(lang === 'ur' ? 'گاہک کا ریکارڈ محفوظ کر لیا گیا ہے' : 'Customer added successfully', 'success');
      
      // Clear form and close
      setName('');
      setPhone('');
      setBalance('');
      setBalanceType('debt');
      setContactType('customer');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to add customer', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
        onClick={!isSubmitting ? onClose : undefined}
      ></div>

      {/* Modal */}
      <div className={`relative w-full max-w-md bg-[#0F172A] border-t sm:border border-white/10 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 ${lang === 'ur' ? 'ur' : ''}`} dir={lang === 'ur' ? 'rtl' : 'ltr'}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 id="modal-title" className="text-xl font-bold text-white tracking-tight">
            {contactType === 'customer' ? t(lang, 'addCustomer') : 'Add Supplier'}
          </h2>
          <button 
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="flex bg-white/5 p-1 rounded-xl">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setContactType('customer')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-colors ${contactType === 'customer' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'} disabled:opacity-50`}
            >
              <UserRound size={16} /> Customer
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setContactType('supplier')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-colors ${contactType === 'supplier' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'} disabled:opacity-50`}
            >
              <Truck size={16} /> Supplier
            </button>
          </div>

          <div className="space-y-2">
            <label htmlFor="customer-name" className="block text-xs font-bold uppercase tracking-widest text-slate-400">
              {contactType === 'customer' ? t(lang, 'customerName') : 'Supplier Name'}
            </label>
            <input 
              id="customer-name"
              ref={nameInputRef}
              type="text" 
              value={name}
              disabled={isSubmitting}
              onChange={e => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="customer-phone" className="block text-xs font-bold uppercase tracking-widest text-slate-400">
              {t(lang, 'customerPhone')}
            </label>
            <input 
              id="customer-phone"
              type="text" 
              value={phone}
              disabled={isSubmitting}
              onChange={e => setPhone(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="customer-balance" className="block text-xs font-bold uppercase tracking-widest text-slate-400">
              {t(lang, 'balancePlaceholder')}
            </label>
            <div className="flex gap-2">
              <input 
                id="customer-balance"
                type="number" 
                value={balance}
                disabled={isSubmitting}
                onChange={e => setBalance(e.target.value)}
                placeholder="0"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
              />
              <select
                value={balanceType}
                disabled={isSubmitting}
                onChange={(e) => setBalanceType(e.target.value as 'advance' | 'debt')}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
              >
                 <option value="debt" className="bg-[#0F172A]">{contactType === 'customer' ? 'Udhaar (They Owe)' : 'Udhaar (We Owe)'}</option>
                 <option value="advance" className="bg-[#0F172A]">Advance</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-300 hover:bg-white/5 transition-colors border border-transparent disabled:opacity-50"
            >
              {t(lang, 'cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 size={18} className="animate-spin" />}
              {t(lang, 'save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
