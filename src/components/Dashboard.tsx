import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { t, Lang } from '../lib/i18n';
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
  const allTransactions = useLiveQuery(() => db.transactions.toArray()) || [];
  const settingsObj = useLiveQuery(() => db.settings.get(1));
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const transactions = allTransactions.filter(t => t.context === activeContext);

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

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            Hello, {settingsObj?.ownerName || 'Arsalan'} <Sparkles size={24} className="text-blue-400" />
          </h2>
          <p className="text-slate-400 font-medium mt-1">Here's what's happening with your {activeContext} today.</p>
        </div>
        <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl backdrop-blur-md">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{format(new Date(), 'EEEE, MMMM do')}</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ perspective: '1000px' }}>

        {/* Total Balance Card */}
        <TiltCard glowColor="rgba(59,130,246,0.3)">
          <div className="group h-full bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/20 p-6 rounded-[2rem] relative z-10 overflow-hidden transition-all duration-300 shadow-2xl">
            <div className="absolute -top-4 -right-4 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl transition-all duration-500 group-hover:bg-blue-500/20 group-hover:scale-150"></div>
            
            <div className="flex justify-between items-start relative z-10">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-200/60 flex items-center gap-2">
                <Wallet size={16} />
                {activeContext === 'business' ? 'Net Profit' : t(lang, 'balance')}
              </p>
              <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-blue-400 group-hover:border-blue-400/30 group-hover:bg-blue-400/10 transition-colors shrink-0">
                <ArrowUpRight size={16} />
              </div>
            </div>
            <div className="relative z-10 w-full mt-6 flex flex-col">
              <h3 className="text-4xl font-black tracking-tight text-white drop-shadow-[0_2px_15px_rgba(59,130,246,0.4)] break-all w-full">
                {formatCompactCurrency(totalBalancePKR)}
              </h3>
            </div>
            <div className="mt-6 text-emerald-400 text-xs flex items-center gap-2 font-bold bg-emerald-500/10 inline-flex px-4 py-1.5 rounded-full border border-emerald-500/20 relative z-10">
              <TrendingUp size={14} />
              {activeContext === 'business' ? 'All-time Profit' : 'Active Balance'}
            </div>
          </div>
        </TiltCard>

        {/* Today's Expenses Card */}
        <TiltCard glowColor="rgba(244,63,94,0.3)">
          <div className="group h-full bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/20 p-6 rounded-[2rem] relative overflow-hidden transition-all duration-300 shadow-2xl">
              <div className="absolute -top-4 -right-4 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl transition-all duration-500 group-hover:bg-rose-500/20 group-hover:scale-150"></div>
              
            <div className="flex justify-between items-start relative z-10">
              <p className="text-xs font-bold uppercase tracking-widest text-rose-200/60 flex items-center gap-2">
                <TrendingDown size={16} />
                {activeContext === 'business' ? 'Today Purchases' : t(lang, 'todayExpense')}
              </p>
              <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-rose-400 group-hover:border-rose-400/30 group-hover:bg-rose-400/10 transition-colors shrink-0">
                <ArrowDownRight size={16} />
              </div>
            </div>
            <div className="relative z-10 w-full mt-6 flex flex-col">
              <h3 className="text-4xl font-black tracking-tight text-white drop-shadow-[0_2px_15px_rgba(244,63,94,0.4)] break-all w-full">
                {formatCompactCurrency(todayExpensePKR)}
              </h3>
            </div>
            <div className="mt-6 text-rose-300/80 text-xs font-bold uppercase tracking-wider bg-rose-500/10 inline-flex px-4 py-1.5 rounded-full border border-rose-500/20 relative z-10">
              Today
            </div>
          </div>
        </TiltCard>

        {/* Highlighted Category Card */}
        <TiltCard glowColor="rgba(245,158,11,0.3)">
          <div className="group h-full bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/20 p-6 rounded-[2rem] relative z-20 overflow-visible transition-all duration-300 shadow-2xl">
            <div className="absolute -top-4 -right-4 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none transition-all duration-500 group-hover:bg-amber-500/20 group-hover:scale-150"></div>
            
            <div className="flex justify-between items-start relative z-50">
              <div className="relative inline-block">
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="text-[10px] font-bold uppercase tracking-widest text-amber-200/80 flex items-center gap-1 hover:text-amber-200 transition-colors bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg border border-amber-500/20"
                >
                  {highlightedCategory ? t(lang, highlightedCategory.name) : 'Select Category'}
                  <ChevronDown size={14} className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isDropdownOpen && (
                  <div className="absolute top-[120%] left-0 w-48 bg-[#0F172A]/95 backdrop-blur-2xl border border-amber-500/20 rounded-2xl shadow-[0_8px_30px_rgba(245,158,11,0.2)] overflow-hidden z-50 transform origin-top animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-48 overflow-y-auto py-2 px-2 custom-scrollbar">
                      {categories.filter(c => c.type === 'income').map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => updateHighlightedCategory(cat.id!)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 mb-1 last:mb-0 ${
                            highlightedCategoryId === cat.id 
                              ? 'bg-amber-500/20 text-amber-300 shadow-inner border border-amber-500/20' 
                              : 'text-slate-300 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          {t(lang, cat.name)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-amber-400 group-hover:border-amber-400/30 group-hover:bg-amber-400/10 transition-colors shrink-0">
                <ArrowUpRight size={16} />
              </div>
            </div>
            
            <div className="relative z-10 w-full mt-6 flex flex-col">
              <h3 className="text-4xl font-black tracking-tight text-white drop-shadow-[0_2px_15px_rgba(245,158,11,0.4)] break-all w-full">
                {formatCompactCurrency(todayHighlightedSalesPKR)}
              </h3>
            </div>
            <div className="mt-6 text-amber-300/80 text-xs font-bold uppercase tracking-wider bg-amber-500/10 inline-flex px-4 py-1.5 rounded-full border border-amber-500/20 relative z-0 pointer-events-none">
              Business Highlight
            </div>
          </div>
        </TiltCard>
      </div>
      
      {/* Quick Summary of Business vs Personal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
         {/* Business Summary Card */}
         <div className="bg-white/5 backdrop-blur-2xl border border-white/10 hover:border-amber-500/30 transition-all duration-500 rounded-[2rem] p-6 flex flex-col flex-1 relative overflow-hidden group shadow-xl">
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-colors duration-500"></div>
            
            <div className="flex justify-between items-start mb-8 relative z-10">
              <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Store size={18} className="text-amber-400" /> {t(lang, 'business')} <span className="hidden sm:inline">Performance</span>
              </h4>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Margin</p>
                <div className={`text-xl font-black tracking-tight ${businessProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {businessProfit >= 0 ? '+' : ''}{businessMarginPct}%
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-end space-y-6 relative z-10">
               <div>
                 <div className="flex justify-between items-baseline mb-2">
                   <span className="text-sm font-medium text-slate-300">Revenue</span>
                   <span className="text-lg font-bold text-white tracking-tight">
                     {formatCurrency(businessRevenue)}
                   </span>
                 </div>
               </div>
               
               <div>
                 <div className="flex justify-between items-baseline mb-2">
                   <span className="text-sm font-medium text-slate-400">Costs</span>
                   <span className="text-lg font-bold text-rose-300 tracking-tight">
                     -{formatCurrency(businessCost)}
                   </span>
                 </div>
               </div>

               <div className="space-y-2 pt-2">
                 <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                   <span>Costs vs Revenue</span>
                   <span>{businessCostPct}%</span>
                 </div>
                 <div className="h-3 w-full bg-[#0f172a] rounded-full overflow-hidden p-0.5 border border-white/5 relative">
                   <div className="absolute inset-0 bg-emerald-500/20"></div>
                   <div 
                     className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-rose-500 to-rose-400 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.5)] transition-all duration-1000 ease-out" 
                     style={{ width: `${businessCostPct}%` }}
                   ></div>
                 </div>
               </div>
            </div>
         </div>
         
         {/* Personal Summary Card */}
         <div className="bg-white/5 backdrop-blur-2xl border border-white/10 hover:border-blue-500/30 transition-all duration-500 rounded-[2rem] p-6 flex flex-col flex-1 relative overflow-hidden group shadow-xl">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors duration-500"></div>
            
            <div className="flex justify-between items-start mb-8 relative z-10">
              <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Wallet size={18} className="text-blue-400" /> {t(lang, 'personal')} <span className="hidden sm:inline">Standing</span>
              </h4>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Net Balance</p>
                <div className={`text-xl font-black tracking-tight ${personalBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {personalBalance >= 0 ? '+' : ''}{formatCompactCurrency(personalBalance)}
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-end space-y-6 relative z-10">
               <div>
                 <div className="flex justify-between items-baseline mb-2">
                   <span className="text-sm font-medium text-slate-300">Income</span>
                   <span className="text-lg font-bold text-white tracking-tight">
                     {formatCurrency(personalIncome)}
                   </span>
                 </div>
               </div>
               
               <div>
                 <div className="flex justify-between items-baseline mb-2">
                   <span className="text-sm font-medium text-slate-400">Expenses</span>
                   <span className="text-lg font-bold text-rose-300 tracking-tight">
                     -{formatCurrency(personalExpense)}
                   </span>
                 </div>
               </div>

               <div className="space-y-2 pt-2">
                 <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                   <span>Expenses vs Income</span>
                   <span>{personalExpensePct}%</span>
                 </div>
                 <div className="h-3 w-full bg-[#0f172a] rounded-full overflow-hidden p-0.5 border border-white/5 relative">
                   <div className="absolute inset-0 bg-blue-500/20"></div>
                   <div 
                     className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-rose-500 to-rose-400 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.5)] transition-all duration-1000 ease-out" 
                     style={{ width: `${personalExpensePct}%` }}
                   ></div>
                 </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

