import React, { useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { useBusinessBrainData, ProfitLeak, UdhaarRisk, ActionItem } from '../../hooks/useBusinessBrainData';
import { useUdhaarAgingReport } from '../../hooks/useUdhaarAgingReport';
import { formatCurrency } from '../../lib/currency';
import { 
  Activity, TrendingDown, AlertTriangle, AlertCircle, 
  CheckCircle2, DollarSign, Package, UserMinus, ShieldCheck, BarChart3
} from 'lucide-react';
import DailyClosingModal from './DailyClosingModal';

export default function BusinessBrainDashboard() {
  const { lang, currency, activeContext } = useSettings();
  const brainData = useBusinessBrainData(activeContext);
  const agingReport = useUdhaarAgingReport();
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);

  const { 
    healthScore, actionList, profitLeaks, udhaarRisks, 
    cashflowWarning, thisWeekIncome, thisWeekExpense 
  } = brainData;

  const scoreColor = healthScore >= 80 ? 'text-emerald-400' : healthScore >= 50 ? 'text-orange-400' : 'text-rose-400';
  const scoreBg = healthScore >= 80 ? 'from-emerald-500/20 to-emerald-500/5' : healthScore >= 50 ? 'from-orange-500/20 to-orange-500/5' : 'from-rose-500/20 to-rose-500/5';
  const scoreBorder = healthScore >= 80 ? 'border-emerald-500/30' : healthScore >= 50 ? 'border-orange-500/30' : 'border-rose-500/30';

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-24">
      {/* Header */}
      <div className="flex justify-between items-start bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
            <Activity size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Business Brain</h2>
            <p className="text-sm text-slate-400">Your AI-driven operational intelligence</p>
          </div>
        </div>
        <button 
          onClick={() => setIsClosingModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-colors"
        >
          Daily Closing
        </button>
      </div>

      <DailyClosingModal 
        isOpen={isClosingModalOpen} 
        onClose={() => setIsClosingModalOpen(false)}
        todayIncome={thisWeekIncome} // Note: This should ideally be today's exact, using thisWeek as placeholder or we should query today specifically if needed, but for Phase 1 MVP we pass the week or calculate today inside the modal
        todayExpense={thisWeekExpense}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health Score Hero */}
        <div className={`col-span-1 lg:col-span-1 bg-gradient-to-br ${scoreBg} border ${scoreBorder} p-8 rounded-[2rem] flex flex-col items-center justify-center text-center relative overflow-hidden group`}>
           <div className={`absolute -top-24 -right-24 w-64 h-64 bg-current opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity ${scoreColor}`}></div>
           <p className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-2">Business Health</p>
           <h3 className={`text-6xl font-black ${scoreColor} tracking-tighter mb-4`}>{healthScore.toFixed(0)}</h3>
           <p className="text-sm text-slate-400 max-w-[250px]">
             {healthScore >= 80 
               ? 'Operations are highly efficient and profitable.' 
               : healthScore >= 50 
                 ? 'Stable, but monitor actionable alerts below.' 
                 : 'Critical attention needed to prevent losses.'}
           </p>
        </div>

        {/* Action List & Urgent Warnings */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          
          {/* Urgent Warnings Strip */}
          {(cashflowWarning || profitLeaks.length > 0 || udhaarRisks.length > 0) && (
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
              {cashflowWarning && (
                <div className="min-w-[280px] snap-start bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl flex gap-3">
                  <TrendingDown className="text-rose-400 shrink-0" />
                  <div>
                    <h4 className="text-rose-400 font-bold text-sm uppercase tracking-wide">Cashflow Warning</h4>
                    <p className="text-rose-300 text-xs mt-1">Expenses exceed income this week.</p>
                  </div>
                </div>
              )}

              {profitLeaks.length > 0 && (
                <div className="min-w-[280px] snap-start bg-orange-500/10 border border-orange-500/30 p-4 rounded-2xl flex gap-3">
                  <AlertTriangle className="text-orange-400 shrink-0" />
                  <div>
                    <h4 className="text-orange-400 font-bold text-sm uppercase tracking-wide">Profit Leaks</h4>
                    <p className="text-orange-300 text-xs mt-1">{profitLeaks.length} expense categories spiking vs 4-week average.</p>
                  </div>
                </div>
              )}

              {udhaarRisks.length > 0 && (
                <div className="min-w-[280px] snap-start bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-2xl flex gap-3">
                  <UserMinus className="text-yellow-400 shrink-0" />
                  <div>
                    <h4 className="text-yellow-400 font-bold text-sm uppercase tracking-wide">Udhaar Risk</h4>
                    <p className="text-yellow-300 text-xs mt-1">{udhaarRisks.length} severe overdue accounts detected.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Today's Action List */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem]">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <CheckCircle2 size={20} className="text-blue-400" /> Today's Action List
            </h3>
            {actionList.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <ShieldCheck size={40} className="mx-auto mb-2 text-emerald-400/50" />
                <p>No urgent actions needed today. You're all caught up!</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {actionList.map(action => (
                  <li key={action.id} className="flex gap-4 items-start p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                    <div className={`p-2 rounded-lg ${action.urgent ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {action.type === 'low_stock' ? <Package size={18} /> : <DollarSign size={18} />}
                    </div>
                    <div>
                      <h4 className={`font-bold ${action.urgent ? 'text-rose-400' : 'text-white'}`}>{action.title}</h4>
                      <p className="text-sm text-slate-400">{action.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      </div>

      {/* Detailed Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Profit Leaks Details */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem]">
           <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
             <AlertTriangle size={20} className="text-orange-400" /> Profit Leaks Detected
           </h3>
           {profitLeaks.length === 0 ? (
             <p className="text-slate-400 text-sm">No significant expense spikes detected.</p>
           ) : (
             <div className="space-y-4">
               {profitLeaks.map(leak => (
                 <div key={leak.categoryId} className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
                   <div className="flex justify-between items-start mb-2">
                     <span className="font-bold text-white">{leak.categoryName}</span>
                     <span className="text-xs font-bold px-2 py-1 bg-rose-500/20 text-rose-400 rounded-md">+{leak.percentageIncrease.toFixed(0)}% Spike</span>
                   </div>
                   <div className="flex justify-between text-sm text-slate-400">
                     <span>Current: {formatCurrency(leak.currentWeekAmount, currency, lang)}</span>
                     <span>Avg: {formatCurrency(leak.averageWeeklyAmount, currency, lang)}</span>
                   </div>
                 </div>
               ))}
             </div>
           )}
        </div>

        {/* Udhaar Risks Details */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem]">
           <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
             <AlertCircle size={20} className="text-yellow-400" /> Severe Udhaar Risks
           </h3>
           {udhaarRisks.length === 0 ? (
             <p className="text-slate-400 text-sm">No severely overdue customer balances.</p>
           ) : (
             <div className="space-y-4">
               {udhaarRisks.map(risk => (
                 <div key={risk.customerId} className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10 flex justify-between items-center">
                   <div>
                     <h4 className="font-bold text-white">{risk.customerName}</h4>
                     <p className="text-sm text-yellow-500/80">{risk.daysOverdue} days overdue</p>
                   </div>
                   <div className="text-right">
                     <span className="font-bold text-rose-400">{formatCurrency(risk.overdueAmount, currency, lang)}</span>
                   </div>
                 </div>
               ))}
             </div>
           )}
        </div>

      </div>

      {/* Udhaar Aging Report */}
      <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem]">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <BarChart3 size={20} className="text-indigo-400" /> Udhaar Aging Report
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {agingReport.map((bucket, index) => {
            const isSevere = index >= 2; // 61-90 and 90+ days
            const isWarning = index === 1; // 31-60 days
            const colorClass = isSevere ? 'text-rose-400' : isWarning ? 'text-orange-400' : 'text-blue-400';
            const bgClass = isSevere ? 'bg-rose-500/10 border-rose-500/20' : isWarning ? 'bg-orange-500/10 border-orange-500/20' : 'bg-blue-500/10 border-blue-500/20';
            
            return (
              <div key={bucket.label} className={`p-4 rounded-xl border ${bgClass} flex flex-col justify-center items-center text-center`}>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">{bucket.label}</p>
                <p className={`text-2xl font-black ${colorClass}`}>{formatCurrency(bucket.amount, currency, lang)}</p>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
