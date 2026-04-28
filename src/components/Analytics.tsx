import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { t, Lang, isRTL } from '../lib/i18n';
import { ComposedChart, Bar, Line, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { startOfWeek, addDays, getDay, isSameDay, startOfMonth, endOfMonth, endOfWeek, isSameMonth, isToday, addMonths, subMonths, format } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function Analytics({ lang, currency, activeContext }: { lang: Lang, currency: string, activeContext: 'business' | 'personal' }) {
  const allTransactions = useLiveQuery(() => db.transactions.toArray(), []) || [];
  const transactions = useLiveQuery(() => db.transactions.where('context').equals(activeContext).toArray(), [activeContext]) || [];
  const categories = useLiveQuery(() => db.categories.toArray(), []) || [];

  const now = new Date();
  const [currentDisplayMonth, setCurrentDisplayMonth] = useState(startOfMonth(now));
  const rtl = isRTL(lang);
  
  // -- Calendar Widget Logic --
  const calendarStart = startOfWeek(startOfMonth(currentDisplayMonth));
  const calendarEnd = endOfWeek(endOfMonth(currentDisplayMonth));
  
  const calendarDays = [];
  let currentDay = calendarStart;
  while (currentDay <= calendarEnd) {
    calendarDays.push(currentDay);
    currentDay = addDays(currentDay, 1);
  }

  // function to get transaction summary for a day
  const getDaySummary = (date: Date) => {
    const dayTxs = transactions.filter(t => isSameDay(new Date(t.date), date));
    const income = dayTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = dayTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return { income, expense };
  };
  
  // -- Weekly Cashflow Data (BarChart) --
  const weekStart = startOfWeek(now); // Sunday
  const weeklyData = Array.from({ length: 7 }).map((_, i) => {
    const d = addDays(weekStart, i);
    const dayName = DAYS[getDay(d)];
    
    const dayTxs = transactions.filter(t => isSameDay(new Date(t.date), d));
    const income = dayTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = dayTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const net = income - expense;
    
    return { name: dayName, income, expense, net, date: d };
  });

  // -- Monthly Expenses Data (PieChart) --
  const currentMonthIdx = now.getMonth();
  const currentYear = now.getFullYear();

  const expenseTransactions = transactions.filter(t => {
    if (t.type !== 'expense') return false;
    try {
      const d = new Date(t.date);
      return d.getMonth() === currentMonthIdx && d.getFullYear() === currentYear;
    } catch(e) { return false; }
  });

  const expenseByCategory = expenseTransactions.reduce((acc, tx) => {
    acc[tx.categoryId] = (acc[tx.categoryId] || 0) + tx.amount;
    return acc;
  }, {} as Record<number, number>);

  const pieData = Object.entries(expenseByCategory).map(([catId, amount]) => {
    const defaultCatName = 'Unknown';
    const cat = categories.find(c => c.id === Number(catId));
    return {
      name: cat ? t(lang, cat.name) : defaultCatName,
      value: amount
    };
  }).filter(d => d.value > 0).sort((a, b) => b.value - a.value);

  const formatTooltipCurrency = (val: number) => {
    return new Intl.NumberFormat(lang === 'ur' ? 'ur-PK' : 'en-PK', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(val);
  };

  // Calculate max daily value for proportional bars
  const maxDailyValue = Math.max(
    ...calendarDays.map(date => {
      const s = getDaySummary(date);
      return Math.max(s.income, s.expense);
    }),
    1 // avoid division by zero
  );

  return (
    <div className="space-y-6">
      {/* Calendar Widget Preview */}
      <div className="bg-[#1E293B]/40 backdrop-blur-3xl border border-white/10 p-8 rounded-[3rem] relative overflow-hidden group hover:border-blue-500/30 transition-all duration-500 shadow-2xl" id="calendar-widget">
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-[80px] group-hover:bg-blue-500/20 transition-all duration-500"></div>
        <div className="flex items-center justify-between mb-8 relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400">
              <CalendarIcon size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">Calendar</h3>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Monthly Summary</div>
            </div>
          </div>
          <div className={`flex items-center gap-2 bg-[#0F172A]/60 backdrop-blur-md border border-white/10 rounded-xl p-1 ${rtl ? 'flex-row-reverse' : ''}`}>
            <button 
              onClick={() => setCurrentDisplayMonth(subMonths(currentDisplayMonth, 1))}
              className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
            >
              {rtl ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
            <span className="text-xs font-black text-white min-w-[90px] text-center uppercase tracking-widest tabular-nums">
              {format(currentDisplayMonth, 'MMM yyyy')}
            </span>
            <button 
              onClick={() => setCurrentDisplayMonth(addMonths(currentDisplayMonth, 1))}
              className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
            >
              {rtl ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>
        </div>
        
        <div className="relative">
          {/* Day Headers */}
          <div className="grid grid-cols-7 mb-4">
            {DAYS.map((day, i) => (
              <div key={i} className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                {day}
              </div>
            ))}
          </div>
          
          {/* Month Grid */}
          <div className="grid grid-cols-7 gap-2 bg-white/5 p-2 rounded-2xl border border-white/5 shadow-inner">
            {calendarDays.map((date, i) => {
              const isCurrentMonth = isSameMonth(date, currentDisplayMonth);
              const isTodayDate = isToday(date);
              const summary = getDaySummary(date);
              
              const formatShortCurrency = (val: number) => {
                if (val >= 1000) return (val / 1000).toFixed(0) + 'k';
                return val.toString();
              };

              return (
                <div 
                  key={i} 
                  className={`flex flex-col p-1.5 aspect-square rounded-2xl transition-all duration-300 relative group/day border
                    ${isCurrentMonth ? 'bg-white/[0.03] border-white/5 text-slate-200' : 'bg-transparent border-transparent text-slate-700'}
                    ${isTodayDate ? 'bg-blue-600/10 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.1)] scale-105 z-10' : 'hover:bg-white/10 hover:border-white/10'}
                  `}
                >
                  <div className={`
                    text-[10px] font-black mb-1 w-5 h-5 flex items-center justify-center rounded-lg mx-auto transition-colors
                    ${isTodayDate ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'group-hover/day:text-blue-400'}
                  `}>
                    {format(date, 'd')}
                  </div>
                  
                  <div className="flex flex-col gap-1 mt-auto items-center">
                    {summary.income > 0 && (
                      <div 
                        className="w-full h-1 bg-emerald-500/20 rounded-full overflow-hidden relative group/income"
                        title={`Income: ${summary.income}`}
                      >
                        <div 
                          className="absolute inset-y-0 left-0 bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-500" 
                          style={{ width: `${Math.max(10, (summary.income / maxDailyValue) * 100)}%` }}
                        ></div>
                      </div>
                    )}
                    {summary.expense > 0 && (
                      <div 
                        className="w-full h-1 bg-rose-500/20 rounded-full overflow-hidden relative group/expense"
                        title={`Expense: ${summary.expense}`}
                      >
                        <div 
                          className="absolute inset-y-0 left-0 bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)] transition-all duration-500" 
                          style={{ width: `${Math.max(10, (summary.expense / maxDailyValue) * 100)}%` }}
                        ></div>
                      </div>
                    )}
                  </div>

                  {/* Activity Indicator Dot */}
                  {(summary.income > 0 || summary.expense > 0) && !isTodayDate && (
                    <div className="absolute top-1 right-1 w-1 h-1 bg-blue-400 rounded-full opacity-50"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Weekly Cashflow */}
      <div className="bg-[#1E293B]/40 backdrop-blur-3xl border border-white/10 p-8 rounded-[3rem] relative overflow-hidden group hover:border-blue-500/30 transition-all duration-500 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] group-hover:bg-emerald-500/10 transition-all duration-500"></div>
        
        <div className="flex justify-between items-start mb-8 relative">
          <div>
            <h3 className="text-lg font-black text-white tracking-tight">Weekly Performance</h3>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Cash In vs Cash Out</div>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Income</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expense</span>
            </div>
          </div>
        </div>
        
        <div className="h-64 text-xs font-medium relative" style={{ minHeight: '250px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={weeklyData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} 
                dy={15} 
              />
              <YAxis hide />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 12 }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-[#0F172A]/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl min-w-[160px]">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">{label} Transactions</p>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center gap-4">
                            <span className="text-[10px] font-bold text-emerald-400 uppercase">Income</span>
                            <span className="text-sm font-black text-white">{formatTooltipCurrency(payload[0].value as number)}</span>
                          </div>
                          <div className="flex justify-between items-center gap-4">
                            <span className="text-[10px] font-bold text-rose-400 uppercase">Expense</span>
                            <span className="text-sm font-black text-white">{formatTooltipCurrency(payload[1].value as number)}</span>
                          </div>
                          <div className="pt-2 mt-2 border-t border-white/5 flex justify-between items-center gap-4">
                            <span className="text-[10px] font-bold text-blue-400 uppercase">Net Flow</span>
                            <span className={`text-sm font-black ${Number(payload[2].value) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {formatTooltipCurrency(payload[2].value as number)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="income" 
                fill="#10b981" 
                radius={[6, 6, 6, 6]} 
                barSize={10} 
                opacity={0.8}
              />
              <Bar 
                dataKey="expense" 
                fill="#f43f5e" 
                radius={[6, 6, 6, 6]} 
                barSize={10} 
                opacity={0.8}
              />
              <Line 
                type="monotone" 
                dataKey="net" 
                stroke="#3b82f6" 
                strokeWidth={4} 
                dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#0F172A' }} 
                activeDot={{ r: 6, strokeWidth: 0, fill: '#60a5fa' }} 
                animationDuration={1500}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Expenses */}
      <div className="bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] relative overflow-hidden group hover:border-purple-500/30 transition-colors duration-500">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-500"></div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 relative">{activeContext === 'business' ? 'Monthly Purchases' : t(lang, 'monthlyExpenses')}</h3>

        {pieData.length === 0 ? (
          <div className="text-center text-slate-500 py-12 relative">{t(lang, 'notEnoughData')}</div>
        ) : (
          <div className="h-48 mt-4 text-xs font-medium" style={{ minHeight: '200px' }}>
            <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={0}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="rgba(255,255,255,0.05)"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '16px',
                    color: '#fff',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
                  }}
                  formatter={(value: number) => [formatTooltipCurrency(value), '']}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
