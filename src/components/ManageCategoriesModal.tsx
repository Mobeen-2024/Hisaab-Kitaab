import React, { useState } from 'react';
import { Category } from '../db';
import { CategoryService } from '../services/CategoryService';
import { X, Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { t, Lang } from '../lib/i18n';
import { useCategories } from '../hooks/useData';
import ConfirmDialog from './ConfirmDialog';

export default function ManageCategoriesModal({
  isOpen,
  onClose,
  lang,
  activeContext
}: {
  isOpen: boolean;
  onClose: () => void;
  lang: Lang;
  activeContext: 'personal' | 'business';
}) {
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense');

  const categories = useCategories(activeContext);

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    
    await CategoryService.add({
      name: newCatName.trim(),
      type: newCatType,
      context: activeContext
    });
    setNewCatName('');
  };

  const handleDelete = async () => {
    if (confirmDeleteId) {
      await CategoryService.delete(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

  const incomes = categories.filter(c => c.type === 'income');
  const expenses = categories.filter(c => c.type === 'expense');

  return (
    <div className="fixed inset-0 bg-[#0F172A]/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <ConfirmDialog
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Category"
        message="Are you sure you want to delete this category? This action cannot be undone and may affect existing transactions."
      />
      <div className="bg-[#1E293B] border border-white/20 rounded-3xl w-full max-w-md overflow-hidden relative shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[85vh]">
        
        <div className="flex justify-between items-center px-6 py-5 border-b border-white/10 shrink-0">
          <h2 className="text-xl font-black text-white tracking-tight">Manage Categories</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors hidden-tap">
            <X size={20} />
          </button>
        </div>
        
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          <form onSubmit={handleAdd} className="space-y-4 bg-white/5 p-4 rounded-2xl border border-white/10">
            <h3 className="text-sm font-bold text-white mb-2">Add New Category</h3>
            
            <div className="flex bg-[#0F172A] rounded-xl p-1">
              <button
                type="button"
                onClick={() => setNewCatType('expense')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${newCatType === 'expense' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setNewCatType('income')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${newCatType === 'income' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Income
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                required
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="Category Name"
                className="flex-1 bg-[#0F172A] border border-white/10 text-white rounded-xl px-4 focus:ring-2 focus:ring-blue-500/50 outline-none"
              />
              <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl transition-colors shrink-0">
                <Plus size={20} />
              </button>
            </div>
          </form>

          <div>
             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
               <TrendingDown size={16} className="text-rose-400" /> Expense Categories
             </h3>
             <div className="space-y-2">
               {expenses.length === 0 && <p className="text-slate-500 text-sm">No expense categories.</p>}
               {expenses.map(c => (
                 <div key={c.id} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl p-3">
                   <span className="text-white font-medium">{t(lang, c.name)}</span>
                   <button 
                     onClick={() => setConfirmDeleteId(c.id!)} 
                     className="transition-colors p-1 rounded text-slate-400 hover:text-rose-400"
                     title="Delete category"
                   >
                     <Trash2 size={16} />
                   </button>
                 </div>
               ))}
             </div>
          </div>

          <div>
             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
               <TrendingUp size={16} className="text-emerald-400" /> Income Categories
             </h3>
             <div className="space-y-2">
               {incomes.length === 0 && <p className="text-slate-500 text-sm">No income categories.</p>}
               {incomes.map(c => (
                 <div key={c.id} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl p-3">
                   <span className="text-white font-medium">{t(lang, c.name)}</span>
                   <button 
                     onClick={() => setConfirmDeleteId(c.id!)} 
                     className="transition-colors p-1 rounded text-slate-400 hover:text-rose-400"
                     title="Delete category"
                   >
                     <Trash2 size={16} />
                   </button>
                 </div>
               ))}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
