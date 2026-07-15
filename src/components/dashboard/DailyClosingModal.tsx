import React from 'react';
import { X, CheckCircle, Calculator } from 'lucide-react';
import { t } from '../../lib/i18n';
import { formatCurrency } from '../../lib/currency';
import { useSettings } from '../../contexts/SettingsContext';

interface DailyClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
  todayIncome: number;
  todayExpense: number;
}

export default function DailyClosingModal({ isOpen, onClose, todayIncome, todayExpense }: DailyClosingModalProps) {
  const { currency, lang } = useSettings();
  const netBalance = todayIncome - todayExpense;

  if (!isOpen) return null;

  const handleConfirm = () => {
    // Phase 1: Just close. Later we can save a snapshot to db or Firebase
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Calculator size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Daily Closing</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Review today's transactions before closing your physical cash drawer or shop for the day.
          </p>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">Today's Income</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold text-lg">{formatCurrency(todayIncome, currency, lang)}</span>
            </div>
            
            <div className="flex justify-between items-center p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20">
              <span className="text-rose-700 dark:text-rose-400 font-medium">Today's Expense</span>
              <span className="text-rose-700 dark:text-rose-400 font-bold text-lg">{formatCurrency(todayExpense, currency, lang)}</span>
            </div>

            <div className="flex justify-between items-center p-4 rounded-2xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
              <span className="text-slate-800 dark:text-white font-bold">Net Expected Cash</span>
              <span className={`font-bold text-xl ${netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatCurrency(netBalance, currency, lang)}
              </span>
            </div>
          </div>
          
          <button 
            onClick={handleConfirm}
            className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-colors shadow-lg shadow-blue-500/30"
          >
            <CheckCircle size={20} />
            Confirm Closing
          </button>
        </div>
      </div>
    </div>
  );
}
