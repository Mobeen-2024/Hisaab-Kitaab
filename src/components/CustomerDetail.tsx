import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Customer } from '../db';
import { CustomerService } from '../services/CustomerService';
import { UdhaarService } from '../services/UdhaarService';
import { InventoryService } from '../services/InventoryService';
import { useUdhaarEntries, useCustomerTransactions, useInventory } from '../hooks/useData';
import { t, Lang } from '../lib/i18n';
import { ArrowLeft, Phone, Calendar, ArrowUpRight, ArrowDownRight, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency as formatSharedCurrency } from '../lib/currency';
import ConfirmDialog from './ConfirmDialog';
import DatePicker from './DatePicker';
import { useToast } from '../contexts/ToastContext';

export default function CustomerDetail({
  customer,
  onBack,
  lang,
  currency,
  activeContext
}: {
  customer: Customer;
  onBack: () => void;
  lang: Lang;
  currency: string;
  activeContext: 'personal' | 'business';
}) {
  const [isAddEntryModalOpen, setIsAddEntryModalOpen] = useState(false);
  const [entryType, setEntryType] = useState<'give' | 'receive'>('give');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isForceDeleting, setIsForceDeleting] = useState(false);
  const { showToast } = useToast();

  const udhaarEntries = useUdhaarEntries(customer.id);
  const transactions = useCustomerTransactions(customer.id);

  const computedBalance = customer.balance;

  const unifiedHistory = React.useMemo(() => {
    const history: any[] = [];

    // Initial Balance Entry (pseudo layout)
    if (customer.initialBalance) {
      history.push({
        id: 'initial',
        syntheticId: 'init-1',
        isUdhaar: false,
        isInitial: true,
        type: customer.initialBalance > 0 ? 'give' : 'receive',
        amount: Math.abs(customer.initialBalance),
        date: customer.createdAt || new Date(0).toISOString(),
        description: 'Initial Balance'
      });
    }

    udhaarEntries.forEach(entry => {
      history.push({
        id: entry.id,
        syntheticId: `u-${entry.id}`,
        isUdhaar: true,
        type: entry.type, // give or receive
        amount: entry.amount,
        date: entry.date,
        dueDate: entry.dueDate,
        description: entry.description
      });
    });

    transactions.forEach(tx => {
      // Map transaction to give/receive concept for unified display
      // Expense = money out (we gave)
      // Income = money in (we received)
      history.push({
        id: tx.id,
        syntheticId: `t-${tx.id}`,
        isUdhaar: false,
        type: tx.type === 'expense' ? 'give' : 'receive',
        amount: tx.amount,
        date: tx.date,
        description: tx.description || 'Transaction Payment'
      });
    });

    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [udhaarEntries, transactions, customer]);

  const formatCurrency = (val: number) => {
    return formatSharedCurrency(val, currency, lang);
  };

  const handleSendReminder = () => {
    if (!customer.phone) {
      alert("No phone number available for this customer.");
      return;
    }
    const amount = formatCurrency(Math.abs(computedBalance));
    const message = computedBalance > 0
      ? `Asalam-o-Alaikum ${customer.name}, you have a pending amount of ${amount}. Please pay your balance at your earliest convenience.`
      : `Asalam-o-Alaikum ${customer.name}, your advance balance is ${amount}.`;

    // Format phone for whatsapp (remove leading 0 and add 92 for PK, this is basic formatting)
    let phoneNum = customer.phone.replace(/[^0-9]/g, '');
    if (phoneNum.startsWith('0')) {
      phoneNum = '92' + phoneNum.substring(1);
    }

    window.open(`https://wa.me/${phoneNum}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleDelete = async () => {
    if (customer.id) {
      try {
        await CustomerService.delete(Number(customer.id));
        setIsDeleting(false);
        onBack();
      } catch (err: any) {
        setIsDeleting(false);
        if (err.message.includes('force delete')) {
          setIsForceDeleting(true);
        } else {
          showToast(err.message || 'Failed to delete customer', 'error');
        }
      }
    }
  };

  const handleForceDelete = async () => {
    if (customer.id) {
      try {
        await CustomerService.delete(Number(customer.id), true);
        setIsForceDeleting(false);
        showToast('Customer and all related transactions force deleted', 'success');
        onBack();
      } catch (err: any) {
        showToast(err.message || 'Failed to force delete customer', 'error');
        setIsForceDeleting(false);
      }
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      <ConfirmDialog
        isOpen={isDeleting}
        onClose={() => setIsDeleting(false)}
        onConfirm={handleDelete}
        title="Delete Customer"
        message="Are you sure you want to delete this customer? This will also remove their transactions and Udhaar history. This action cannot be undone."
      />
      <ConfirmDialog
        isOpen={isForceDeleting}
        onClose={() => setIsForceDeleting(false)}
        onConfirm={handleForceDelete}
        title="Force Delete Contact?"
        message="This customer has an active balance. Are you sure you want to delete them AND all their related transactions? This cannot be undone."
        confirmText="Force Delete"
        isDestructive={true}
      />
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-slate-400 hover:text-white"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">{customer.name}</h2>
              <div className="flex items-center gap-2 text-slate-400 mt-1">
                <Phone size={14} />
                <span className="text-sm font-medium">{customer.phone || 'No phone number'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSendReminder}
              disabled={!customer.phone}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold transition-colors"
            >
              <MessageSquare size={16} />
              WhatsApp Reminder
            </button>
            <button
              onClick={() => setIsDeleting(true)}
              className="w-10 h-10 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center transition-colors flex-shrink-0"
              title="Delete Person"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          <div className={`p-6 rounded-2xl border ${computedBalance > 0 ? 'bg-rose-500/10 border-rose-500/20' : computedBalance < 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-500/10 border-slate-500/20'}`}>
            <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${computedBalance > 0 ? 'text-rose-400/80' : computedBalance < 0 ? 'text-emerald-400/80' : 'text-slate-400/80'}`}>Total Balance</p>
            <h3 className={`text-3xl font-black tracking-tight ${computedBalance > 0 ? 'text-rose-400' : computedBalance < 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
              {formatCurrency(Math.abs(computedBalance))}
            </h3>
            <p className={`text-sm mt-1 font-medium ${computedBalance > 0 ? 'text-rose-400/80' : computedBalance < 0 ? 'text-emerald-400/80' : 'text-slate-400/80'}`}>
              {computedBalance > 0 ? (customer.type === 'supplier' ? 'You owe them' : 'They owe you') : computedBalance < 0 ? (customer.type === 'supplier' ? 'Advance given to them' : 'Advance from them') : 'Account settled'}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => { setEntryType('give'); setIsAddEntryModalOpen(true); }}
              className="flex-1 flex items-center justify-between p-4 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-2xl transition-colors group text-left"
            >
              <div>
                <p className="text-rose-400 font-bold text-lg">{customer.type === 'supplier' ? 'Credit (Borrowed/Bought)' : 'Gave Udhaar (Credit)'}</p>
                <p className="text-rose-400/60 text-sm">{customer.type === 'supplier' ? 'Received items on credit' : 'You gave item/money'}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                <ArrowUpRight size={20} />
              </div>
            </button>
            <button
              onClick={() => { setEntryType('receive'); setIsAddEntryModalOpen(true); }}
              className="flex-1 flex items-center justify-between p-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-2xl transition-colors group text-left"
            >
              <div>
                <p className="text-emerald-400 font-bold text-lg">{customer.type === 'supplier' ? 'Given Payment' : 'Got Payment'}</p>
                <p className="text-emerald-400/60 text-sm">{customer.type === 'supplier' ? 'You paid your debt' : 'They paid their debt'}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <ArrowDownRight size={20} />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-lg font-bold tracking-tight text-white">Payment History</h3>
        </div>

        {unifiedHistory.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No history found for this customer.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {unifiedHistory.map(entry => (
              <div key={entry.syntheticId} className="p-6 hover:bg-white/5 transition-colors flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${entry.type === 'give' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {entry.type === 'give' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                  </div>
                  <div>
                    <h4 className="font-bold text-white leading-tight">
                      {entry.description || (entry.type === 'give' ? (customer.type === 'supplier' ? 'Credit Purchase' : 'Given Udhaar') : (customer.type === 'supplier' ? 'Given Payment' : 'Payment Received'))}
                      {!entry.isUdhaar && !entry.isInitial && <span className="ml-2 text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">Transaction</span>}
                      {entry.isInitial && <span className="ml-2 text-[10px] bg-slate-500/20 text-slate-400 px-2 py-0.5 rounded-full">Initial Balance</span>}
                    </h4>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                      <span className="flex items-center gap-1"><Calendar size={14} /> {format(new Date(entry.date), 'dd MMM yy')}</span>
                      {entry.dueDate && (
                        <span className="text-amber-400 flex items-center gap-1">Due: {format(new Date(entry.dueDate), 'dd MMM yy')}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className={`text-xl font-bold tracking-tight ${entry.type === 'give' ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {entry.type === 'give' ? '+' : '-'}{formatCurrency(entry.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddUdhaarEntryModal
        isOpen={isAddEntryModalOpen}
        onClose={() => setIsAddEntryModalOpen(false)}
        customer={customer}
        type={entryType}
        lang={lang}
        activeContext={activeContext}
      />
    </div>
  );
}

function AddUdhaarEntryModal({
  isOpen,
  onClose,
  customer,
  type,
  lang,
  activeContext
}: {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  type: 'give' | 'receive';
  lang: Lang;
  activeContext: 'personal' | 'business';
}) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState('');

  const [inventoryItemId, setInventoryItemId] = useState<string>('');
  const [inventoryQty, setInventoryQty] = useState('');

  const [isConfirmingSave, setIsConfirmingSave] = useState(false);

  const inventoryItems = useInventory(activeContext);

  if (!isOpen) return null;

  const processSave = async () => {
    if (!amount || isNaN(Number(amount)) || !customer.id) return;

    const numAmount = Number(amount);

    // Add entry
    await UdhaarService.add({
      customerId: customer.id,
      type,
      amount: numAmount,
      date: new Date(date).toISOString(),
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      description: description.trim(),
      originalCurrency: 'PKR', // Default for this modal
      originalAmount: numAmount,
      exchangeRate: 1,
      isCompleted: false
    });

    // Handle inventory deduction/addition
    if (inventoryItemId && inventoryQty && !isNaN(Number(inventoryQty))) {
      const qty = Number(inventoryQty);
      const delta = customer.type === 'supplier' ? qty : -qty;
      await InventoryService.updateQuantity(Number(inventoryItemId), delta);
    }

    onClose();

    setAmount('');
    setDescription('');
    setDueDate('');
    setInventoryItemId('');
    setInventoryQty('');
    setIsConfirmingSave(false);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConfirmingSave(true);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0F172A] border border-white/10 rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            {type === 'give' ? (
              <><span className="text-rose-400"><ArrowUpRight size={24} /></span> {customer.type === 'supplier' ? 'Add Credit (Bought)' : 'Add Credit (Udhaar)'}</>
            ) : (
              <><span className="text-emerald-400"><ArrowDownRight size={24} /></span> {customer.type === 'supplier' ? 'Given Payment' : 'Add Payment'}</>
            )}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-lg">Rs</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                required
                className="w-full bg-[#1E293B] border border-white/10 text-white text-xl rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-indigo-500/50 outline-none placeholder:text-slate-600 font-bold"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1 z-50">Date</label>
            <DatePicker
              value={date}
              onChange={(newDate) => setDate(newDate)}
              className="w-full bg-[#1E293B] border border-white/10 text-white rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
            />
          </div>

          {type === 'give' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1 z-40">Due Date (Optional)</label>
                <DatePicker
                  value={dueDate}
                  onChange={(newDate) => setDueDate(newDate)}
                  className="w-full bg-[#1E293B] border border-white/10 text-white rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
                />
              </div>
              <div className="pt-2 border-t border-white/10">
                <label className="block text-sm font-medium text-white mb-2">{customer.type === 'supplier' ? 'Link Inventory (Add Stock)' : 'Link Inventory (Deduct Stock)'}</label>
                <div className="flex gap-2">
                  <select
                    value={inventoryItemId}
                    onChange={(e) => {
                      setInventoryItemId(e.target.value);
                      const item = inventoryItems.find((i: any) => i.id === Number(e.target.value));
                      if (item && !description && !amount) {
                        setDescription(customer.type === 'supplier' ? `Bought ${item.name}` : `Sold ${item.name}`);
                        // optionally we could set amount if we knew qty, but user can edit.
                      }
                    }}
                    className="flex-1 bg-[#1E293B] border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none appearance-none"
                  >
                    <option value="">No item (Optional)</option>
                    {inventoryItems.map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.quantity} in stock)
                      </option>
                    ))}
                  </select>
                  {inventoryItemId && (
                    <input
                      type="number"
                      required
                      value={inventoryQty}
                      onChange={(e) => {
                        setInventoryQty(e.target.value);
                        const item = inventoryItems.find((i: any) => i.id === Number(inventoryItemId));
                        if (item && e.target.value) {
                          setAmount(String(item.unitPrice * Number(e.target.value)));
                        }
                      }}
                      placeholder="Qty"
                      className="w-20 bg-[#1E293B] border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
                    />
                  )}
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was this for?"
              className="w-full bg-[#1E293B] border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`flex-1 px-4 py-3 rounded-xl text-white text-sm font-bold shadow-lg transition-colors ${type === 'give' ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
                }`}
            >
              Save {type === 'give' ? 'Udhaar' : 'Payment'}
            </button>
          </div>
        </form>

        <ConfirmDialog
          isOpen={isConfirmingSave}
          onClose={() => setIsConfirmingSave(false)}
          onConfirm={processSave}
          title="Confirm Transaction"
          message={`Are you sure you want to save this ${type === 'give' ? 'credit' : 'payment'} of ${amount}?`}
          confirmText="Save Transaction"
          isDestructive={false}
        />
      </div>
    </div>
  );
}
