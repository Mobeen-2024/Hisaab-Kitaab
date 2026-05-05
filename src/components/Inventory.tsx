import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, InventoryItem } from '../db';
import { Package, Plus, AlertCircle, Trash2, Edit2, TrendingUp, DollarSign, BarChart3, Minus } from 'lucide-react';
import { formatCurrency as formatSharedCurrency } from '../lib/currency';
import ConfirmDialog from './ConfirmDialog';
import { useSettings } from '../contexts/SettingsContext';

export default function Inventory() {
  const { lang, currency, activeContext } = useSettings();
  const items = useLiveQuery(() => db.inventory.where('context').equals(activeContext).toArray(), [activeContext]) || [];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [restockId, setRestockId] = useState<number | null>(null);
  const [restockQty, setRestockQty] = useState('');

  if (activeContext !== 'business') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white/5 rounded-[2rem] border border-white/10">
        <Package size={48} className="mb-4 text-slate-500" />
        <p>Inventory management is only available in Business mode.</p>
      </div>
    );
  }

  const formatCurrency = (val: number) => formatSharedCurrency(val, currency, lang);
  const totalValue = items.reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  const handleRestock = async () => {
    if (!restockId || !restockQty || isNaN(Number(restockQty))) return;
    const item = items.find(i => i.id === restockId);
    if (item) {
      await db.inventory.update(restockId, { quantity: item.quantity + Number(restockQty) });
    }
    setRestockId(null);
    setRestockQty('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Restock Modal */}
      {restockId !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-white/10 rounded-[2rem] w-full max-sm shadow-2xl animate-in zoom-in-95 duration-200 p-6">
            <h3 className="text-lg font-bold text-white mb-1">Restock Item</h3>
            <p className="text-sm text-slate-400 mb-4">Adding to: <b className="text-white">{items.find(i => i.id === restockId)?.name}</b></p>
            <label className="block text-sm font-medium text-slate-400 mb-1">Quantity to Add</label>
            <input
              type="number" autoFocus value={restockQty} onChange={e => setRestockQty(e.target.value)} min="1"
              onKeyDown={e => e.key === 'Enter' && handleRestock()}
              className="w-full bg-[#1E293B] border border-white/10 text-white text-xl rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500/50 outline-none mb-4"
              placeholder="0"
            />
            <div className="flex gap-3">
              <button onClick={() => { setRestockId(null); setRestockQty(''); }} className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-colors">Cancel</button>
              <button onClick={handleRestock} className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-bold transition-colors">Add Stock</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400">
            <Package size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Stock Inventory</h2>
            <p className="text-sm text-slate-400">Manage items, stock levels & valuation.</p>
          </div>
        </div>
        <button
          onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-orange-900/20"
        >
          <Plus size={18} />
          <span>Add Item</span>
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Inventory Value</p>
            <p className="text-lg font-black text-orange-400 tabular-nums">{formatCurrency(totalValue)}</p>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
            <BarChart3 size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Total Stock Count</p>
            <p className="text-lg font-black text-white tabular-nums">{totalItems} units</p>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Critical Stock</p>
            <p className="text-lg font-black text-rose-400 tabular-nums">{items.filter(i => i.quantity <= i.minQuantity).length} items</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
        {items.map((item) => (
          <div
            key={item.id}
            className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 hover:bg-white/10 transition-all duration-300 relative overflow-hidden"
          >
            {item.quantity <= item.minQuantity && (
              <div className="absolute top-4 right-4 text-rose-400 animate-pulse">
                <AlertCircle size={20} />
              </div>
            )}
            
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white mb-1 group-hover:text-orange-400 transition-colors">{item.name}</h3>
              <p className="text-sm text-slate-400 line-clamp-1">{item.category}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-black/20 rounded-2xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Unit Price</p>
                <p className="text-base font-bold text-slate-300">{formatCurrency(item.unitPrice)}</p>
              </div>
              <div className="bg-black/20 rounded-2xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Total Value</p>
                <p className="text-base font-bold text-orange-400">{formatCurrency(item.quantity * item.unitPrice)}</p>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex justify-between items-end mb-2">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Stock Level</p>
                <span className={`text-sm font-bold ${item.quantity <= item.minQuantity ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {item.quantity} / {item.minQuantity}
                </span>
              </div>
              <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/5">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    item.quantity <= item.minQuantity ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                  }`}
                  style={{ width: `${Math.min(100, (item.quantity / (item.minQuantity * 2)) * 100)}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setRestockId(item.id!)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-colors border border-white/5"
              >
                <Plus size={14} />
                <span>Restock</span>
              </button>
              <button
                onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                className="p-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-colors border border-white/5"
              >
                <Edit2 size={18} />
              </button>
              <button
                onClick={() => setDeleteId(item.id!)}
                className="p-3 bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl transition-colors border border-white/5"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-500 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
            <Package size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">No items in inventory</p>
            <p className="text-sm">Click "Add Item" to start tracking your stock.</p>
          </div>
        )}
      </div>

      <InventoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        item={editingItem}
        activeContext={activeContext}
        currency={currency}
      />

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) {
            await db.inventory.delete(deleteId);
            setDeleteId(null);
          }
        }}
        title="Delete Item"
        message="Are you sure you want to remove this item? This action cannot be undone."
      />
    </div>
  );
}

function InventoryModal({ isOpen, onClose, item, activeContext, currency }: any) {
  const [name, setName] = useState(item?.name || '');
  const [category, setCategory] = useState(item?.category || '');
  const [quantity, setQuantity] = useState(item?.quantity?.toString() || '');
  const [minQuantity, setMinQuantity] = useState(item?.minQuantity?.toString() || '');
  const [unitPrice, setUnitPrice] = useState(item?.unitPrice?.toString() || '');

  React.useEffect(() => {
    if (item) {
      setName(item.name);
      setCategory(item.category);
      setQuantity(item.quantity.toString());
      setMinQuantity(item.minQuantity.toString());
      setUnitPrice(item.unitPrice.toString());
    } else {
      setName('');
      setCategory('');
      setQuantity('');
      setMinQuantity('');
      setUnitPrice('');
    }
  }, [item]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name,
      category,
      quantity: Number(quantity),
      minQuantity: Number(minQuantity),
      unitPrice: Number(unitPrice),
      context: activeContext
    };

    if (item?.id) {
      await db.inventory.update(item.id, data);
    } else {
      await db.inventory.add(data);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#0F172A] border border-white/10 rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-white/10 bg-white/5 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">{item ? 'Edit Item' : 'New Inventory Item'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400">
            <Minus size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-widest">Item Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-[#1E293B] border border-white/10 text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-widest">Category</label>
              <input type="text" value={category} onChange={e => setCategory(e.target.value)} required className="w-full bg-[#1E293B] border border-white/10 text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-widest">Unit Price</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">{currency === 'PKR' ? 'Rs' : '$'}</span>
                <input type="number" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} required className="w-full bg-[#1E293B] border border-white/10 text-white rounded-2xl pl-12 pr-5 py-4 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-widest">Current Stock</label>
              <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} required className="w-full bg-[#1E293B] border border-white/10 text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-widest">Min. Alert Level</label>
              <input type="number" value={minQuantity} onChange={e => setMinQuantity(e.target.value)} required className="w-full bg-[#1E293B] border border-white/10 text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
            </div>
          </div>
          <div className="pt-4 flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all">Cancel</button>
            <button type="submit" className="flex-1 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-orange-900/20">
              {item ? 'Update Item' : 'Create Item'}
            </button>
          </div>
          <p className="text-center text-xs text-slate-500">
            Total value: {formatSharedCurrency(Number(quantity) * Number(unitPrice), currency, 'en')}
          </p>
        </form>
      </div>
    </div>
  );
}
