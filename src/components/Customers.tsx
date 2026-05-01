import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Customer } from '../db';
import { t } from '../lib/i18n';
import { Plus, Users, Search, Phone, ChevronRight, Trash2, UserRound, Truck } from 'lucide-react';
import { formatCurrency as formatSharedCurrency } from '../lib/currency';
import CustomerDetail from './CustomerDetail';
import ConfirmDialog from './ConfirmDialog';
import { useSettings } from '../contexts/SettingsContext';
import { useUI } from '../contexts/UIContext';

export default function Customers() {
  const { lang, currency, activeContext } = useSettings();
  const { setIsAddCustomerModalOpen } = useUI();
  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deletingCustomerId, setDeletingCustomerId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'customer' | 'supplier'>('all');

  if (selectedCustomer) {
    return <CustomerDetail 
      customer={selectedCustomer} 
      onBack={() => setSelectedCustomer(null)} 
      lang={lang} 
      currency={currency} 
      activeContext={activeContext}
    />;
  }

  const filteredCustomers = customers.filter(c => {
    if (activeTab !== 'all') {
      const type = c.type || 'customer'; // Default old records to customer
      if (type !== activeTab) return false;
    }
    if (!searchQuery.trim()) return true;
    const name = c.name.toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || c.phone.includes(query);
  });

  const formatCurrency = (val: number) => {
    return formatSharedCurrency(val, currency, lang);
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog
        isOpen={deletingCustomerId !== null}
        onClose={() => setDeletingCustomerId(null)}
        onConfirm={async () => {
          if (deletingCustomerId) {
            try {
              const custId = deletingCustomerId;
              
              const txs = await db.transactions.toArray();
              const txIds = txs.filter(t => Number(t.customerId) === custId).map(t => t.id).filter((id): id is number => id !== undefined);
              if (txIds.length > 0) await db.transactions.bulkDelete(txIds);

              const entries = await db.udhaarEntries.toArray();
              const entryIds = entries.filter(e => Number(e.customerId) === custId).map(e => e.id).filter((id): id is number => id !== undefined);
              if (entryIds.length > 0) await db.udhaarEntries.bulkDelete(entryIds);

              await db.customers.delete(custId);
            } catch (err) {
              console.error("Error deleting customer:", err);
            }
            setDeletingCustomerId(null);
          }
        }}
        title="Delete Contact"
        message="Are you sure you want to delete this contact? This will also remove their transactions and Udhaar history. This action cannot be undone."
      />
      <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden relative p-6 cursor-default">
        <div className="absolute top-0 right-1/4 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Users size={20} />
            </div>
            <h3 className="text-lg font-bold tracking-tight">Khata (Receivables & Payables)</h3>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-auto">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder={t(lang, 'searchTransactions')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0F172A]/50 border border-white/10 text-white rounded-xl pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none placeholder:text-slate-600"
              />
            </div>
            <button
              onClick={() => setIsAddCustomerModalOpen(true)}
              className="hidden lg:flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 transition-colors"
            >
              <Plus size={16} />
              Add Contact
            </button>
          </div>
        </div>
        
        <div className="flex bg-white/5 p-1 rounded-xl w-full max-w-sm mt-6">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${activeTab === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('customer')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'customer' ? 'bg-emerald-600/50 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <UserRound size={12} /> Customers
          </button>
          <button
            onClick={() => setActiveTab('supplier')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'supplier' ? 'bg-blue-600/50 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Truck size={12} /> Suppliers
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {filteredCustomers.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500">
              No contacts found.
            </div>
          ) : (
            filteredCustomers.map(customer => {
              const isSupplier = customer.type === 'supplier';
              return (
                <div 
                  key={customer.id} 
                  onClick={() => setSelectedCustomer(customer)}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all cursor-pointer group hover:-translate-y-1"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-bold text-white text-lg flex items-center gap-2">
                      {isSupplier ? <Truck size={16} className="text-blue-400" /> : <UserRound size={16} className="text-emerald-400" />}
                      {customer.name}
                    </h4>
                    <div className={`text-sm font-bold px-2 py-1 rounded-md ${customer.balance > 0 ? 'bg-rose-500/20 text-rose-400' : customer.balance < 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
                      {customer.balance > 0 ? (isSupplier ? 'You Owe ' : 'They Owe ') : customer.balance < 0 ? (isSupplier ? 'Your Advance ' : 'Their Advance ') : 'Settled'} 
                      {customer.balance !== 0 && formatCurrency(Math.abs(customer.balance))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <Phone size={14} />
                      {customer.phone || 'N/A'}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (customer.id) setDeletingCustomerId(customer.id);
                        }}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors z-10 relative"
                        title="Delete Person"
                      >
                        <Trash2 size={16} />
                      </button>
                      <ChevronRight size={18} className="text-slate-500 group-hover:text-white transition-colors" />
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
