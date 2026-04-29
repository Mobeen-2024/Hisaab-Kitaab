import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { t, Lang } from '../lib/i18n';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  eachDayOfInterval,
  isToday,
  startOfDay,
  endOfDay
} from 'date-fns';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  X,
  Clock,
  Wallet,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { formatCurrency as formatSharedCurrency } from '../lib/currency';

interface TransactionCalendarProps {
  lang: Lang;
  currency: string;
  activeContext: 'business' | 'personal';
}

export default function TransactionCalendar({ lang, currency, activeContext }: TransactionCalendarProps) {
  const [currentDisplayMonth, setCurrentDisplayMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // 3D Tilt state
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [5, -5]);
  const rotateY = useTransform(mouseX, [-300, 300], [-5, 5]);
  const springConfig = { stiffness: 150, damping: 20 };
  const dx = useSpring(rotateX, springConfig);
  const dy = useSpring(rotateY, springConfig);

  const transactions = useLiveQuery(() => 
    db.transactions.where({ context: activeContext }).toArray(),
    [activeContext]
  ) || [];

  const categories = useLiveQuery(() => db.categories.toArray()) || [];

  const formatCurrency = (val: number) => {
    return formatSharedCurrency(val, currency, lang);
  };

  // Calendar Logic
  const monthStart = startOfMonth(currentDisplayMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentDisplayMonth(addMonths(currentDisplayMonth, 1));
  const prevMonth = () => setCurrentDisplayMonth(subMonths(currentDisplayMonth, 1));

  const getDayTransactions = (date: Date) => {
    return transactions.filter(tx => isSameDay(new Date(tx.date), date));
  };

  const getDaySummary = (date: Date) => {
    const dayTxs = getDayTransactions(date);
    const income = dayTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = dayTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return { income, expense, count: dayTxs.length };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const selectedDayTransactions = selectedDate ? getDayTransactions(selectedDate) : [];
  const selectedDaySummary = selectedDate ? getDaySummary(selectedDate) : { income: 0, expense: 0, count: 0 };

  return (
    <div className="flex flex-col h-full space-y-8 animate-in fade-in duration-700 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#1E293B]/40 backdrop-blur-3xl border border-white/10 p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center text-white shadow-[0_8px_20px_rgba(37,99,235,0.3)] transform -rotate-3">
              <CalendarIcon size={30} />
            </div>
            <div>
              <h2 className="text-4xl font-black text-white tracking-tighter leading-none">
                Calendar
              </h2>
              <div className="text-blue-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">Financial Timeline</div>
            </div>
          </div>
          <p className="text-slate-400 text-sm font-medium max-w-md">
            Track your daily {activeContext} cashflow with interactive insights and transaction history.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4 relative z-10 w-full sm:w-auto">
          <div className="flex flex-1 sm:flex-none items-center justify-between sm:justify-start bg-[#0F172A]/80 backdrop-blur-md border border-white/10 rounded-[1.5rem] p-1.5 shadow-2xl">
            <button 
              onClick={prevMonth}
              className="p-2 sm:p-3 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all active:scale-90"
            >
              <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
            </button>
            <div className="px-2 sm:px-8 text-sm sm:text-lg font-black text-white min-w-[120px] sm:min-w-[180px] text-center uppercase tracking-widest tabular-nums truncate">
              {format(currentDisplayMonth, 'MMM yyyy')}
            </div>
            <button 
              onClick={nextMonth}
              className="p-2 sm:p-3 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all active:scale-90"
            >
              <ChevronRight size={20} className="sm:w-6 sm:h-6" />
            </button>
          </div>
          <button 
            onClick={() => setCurrentDisplayMonth(new Date())}
            className="w-full sm:w-auto px-6 py-3.5 sm:py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-[1.5rem] text-xs sm:text-sm font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all active:scale-95 text-center"
          >
            Today
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start w-full max-w-full overflow-hidden">
        {/* Main Calendar Grid */}
        <motion.div 
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ rotateX: dx, rotateY: dy, transformStyle: 'preserve-3d' }}
          className="lg:col-span-8 bg-[#1E293B]/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] sm:rounded-[3rem] p-3 sm:p-6 md:p-10 shadow-2xl relative w-full overflow-hidden"
        >
          <div className="grid grid-cols-7 mb-2 sm:mb-6">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-[9px] sm:text-[11px] font-black uppercase sm:tracking-[0.3em] text-slate-500 py-2 truncate">
                {day.slice(0, 1)}<span className="hidden sm:inline">{day.slice(1)}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2 md:gap-3 w-full">
            {calendarDays.map((day, idx) => {
              const isCurrMonth = isSameMonth(day, monthStart);
              const isTodayDay = isToday(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const summary = getDaySummary(day);

              return (
                <motion.button
                  key={idx}
                  whileHover={{ y: -5, scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedDate(day);
                    setIsDetailOpen(true);
                  }}
                  className={`
                    relative aspect-square flex flex-col p-1 sm:p-3 transition-all duration-500 rounded-xl sm:rounded-3xl overflow-hidden
                    ${isCurrMonth ? 'bg-white/5 border border-white/5 text-white' : 'bg-transparent text-slate-600'}
                    ${isSelected ? 'bg-blue-600/10 border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.15)] z-10' : 'hover:bg-white/10'}
                    ${isTodayDay ? 'after:content-[""] after:absolute after:top-1 sm:after:top-3 after:right-1 sm:after:right-3 after:w-1.5 after:h-1.5 sm:after:w-2 sm:after:h-2 after:bg-blue-400 after:rounded-full after:shadow-[0_0_15px_#60A5FA] border-blue-500/30' : ''}
                  `}
                >
                  <span className={`
                    text-xs sm:text-sm font-black w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg sm:rounded-xl transition-all duration-500 mx-auto sm:mx-0
                    ${isSelected ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/50 scale-110' : 'group-hover:text-blue-400'}
                  `}>
                    {format(day, 'd')}
                  </span>

                  <div className="mt-auto flex flex-col gap-0.5 sm:gap-1.5 w-full items-center sm:items-stretch">
                    {summary.income > 0 && (
                      <div className="h-1.5 w-1.5 sm:w-full sm:h-5 bg-emerald-500/50 sm:bg-emerald-500/10 border border-transparent sm:border-emerald-500/20 rounded-full sm:rounded-lg flex items-center sm:px-1.5 overflow-hidden shrink-0">
                        <div className="hidden sm:block text-[9px] font-black text-emerald-400 truncate tracking-tighter">
                          +{formatCurrency(summary.income).split('.')[0]}
                        </div>
                      </div>
                    )}
                    {summary.expense > 0 && (
                      <div className="h-1.5 w-1.5 sm:w-full sm:h-5 bg-rose-500/50 sm:bg-rose-500/10 border border-transparent sm:border-rose-500/20 rounded-full sm:rounded-lg flex items-center sm:px-1.5 overflow-hidden shrink-0">
                        <div className="hidden sm:block text-[9px] font-black text-rose-400 truncate tracking-tighter">
                          -{formatCurrency(summary.expense).split('.')[0]}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Selected Day Details Panel */}
        <div className="lg:col-span-4 space-y-6">
          <AnimatePresence mode="wait">
            {selectedDate && (
              <motion.div
                key={selectedDate.toISOString()}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h3 className="text-2xl font-black text-white tracking-tighter">
                        {format(selectedDate, 'EEEE')}
                      </h3>
                      <p className="text-slate-400 text-sm font-medium">
                        {format(selectedDate, 'dd MMMM, yyyy')}
                      </p>
                    </div>
                    <div className="bg-white/5 px-3 py-1 rounded-full border border-white/10 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      {selectedDayTransactions.length} Events
                    </div>
                  </div>

                  {/* Daily Summary Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-3xl">
                      <div className="flex items-center gap-2 text-emerald-400 mb-1">
                        <TrendingUp size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Income</span>
                      </div>
                      <div className="text-xl font-black text-white truncate">
                        {formatCurrency(selectedDaySummary.income)}
                      </div>
                    </div>
                    <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-3xl">
                      <div className="flex items-center gap-2 text-rose-400 mb-1">
                        <TrendingDown size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Expense</span>
                      </div>
                      <div className="text-xl font-black text-white truncate">
                        {formatCurrency(selectedDaySummary.expense)}
                      </div>
                    </div>
                  </div>

                  {/* Transaction List for the Day */}
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Timeline</h4>
                    
                    {selectedDayTransactions.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-[2rem]">
                        <Clock className="mx-auto text-slate-700 mb-2" size={32} />
                        <p className="text-slate-500 text-sm font-medium">No activity recorded</p>
                      </div>
                    ) : (
                      selectedDayTransactions.map((tx) => {
                        const cat = categories.find(c => c.id === tx.categoryId);
                        return (
                          <div key={tx.id} className="group bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl p-4 transition-all duration-300">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tx.type === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                {tx.type === 'income' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                  <h5 className="text-sm font-bold text-white truncate pr-2">{tx.description}</h5>
                                  <span className={`text-sm font-black whitespace-nowrap ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-md border border-white/10 uppercase tracking-wider">
                                    {cat ? t(lang, cat.name) : 'General'}
                                  </span>
                                  {tx.paymentMethod && (
                                    <span className="text-[10px] text-blue-400 font-bold uppercase">
                                      via {tx.paymentMethod}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Summary Balance */}
                  <div className="mt-8 pt-8 border-t border-white/10">
                    <div className="flex items-center justify-between p-5 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-white/10 rounded-3xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-blue-400">
                          <Wallet size={20} />
                        </div>
                        <span className="text-sm font-bold text-slate-300">Net Flow</span>
                      </div>
                      <div className={`text-xl font-black ${selectedDaySummary.income - selectedDaySummary.expense >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatCurrency(selectedDaySummary.income - selectedDaySummary.expense)}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
