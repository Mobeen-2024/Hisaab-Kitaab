import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Goal, Budget } from '../db';
import { Lang, t } from '../lib/i18n';
import { Target, PieChart, TrendingUp, AlertCircle, Plus, X, Pencil, PiggyBank, Calendar, Trash2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { formatCurrency as formatSharedCurrency } from '../lib/currency';
import ConfirmDialog from './ConfirmDialog';
import DatePicker from './DatePicker';
import RetentionCards from './RetentionCards';

import { useSettings } from '../contexts/SettingsContext';

export default function Planner() {
  const { lang, currency, activeContext } = useSettings();
  const currentMonth = format(new Date(), 'yyyy-MM');
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());

  const goals = useLiveQuery(() => db.goals.where({ context: activeContext }).toArray()) || [];
  const budgets = useLiveQuery(() => db.budgets.where({ month: currentMonth, context: activeContext }).toArray()) || [];
  const transactions = useLiveQuery(() => db.transactions.where({ context: activeContext }).toArray()) || [];

  const currentBudget = budgets.length > 0 ? budgets[0] : null;

  const currentMonthExpenses = transactions.filter(t => 
    t.type === 'expense' && 
    isWithinInterval(new Date(t.date), { start: monthStart, end: monthEnd })
  ).reduce((sum, t) => sum + t.amount, 0);

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [deletingGoalId, setDeletingGoalId] = useState<number | null>(null);

  const formatCurrency = (val: number) => {
    return formatSharedCurrency(val, currency, lang);
  };

  const getBudgetStatusColor = (percentage: number) => {
    if (percentage < 50) return 'text-emerald-400';
    if (percentage < 80) return 'text-amber-400';
    return 'text-rose-400';
  };
  
  const getBudgetStatusBgColor = (percentage: number) => {
    if (percentage < 50) return 'bg-emerald-400';
    if (percentage < 80) return 'bg-amber-400';
    return 'bg-rose-400';
  };

  const budgetUsedPct = currentBudget && currentBudget.amount > 0 
    ? Math.min(100, Math.round((currentMonthExpenses / currentBudget.amount) * 100))
    : 0;

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      <RetentionCards lang={lang} currency={currency} />
      <ConfirmDialog
        isOpen={deletingGoalId !== null}
        onClose={() => setDeletingGoalId(null)}
        onConfirm={async () => {
          if (deletingGoalId) {
            await db.goals.delete(deletingGoalId);
            setDeletingGoalId(null);
          }
        }}
        title="Delete Goal"
        message="Are you sure you want to delete this goal? This action cannot be undone."
      />
      
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <PieChart className="text-purple-400" />
            {activeContext === 'business' ? 'Business Planner' : 'Budget & Savings Planner'}
          </h2>
          <p className="text-slate-400 mt-2 text-sm max-w-xl">
            {activeContext === 'business' 
              ? 'Set targets, plan expenses, and maximize your profit.'
              : 'Take control of your money, set saving goals, and track your monthly budget.'}
          </p>
        </div>
      </div>

      {/* Budget Section */}
      <div className="bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="text-amber-400" size={20} />
            Monthly Budget ({format(new Date(), 'MMMM yyyy')})
          </h3>
          <button 
            onClick={() => setIsBudgetModalOpen(true)}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
          >
            <Pencil size={16} /> Edit
          </button>
        </div>

        {currentBudget ? (
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-slate-400 text-sm font-medium mb-1">Total Spent</p>
                <div className={`text-3xl font-black ${getBudgetStatusColor(budgetUsedPct)}`}>
                  {formatCurrency(currentMonthExpenses)}
                </div>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-sm font-medium mb-1">Total Budget</p>
                <div className="text-xl font-bold text-white">
                  {formatCurrency(currentBudget.amount)}
                </div>
              </div>
            </div>

            <div className="h-4 bg-white/10 rounded-full overflow-hidden">
              <div 
                className={`h-full ${getBudgetStatusBgColor(budgetUsedPct)} transition-all duration-1000`} 
                style={{ width: `${budgetUsedPct}%` }}
              ></div>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-slate-400">{budgetUsedPct}% Used</span>
              {budgetUsedPct >= 100 ? (
                <span className="text-rose-400 font-bold flex items-center gap-1">
                  <AlertCircle size={14} /> Over Budget by {formatCurrency(Math.abs(currentBudget.amount - currentMonthExpenses))}
                </span>
              ) : (
                <span className="text-emerald-400 font-bold">
                  {formatCurrency(currentBudget.amount - currentMonthExpenses)} remaining
                </span>
              )}
            </div>

            {budgetUsedPct > 80 && budgetUsedPct < 100 && (
              <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                <AlertCircle className="text-amber-400 shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-amber-400">
                  You have used <b>{budgetUsedPct}%</b> of your budget. Consider reducing {activeContext === 'business' ? 'purchases' : 'expenses'} for the rest of the month.
                </p>
              </div>
            )}
            
            {budgetUsedPct >= 100 && (
              <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3">
                <AlertCircle className="text-rose-400 shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-rose-400">
                  You have exceeded your overall limit. Review your {activeContext === 'business' ? 'expenses' : 'spending'} to bring it under control for next month.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-400 mb-4">No budget set for this month.</p>
            <button 
              onClick={() => setIsBudgetModalOpen(true)}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-amber-500/20"
            >
              Set Monthly Limit
            </button>
          </div>
        )}
      </div>

      {/* Goals Section */}
      <div className="bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Target className="text-purple-400" size={20} />
            {activeContext === 'business' ? 'Financial Targets' : 'Savings Goals'}
          </h3>
          <button 
            onClick={() => setIsGoalModalOpen(true)}
            className="w-10 h-10 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl flex items-center justify-center transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>

        {goals.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 mx-auto mb-4">
              <PiggyBank size={32} />
            </div>
            <p className="text-slate-400 mb-4">You haven't set any goals yet.</p>
            <button 
              onClick={() => setIsGoalModalOpen(true)}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-purple-500/20"
            >
              Start Saving
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map(goal => {
              const progress = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
              return (
                <div key={goal.id} className="p-5 bg-white/5 border border-white/10 rounded-2xl relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-white text-lg">{goal.title}</h4>
                      {goal.deadline && (
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                          <Calendar size={12} /> by {format(new Date(goal.deadline), 'MMM yyyy')}
                        </p>
                      )}
                    </div>
                    <button 
                      onClick={() => setDeletingGoalId(goal.id!)}
                      className="text-slate-500 hover:text-rose-400 transition-colors bg-white/5 p-1.5 rounded-lg opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="flex justify-between items-end mb-2">
                    <div className="text-sm font-bold text-purple-400">{formatCurrency(goal.currentAmount)}</div>
                    <div className="text-xs text-slate-400 font-medium">of {formatCurrency(goal.targetAmount)}</div>
                  </div>

                  <div className="h-2.5 bg-white/10 rounded-full overflow-hidden mb-3">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-600 to-fuchsia-500 rounded-full transition-all duration-1000"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">{progress}% complete</span>
                    <button 
                      onClick={() => {
                        const amt = prompt('Amount to add:');
                        if (amt && !isNaN(Number(amt))) {
                          db.goals.update(goal.id!, {
                            currentAmount: goal.currentAmount + Number(amt)
                          });
                        }
                      }}
                      className="text-purple-400 font-bold hover:text-purple-300 transition-colors flex items-center gap-1"
                    >
                      <Plus size={12} /> Add Funds
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Saving Suggestions */}
      <div className="bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 p-6 rounded-[2rem]">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
           <AlertCircle className="text-indigo-400" size={20} />
           Smart Advice
        </h3>
        <ul className="space-y-3">
          {activeContext === 'business' ? (
            <>
              <li className="text-sm text-slate-300 flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5">•</span> 
                <span>Check your <b>Purchases</b> from last week. Can you negotiate better rates with suppliers?</span>
              </li>
              <li className="text-sm text-slate-300 flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5">•</span> 
                <span>Set a daily sales target. Breaking a large monthly goal into daily chunks makes it achievable.</span>
              </li>
              <li className="text-sm text-slate-300 flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5">•</span> 
                <span>Keep track of active Udhaar closely. Unpaid credit directly impacts your cash flow.</span>
              </li>
            </>
          ) : (
            <>
              <li className="text-sm text-slate-300 flex items-start gap-2">
                 <span className="text-indigo-400 mt-0.5">•</span> 
                 <span>Follow the 50/30/20 rule: 50% on needs, 30% on wants, and 20% to savings.</span>
              </li>
              <li className="text-sm text-slate-300 flex items-start gap-2">
                 <span className="text-indigo-400 mt-0.5">•</span> 
                 <span>Review your utility bills. Small reductions in daily usage can lead to significant monthly savings.</span>
              </li>
              <li className="text-sm text-slate-300 flex items-start gap-2">
                 <span className="text-indigo-400 mt-0.5">•</span> 
                 <span>Every time you skip a want (like eating out), add that money directly to your active savings goal.</span>
              </li>
            </>
          )}
        </ul>
      </div>

      <BudgetModal 
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        activeContext={activeContext}
        currentBudget={currentBudget}
        currentMonth={currentMonth}
        currency={currency}
      />

      <GoalModal 
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        activeContext={activeContext}
        currency={currency}
      />

    </div>
  );
}

function BudgetModal({ isOpen, onClose, activeContext, currentBudget, currentMonth, currency }: any) {
  const [amount, setAmount] = useState(currentBudget ? String(currentBudget.amount) : '');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;

    if (currentBudget?.id) {
      await db.budgets.update(currentBudget.id, { amount: Number(amount) });
    } else {
      await db.budgets.add({
        month: currentMonth,
        amount: Number(amount),
        context: activeContext
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0F172A] border border-white/10 rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="text-amber-400" size={24} /> Set Monthly Limit
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Total Limit for {format(new Date(), 'MMMM yyyy')}</label>
            <div className="relative">
               <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">{currency === 'PKR' ? 'Rs' : currency === 'USD' ? '$' : '€'}</span>
               <input
                 type="number"
                 value={amount}
                 onChange={(e) => setAmount(e.target.value)}
                 autoFocus
                 required
                 min="0"
                 className="w-full bg-[#1E293B] border border-white/10 text-white text-xl rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-amber-500/50 outline-none"
               />
             </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-colors">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-xl text-sm font-bold transition-colors">Save Limit</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GoalModal({ isOpen, onClose, activeContext, currency }: any) {
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !targetAmount || isNaN(Number(targetAmount))) return;

    await db.goals.add({
      title,
      targetAmount: Number(targetAmount),
      currentAmount: 0,
      deadline: deadline || undefined,
      context: activeContext
    });

    setTitle('');
    setTargetAmount('');
    setDeadline('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0F172A] border border-white/10 rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Target className="text-purple-400" size={24} /> New Goal
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Goal Name</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Emergency Fund"
              required
              className="w-full bg-[#1E293B] border border-white/10 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500/50 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Target Amount</label>
            <div className="relative">
               <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">{currency === 'PKR' ? 'Rs' : currency === 'USD' ? '$' : '€'}</span>
               <input
                 type="number"
                 value={targetAmount}
                 onChange={(e) => setTargetAmount(e.target.value)}
                 required
                 min="1"
                 className="w-full bg-[#1E293B] border border-white/10 text-white rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-purple-500/50 outline-none"
               />
             </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1 z-40">Target Date (Optional)</label>
            <DatePicker
              value={deadline}
              onChange={(newDate) => setDeadline(newDate)}
              className="w-full bg-[#1E293B] border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-purple-500/50 outline-none"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-colors">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-bold transition-colors">Create Goal</button>
          </div>
        </form>
      </div>
    </div>
  );
}
