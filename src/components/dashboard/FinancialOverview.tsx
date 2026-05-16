import React, { useMemo } from 'react';
import { format, subMonths, isAfter } from 'date-fns';
import { TrendingUp, Target, PieChart } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { useTransactions, useGoals, useBudgets } from '../../hooks/useData';
import { formatCurrency as formatSharedCurrency } from '../../lib/currency';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';

export function FinancialOverview() {
  const { lang, currency, activeContext, rtl } = useSettings();
  const isUrdu = lang === 'ur';

  const transactions = useTransactions(activeContext);
  const goals = useGoals(activeContext);
  const currentMonth = format(new Date(), 'yyyy-MM');
  const budgets = useBudgets(activeContext, currentMonth);
  const budget = budgets[0] || null;

  const totalExpensePKR = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);

  const formatCompactCurrency = (valInPKR: number) => {
    return formatSharedCurrency(valInPKR, currency, lang, true);
  };

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
      data.push({ name: format(d, 'EEE'), income, expense });
    }
    return data;
  }, [transactions]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10 mb-8">
      {/* Weekly Trend Chart */}
      <div className="bg-[#0F172A]/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-6 lg:p-7 flex flex-col shadow-2xl h-full">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
          <TrendingUp size={14} className="text-blue-400" />
          {isUrdu ? 'ہفتہ وار کیش فلو' : '7-Day Cash Flow'}
        </h3>
        <div className="flex-1 w-full min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
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
              <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', fontSize: '12px' }} />
              <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fill="url(#colorIncome)" />
              <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2} fill="url(#colorExpense)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Goals Progress */}
      <div className="bg-[#0F172A]/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-6 lg:p-7 shadow-2xl flex flex-col h-full">
        <div className={`flex justify-between items-center mb-6 ${rtl ? 'flex-row-reverse' : ''}`}>
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <Target size={14} className="text-purple-400" />
            {isUrdu ? 'مالی اہداف' : 'Financial Goals'}
          </h3>
          <span className="text-[9px] font-black text-slate-500 uppercase bg-white/5 px-2 py-0.5 rounded-full border border-white/5">{goals.length}</span>
        </div>
        <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[250px]">
          {goals.length === 0 ? (
            <div className="py-10 text-center border-2 border-dashed border-white/5 rounded-3xl h-full flex items-center justify-center">
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{isUrdu ? 'کوئی فعال اہداف نہیں' : 'No active goals'}</p>
            </div>
          ) : (
            goals.map(goal => {
              const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
              return (
                <div key={goal.id} className="space-y-2 bg-white/[0.02] p-3 rounded-2xl border border-white/5">
                  <div className={`flex justify-between items-end ${rtl ? 'flex-row-reverse' : ''}`}>
                    <div className="min-w-0">
                      <p className="text-white font-bold text-[11px] truncate">{goal.title}</p>
                      <p className="text-slate-500 text-[9px] font-black uppercase tracking-tight mt-0.5">
                        {formatCompactCurrency(goal.currentAmount)} / {formatCompactCurrency(goal.targetAmount)}
                      </p>
                    </div>
                    <span className="text-purple-400 text-[10px] font-black tabular-nums">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-600 to-indigo-500" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Monthly Budget Progress */}
      <div className="bg-[#0F172A]/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-6 lg:p-7 shadow-2xl flex flex-col h-full">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
          <PieChart size={14} className="text-blue-400" />
          {isUrdu ? 'ماہانہ بجٹ' : 'Monthly Budget'}
        </h3>
        {!budget ? (
          <div className="py-10 text-center border-2 border-dashed border-white/5 rounded-3xl h-full flex items-center justify-center">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{isUrdu ? 'کوئی بجٹ مقرر نہیں' : 'No budget set'}</p>
          </div>
        ) : (
          <div className="flex flex-col h-full justify-between gap-4">
            <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                <circle cx="56" cy="56" r="50" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/5" />
                <motion.circle cx="56" cy="56" r="50" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={314.16} initial={{ strokeDashoffset: 314.16 }} animate={{ strokeDashoffset: 314.16 - (314.16 * Math.min(1, totalExpensePKR / budget.amount)) }} className="text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-black text-white">{Math.round((totalExpensePKR / budget.amount) * 100)}%</span>
                <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">{isUrdu ? 'استعمال شدہ' : 'Used'}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-white/5 rounded-xl border border-white/5">
                <p className="text-slate-500 text-[7px] font-black uppercase mb-1">{isUrdu ? 'بجٹ' : 'Budget'}</p>
                <p className="text-white font-black text-xs truncate">{formatCompactCurrency(budget.amount)}</p>
              </div>
              <div className="p-2.5 bg-white/5 rounded-xl border border-white/5">
                <p className="text-slate-500 text-[7px] font-black uppercase mb-1">{isUrdu ? 'بقیہ' : 'Left'}</p>
                <p className={`font-black text-xs truncate ${budget.amount - totalExpensePKR > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCompactCurrency(Math.max(0, budget.amount - totalExpensePKR))}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
