import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Lang, t, isRTL } from '../lib/i18n';
import { Wallet, TrendingUp, TrendingDown, Store, ChevronDown, ArrowUpRight, ArrowDownRight, Sparkles } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { formatCurrency as formatSharedCurrency } from '../lib/currency';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8" style={{ perspective: '1200px' }}>

        {/* Total Balance Card */}
        <div className="group h-full will-change-transform lg:col-span-1 md:col-span-2">
          <div className="group h-full bg-gradient-to-br from-blue-950/60 via-slate-900/60 to-slate-900/60 border border-blue-500/10 hover:border-blue-400/40 p-8 rounded-[2.5rem] relative z-10 overflow-hidden transition-all duration-700 shadow-2xl [backface-visibility:hidden]">
            {/* Multi-layer glow orb - Optimized for Urdu */}
            <div className={`absolute -top-8 -right-8 w-52 h-52 bg-blue-500/20 rounded-full ${isUrdu ? 'blur-[30px] opacity-30' : 'blur-[60px]'} transition-all duration-700 group-hover:bg-blue-400/35 group-hover:scale-125`} />
            <div className={`absolute -top-4 -right-4 w-28 h-28 bg-blue-400/15 rounded-full ${isUrdu ? 'blur-[15px] opacity-20' : 'blur-[30px]'} transition-all duration-500 group-hover:bg-blue-300/25`} />
            {/* Neon border accent */}
            <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />
            
            <div className={`flex justify-between items-start relative z-10 ${rtl ? 'flex-row-reverse' : ''}`}>
              <p className={`text-[10px] font-black uppercase text-blue-300/90 flex items-center gap-2 ${isUrdu ? 'flex-row-reverse' : 'tracking-[0.2em]'}`}>
                <Wallet size={14} strokeWidth={3} />
                {activeContext === 'business' ? (isUrdu ? 'مجموعی آمدنی' : 'Cumulative Revenue') : (isUrdu ? 'کل بیلنس' : 'Net Liquidity')}
              </p>
              <div className="w-9 h-9 rounded-2xl border border-blue-400/20 bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-400/20 group-hover:border-blue-400/40 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all duration-500 shrink-0">
                <ArrowDownRight size={18} className={rtl ? 'scale-x-[-1]' : ''} />
              </div>
            </div>
            <div className="relative z-10 w-full mt-8 flex flex-col">
              <h3 className={`text-4xl sm:text-5xl font-black tracking-tighter tabular-nums leading-none drop-shadow-[0_0_30px_rgba(59,130,246,0.6)] ${isUrdu ? 'text-right' : ''}`} style={{ color: '#e0eaff' }} dir="ltr">
                {formatCompactCurrency(totalBalancePKR)}
              </h3>
            </div>
            <div className={`mt-8 text-emerald-300 text-[10px] flex items-center gap-2 font-black uppercase bg-emerald-500/10 inline-flex px-5 py-2 rounded-xl border border-emerald-400/20 relative z-10 shadow-[0_0_15px_rgba(16,185,129,0.2)] ${isUrdu ? 'flex-row-reverse tracking-normal' : 'tracking-[0.15em]'}`}>
              <TrendingUp size={12} strokeWidth={3} />
              {isUrdu ? 'فعال' : 'Operational'}
            </div>
          </div>
        </div>

        {/* Today's Expenses Card */}
        <div className="group h-full">
          <div className="group h-full bg-gradient-to-br from-rose-950/50 via-slate-900/60 to-slate-900/60 border border-rose-500/10 hover:border-rose-400/40 p-8 rounded-[2.5rem] relative overflow-hidden transition-all duration-700 shadow-2xl [backface-visibility:hidden]">
            <div className={`absolute -top-8 -right-8 w-52 h-52 bg-rose-500/20 rounded-full ${isUrdu ? 'blur-[30px] opacity-30' : 'blur-[60px]'} transition-all duration-700 group-hover:bg-rose-400/35 group-hover:scale-125`} />
            <div className={`absolute -top-4 -right-4 w-28 h-28 bg-rose-400/15 rounded-full ${isUrdu ? 'blur-[15px] opacity-20' : 'blur-[30px]'} transition-all duration-500 group-hover:bg-rose-300/25`} />
            <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-rose-400/60 to-transparent" />

            <div className={`flex justify-between items-start relative z-10 ${rtl ? 'flex-row-reverse' : ''}`}>
              <p className={`text-[10px] font-black uppercase text-rose-300/90 flex items-center gap-2 ${isUrdu ? 'flex-row-reverse' : 'tracking-[0.2em]'}`}>
                <TrendingDown size={14} strokeWidth={3} />
                {activeContext === 'business' ? (isUrdu ? 'آج کی خریداری' : 'Cost Basis Today') : (isUrdu ? 'آج کے اخراجات' : 'Burn Rate Today')}
              </p>
              <div className="w-9 h-9 rounded-2xl border border-rose-400/20 bg-rose-500/10 flex items-center justify-center text-rose-400 group-hover:bg-rose-400/20 group-hover:border-rose-400/40 group-hover:shadow-[0_0_20px_rgba(244,63,94,0.4)] transition-all duration-500 shrink-0">
                <ArrowUpRight size={18} className={rtl ? 'scale-x-[-1]' : ''} />
              </div>
            </div>
            <div className="relative z-10 w-full mt-8 flex flex-col">
              <h3 className={`text-4xl sm:text-5xl font-black tracking-tighter tabular-nums leading-none drop-shadow-[0_0_30px_rgba(244,63,94,0.6)] ${isUrdu ? 'text-right' : ''}`} style={{ color: '#ffe0e6' }} dir="ltr">
                {formatCompactCurrency(todayExpensePKR)}
              </h3>
            </div>
            <div className={`mt-8 text-rose-300/90 text-[10px] font-black uppercase bg-rose-500/10 inline-flex px-5 py-2 rounded-xl border border-rose-400/20 relative z-10 shadow-[0_0_15px_rgba(244,63,94,0.2)] ${isUrdu ? 'tracking-normal' : 'tracking-[0.15em]'}`}>
              {isUrdu ? 'لائیو فیڈ' : 'Live Feed'}
            </div>
          </div>
        </div>

        {/* Highlighted Category Card */}
        <div className="group h-full">
          <div className="group h-full bg-gradient-to-br from-amber-950/40 via-slate-900/60 to-slate-900/60 border border-amber-500/10 hover:border-amber-400/40 p-8 rounded-[2.5rem] relative z-20 overflow-visible transition-all duration-700 shadow-2xl [backface-visibility:hidden]">
            {/* Premium Glow Orbs - Optimized for Urdu */}
            <div className={`absolute -top-8 -right-8 w-52 h-52 bg-amber-500/20 rounded-full ${isUrdu ? 'blur-[30px] opacity-30' : 'blur-[60px]'} transition-all duration-700 group-hover:bg-amber-400/35 group-hover:scale-125`} />
            <div className={`absolute -top-4 -right-4 w-28 h-28 bg-amber-400/15 rounded-full ${isUrdu ? 'blur-[15px] opacity-20' : 'blur-[30px]'} transition-all duration-500 group-hover:bg-amber-300/25`} />
            <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
            
            <div className={`flex justify-between items-start relative z-50 ${rtl ? 'flex-row-reverse' : ''}`}>
              <div className="relative inline-block">
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`text-[9px] font-black uppercase text-amber-400 flex items-center gap-2 hover:text-amber-300 transition-all bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2 rounded-xl border border-amber-500/10 shadow-lg ${isUrdu ? 'flex-row-reverse tracking-normal' : 'tracking-[0.2em]'}`}
                >
                  {highlightedCategory ? t(lang, highlightedCategory.name) : (isUrdu ? 'منتخب کریں' : 'CHOOSE STREAM')}
                  <ChevronDown size={12} strokeWidth={3} className={`transition-transform duration-500 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isDropdownOpen && (
                  <div className={`absolute top-[130%] ${isUrdu ? 'right-0' : 'left-0'} w-56 bg-[#0F172A]/98 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-50 transform origin-top animate-in fade-in zoom-in-95 duration-300`}>
                    <div className="max-h-56 overflow-y-auto py-3 px-3 custom-scrollbar">
                      {categories.filter(c => c.type === 'income').map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => updateHighlightedCategory(cat.id!)}
                          className={`w-full px-4 py-3 rounded-2xl text-[11px] font-black uppercase transition-all duration-300 mb-1.5 last:mb-0 ${isUrdu ? 'text-right tracking-normal' : 'text-left tracking-widest'} ${
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
              
              <div className="w-9 h-9 rounded-2xl border border-white/5 bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-amber-400 group-hover:border-amber-400/20 group-hover:bg-amber-400/10 transition-all duration-500 shrink-0">
                <ArrowDownRight size={18} className={rtl ? 'scale-x-[-1]' : ''} />
              </div>
            </div>
            
            <div className="relative z-10 w-full mt-8 flex flex-col">
              <h3 className={`text-4xl sm:text-5xl font-black tracking-tighter text-white drop-shadow-[0_4px_20px_rgba(245,158,11,0.3)] tabular-nums leading-none ${isUrdu ? 'text-right' : ''}`} dir="ltr">
                {formatCompactCurrency(todayHighlightedSalesPKR)}
              </h3>
            </div>
            <div className={`mt-8 text-amber-400/80 text-[10px] font-black uppercase bg-amber-500/5 inline-flex px-5 py-2 rounded-xl border border-amber-500/10 relative z-0 pointer-events-none shadow-lg ${isUrdu ? 'tracking-normal' : 'tracking-[0.15em]'}`}>
              {isUrdu ? 'کارکردگی' : 'Performance Focus'}
            </div>
          </div>
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
    </div>
  );
}

