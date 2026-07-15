import { useMemo } from 'react';
import { useTransactions, useCustomers, useUdhaarEntries, useInventory } from './useData';
import { subDays, subWeeks, isAfter, isBefore, startOfWeek, endOfWeek } from 'date-fns';

export interface ActionItem {
  id: string;
  type: 'udhaar_due' | 'low_stock';
  title: string;
  description: string;
  urgent: boolean;
  referenceId?: number | string;
}

export interface ProfitLeak {
  categoryId: number;
  categoryName: string;
  currentWeekAmount: number;
  averageWeeklyAmount: number;
  percentageIncrease: number;
}

export interface UdhaarRisk {
  customerId: number;
  customerName: string;
  overdueAmount: number;
  daysOverdue: number;
}

export interface BusinessBrainInsights {
  healthScore: number;
  actionList: ActionItem[];
  profitLeaks: ProfitLeak[];
  udhaarRisks: UdhaarRisk[];
  lowStockItems: number;
  cashflowWarning: boolean;
  thisWeekIncome: number;
  thisWeekExpense: number;
}

export function useBusinessBrainData(context: 'personal' | 'business'): BusinessBrainInsights {
  const transactions = useTransactions(context) || [];
  const customers = useCustomers() || [];
  const udhaarEntries = useUdhaarEntries() || [];
  const inventory = useInventory(context) || [];

  return useMemo(() => {
    const now = new Date();
    
    // --- Dates ---
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const past4WeeksStart = subWeeks(thisWeekStart, 4);

    // --- Basic Financials ---
    let thisWeekIncome = 0;
    let thisWeekExpense = 0;
    let thisMonthIncome = 0;
    let thisMonthExpense = 0;

    const thisMonthStart = subDays(now, 30); // Using rolling 30 days for health score

    // Categorized expenses for leak calculation
    const thisWeekExpensesByCategory: Record<number, number> = {};
    const past4WeeksExpensesByCategory: Record<number, number> = {};

    transactions.forEach(t => {
      const tDate = new Date(t.date);
      
      // 30 days rolling for Health Score
      if (isAfter(tDate, thisMonthStart)) {
        if (t.type === 'income') thisMonthIncome += t.amount;
        if (t.type === 'expense') thisMonthExpense += t.amount;
      }

      // This week vs Past 4 weeks for Leaks & Cashflow
      if (isAfter(tDate, thisWeekStart) && !isAfter(tDate, thisWeekEnd)) {
        if (t.type === 'income') thisWeekIncome += t.amount;
        if (t.type === 'expense') {
          thisWeekExpense += t.amount;
          thisWeekExpensesByCategory[t.categoryId] = (thisWeekExpensesByCategory[t.categoryId] || 0) + t.amount;
        }
      } else if (isAfter(tDate, past4WeeksStart) && isBefore(tDate, thisWeekStart)) {
        if (t.type === 'expense') {
          past4WeeksExpensesByCategory[t.categoryId] = (past4WeeksExpensesByCategory[t.categoryId] || 0) + t.amount;
        }
      }
    });

    const cashflowWarning = thisWeekExpense > thisWeekIncome;

    // --- Profit Leaks ---
    const profitLeaks: ProfitLeak[] = [];
    Object.keys(thisWeekExpensesByCategory).forEach(catIdStr => {
      const catId = parseInt(catIdStr);
      const currentWeekAmount = thisWeekExpensesByCategory[catId];
      const past4WeeksTotal = past4WeeksExpensesByCategory[catId] || 0;
      const averageWeeklyAmount = past4WeeksTotal / 4;

      // Leak criteria: > 20% increase AND significant amount (e.g. > 1000)
      if (averageWeeklyAmount > 0 && currentWeekAmount > 1000) {
        const percentageIncrease = ((currentWeekAmount - averageWeeklyAmount) / averageWeeklyAmount) * 100;
        if (percentageIncrease > 20) {
          profitLeaks.push({
            categoryId: catId,
            categoryName: `Category #${catId}`, // Placeholder, UI can map this if needed
            currentWeekAmount,
            averageWeeklyAmount,
            percentageIncrease
          });
        }
      }
    });

    // Sort leaks by absolute amount difference descending
    profitLeaks.sort((a, b) => (b.currentWeekAmount - b.averageWeeklyAmount) - (a.currentWeekAmount - a.averageWeeklyAmount));

    // --- Action List & Udhaar Risks ---
    const actionList: ActionItem[] = [];
    const udhaarRisks: UdhaarRisk[] = [];
    const customerMap = new Map(customers.map(c => [c.id, c.name]));

    udhaarEntries.forEach(entry => {
      if (!entry.isCompleted && entry.dueDate && entry.context === context) {
        const dueDate = new Date(entry.dueDate);
        if (isBefore(dueDate, now)) {
          // Overdue!
          const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));
          const customerName = customerMap.get(entry.customerId) || 'Unknown Customer';
          
          actionList.push({
            id: `udhaar_${entry.id}`,
            type: 'udhaar_due',
            title: `Collect Udhaar from ${customerName}`,
            description: `${daysOverdue} days overdue. Amount: ${entry.amount}`,
            urgent: daysOverdue > 7,
            referenceId: entry.customerId
          });

          // Add to risks if significant (e.g. > 7 days)
          if (daysOverdue > 7 && entry.amount > 500) {
            udhaarRisks.push({
              customerId: entry.customerId,
              customerName,
              overdueAmount: entry.amount,
              daysOverdue
            });
          }
        } else if (Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24)) <= 1) {
          // Due today or tomorrow
          const customerName = customerMap.get(entry.customerId) || 'Unknown Customer';
          actionList.push({
            id: `udhaar_${entry.id}`,
            type: 'udhaar_due',
            title: `Udhaar Due: ${customerName}`,
            description: `Amount: ${entry.amount} is due ${isBefore(dueDate, now) ? 'today' : 'tomorrow'}.`,
            urgent: false,
            referenceId: entry.customerId
          });
        }
      }
    });

    // --- Low Stock Alerts ---
    let lowStockCount = 0;
    inventory.forEach(item => {
      if (item.quantity <= (item.minStockLevel || 0)) {
        lowStockCount++;
        actionList.push({
          id: `stock_${item.id}`,
          type: 'low_stock',
          title: `Restock: ${item.name}`,
          description: `Only ${item.quantity} left in stock.`,
          urgent: item.quantity === 0,
          referenceId: item.id
        });
      }
    });

    // --- Health Score Calculation ---
    // Simple 0-100 score based on 30 day rolling metrics
    let score = 50; // Base score
    const totalReceivables = customers.filter(c => c.type !== 'supplier' && c.balance > 0).reduce((sum, c) => sum + c.balance, 0);
    const totalBank = transactions.reduce((sum, t) => t.type === 'income' ? sum + t.amount : sum - t.amount, 0);
    const thisMonthProfit = thisMonthIncome - thisMonthExpense;

    if (thisMonthProfit > 0) score += 20; // Profitable this month
    if (totalBank > totalReceivables) score += 15; // More cash than pending receivables
    if (!cashflowWarning) score += 10; // Weekly cashflow is positive
    if (udhaarRisks.length === 0) score += 5; // No severe overdue udhaars
    
    // Penalties
    if (cashflowWarning) score -= 10;
    if (profitLeaks.length > 0) score -= (profitLeaks.length * 5);

    score = Math.min(Math.max(score, 0), 100);

    // Sort action list (urgent first)
    actionList.sort((a, b) => (a.urgent === b.urgent ? 0 : a.urgent ? -1 : 1));

    return {
      healthScore: score,
      actionList,
      profitLeaks,
      udhaarRisks,
      lowStockItems: lowStockCount,
      cashflowWarning,
      thisWeekIncome,
      thisWeekExpense
    };
  }, [transactions, customers, udhaarEntries, inventory, context]);
}
