import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { useInventory } from '../../hooks/useData';

export function InventoryAlert() {
  const { lang, activeContext } = useSettings();
  const inventory = useInventory(activeContext);
  const lowStockItems = inventory.filter(item => item.quantity <= item.minQuantity);
  const isUrdu = lang === 'ur';

  if (lowStockItems.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center justify-between gap-4 relative overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 via-rose-500/5 to-rose-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
      <div className="flex items-center gap-3 relative z-10">
        <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
          <AlertTriangle size={20} className="animate-bounce" />
        </div>
        <div>
          <p className="text-xs font-black text-rose-300 uppercase tracking-widest">{isUrdu ? 'توجہ فرمائیں' : 'Inventory Alert'}</p>
          <p className="text-white text-sm font-bold">{lowStockItems.length} {isUrdu ? 'چیزیں اسٹاک میں کم ہیں' : 'items are running low on stock'}</p>
        </div>
      </div>
      <button className="text-[10px] font-black uppercase tracking-widest bg-rose-500 text-white px-4 py-2 rounded-lg hover:bg-rose-400 transition-colors relative z-10">
        {isUrdu ? 'چیک کریں' : 'View Stock'}
      </button>
    </motion.div>
  );
}
