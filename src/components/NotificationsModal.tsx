import React from 'react';
import { X, Bell, Package, Users, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { Lang } from '../lib/i18n';
import { formatCurrency } from '../lib/currency';
import { useInventory, useCustomers, useUdhaarEntries } from '../hooks/useData';
import { useSettings } from '../contexts/SettingsContext';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Lang;
  currency: string;
}

export default function NotificationsModal({ isOpen, onClose, lang, currency }: NotificationsModalProps) {
  const { activeContext } = useSettings();
  const inventory = useInventory(activeContext);
  const customers = useCustomers();
  const allUdhaarEntries = useUdhaarEntries();

  const customersWithBalances = React.useMemo(() => customers.map(c => {
    const isSupplier = c.type === 'supplier';
    const balance = allUdhaarEntries
      .filter(e => e.customerId === c.id)
      .reduce((sum, e) => {
        if (isSupplier) {
          return sum + (e.type === 'receive' ? e.amount : -e.amount);
        } else {
          return sum + (e.type === 'give' ? e.amount : -e.amount);
        }
      }, 0);
    return { ...c, balance };
  }), [customers, allUdhaarEntries]);

  const lowStockItems = inventory.filter(item => item.quantity <= item.minQuantity);
  const outstandingDebts = customersWithBalances.filter(c => c.balance > 0 && c.type !== 'supplier');
  const outstandingPayables = customersWithBalances.filter(c => c.balance > 0 && c.type === 'supplier');

  const notifications = [
    ...lowStockItems.map(item => ({
      id: `stock-${item.id}`,
      type: 'inventory',
      title: `${item.name} low stock`,
      message: `Current stock is ${item.quantity}. Min threshold is ${item.minQuantity}.`,
      timestamp: new Date().toISOString(),
      read: false
    })),
    ...outstandingDebts.map(c => ({
      id: `debt-${c.id}`,
      type: 'payment',
      title: `${c.name} owes you`,
      message: `Outstanding balance: ${formatCurrency(c.balance, currency, lang)}`,
      timestamp: new Date().toISOString(),
      read: false
    })),
    ...outstandingPayables.map(c => ({
      id: `payable-${c.id}`,
      type: 'payment',
      title: `You owe ${c.name}`,
      message: `Outstanding balance: ${formatCurrency(c.balance, currency, lang)}`,
      timestamp: new Date().toISOString(),
      read: false
    }))
  ];

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end pointer-events-auto">
          <div 
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
          />
          
          <div 
            className="w-full max-w-md bg-[#0F172A] border-l border-white/10 h-full shadow-2xl relative flex flex-col z-10"
          >
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400 border border-blue-500/20">
                  <Bell size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Notifications</h2>
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-0.5">Real-time Alerts</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                    <Bell size={32} className="text-slate-600" />
                  </div>
                  <h3 className="text-white font-bold mb-1">No new alerts</h3>
                  <p className="text-xs text-slate-500">We'll notify you about low stock, pending udhaar, and important business updates here.</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer group hover:scale-[1.02] active:scale-95 ${
                      notif.read ? 'bg-white/5 border-white/10' : 'bg-blue-600/10 border-blue-500/30 shadow-lg shadow-blue-500/5'
                    }`}
                  >
                    <div className="flex gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        notif.type === 'inventory' ? 'bg-amber-500/20 border-amber-500/20 text-amber-500' :
                        notif.type === 'payment' ? 'bg-emerald-500/20 border-emerald-500/20 text-emerald-500' :
                        'bg-blue-500/20 border-blue-500/20 text-blue-500'
                      }`}>
                        {notif.type === 'inventory' ? <Package size={20} /> : <Users size={20} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-bold text-white text-sm truncate pr-2">{notif.title}</h4>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed mb-3">{notif.message}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-6 border-t border-white/10 bg-white/5">
                <button className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-300 transition-all flex items-center justify-center gap-2">
                  Clear All Notifications
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
