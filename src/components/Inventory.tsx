import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, InventoryItem } from '../db';
import { Package, Plus, AlertCircle, Trash2, Edit2 } from 'lucide-react';
import { formatCurrency as formatSharedCurrency } from '../lib/currency';
import { t, Lang } from '../lib/i18n';
import ConfirmDialog from './ConfirmDialog';

import { useSettings } from '../contexts/SettingsContext';

export default function Inventory() {
  const { lang, currency, activeContext } = useSettings();
  const items = useLiveQuery(() => db.inventory.where('context').equals(activeContext).toArray(), [activeContext]) || [];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  if (activeContext !== 'business') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <Package size={48} className="mb-4 text-slate-500" />
        <p>Inventory tracking is only available in Business mode.</p>
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return formatSharedCurrency(val, currency, lang);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400">
            <Package size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Inventory Management</h2>
            <p className="text-sm text-slate-400">Track stock levels and get low stock alerts.</p>
          </div>
        </div>
        <button 
          onClick={() => {
            setEditingItem(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-bold transition-colors"
        >
          <Plus size={16} /> Add Item
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => {
          const isLowStock = item.quantity <= item.minQuantity;
          return (
            <div key={item.id} className={`p-5 rounded-2xl border ${isLowStock ? 'bg-rose-500/10 border-rose-500/30' : 'bg-white/5 border-white/10'} relative group`}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-white text-lg">{item.name}</h3>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="text-slate-400 hover:text-white"><Edit2 size={16} /></button>
                  <button onClick={() => setDeleteId(item.id!)} className="text-slate-400 hover:text-rose-400"><Trash2 size={16} /></button>
                </div>
              </div>
              
              <div className="flex justify-between items-end mt-4">
                <div>
                   <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">In Stock</p>
                   <p className={`text-2xl font-black ${isLowStock ? 'text-rose-400' : 'text-emerald-400'}`}>
                     {item.quantity}
                   </p>
                </div>
                <div className="text-right">
                   <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Unit Price</p>
                   <p className="text-lg font-bold text-slate-300">{formatCurrency(item.unitPrice)}</p>
                </div>
              </div>

              {isLowStock && (
                <div className="mt-4 flex items-center gap-2 text-xs font-bold text-rose-400 bg-rose-400/10 px-3 py-1.5 rounded-lg border border-rose-400/20">
                  <AlertCircle size={14} /> Low stock! (Min: {item.minQuantity})
                </div>
              )}
            </div>
          );
        })}
        
        {items.length === 0 && (
          <div className="col-span-full p-12 text-center text-slate-500 bg-white/5 rounded-2xl border border-white/10">
            No items in inventory. Click "Add Item" to start tracking.
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) {
            await db.inventory.delete(deleteId);
            setDeleteId(null);
          }
        }}
        title="Delete Inventory Item"
        message="Are you sure you want to delete this item? This action cannot be undone."
      />

      <InventoryModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        activeContext={activeContext}
        editingItem={editingItem}
        currency={currency}
      />
    </div>
  );
}

function InventoryModal({ isOpen, onClose, activeContext, editingItem, currency }: any) {
  const [name, setName] = useState(editingItem?.name || '');
  const [quantity, setQuantity] = useState(editingItem ? String(editingItem.quantity) : '');
  const [minQuantity, setMinQuantity] = useState(editingItem ? String(editingItem.minQuantity) : '5');
  const [unitPrice, setUnitPrice] = useState(editingItem ? String(editingItem.unitPrice) : '');

  React.useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setQuantity(String(editingItem.quantity));
      setMinQuantity(String(editingItem.minQuantity));
      setUnitPrice(String(editingItem.unitPrice));
    } else {
      setName('');
      setQuantity('');
      setMinQuantity('5');
      setUnitPrice('');
    }
  }, [editingItem, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || isNaN(Number(quantity)) || isNaN(Number(unitPrice))) return;

    if (editingItem?.id) {
      await db.inventory.update(editingItem.id, {
        name,
        quantity: Number(quantity),
        minQuantity: Number(minQuantity),
        unitPrice: Number(unitPrice),
      });
    } else {
      await db.inventory.add({
        name,
        quantity: Number(quantity),
        minQuantity: Number(minQuantity),
        unitPrice: Number(unitPrice),
        context: activeContext,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0F172A] border border-white/10 rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="text-orange-400" size={24} /> 
            {editingItem ? 'Edit Item' : 'Add Item'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Item Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Cement Bag, Fresh Milk"
              required
              className="w-full bg-[#1E293B] border border-white/10 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500/50 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="w-full bg-[#1E293B] border border-white/10 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500/50 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Min Quantity Alert</label>
              <input
                type="number"
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
                required
                className="w-full bg-[#1E293B] border border-white/10 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500/50 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Unit Price ({currency})</label>
            <input
              type="number"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              required
              className="w-full bg-[#1E293B] border border-white/10 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500/50 outline-none"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-colors">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-bold transition-colors">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}
