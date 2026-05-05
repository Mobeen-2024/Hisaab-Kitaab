import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Customer } from '../db';
import { t } from '../lib/i18n';
import { Plus, Users, Search, Phone, ChevronRight, Trash2, UserRound, Truck, ArrowDownLeft, ArrowUpRight, Pencil, X } from 'lucide-react';
import { formatCurrency as formatSharedCurrency } from '../lib/currency';
import CustomerDetail from './CustomerDetail';
import ConfirmDialog from './ConfirmDialog';
import { useSettings } from '../contexts/SettingsContext';
import { useUI } from '../contexts/UIContext';

function EditCustomerModal({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone);
  const [type, setType] = useState<'customer' | 'supplier'>(customer.type || 'customer');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await db.customers.update(customer.id!, { name: name.trim(), phone: phone.trim(), type });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0F172A] border border-white/10 rounded-[2rem] w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/5 rounded-t-[2rem]">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Pencil size={18} className="text-emerald-400" /> Edit Contact
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Full Name</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)} required autoFocus
              className="w-full bg-[#1E293B] border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Phone Number</label>
            <input
              type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full bg-[#1E293B] border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Contact Type</label>
            <div className="flex bg-white/5 p-1 rounded-xl">
              {(['customer', 'supplier'] as const).map(t => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${type === t ? (t === 'customer' ? 'bg-emerald-600/60 text-white' : 'bg-blue-600/60 text-white') : 'text-slate-400 hover:text-white'}`}>
                  {t === 'customer' ? <UserRound size={12} /> : <Truck size={12} />}
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-colors">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Customers() {
  const { lang, currency, activeContext } = useSettings();
  const { setIsAddCustomerModalOpen } = useUI();
  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deletingCustomerId, setDeletingCustomerId] = useState<number | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'customer' | 'supplier'>('all');

  if (selectedCustomer) {
    return <CustomerDetail customer={selectedCustomer} onBack={() => setSelectedCustomer(null)} lang={lang} currency={currency} activeContext={activeContext} />;
  }

  const filteredCustomers = customers.filter(c => {
    if (activeTab !== 'all' && (c.type || 'customer') !== activeTab) return false;
    if (!searchQuery.trim()) return true;
    return c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery);
  });

  const totalReceivable = customers.filter(c => c.type !== 'supplier' && c.balance > 0).reduce((s, c) => s + c.balance, 0);
  const totalPayable = customers.filter(c => c.type === 'supplier' && c.balance > 0).reduce((s, c) => s + c.balance, 0);
  const settledCount = customers.filter(c => c.balance === 0).length;

  const formatCurrency = (val: number) => formatSharedCurrency(val, currency, lang);

  return (
    <div className="space-y-6">
      {editingCustomer && <EditCustomerModal customer={editingCustomer} onClose={() => setEditingCustomer(null)} />}

      <ConfirmDialog
        isOpen={deletingCustomerId !== null}
        onClose={() => setDeletingCustomerId(null)}
        onConfirm={async () => {
          if (deletingCustomerId) {
            const custId = deletingCustomerId;
            const txs = await db.transactions.toArray();
            const txIds = txs.filter(t => Number(t.customerId) === custId).map(t => t.id).filter((id): id is number => id !== undefined);
            if (txIds.length > 0) await db.transactions.bulkDelete(txIds);
            const entries = await db.udhaarEntries.toArray();
            const entryIds = entries.filter(e => Number(e.customerId) === custId).map(e => e.id).filter((id): id is number => id !== undefined);
            if (entryIds.length > 0) await db.udhaarEntries.bulkDelete(entryIds);
            await db.customers.delete(custId);
            setDeletingCustomerId(null);
          }
        }}
        title="Delete Contact"
        message="This will remove all transactions and Udhaar history for this contact. Cannot be undone."
      />

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-900/30 to-slate-900/60 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
            <ArrowDownLeft size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">To Receive</p>
            <p className="text-lg font-black text-emerald-400 tabular-nums">{formatCurrency(totalReceivable)}</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-rose-900/30 to-slate-900/60 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0">
            <ArrowUpRight size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">To Pay</p>
            <p className="text-lg font-black text-rose-400 tabular-nums">{formatCurrency(totalPayable)}</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-white/10 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 text-slate-400 flex items-center justify-center shrink-0">
            <Users size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contacts</p>
            <p className="text-lg font-black text-white tabular-nums">{customers.length} <span className="text-xs text-slate-500 font-medium">({settledCount} settled)</span></p>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden relative p-6">
        <div className="absolute top-0 right-1/4 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Users size={20} />
            </div>
            <h3 className="text-lg font-bold tracking-tight">Khata (Receivables & Payables)</h3>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text" placeholder="Search contacts…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#0F172A]/50 border border-white/10 text-white rounded-xl pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none placeholder:text-slate-600"
              />
            </div>
            <button onClick={() => setIsAddCustomerModalOpen(true)}
              className="hidden lg:flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 transition-colors whitespace-nowrap">
              <Plus size={16} /> Add Contact
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-white/5 p-1 rounded-xl w-full max-w-sm mt-5">
          {([['all', 'All', null], ['customer', 'Customers', 'emerald'], ['supplier', 'Suppliers', 'blue']] as const).map(([tab, label, color]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${activeTab === tab ? (color ? `bg-${color}-600/50 text-white` : 'bg-slate-700 text-white') : 'text-slate-400 hover:text-white'}`}>
              {tab === 'customer' && <UserRound size={12} />}
              {tab === 'supplier' && <Truck size={12} />}
              {label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {filteredCustomers.length === 0 ? (
            <div className="col-span-full py-16 text-center">
              <Users size={40} className="mx-auto mb-4 text-slate-600" />
              <p className="text-slate-500 font-medium">No contacts found.</p>
              <button onClick={() => setIsAddCustomerModalOpen(true)} className="mt-4 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-colors">
                Add First Contact
              </button>
            </div>
          ) : (
            filteredCustomers.map(customer => {
              const isSupplier = customer.type === 'supplier';
              return (
                <div key={customer.id} onClick={() => setSelectedCustomer(customer)}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all cursor-pointer group hover:-translate-y-0.5 relative">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-bold text-white text-base flex items-center gap-2 truncate">
                      {isSupplier ? <Truck size={14} className="text-blue-400 shrink-0" /> : <UserRound size={14} className="text-emerald-400 shrink-0" />}
                      <span className="truncate">{customer.name}</span>
                    </h4>
                    <span className={`text-xs font-bold px-2 py-1 rounded-md shrink-0 ml-2 ${customer.balance > 0 ? 'bg-rose-500/20 text-rose-400' : customer.balance < 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
                      {customer.balance === 0 ? 'Settled' : customer.balance > 0 ? (isSupplier ? 'You Owe' : 'They Owe') : 'Advance'}
                    </span>
                  </div>

                  {customer.balance !== 0 && (
                    <p className={`text-xl font-black tabular-nums mb-3 ${customer.balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {formatCurrency(Math.abs(customer.balance))}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                      <Phone size={12} />
                      <span>{customer.phone || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={e => { e.stopPropagation(); setEditingCustomer(customer); }}
                        className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                        title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); if (customer.id) setDeletingCustomerId(customer.id); }}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"
                        title="Delete">
                        <Trash2 size={14} />
                      </button>
                      <ChevronRight size={16} className="text-slate-500 group-hover:text-white transition-colors ml-1" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
