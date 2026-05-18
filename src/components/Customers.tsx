import React, { useState } from 'react';
import { Customer } from '../models';
import { CustomerService } from '../services/CustomerService';
import { useCustomers, useUdhaarEntries } from '../hooks/useData';
import { t } from '../lib/i18n';
import { Plus, Users, Search, Phone, ChevronRight, Trash2, UserRound, Truck, ArrowDownLeft, ArrowUpRight, Pencil } from 'lucide-react';
import { formatCurrency as formatSharedCurrency } from '../lib/currency';
import CustomerDetail from './CustomerDetail';
import ConfirmDialog from './ConfirmDialog';
import { useSettings } from '../contexts/SettingsContext';
import { useUIStore } from '../lib/store';
import { useToast } from '../contexts/ToastContext';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';

interface EditCustomerModalProps {
  customer: Customer;
  onClose: () => void;
}

function EditCustomerModal({ customer, onClose }: EditCustomerModalProps) {
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone);
  const [type, setType] = useState<'customer' | 'supplier'>(customer.type || 'customer');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await CustomerService.update(customer.id!, { name: name.trim(), phone: phone.trim(), type });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const themeColor = type === 'customer' ? 'emerald' : 'blue';

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Pencil size={18} className="text-emerald-400" /> Edit Contact
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label htmlFor="edit-name" required>Full Name</Label>
          <Input
            id="edit-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            autoFocus
            focusColor={themeColor}
          />
        </div>
        <div>
          <Label htmlFor="edit-phone">Phone Number</Label>
          <Input
            id="edit-phone"
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            focusColor={themeColor}
          />
        </div>
        <div>
          <Label>Contact Type</Label>
          <div className="flex bg-white/5 p-1 rounded-xl">
            {(['customer', 'supplier'] as const).map(t => (
              <Button
                key={t}
                variant={type === t ? (t === 'customer' ? 'emerald' : 'blue') : 'ghost'}
                size="sm"
                className="flex-1"
                onClick={() => setType(t)}
                leftIcon={t === 'customer' ? <UserRound size={12} /> : <Truck size={12} />}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-4 border-t border-white/5">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1 text-slate-300"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant={themeColor}
            className="flex-1"
            isLoading={saving}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Customers() {
  const { showToast } = useToast();
  const { lang, currency, activeContext } = useSettings();
  const { setAddCustomerModalOpen } = useUIStore();
  const customers = useCustomers();
  const allUdhaarEntries = useUdhaarEntries();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [deletingCustomerId, setDeletingCustomerId] = useState<number | null>(null);
  const [forceDeleteCustomerId, setForceDeleteCustomerId] = useState<number | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'customer' | 'supplier'>('all');

  const customersWithBalances = customers;

  const filteredCustomers = React.useMemo(() => customersWithBalances.filter(c => {
    if (activeTab !== 'all' && (c.type || 'customer') !== activeTab) return false;
    if (!searchQuery.trim()) return true;
    return c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery);
  }), [customersWithBalances, activeTab, searchQuery]);

  const totalReceivable = React.useMemo(() => customersWithBalances.filter(c => c.type !== 'supplier' && c.balance > 0).reduce((s, c) => s + c.balance, 0), [customersWithBalances]);
  const totalPayable = React.useMemo(() => customersWithBalances.filter(c => c.type === 'supplier' && c.balance > 0).reduce((s, c) => s + c.balance, 0), [customersWithBalances]);
  const settledCount = customersWithBalances.filter(c => c.balance === 0).length;

  const formatCurrency = (val: number) => formatSharedCurrency(val, currency, lang);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || null;

  if (selectedCustomer) {
    return <CustomerDetail customer={selectedCustomer} onBack={() => setSelectedCustomerId(null)} lang={lang} currency={currency} activeContext={activeContext} />;
  }

  return (
    <div className="space-y-6">
      {editingCustomer && <EditCustomerModal customer={editingCustomer} onClose={() => setEditingCustomer(null)} />}

      <ConfirmDialog
        isOpen={deletingCustomerId !== null}
        onClose={() => setDeletingCustomerId(null)}
        onConfirm={async () => {
          if (deletingCustomerId) {
            try {
              await CustomerService.delete(deletingCustomerId);
              setDeletingCustomerId(null);
            } catch (err: any) {
              if (err.message.includes('force delete')) {
                setForceDeleteCustomerId(deletingCustomerId);
              } else {
                showToast(err.message || 'Failed to delete customer', 'error');
              }
              setDeletingCustomerId(null);
            }
          }
        }}
        title="Delete Contact"
        message="This will remove all transactions and Udhaar history for this contact. Cannot be undone."
      />

      <ConfirmDialog
        isOpen={forceDeleteCustomerId !== null}
        onClose={() => setForceDeleteCustomerId(null)}
        onConfirm={async () => {
          if (forceDeleteCustomerId) {
            try {
              await CustomerService.delete(forceDeleteCustomerId, true);
              setForceDeleteCustomerId(null);
              showToast('Contact and all related transactions force deleted', 'success');
            } catch (err: any) {
              showToast(err.message || 'Failed to force delete customer', 'error');
              setForceDeleteCustomerId(null);
            }
          }
        }}
        title="Force Delete Contact?"
        message="This contact has an active balance. Are you sure you want to delete them AND all their related transactions? This cannot be undone."
        confirmText="Force Delete"
        isDestructive={true}
      />

      {/* Stats Bar */}
      <div className="bg-[#1E293B]/80 backdrop-blur-md rounded-3xl border border-white/10 p-3 sm:p-4 flex flex-row divide-x divide-white/10 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex-1 py-2 px-1 sm:px-2 flex flex-col items-center justify-center text-center">
          <p className="text-[9px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center justify-center gap-1"><ArrowDownLeft size={14} className="text-emerald-400 hidden sm:block" /> <span className="truncate">To Receive</span></p>
          <p className="text-sm sm:text-2xl font-black text-emerald-400 tabular-nums leading-none truncate w-full px-1" title={formatCurrency(totalReceivable)}>{formatCurrency(totalReceivable)}</p>
        </div>
        <div className="flex-1 py-2 px-1 sm:px-2 flex flex-col items-center justify-center text-center">
          <p className="text-[9px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center justify-center gap-1"><ArrowUpRight size={14} className="text-rose-400 hidden sm:block" /> <span className="truncate">To Pay</span></p>
          <p className="text-sm sm:text-2xl font-black text-rose-400 tabular-nums leading-none truncate w-full px-1" title={formatCurrency(totalPayable)}>{formatCurrency(totalPayable)}</p>
        </div>
        <div className="flex-1 py-2 px-1 sm:px-2 flex flex-col items-center justify-center text-center">
          <p className="text-[9px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center justify-center gap-1"><Users size={14} className="text-blue-400 hidden sm:block" /> <span className="truncate">Contacts</span></p>
          <p className="text-sm sm:text-2xl font-black text-white tabular-nums leading-none truncate w-full px-1">{customers.length} <span className="text-[9px] sm:text-[11px] text-slate-500 font-medium block sm:inline">({settledCount})</span></p>
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
              <Input
                type="text"
                placeholder="Search contacts…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
                className="py-2.5 rounded-xl placeholder:text-slate-600 bg-[#0F172A]/50 border border-white/10 text-white"
                focusColor="emerald"
              />
            </div>
            <Button
              variant="emerald"
              onClick={() => setAddCustomerModalOpen(true)}
              leftIcon={<Plus size={16} />}
              className="hidden lg:flex"
            >
              Add Contact
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-white/5 p-1 rounded-xl w-full max-w-sm mt-5">
          {([['all', 'All', null], ['customer', 'Customers', 'emerald'], ['supplier', 'Suppliers', 'blue']] as const).map(([tab, label, color]) => (
            <Button
              key={tab}
              onClick={() => setActiveTab(tab)}
              variant={activeTab === tab ? (color === 'emerald' ? 'emerald' : color === 'blue' ? 'blue' : 'secondary') : 'ghost'}
              size="sm"
              className="flex-1"
              leftIcon={
                tab === 'customer' ? <UserRound size={12} /> : tab === 'supplier' ? <Truck size={12} /> : undefined
              }
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {filteredCustomers.length === 0 ? (
            <div className="col-span-full py-16 text-center">
              <Users size={40} className="mx-auto mb-4 text-slate-600" />
              <p className="text-slate-500 font-medium">No contacts found.</p>
              <Button
                variant="emerald"
                onClick={() => setAddCustomerModalOpen(true)}
                className="mt-4"
              >
                Add First Contact
              </Button>
            </div>
          ) : (
            filteredCustomers.map(customer => {
              const isSupplier = customer.type === 'supplier';
              return (
                <div key={customer.id} onClick={() => setSelectedCustomerId(customer.id!)}
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
