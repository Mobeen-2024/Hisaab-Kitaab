import React, { useState } from 'react';
import { CategoryService } from '../services/CategoryService';
import { X, Plus, Trash2, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { t, Lang } from '../lib/i18n';
import { useCategories } from '../hooks/useData';
import ConfirmDialog from './ConfirmDialog';
import { useToast } from '../contexts/ToastContext';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const categories = useCategories(activeContext);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await CategoryService.add({
        name: newCatName.trim(),
        type: newCatType,
        context: activeContext
      });
      setNewCatName('');
      showToast('Category added successfully', 'success');
    } catch (error: any) {
      if (error?.issues?.[0]?.message) {
        showToast(error.issues[0].message, 'error');
      } else {
        showToast('Failed to add category', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId || isDeleting) return;
    
    setIsDeleting(true);
    try {
      await CategoryService.delete(confirmDeleteId);
      showToast('Category deleted successfully', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to delete category', 'error');
    } finally {
      setIsDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  const incomes = categories.filter(c => c.type === 'income');
  const expenses = categories.filter(c => c.type === 'expense');

  return (
    <div 
      className="fixed inset-0 bg-[#0F172A]/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <ConfirmDialog
        isOpen={confirmDeleteId !== null}
        onClose={() => !isDeleting && setConfirmDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Category"
        message="Are you sure you want to delete this category? If it is currently used in any transactions, the deletion will be prevented."
      />
      <div className="bg-[#1E293B] border border-white/20 rounded-3xl w-full max-w-md overflow-hidden relative shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[85vh]">
        
        <div className="flex justify-between items-center px-6 py-5 border-b border-white/10 shrink-0">
          <h2 id="modal-title" className="text-xl font-black text-white tracking-tight">Manage Categories</h2>
          <button 
            onClick={onClose} 
            disabled={isSubmitting || isDeleting}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors hidden-tap disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          <form onSubmit={handleAdd} className="space-y-4 bg-white/5 p-4 rounded-2xl border border-white/10">
            <h3 className="text-sm font-bold text-white mb-2">Add New Category</h3>
            
            <div className="flex bg-[#0F172A] rounded-xl p-1">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setNewCatType('expense')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 ${newCatType === 'expense' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Expense
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setNewCatType('income')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 ${newCatType === 'income' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Income
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                required
                disabled={isSubmitting}
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="Category Name"
                className="flex-1 bg-[#0F172A] border border-white/10 text-white rounded-xl px-4 focus:ring-2 focus:ring-blue-500/50 outline-none disabled:opacity-50"
              />
              <button 
                type="submit" 
                disabled={isSubmitting || !newCatName.trim()}
                className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[44px]"
                aria-label="Add category"
              >
                {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
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
                     disabled={isDeleting || isSubmitting}
                     onClick={() => setConfirmDeleteId(c.id!)} 
                     className="transition-colors p-1 rounded text-slate-400 hover:text-rose-400 disabled:opacity-50 disabled:cursor-not-allowed"
                     aria-label={`Delete ${c.name} category`}
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
                     disabled={isDeleting || isSubmitting}
                     onClick={() => setConfirmDeleteId(c.id!)} 
                     className="transition-colors p-1 rounded text-slate-400 hover:text-rose-400 disabled:opacity-50 disabled:cursor-not-allowed"
                     aria-label={`Delete ${c.name} category`}
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
