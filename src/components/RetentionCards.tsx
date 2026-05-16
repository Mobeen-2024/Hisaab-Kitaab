import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Flame, Trophy, TrendingUp, Calendar, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { format, subDays, isSameDay } from 'date-fns';

export default function RetentionCards({ lang, currency }: { lang: any, currency: string }) {
  const allTransactions = useLiveQuery(() => db.transactions.toArray()) || [];
  const settingsObj = useLiveQuery(() => db.settings.toCollection().first());

  // Compute streaks
  const { currentStreak, longestStreak } = useMemo(() => {
    if (!allTransactions.length) return { currentStreak: 0, longestStreak: 0 };
    
    // get unique dates of transactions
    const dates = [...new Set(allTransactions.map(t => t.date.split('T')[0]))].sort().reverse();
    
    let current = 0;
    let longest = 0;
    let tempStreak = 0;

    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd');

    // Check current streak
    if (dates.length && (dates[0] === todayStr || dates[0] === yesterdayStr)) {
      current = 1;
      let checkDate = new Date(dates[0]);
      for (let i = 1; i < dates.length; i++) {
        const diffDays = Math.round((checkDate.getTime() - new Date(dates[i]).getTime()) / (1000 * 3600 * 24));
        if (diffDays === 1) {
          current++;
          checkDate = new Date(dates[i]);
        } else {
          break;
        }
      }
    }

    // Check longest streak
    for (let i = 0; i < dates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const diffDays = Math.round((new Date(dates[i-1]).getTime() - new Date(dates[i]).getTime()) / (1000 * 3600 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      if (tempStreak > longest) longest = tempStreak;
    }

    // Default longest to current if it's somehow higher
    longest = Math.max(longest, current);

    return { currentStreak: current, longestStreak: longest };
  }, [allTransactions]);

  // Compute Achievements
  const achievements = useMemo(() => {
    const list = [];
    const transactionCount = allTransactions.length;
    
    if (transactionCount >= 1) list.push({ icon: <Zap size={16} className="text-amber-400" />, title: 'First Entry', desc: 'Started tracking!' });
    if (transactionCount >= 10) list.push({ icon: <Trophy size={16} className="text-emerald-400" />, title: 'Tracker', desc: '10 transactions recorded' });
    if (currentStreak >= 3) list.push({ icon: <Flame size={16} className="text-orange-500" />, title: 'On Fire', desc: '3 day streak' });
    if (currentStreak >= 7) list.push({ icon: <Flame size={16} className="text-rose-500 font-bold" />, title: 'Habit Builder', desc: '7 days of tracking completed' });
    
    return list;
  }, [allTransactions.length, currentStreak]);

  // Weekly Progress Summary
  const weeklySummary = useMemo(() => {
    const today = new Date();
    const last7Days = Array.from({length: 7}).map((_, i) => format(subDays(today, i), 'yyyy-MM-dd'));
    const txInLast7Days = allTransactions.filter(t => last7Days.includes(t.date.split('T')[0]));
    
    const income = txInLast7Days.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
    const expense = txInLast7Days.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
    return { count: txInLast7Days.length, income, expense };
  }, [allTransactions]);

  // Personalized insight
  const insight = useMemo(() => {
    if (allTransactions.length === 0) return "Start tracking to uncover insights.";
    if (currentStreak === 0) return "Log today's transactions to build your streak!";
    if (weeklySummary.expense > weeklySummary.income && weeklySummary.income > 0) return "You spent more than you earned this week. Let's monitor the budget.";
    if (weeklySummary.income > weeklySummary.expense) return "Great job! You saved more than you spent this week.";
    if (currentStreak >= 7) return "You're building an amazing tracking habit. Keep it up!";
    return "Consistent tracking helps you understand your money.";
  }, [allTransactions.length, currentStreak, weeklySummary]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full mb-6 relative z-10">
      
      {/* Streak Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 backdrop-blur-md rounded-[1.5rem] p-5 flex flex-col justify-between"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-orange-400 uppercase tracking-widest flex items-center gap-2">
            <Flame size={16} /> 
            Streak System
          </h3>
          <div className="text-2xl font-black text-orange-500">{currentStreak} <span className="text-xs text-slate-400">Days</span></div>
        </div>
        <p className="text-xs text-slate-300 font-medium bg-black/20 p-2.5 rounded-lg border border-white/5">
          {currentStreak > 0 ? `You're on a ${currentStreak}-day roll! record daily to keep it alive.` : "Start a new tracking streak today!"}
        </p>
      </motion.div>

      {/* Weekly Progress Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 backdrop-blur-md rounded-[1.5rem] p-5 flex flex-col justify-between"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
            <Calendar size={16} /> 
            Weekly Summary
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
          <div className="bg-[#0F172A]/50 p-2 rounded-lg border border-white/5">
            <div className="text-slate-400 mb-1">Items Tracked</div>
            <div className="font-bold text-white text-base">{weeklySummary.count}</div>
          </div>
          <div className="bg-[#0F172A]/50 p-2 rounded-lg border border-white/5">
            <div className="text-slate-400 mb-1">Status</div>
            <div className={`font-bold ${weeklySummary.income > weeklySummary.expense ? 'text-emerald-400' : 'text-rose-400'} text-base`}>
              {weeklySummary.income > weeklySummary.expense ? '+Positive' : '-Negative'}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Actionable Insight & Achievements */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 backdrop-blur-md rounded-[1.5rem] p-5 flex flex-col justify-between md:col-span-2 lg:col-span-1"
      >
        <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-3">
          <TrendingUp size={16} /> 
          Smart Insight
        </h3>
        <p className="text-sm text-slate-200 font-medium mb-4 italic">"{insight}"</p>
        
        {achievements.length > 0 && (
          <div className="mt-auto">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Latest Milestone</div>
            <div className="bg-indigo-500/10 border border-indigo-500/20 p-2 rounded-lg flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#0F172A] flex items-center justify-center shrink-0 border border-white/5">
                {achievements[achievements.length - 1].icon}
              </div>
              <div>
                <div className="text-xs font-bold text-white leading-tight">{achievements[achievements.length - 1].title}</div>
                <div className="text-[10px] text-slate-400">{achievements[achievements.length - 1].desc}</div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
