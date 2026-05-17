import React, { useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, ChevronDown } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { useTransactions, useAppSettings, useCategories, useTodayTransactions } from '../../hooks/useData';
import { SettingsService } from '../../services/SettingsService';
import { formatCurrency as formatSharedCurrency } from '../../lib/currency';
import { t } from '../../lib/i18n';

export function QuickStats() {
  const { lang, currency, activeContext, rtl } = useSettings();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const isUrdu = lang === 'ur';

  const transactions = useTransactions(activeContext);
  const todayTransactions = useTodayTransactions(activeContext);
  const settingsObj = useAppSettings();
  const categories = useCategories();

  const totalIncomePKR = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpensePKR = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const totalBalancePKR = totalIncomePKR - totalExpensePKR;

  const todayExpensePKR = todayTransactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);

  const incomeCategories = categories.filter(c => c.type === 'income' && c.context === 'business');
  const defaultCategory = incomeCategories.length > 0 ? incomeCategories[0] : null;
  const milkCategoryIndex = categories.findIndex(c => c.name === 'Daily Milk Sales');
  
  const highlightedCategoryId = settingsObj?.highlightedCategoryId ?? (milkCategoryIndex !== -1 ? categories[milkCategoryIndex].id : defaultCategory?.id);
  const highlightedCategory = categories.find(c => c.id === highlightedCategoryId);
  
  const todayHighlightedSalesPKR = highlightedCategoryId
    ? todayTransactions
        .filter(t => t.type === 'income' && t.categoryId === highlightedCategoryId)
        .reduce((acc, curr) => acc + curr.amount, 0)
    : 0;

  const formatCompactCurrency = (valInPKR: number) => {
    return formatSharedCurrency(valInPKR, currency, lang, true);
  };

  const updateHighlightedCategory = async (id: number) => {
    if (settingsObj?.id) {
      await SettingsService.update(settingsObj.id, { highlightedCategoryId: id });
    }
    setIsDropdownOpen(false);
  };

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-6 md:gap-8 relative z-[60]" style={{ perspective: '1200px' }}>
      {/* Total Balance Card */}
      <div className="group h-full lg:col-span-1 md:col-span-2">
        <div className="group h-full bg-gradient-to-br from-blue-950/60 via-slate-900/60 to-slate-900/60 border border-blue-500/10 hover:border-blue-400/40 p-3 sm:p-8 rounded-2xl sm:rounded-[2.5rem] relative overflow-hidden transition-all duration-700 shadow-2xl">
          <div className={`absolute -top-8 -right-8 w-24 h-24 sm:w-52 sm:h-52 bg-blue-500/20 rounded-full ${isUrdu ? 'blur-[15px] opacity-30' : 'blur-[30px]'} transition-all duration-700 group-hover:bg-blue-400/35 group-hover:scale-125`} />
          <div className="absolute top-0 left-2 right-2 sm:left-8 sm:right-8 h-[1px] bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />
          
          <div className={`flex flex-col sm:flex-row justify-between items-start relative z-10 ${rtl ? 'flex-row-reverse' : ''} gap-1 sm:gap-0`}>
            <p className={`text-[8px] sm:text-[10px] font-black uppercase text-blue-300/90 flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-center sm:text-left ${isUrdu ? '' : 'tracking-widest'} w-full sm:w-auto`}>
              <Wallet size={14} strokeWidth={3} className="hidden sm:block" />
              <span className="truncate">{activeContext === 'business' ? (isUrdu ? 'مجموعی آمدنی' : 'Cumulative') : (isUrdu ? 'کل بیلنس' : 'Liquidity')}</span>
            </p>
            <div className="hidden sm:flex w-9 h-9 rounded-2xl border border-blue-400/20 bg-blue-500/10 items-center justify-center text-blue-400 transition-all duration-500 shrink-0">
              <ArrowDownRight size={18} className={rtl ? 'scale-x-[-1]' : ''} />
            </div>
          </div>
          <div className="relative z-10 w-full mt-2 sm:mt-8 flex flex-col items-center sm:items-start">
            <h3 className="text-sm sm:text-4xl lg:text-5xl font-black tracking-tighter tabular-nums leading-none drop-shadow-[0_0_30px_rgba(59,130,246,0.6)] text-center sm:text-left w-full break-all sm:truncate" style={{ color: '#e0eaff' }} dir="ltr">
              {formatCompactCurrency(totalBalancePKR)}
            </h3>
          </div>
          <div className={`hidden sm:inline-flex mt-8 text-emerald-300 text-[10px] items-center gap-2 font-black uppercase bg-emerald-500/10 px-5 py-2 rounded-xl border border-emerald-400/20 relative z-10 ${isUrdu ? 'flex-row-reverse' : 'tracking-widest'}`}>
            <TrendingUp size={12} strokeWidth={3} />
            {isUrdu ? 'فعال' : 'Operational'}
          </div>
        </div>
      </div>

      {/* Today's Expenses Card */}
      <div className="group h-full">
        <div className="group h-full bg-gradient-to-br from-rose-950/50 via-slate-900/60 to-slate-900/60 border border-rose-500/10 hover:border-rose-400/40 p-3 sm:p-8 rounded-2xl sm:rounded-[2.5rem] relative overflow-hidden transition-all duration-700 shadow-2xl">
          <div className={`absolute -top-8 -right-8 w-24 h-24 sm:w-52 sm:h-52 bg-rose-500/20 rounded-full ${isUrdu ? 'blur-[15px] opacity-30' : 'blur-[30px]'} transition-all duration-700 group-hover:bg-rose-400/35 group-hover:scale-125`} />
          <div className="absolute top-0 left-2 right-2 sm:left-8 sm:right-8 h-[1px] bg-gradient-to-r from-transparent via-rose-400/60 to-transparent" />

          <div className={`flex flex-col sm:flex-row justify-between items-start relative z-10 ${rtl ? 'flex-row-reverse' : ''} gap-1 sm:gap-0`}>
            <p className={`text-[8px] sm:text-[10px] font-black uppercase text-rose-300/90 flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-center sm:text-left ${isUrdu ? '' : 'tracking-widest'} w-full sm:w-auto`}>
              <TrendingDown size={14} strokeWidth={3} className="hidden sm:block" />
              <span className="truncate">{activeContext === 'business' ? (isUrdu ? 'آج کی خریداری' : 'Cost Today') : (isUrdu ? 'آج کے اخراجات' : 'Burn Today')}</span>
            </p>
            <div className="hidden sm:flex w-9 h-9 rounded-2xl border border-rose-400/20 bg-rose-500/10 items-center justify-center text-rose-400 transition-all duration-500 shrink-0">
              <ArrowUpRight size={18} className={rtl ? 'scale-x-[-1]' : ''} />
            </div>
          </div>
          <div className="relative z-10 w-full mt-2 sm:mt-8 flex flex-col items-center sm:items-start">
            <h3 className="text-sm sm:text-4xl lg:text-5xl font-black tracking-tighter tabular-nums leading-none drop-shadow-[0_0_30px_rgba(244,63,94,0.6)] text-center sm:text-left w-full break-all sm:truncate" style={{ color: '#ffe0e6' }} dir="ltr">
              {formatCompactCurrency(todayExpensePKR)}
            </h3>
          </div>
          <div className={`hidden sm:inline-flex mt-8 text-rose-300/90 text-[10px] font-black uppercase bg-rose-500/10 px-5 py-2 rounded-xl border border-rose-400/20 relative z-10 ${isUrdu ? '' : 'tracking-widest'}`}>
            {isUrdu ? 'لائیو فیڈ' : 'Live Feed'}
          </div>
        </div>
      </div>

      {/* Highlighted Category Card */}
      <div className="group h-full">
        <div className="group h-full bg-gradient-to-br from-amber-950/40 via-slate-900/60 to-slate-900/60 border border-amber-500/10 hover:border-amber-400/40 p-3 sm:p-8 rounded-2xl sm:rounded-[2.5rem] relative z-20 overflow-visible transition-all duration-700 shadow-2xl">
          <div className={`absolute -top-8 -right-8 w-24 h-24 sm:w-52 sm:h-52 bg-amber-500/20 rounded-full ${isUrdu ? 'blur-[15px] opacity-30' : 'blur-[30px]'} transition-all duration-700 group-hover:bg-amber-400/35 group-hover:scale-125`} />
          <div className="absolute top-0 left-2 right-2 sm:left-8 sm:right-8 h-[1px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
          
          <div className={`flex flex-col sm:flex-row justify-between items-start relative z-50 ${rtl ? 'flex-row-reverse' : ''} gap-1 sm:gap-0`}>
            <div className="relative inline-block w-full sm:w-auto flex justify-center sm:block">
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`text-[8px] sm:text-[9px] font-black uppercase text-amber-400 flex items-center justify-center gap-1 sm:gap-2 hover:text-amber-300 transition-all bg-amber-500/10 hover:bg-amber-500/20 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-amber-500/10 shadow-lg ${isUrdu ? 'flex-row-reverse' : 'tracking-widest'} w-full sm:w-auto truncate`}
              >
                <span className="truncate">{highlightedCategory ? t(lang, highlightedCategory.name) : (isUrdu ? 'منتخب کریں' : 'STREAM')}</span>
                <ChevronDown size={10} strokeWidth={3} className={`shrink-0 transition-transform duration-500 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isDropdownOpen && (
                <div className={`absolute top-[130%] ${isUrdu ? 'right-0' : 'left-0'} w-48 sm:w-56 bg-[#0F172A]/98 backdrop-blur-3xl border border-white/10 rounded-xl sm:rounded-[1.5rem] shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-300`}>
                  <div className="max-h-56 overflow-y-auto py-2 px-2 custom-scrollbar">
                    {categories.filter(c => c.type === 'income').map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => updateHighlightedCategory(cat.id!)}
                        className={`w-full px-3 py-2.5 rounded-xl text-[10px] sm:text-[11px] font-black uppercase transition-all duration-300 mb-1 last:mb-0 ${isUrdu ? 'text-right' : 'text-left tracking-widest'} ${
                          highlightedCategoryId === cat.id 
                            ? 'bg-amber-500 text-black' 
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {t(lang, cat.name)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="hidden sm:flex w-9 h-9 rounded-2xl border border-white/5 bg-white/5 items-center justify-center text-slate-500 transition-all duration-500 shrink-0">
              <ArrowDownRight size={18} className={rtl ? 'scale-x-[-1]' : ''} />
            </div>
          </div>
          
          <div className="relative z-10 w-full mt-2 sm:mt-8 flex flex-col items-center sm:items-start text-center sm:text-left">
            <h3 className="text-sm sm:text-4xl lg:text-5xl font-black tracking-tighter text-white tabular-nums leading-none w-full break-all sm:truncate" dir="ltr">
              {formatCompactCurrency(todayHighlightedSalesPKR)}
            </h3>
          </div>
          <div className={`hidden sm:inline-flex mt-8 text-amber-400/80 text-[10px] font-black uppercase bg-amber-500/5 px-5 py-2 rounded-xl border border-amber-500/10 ${isUrdu ? '' : 'tracking-widest'}`}>
            {isUrdu ? 'کارکردگی' : 'Performance Focus'}
          </div>
        </div>
      </div>
    </div>
  );
}
