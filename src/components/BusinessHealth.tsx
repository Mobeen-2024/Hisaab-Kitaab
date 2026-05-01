import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Lang, t } from '../lib/i18n';
import { formatCurrency } from '../lib/currency';
import { Activity, TrendingUp, TrendingDown, ShieldAlert, DollarSign, Target, PieChart, ShieldCheck } from 'lucide-react';
import { subMonths, isAfter, startOfMonth } from 'date-fns';

import { useSettings } from '../contexts/SettingsContext';

export default function BusinessHealth() {
  const { lang, currency, activeContext } = useSettings();
  const transactions = useLiveQuery(() => db.transactions.where('context').equals(activeContext).toArray(), [activeContext]) || [];
  const customers = useLiveQuery(() => db.customers.toArray()) || [];

  const healthData = useMemo(() => {
    const now = new Date();
    const lastMonth = subMonths(now, 1);
    const thisMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(lastMonth);

    // Filter transactions
    const thisMonthTxs = transactions.filter(t => isAfter(new Date(t.date), thisMonthStart));
    const lastMonthTxs = transactions.filter(t => isAfter(new Date(t.date), lastMonthStart) && !isAfter(new Date(t.date), thisMonthStart));

    const thisMonthIncome = thisMonthTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const thisMonthExpense = thisMonthTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const thisMonthProfit = thisMonthIncome - thisMonthExpense;
    
    const lastMonthIncome = lastMonthTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const lastMonthExpense = lastMonthTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const lastMonthProfit = lastMonthIncome - lastMonthExpense;

    // Debt Exposure
    const totalReceivables = customers.filter(c => c.type !== 'supplier' && c.balance > 0).reduce((sum, c) => sum + c.balance, 0);
    const totalPayables = customers.filter(c => c.type === 'supplier' && c.balance > 0).reduce((sum, c) => sum + c.balance, 0);

    const totalBank = transactions.reduce((sum, t) => t.type === 'income' ? sum + t.amount : sum - t.amount, 0);

    // Business Health Metrics
    // 1. Savings Ratio = Profit / Income
    const savingsRatio = thisMonthIncome > 0 ? (thisMonthProfit / thisMonthIncome) * 100 : 0;
    
    // 2. Profit Margin = Profit / Income (Same as savings ratio here, but let's label it for business)
    const profitMargin = thisMonthIncome > 0 ? (thisMonthProfit / thisMonthIncome) * 100 : 0;

    // 3. Cash Flow Score (0-100)
    // Good score: Positive profit, low receivables relative to cash, growing income.
    let score = 50;
    if (thisMonthProfit > 0) score += 20;
    if (thisMonthIncome > lastMonthIncome) score += 10;
    if (totalReceivables < totalBank) score += 15;
    if (totalPayables < (totalBank * 0.5)) score += 5;
    score = Math.min(Math.max(score, 0), 100);

    // Trend Direction
    const trendDirection = thisMonthProfit > lastMonthProfit ? 'up' : 'down';
    const profitGrowth = lastMonthProfit !== 0 ? ((thisMonthProfit - lastMonthProfit) / Math.abs(lastMonthProfit)) * 100 : 0;

    return {
      savingsRatio,
      profitMargin,
      score,
      trendDirection,
      profitGrowth,
      totalReceivables,
      totalPayables,
      thisMonthIncome,
      thisMonthProfit,
      totalBank
    };
  }, [transactions, customers]);

  if (activeContext !== 'business') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 bg-white/5 rounded-[2rem] border border-white/10">
        <Activity size={48} className="mb-4 text-slate-500" />
        <p>Business Health Intelligence is only available in Business mode.</p>
      </div>
    );
  }

  const { savingsRatio, profitMargin, score, trendDirection, profitGrowth, totalReceivables, totalPayables, thisMonthIncome, thisMonthProfit, totalBank } = healthData;

  const scoreColor = score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-orange-400' : 'text-rose-400';
  const scoreBg = score >= 80 ? 'from-emerald-500/20 to-emerald-500/5' : score >= 50 ? 'from-orange-500/20 to-orange-500/5' : 'from-rose-500/20 to-rose-500/5';
  const scoreBorder = score >= 80 ? 'border-emerald-500/30' : score >= 50 ? 'border-orange-500/30' : 'border-rose-500/30';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-start bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
            <Activity size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Business Intelligence</h2>
            <p className="text-sm text-slate-400">Holistic overview of your business health & exposure.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Score Card */}
        <div className={`col-span-1 lg:col-span-1 bg-gradient-to-br ${scoreBg} border ${scoreBorder} p-8 rounded-[2rem] flex flex-col items-center justify-center text-center relative overflow-hidden group`}>
           <div className={`absolute -top-24 -right-24 w-64 h-64 bg-current opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity ${scoreColor}`}></div>
           <p className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-2">Cash Flow Score</p>
           <h3 className={`text-6xl font-black ${scoreColor} tracking-tighter mb-4`}>{score.toFixed(0)}</h3>
           <p className="text-sm text-slate-400 max-w-[250px]">
             {score >= 80 ? 'Your business cash flow is extremely healthy.' : score >= 50 ? 'Stable, but monitor your receivables.' : 'Warning: High debt exposure or negative cash flow.'}
           </p>
        </div>

        {/* Key Metrics */}
        <div className="col-span-1 lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
           <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex flex-col justify-between hover:bg-white/10 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Trend Direction</p>
                <div className={`p-2 rounded-lg ${trendDirection === 'up' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                  {trendDirection === 'up' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                </div>
              </div>
              <div>
                <h3 className={`text-2xl font-bold ${trendDirection === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
                   {trendDirection === 'up' ? '+' : ''}{profitGrowth.toFixed(1)}%
                </h3>
                <p className="text-sm text-slate-400 mt-1">Profit growth vs last month.</p>
              </div>
           </div>

           <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex flex-col justify-between hover:bg-white/10 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Profit Margin</p>
                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                  <PieChart size={20} />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">
                   {profitMargin.toFixed(1)}%
                </h3>
                <p className="text-sm text-slate-400 mt-1">Of total revenue is profit.</p>
              </div>
           </div>

           <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex flex-col justify-between hover:bg-white/10 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Savings / Reserve Ratio</p>
                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <ShieldCheck size={20} />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">
                   {savingsRatio.toFixed(1)}%
                </h3>
                <p className="text-sm text-slate-400 mt-1">Cash retained from income.</p>
              </div>
           </div>

           <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex flex-col justify-between hover:bg-white/10 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Debt Exposure</p>
                <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400">
                  <ShieldAlert size={20} />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">
                   {formatCurrency(totalReceivables, currency, lang)}
                </h3>
                <p className="text-sm text-slate-400 mt-1">Outstanding receivables pending.</p>
              </div>
           </div>

           <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex flex-col justify-between hover:bg-white/10 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Liabilities</p>
                <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
                  <DollarSign size={20} />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">
                   {formatCurrency(totalPayables, currency, lang)}
                </h3>
                <p className="text-sm text-slate-400 mt-1">Owed to suppliers.</p>
              </div>
           </div>
        </div>
      </div>

    </div>
  );
}
