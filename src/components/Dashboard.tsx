import React, { useState, useRef, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Lang, t, isRTL } from '../lib/i18n';
import { Wallet, TrendingUp, TrendingDown, Store, ChevronDown, ArrowUpRight, ArrowDownRight, Sparkles, Plus, HandCoins, Target, PieChart, AlertTriangle, Package } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { formatCurrency as formatSharedCurrency } from '../lib/currency';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import TransactionList from './TransactionList';
import QuickEntryModal from './QuickEntryModal';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function TiltCard({ children, className, glowColor = "rgba(59,130,246,0.5)" }: { children: React.ReactNode, className?: string, glowColor?: string }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseX = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseY = useSpring(y, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(mouseY, [-0.5, 0.5], ["7deg", "-7deg"]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-7deg", "7deg"]);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseXPos = event.clientX - rect.left;
    const mouseYPos = event.clientY - rect.top;
    x.set(mouseXPos / width - 0.5);
    y.set(mouseYPos / height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className={`relative ${className}`}
    >
      <div 
        style={{ transform: "translateZ(50px)", transformStyle: "preserve-3d" }}
        className="w-full h-full"
      >
        {children}
      </div>
      {/* Dynamic Glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2rem]"
        style={{
          background: `radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${glowColor}, transparent 80%)`,
        }}
      />
    </motion.div>
  );
}

export default function Dashboard({ lang, currency, activeContext }: { lang: Lang, currency: string, activeContext: 'business' | 'personal' }) {
  const allTransactions = useLiveQuery(() => db.transactions.toArray(), []) || [];
  const settingsObj = useLiveQuery(() => db.settings.get(1), []) || null;
  const categories = useLiveQuery(() => db.categories.toArray(), []) || [];
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(false);

  const udhaarEntries = useLiveQuery(() => db.udhaarEntries.toArray(), []) || [];
  const udhaarToReceive = udhaarEntries.filter(u => u.type === 'give' && !u.isCompleted).reduce((sum, u) => sum + u.amount, 0);
  const udhaarToGive = udhaarEntries.filter(u => u.type === 'receive' && !u.isCompleted).reduce((sum, u) => sum + u.amount, 0);

  const goals = useLiveQuery(() => db.goals.where('context').equals(activeContext).toArray(), [activeContext]) || [];
  const currentMonth = format(new Date(), 'yyyy-MM');
  const budget = useLiveQuery(() => db.budgets.where({ month: currentMonth, context: activeContext }).first(), [activeContext, currentMonth]);

  const inventory = useLiveQuery(() => db.inventory.where('context').equals(activeContext).toArray(), [activeContext]) || [];
  const lowStockItems = inventory.filter(item => item.quantity <= item.minQuantity);

  const transactions = useLiveQuery(
    () => db.transactions.where('context').equals(activeContext).toArray(),
    [activeContext]
  ) || [];

  // Calculate balances
  const totalIncomePKR = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpensePKR = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const totalBalancePKR = totalIncomePKR - totalExpensePKR;

  // Calculate today's stats
  const todayTransactions = transactions.filter(t => {
    try {
      return isToday(new Date(t.date));
    } catch(e) { return false; }
  });

  const todayExpensePKR = todayTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  // Determine highlighted category
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

  const updateHighlightedCategory = async (id: number) => {
    if (settingsObj?.id) {
      await db.settings.update(settingsObj.id, { highlightedCategoryId: id });
    }
    setIsDropdownOpen(false);
  };

  const formatCurrency = (valInPKR: number) => {
    return formatSharedCurrency(valInPKR, currency, lang);
  };

  const formatCompactCurrency = (valInPKR: number) => {
    return formatSharedCurrency(valInPKR, currency, lang, true);
  };

  const businessRevenue = allTransactions.filter(t => t.context === 'business' && t.type === 'income').reduce((a, b) => a + b.amount, 0);
  const businessCost = allTransactions.filter(t => t.context === 'business' && t.type === 'expense').reduce((a, b) => a + b.amount, 0);
  const businessProfit = businessRevenue - businessCost;
  const businessMarginPct = businessRevenue > 0 ? ((businessProfit / businessRevenue) * 100).toFixed(0) : '0';
  const businessCostPct = businessRevenue > 0 ? Math.min((businessCost / businessRevenue) * 100, 100).toFixed(0) : '0';

  // Generate data for Cash Flow Chart (Last 7 Days)
  const chartData = useMemo(() => {
    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = format(d, 'yyyy-MM-dd');
      
      const dayTransactions = transactions.filter(t => t.date.startsWith(dateStr));
      const income = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expense = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      
      data.push({
        name: format(d, 'EEE'),
        income,
        expense
      });
    }
    return data;
  }, [transactions]);

  const personalIncome = allTransactions.filter(t => t.context === 'personal' && t.type === 'income').reduce((a, b) => a + b.amount, 0);
  const personalExpense = allTransactions.filter(t => t.context === 'personal' && t.type === 'expense').reduce((a, b) => a + b.amount, 0);
  const personalBalance = personalIncome - personalExpense;
  const personalExpensePct = personalIncome > 0 ? Math.min((personalExpense / personalIncome) * 100, 100).toFixed(0) : '0';

  const rtl = isRTL(lang);
  const isUrdu = lang === 'ur'; // Keep isUrdu for specific font things if needed, but use rtl for layout

  return (
    <div className={`space-y-10 scroll-section ${rtl ? 'text-right' : ''} max-w-full bg-transparent`}>
      {/* Welcome Header */}
      <motion.div 
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative"
      >
        {/* Subtle aurora behind greeting */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_30%_50%,rgba(59,130,246,0.08)_0%,transparent_70%)] pointer-events-none" />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-1.5 h-6 bg-gradient-to-b from-blue-400 to-indigo-600 rounded-full shadow-[0_0_12px_rgba(99,102,241,0.8)]`} />
            <p className={`text-[10px] font-black uppercase text-slate-500 ${isUrdu ? '' : 'tracking-[0.3em]'}`}>
              {isUrdu ? 'خوش آمدید' : 'Welcome back'}
            </p>
          </div>
          <h2 className={`text-4xl md:text-5xl font-black tracking-tighter flex items-center gap-3 relative ${rtl ? 'flex-row-reverse' : ''}`}>
            <span className="text-white">{isUrdu ? '' : 'Hello, '}</span>
            <span className="relative">
              <span className="bg-gradient-to-r from-blue-300 via-indigo-200 to-purple-300 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(99,102,241,0.6)]">
                {settingsObj?.ownerName || 'Arsalan'}
              </span>
              {/* Name underline glow - Optimized for Urdu */}
              <span className={`absolute -bottom-1 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500/0 via-indigo-400/80 to-purple-500/0 rounded-full ${isUrdu ? '' : 'blur-[1px]'}`} />
            </span>
            <Sparkles size={26} className={`text-indigo-400 drop-shadow-[0_0_16px_rgba(99,102,241,0.9)] ${isUrdu ? '' : 'animate-pulse'}`} />
          </h2>
          <p className={`text-slate-500 font-bold uppercase text-[10px] mt-3 opacity-70 ${isUrdu ? '' : 'tracking-[0.2em]'}`}>
            {isUrdu ? 'آپ کے کاروبار کی ذہین بصیرت' : `Intelligent insights · ${activeContext} context`}
          </p>
        </div>
        <div className="relative">
          <div className="absolute inset-0 bg-blue-500/10 rounded-[1.5rem] blur-xl" />
          <div className="relative bg-white/[0.04] border border-white/10 hover:border-blue-500/30 px-6 py-3 rounded-[1.25rem] flex items-center gap-3 shadow-xl transition-colors duration-500">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(96,165,250,1)]"></div>
            <div>
              <p className={`text-[9px] font-black text-slate-600 uppercase mb-0.5 ${isUrdu ? '' : 'tracking-[0.2em]'}`}>{isUrdu ? 'آج کی تاریخ' : 'Today'}</p>
              <span className={`text-[11px] font-black text-slate-300 uppercase ${isUrdu ? '' : 'tracking-[0.15em]'}`}>{format(new Date(), 'EEEE, MMM do')}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Critical Alerts Bar */}
      {lowStockItems.length > 0 && (
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
      )}

      <div className="grid grid-cols-3 gap-2 sm:gap-6 md:gap-8" style={{ perspective: '1200px' }}>

        {/* Total Balance Card */}
        <div className="group h-full will-change-transform lg:col-span-1 md:col-span-2">
          <div className="group h-full bg-gradient-to-br from-blue-950/60 via-slate-900/60 to-slate-900/60 border border-blue-500/10 hover:border-blue-400/40 p-3 sm:p-8 rounded-2xl sm:rounded-[2.5rem] relative z-10 overflow-hidden transition-all duration-700 shadow-2xl [backface-visibility:hidden]">
            {/* Multi-layer glow orb - Optimized for Urdu */}
            <div className={`absolute -top-8 -right-8 w-24 h-24 sm:w-52 sm:h-52 bg-blue-500/20 rounded-full ${isUrdu ? 'blur-[15px] sm:blur-[30px] opacity-30' : 'blur-[30px] sm:blur-[60px]'} transition-all duration-700 group-hover:bg-blue-400/35 group-hover:scale-125`} />
            <div className={`absolute -top-4 -right-4 w-16 h-16 sm:w-28 sm:h-28 bg-blue-400/15 rounded-full ${isUrdu ? 'blur-[10px] sm:blur-[15px] opacity-20' : 'blur-[20px] sm:blur-[30px]'} transition-all duration-500 group-hover:bg-blue-300/25`} />
            {/* Neon border accent */}
            <div className="absolute top-0 left-2 right-2 sm:left-8 sm:right-8 h-[1px] bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />
            
            <div className={`flex flex-col sm:flex-row justify-between items-start relative z-10 ${rtl ? 'flex-row-reverse' : ''} gap-1 sm:gap-0`}>
              <p className={`text-[8px] sm:text-[10px] font-black uppercase text-blue-300/90 flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-center sm:text-left ${isUrdu ? '' : 'tracking-widest sm:tracking-[0.2em]'} w-full sm:w-auto`}>
                <Wallet size={14} strokeWidth={3} className="hidden sm:block" />
                <span className="truncate">{activeContext === 'business' ? (isUrdu ? 'مجموعی آمدنی' : 'Cumulative') : (isUrdu ? 'کل بیلنس' : 'Liquidity')}</span>
              </p>
              <div className="hidden sm:flex w-9 h-9 rounded-2xl border border-blue-400/20 bg-blue-500/10 items-center justify-center text-blue-400 group-hover:bg-blue-400/20 group-hover:border-blue-400/40 transition-all duration-500 shrink-0">
                <ArrowDownRight size={18} className={rtl ? 'scale-x-[-1]' : ''} />
              </div>
            </div>
            <div className="relative z-10 w-full mt-2 sm:mt-8 flex flex-col items-center sm:items-start">
              <h3 className={`text-base sm:text-5xl font-black tracking-tighter tabular-nums leading-none drop-shadow-[0_0_30px_rgba(59,130,246,0.6)] text-center sm:text-left truncate w-full`} style={{ color: '#e0eaff' }} dir="ltr" title={formatCompactCurrency(totalBalancePKR)}>
                {formatCompactCurrency(totalBalancePKR)}
              </h3>
            </div>
            <div className={`hidden sm:inline-flex mt-8 text-emerald-300 text-[10px] items-center gap-2 font-black uppercase bg-emerald-500/10 px-5 py-2 rounded-xl border border-emerald-400/20 relative z-10 shadow-[0_0_15px_rgba(16,185,129,0.2)] ${isUrdu ? 'flex-row-reverse tracking-normal' : 'tracking-[0.15em]'}`}>
              <TrendingUp size={12} strokeWidth={3} />
              {isUrdu ? 'فعال' : 'Operational'}
            </div>
          </div>
        </div>

        {/* Today's Expenses Card */}
        <div className="group h-full">
          <div className="group h-full bg-gradient-to-br from-rose-950/50 via-slate-900/60 to-slate-900/60 border border-rose-500/10 hover:border-rose-400/40 p-3 sm:p-8 rounded-2xl sm:rounded-[2.5rem] relative overflow-hidden transition-all duration-700 shadow-2xl [backface-visibility:hidden]">
            <div className={`absolute -top-8 -right-8 w-24 h-24 sm:w-52 sm:h-52 bg-rose-500/20 rounded-full ${isUrdu ? 'blur-[15px] sm:blur-[30px] opacity-30' : 'blur-[30px] sm:blur-[60px]'} transition-all duration-700 group-hover:bg-rose-400/35 group-hover:scale-125`} />
            <div className={`absolute -top-4 -right-4 w-16 h-16 sm:w-28 sm:h-28 bg-rose-400/15 rounded-full ${isUrdu ? 'blur-[10px] sm:blur-[15px] opacity-20' : 'blur-[20px] sm:blur-[30px]'} transition-all duration-500 group-hover:bg-rose-300/25`} />
            <div className="absolute top-0 left-2 right-2 sm:left-8 sm:right-8 h-[1px] bg-gradient-to-r from-transparent via-rose-400/60 to-transparent" />

            <div className={`flex flex-col sm:flex-row justify-between items-start relative z-10 ${rtl ? 'flex-row-reverse' : ''} gap-1 sm:gap-0`}>
              <p className={`text-[8px] sm:text-[10px] font-black uppercase text-rose-300/90 flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-center sm:text-left ${isUrdu ? '' : 'tracking-widest sm:tracking-[0.2em]'} w-full sm:w-auto`}>
                <TrendingDown size={14} strokeWidth={3} className="hidden sm:block" />
                <span className="truncate">{activeContext === 'business' ? (isUrdu ? 'آج کی خریداری' : 'Cost Today') : (isUrdu ? 'آج کے اخراجات' : 'Burn Today')}</span>
              </p>
              <div className="hidden sm:flex w-9 h-9 rounded-2xl border border-rose-400/20 bg-rose-500/10 items-center justify-center text-rose-400 group-hover:bg-rose-400/20 group-hover:border-rose-400/40 transition-all duration-500 shrink-0">
                <ArrowUpRight size={18} className={rtl ? 'scale-x-[-1]' : ''} />
              </div>
            </div>
            <div className="relative z-10 w-full mt-2 sm:mt-8 flex flex-col items-center sm:items-start">
              <h3 className={`text-base sm:text-5xl font-black tracking-tighter tabular-nums leading-none drop-shadow-[0_0_30px_rgba(244,63,94,0.6)] text-center sm:text-left truncate w-full`} style={{ color: '#ffe0e6' }} dir="ltr" title={formatCompactCurrency(todayExpensePKR)}>
                {formatCompactCurrency(todayExpensePKR)}
              </h3>
            </div>
            <div className={`hidden sm:inline-flex mt-8 text-rose-300/90 text-[10px] font-black uppercase bg-rose-500/10 px-5 py-2 rounded-xl border border-rose-400/20 relative z-10 shadow-[0_0_15px_rgba(244,63,94,0.2)] ${isUrdu ? 'tracking-normal' : 'tracking-[0.15em]'}`}>
              {isUrdu ? 'لائیو فیڈ' : 'Live Feed'}
            </div>
          </div>
        </div>

        {/* Highlighted Category Card */}
        <div className="group h-full">
          <div className="group h-full bg-gradient-to-br from-amber-950/40 via-slate-900/60 to-slate-900/60 border border-amber-500/10 hover:border-amber-400/40 p-3 sm:p-8 rounded-2xl sm:rounded-[2.5rem] relative z-20 overflow-visible transition-all duration-700 shadow-2xl [backface-visibility:hidden]">
            {/* Premium Glow Orbs - Optimized for Urdu */}
            <div className={`absolute -top-8 -right-8 w-24 h-24 sm:w-52 sm:h-52 bg-amber-500/20 rounded-full ${isUrdu ? 'blur-[15px] sm:blur-[30px] opacity-30' : 'blur-[30px] sm:blur-[60px]'} transition-all duration-700 group-hover:bg-amber-400/35 group-hover:scale-125`} />
            <div className={`absolute -top-4 -right-4 w-16 h-16 sm:w-28 sm:h-28 bg-amber-400/15 rounded-full ${isUrdu ? 'blur-[10px] sm:blur-[15px] opacity-20' : 'blur-[20px] sm:blur-[30px]'} transition-all duration-500 group-hover:bg-amber-300/25`} />
            <div className="absolute top-0 left-2 right-2 sm:left-8 sm:right-8 h-[1px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
            
            <div className={`flex flex-col sm:flex-row justify-between items-start relative z-50 ${rtl ? 'flex-row-reverse' : ''} gap-1 sm:gap-0`}>
              <div className="relative inline-block w-full sm:w-auto flex justify-center sm:block">
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`text-[8px] sm:text-[9px] font-black uppercase text-amber-400 flex items-center justify-center gap-1 sm:gap-2 hover:text-amber-300 transition-all bg-amber-500/10 hover:bg-amber-500/20 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-amber-500/10 shadow-lg ${isUrdu ? 'flex-row-reverse tracking-normal' : 'tracking-widest sm:tracking-[0.2em]'} w-full sm:w-auto truncate`}
                >
                  <span className="truncate">{highlightedCategory ? t(lang, highlightedCategory.name) : (isUrdu ? 'منتخب کریں' : 'STREAM')}</span>
                  <ChevronDown size={10} strokeWidth={3} className={`shrink-0 transition-transform duration-500 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isDropdownOpen && (
                  <div className={`absolute top-[130%] ${isUrdu ? 'right-0' : 'left-0'} w-48 sm:w-56 bg-[#0F172A]/98 backdrop-blur-3xl border border-white/10 rounded-xl sm:rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-50 transform origin-top animate-in fade-in zoom-in-95 duration-300`}>
                    <div className="max-h-56 overflow-y-auto py-2 px-2 custom-scrollbar">
                      {categories.filter(c => c.type === 'income').map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => updateHighlightedCategory(cat.id!)}
                          className={`w-full px-3 py-2.5 rounded-xl text-[10px] sm:text-[11px] font-black uppercase transition-all duration-300 mb-1 last:mb-0 ${isUrdu ? 'text-right tracking-normal' : 'text-left tracking-widest'} ${
                            highlightedCategoryId === cat.id 
                              ? 'bg-amber-500 text-black shadow-lg' 
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
              
              <div className="hidden sm:flex w-9 h-9 rounded-2xl border border-white/5 bg-white/5 items-center justify-center text-slate-500 group-hover:text-amber-400 group-hover:border-amber-400/20 group-hover:bg-amber-400/10 transition-all duration-500 shrink-0">
                <ArrowDownRight size={18} className={rtl ? 'scale-x-[-1]' : ''} />
              </div>
            </div>
            
            <div className="relative z-10 w-full mt-2 sm:mt-8 flex flex-col items-center sm:items-start text-center sm:text-left">
              <h3 className={`text-base sm:text-5xl font-black tracking-tighter text-white drop-shadow-[0_4px_20px_rgba(245,158,11,0.3)] tabular-nums leading-none truncate w-full ${isUrdu ? 'sm:text-right' : ''}`} dir="ltr" title={formatCompactCurrency(todayHighlightedSalesPKR)}>
                {formatCompactCurrency(todayHighlightedSalesPKR)}
              </h3>
            </div>
            <div className={`hidden sm:inline-flex mt-8 text-amber-400/80 text-[10px] font-black uppercase bg-amber-500/5 px-5 py-2 rounded-xl border border-amber-500/10 relative z-0 pointer-events-none shadow-lg ${isUrdu ? 'tracking-normal' : 'tracking-[0.15em]'}`}>
              {isUrdu ? 'کارکردگی' : 'Performance Focus'}
            </div>
          </div>
        </div>
      </div>
      
      {/* Udhaar & Debt Summary Mini-Cards */}
      <div className="grid grid-cols-2 gap-6 relative z-10">
        <div className="bg-gradient-to-br from-emerald-900/30 to-slate-900/60 border border-emerald-500/20 p-5 rounded-3xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <HandCoins size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isUrdu ? 'وصول کرنا ہے' : 'To Receive'}</p>
            <p className="text-xl font-black text-emerald-400 tabular-nums">{formatCompactCurrency(udhaarToReceive)}</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-rose-900/30 to-slate-900/60 border border-rose-500/20 p-5 rounded-3xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
            <HandCoins size={24} className="rotate-180" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isUrdu ? 'ادا کرنا ہے' : 'To Pay'}</p>
            <p className="text-xl font-black text-rose-400 tabular-nums">{formatCompactCurrency(udhaarToGive)}</p>
          </div>
        </div>
      </div>
      
      {/* Cash Flow Trend & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        
        {/* Weekly Trend Chart */}
        <div className="lg:col-span-2 bg-[#0F172A]/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-6 lg:p-8 flex flex-col shadow-2xl">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-400" />
            {isUrdu ? 'ہفتہ وار کیش فلو' : '7-Day Cash Flow'}
          </h3>
          <div className="flex-1 w-full h-[250px] min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ fontSize: '14px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="income" name={isUrdu ? 'آمدنی' : 'Income'} stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="expense" name={isUrdu ? 'اخراجات' : 'Expense'} stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Quick Recent Transactions */}
        <div className="lg:col-span-1 flex flex-col h-full max-h-[400px] overflow-hidden">
           <TransactionList lang={lang} currency={currency} activeContext={activeContext} />
        </div>
      </div>

      {/* Goals & Budget Progress Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 relative z-10">
        
        {/* Goals Progress */}
        <div className="bg-[#0F172A]/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
          <div className={`flex justify-between items-center mb-6 ${rtl ? 'flex-row-reverse' : ''}`}>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Target size={16} className="text-purple-400" />
              {isUrdu ? 'مالی اہداف' : 'Financial Goals'}
            </h3>
            <span className="text-[10px] font-black text-slate-500 uppercase bg-white/5 px-3 py-1 rounded-full border border-white/5">
              {goals.length} {isUrdu ? 'فعال' : 'Active'}
            </span>
          </div>
          
          <div className="space-y-6">
            {goals.length === 0 ? (
              <div className="py-10 text-center border-2 border-dashed border-white/5 rounded-3xl">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{isUrdu ? 'کوئی فعال اہداف نہیں' : 'No active goals yet'}</p>
              </div>
            ) : (
              goals.map(goal => {
                const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
                return (
                  <div key={goal.id} className="space-y-3">
                    <div className={`flex justify-between items-end ${rtl ? 'flex-row-reverse' : ''}`}>
                      <div>
                        <p className="text-white font-bold text-sm">{goal.title}</p>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">
                          {formatCompactCurrency(goal.currentAmount)} / {formatCompactCurrency(goal.targetAmount)}
                        </p>
                      </div>
                      <span className="text-purple-400 text-sm font-black tabular-nums">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden relative border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-purple-600 to-indigo-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Monthly Budget Progress */}
        <div className="bg-[#0F172A]/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
          <div className={`flex justify-between items-center mb-6 ${rtl ? 'flex-row-reverse' : ''}`}>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <PieChart size={16} className="text-blue-400" />
              {isUrdu ? 'ماہانہ بجٹ' : 'Monthly Budget'}
            </h3>
            <span className="text-[10px] font-black text-slate-500 uppercase bg-white/5 px-3 py-1 rounded-full border border-white/5">
              {format(new Date(), 'MMMM yyyy')}
            </span>
          </div>

          {!budget ? (
            <div className="py-10 text-center border-2 border-dashed border-white/5 rounded-3xl">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{isUrdu ? 'کوئی بجٹ مقرر نہیں کیا گیا' : 'No budget set for this month'}</p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex flex-col items-center justify-center py-4">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  {/* Simple SVG progress circle */}
                  <svg className="w-full h-full -rotate-90">
                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                    <motion.circle 
                      cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" 
                      strokeDasharray={364.4}
                      initial={{ strokeDashoffset: 364.4 }}
                      animate={{ strokeDashoffset: 364.4 - (364.4 * Math.min(1, totalExpensePKR / budget.amount)) }}
                      transition={{ duration: 2, ease: "easeInOut" }}
                      className="text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-white tabular-nums">{Math.round((totalExpensePKR / budget.amount) * 100)}%</span>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{isUrdu ? 'استعمال شدہ' : 'Used'}</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest mb-1">{isUrdu ? 'مجموعی بجٹ' : 'Total Budget'}</p>
                  <p className="text-white font-black tabular-nums text-lg">{formatCompactCurrency(budget.amount)}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest mb-1">{isUrdu ? 'بقیہ' : 'Remaining'}</p>
                  <p className={`font-black tabular-nums text-lg ${budget.amount - totalExpensePKR > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCompactCurrency(Math.max(0, budget.amount - totalExpensePKR))}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Quick Summary of Business vs Personal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 relative z-10">
         {/* Business Summary Card */}
         <div className="bg-gradient-to-br from-amber-950/40 via-slate-900/70 to-slate-900/60 backdrop-blur-3xl border border-amber-500/10 hover:border-amber-400/40 transition-all duration-700 rounded-[2.5rem] p-8 flex flex-col flex-1 relative overflow-hidden group shadow-2xl [backface-visibility:hidden] will-change-transform">
            {/* Premium Glow Orbs - Optimized for performance in Urdu */}
            <div className={`absolute -top-12 -right-12 w-64 h-64 bg-amber-500/15 rounded-full ${isUrdu ? 'blur-[40px] opacity-30' : 'blur-[80px]'} group-hover:bg-amber-500/25 transition-all duration-700`}></div>
            <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
            
            <div className={`flex justify-between items-start mb-10 relative z-10 ${rtl ? 'flex-row-reverse' : ''}`}>
              <div className="space-y-2">
                <div className={`flex items-center gap-2 ${rtl ? 'flex-row-reverse' : ''}`}>
                  <div className="w-1 h-4 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.8)]"></div>
                  <h4 className={`text-[10px] font-black uppercase ${isUrdu ? '' : 'tracking-[0.25em]'} text-slate-500`}>
                    {t(lang, 'business')} {isUrdu ? 'کارکردگی' : 'Stream'}
                  </h4>
                </div>
              </div>
              <div className={isUrdu ? 'text-left' : 'text-right'}>
                <p className={`text-[9px] text-slate-500 font-black uppercase mb-1.5 opacity-60 ${isUrdu ? 'tracking-normal' : 'tracking-[0.2em]'}`}>{isUrdu ? 'منافع' : 'Net Yield'}</p>
                <div className={`text-3xl font-black tracking-tighter tabular-nums drop-shadow-[0_0_20px_rgba(16,185,129,0.3)] ${businessProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {businessProfit >= 0 ? '+' : ''}{businessMarginPct}%
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-end space-y-8 relative z-10">
               <div>
                 <div className={`flex justify-between items-baseline mb-3 ${rtl ? 'flex-row-reverse' : ''}`}>
                   <span className={`text-[10px] font-black uppercase text-slate-400 ${isUrdu ? 'tracking-normal' : 'tracking-[0.15em]'}`}>{isUrdu ? 'کل آمدنی' : 'Gross Revenue'}</span>
                   <span className="text-2xl font-black text-white tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" dir="ltr">
                     {formatCurrency(businessRevenue)}
                   </span>
                 </div>
               </div>
               
               <div>
                 <div className={`flex justify-between items-baseline mb-3 ${rtl ? 'flex-row-reverse' : ''}`}>
                   <span className={`text-[10px] font-black uppercase text-slate-500 ${isUrdu ? 'tracking-normal' : 'tracking-[0.15em]'}`}>{isUrdu ? 'اخراجات' : 'Operating Costs'}</span>
                   <span className="text-2xl font-black text-rose-400/90 tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(244,63,94,0.2)]" dir="ltr">
                     -{formatCurrency(businessCost)}
                   </span>
                 </div>
               </div>

               <div className="space-y-4 pt-6 border-t border-white/5">
                 <div className={`flex justify-between text-[9px] text-slate-500 font-black uppercase ${isUrdu ? 'flex-row-reverse tracking-normal' : 'tracking-[0.2em]'}`}>
                   <span>{isUrdu ? 'اخراجات بمقابلہ آمدنی' : 'Cost-to-Revenue Index'}</span>
                   <span className="text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">{businessCostPct}%</span>
                 </div>
                 <div className="h-2.5 w-full bg-black/40 rounded-full overflow-hidden p-[2px] border border-white/5 relative shadow-inner">
                   <div className="absolute inset-0 bg-emerald-500/5"></div>
                   <div 
                     className={`absolute top-0 bottom-0 ${isUrdu ? 'right-0' : 'left-0'} bg-gradient-to-r from-rose-600 via-rose-500 to-rose-400 rounded-full shadow-[0_0_20px_rgba(244,63,94,0.5)] transition-all duration-1000 ease-out`} 
                     style={{ width: `${businessCostPct}%` }}
                   ></div>
                 </div>
               </div>
            </div>
         </div>
         
         {/* Personal Summary Card */}
         <div className="bg-gradient-to-br from-blue-950/40 via-slate-900/70 to-slate-900/60 backdrop-blur-3xl border border-blue-500/10 hover:border-blue-400/40 transition-all duration-700 rounded-[2.5rem] p-8 flex flex-col flex-1 relative overflow-hidden group shadow-2xl [backface-visibility:hidden] will-change-transform">
            {/* Premium Glow Orbs - Optimized for performance in Urdu */}
            <div className={`absolute -top-12 -right-12 w-64 h-64 bg-blue-500/15 rounded-full ${isUrdu ? 'blur-[40px] opacity-30' : 'blur-[80px]'} group-hover:bg-blue-400/25 transition-all duration-700`}></div>
            <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />
            
            <div className={`flex justify-between items-start mb-10 relative z-10 ${rtl ? 'flex-row-reverse' : ''}`}>
              <div className="space-y-2">
                <div className={`flex items-center gap-2 ${rtl ? 'flex-row-reverse' : ''}`}>
                  <div className="w-1 h-4 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                  <h4 className={`text-[10px] font-black uppercase ${isUrdu ? '' : 'tracking-[0.25em]'} text-slate-500`}>
                    {t(lang, 'personal')} {isUrdu ? 'بیلنس' : 'Standing'}
                  </h4>
                </div>
              </div>
              <div className={isUrdu ? 'text-left' : 'text-right'}>
                <p className={`text-[9px] text-slate-500 font-black uppercase mb-1.5 opacity-60 ${isUrdu ? 'tracking-normal' : 'tracking-[0.2em]'}`}>{isUrdu ? 'موجودہ سرمایہ' : 'Available Capital'}</p>
                <div className={`text-3xl font-black tracking-tighter tabular-nums drop-shadow-[0_0_20px_rgba(96,165,250,0.3)] ${personalBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {personalBalance >= 0 ? '+' : ''}{formatCompactCurrency(personalBalance)}
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-end space-y-8 relative z-10">
               <div>
                 <div className={`flex justify-between items-baseline mb-3 ${rtl ? 'flex-row-reverse' : ''}`}>
                   <span className={`text-[10px] font-black uppercase text-slate-400 ${isUrdu ? 'tracking-normal' : 'tracking-[0.15em]'}`}>{isUrdu ? 'کل آمدنی' : 'Total Inflow'}</span>
                   <span className="text-2xl font-black text-white tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" dir="ltr">
                     {formatCurrency(personalIncome)}
                   </span>
                 </div>
               </div>
               
               <div>
                 <div className={`flex justify-between items-baseline mb-3 ${rtl ? 'flex-row-reverse' : ''}`}>
                   <span className={`text-[10px] font-black uppercase text-slate-500 ${isUrdu ? 'tracking-normal' : 'tracking-[0.15em]'}`}>{isUrdu ? 'اخراجات' : 'Monthly Outflow'}</span>
                   <span className="text-2xl font-black text-rose-400/90 tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(244,63,94,0.2)]" dir="ltr">
                     -{formatCurrency(personalExpense)}
                   </span>
                 </div>
               </div>

               <div className="space-y-4 pt-6 border-t border-white/5">
                 <div className={`flex justify-between text-[9px] text-slate-500 font-black uppercase ${isUrdu ? 'flex-row-reverse tracking-normal' : 'tracking-[0.2em]'}`}>
                   <span>{isUrdu ? 'بجت بمقابلہ خرچ' : 'Liquidity Health'}</span>
                   <span className="text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">{Math.min(100, Math.max(0, Math.round((personalBalance / (personalIncome || 1)) * 100)))}%</span>
                 </div>
                 <div className="h-2.5 w-full bg-black/40 rounded-full overflow-hidden p-[2px] border border-white/5 relative shadow-inner">
                   <div className="absolute inset-0 bg-blue-500/5"></div>
                   <div 
                     className={`absolute top-0 bottom-0 ${isUrdu ? 'right-0' : 'left-0'} bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-400 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-1000 ease-out`} 
                     style={{ width: `${Math.min(100, Math.max(0, (personalBalance / (personalIncome || 1)) * 100))}%` }}
                   ></div>
                 </div>
               </div>
            </div>
         </div>
      </div>

      <QuickEntryModal 
        isOpen={isQuickEntryOpen} 
        onClose={() => setIsQuickEntryOpen(false)} 
        lang={lang} 
        activeContext={activeContext} 
      />
    </div>
  );
}

