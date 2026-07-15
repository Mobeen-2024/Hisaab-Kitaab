import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { startOfDay } from 'date-fns';
import { Invoice, Transaction, UdhaarEntry, InventoryItem, RepairJob, Warranty } from '../models/schemas';

export interface DailyClosingData {
  todaySales: number;
  todayExpenses: number;
  profitEstimate: number;
  cashExpected: number;
  udhaarGiven: number;
  udhaarReceived: number;
  lowStockCount: number;
  pendingRepairs: number;
  activeWarranties: number;
}

export function calculateDailyClosingData(
  invoices: Invoice[],
  transactions: Transaction[],
  udhaarEntries: UdhaarEntry[],
  inventory: InventoryItem[],
  repairs: RepairJob[],
  warranties: Warranty[],
  todayStartMs: number
): DailyClosingData {
  let todaySales = 0;
  let todayExpenses = 0;
  let profitEstimate = 0;
  let cashExpected = 0;
  let udhaarGiven = 0;
  let udhaarReceived = 0;
  let lowStockCount = 0;
  let pendingRepairs = 0;
  let activeWarranties = 0;

  // Process Invoices (Sales & Profit)
  invoices.forEach(inv => {
    const createdTs = new Date(inv.createdAt).getTime();
    if (createdTs >= todayStartMs && inv.type === 'invoice') {
      todaySales += inv.total;
      
      if (inv.items && inv.items.length > 0) {
        inv.items.forEach(item => {
          const invItem = inventory.find(i => i.id === item.itemId);
          const cost = invItem?.costPrice || 0; 
          const effectiveCost = cost > 0 ? cost : item.unitPrice;
          profitEstimate += (item.unitPrice - effectiveCost) * item.quantity;
        });
      }
    }
  });

  // Process Transactions (Cash & Expenses)
  transactions.forEach(t => {
    const tTs = new Date(t.date).getTime();
    if (tTs >= todayStartMs) {
      if (t.type === 'expense') {
        todayExpenses += t.amount;
        cashExpected -= t.amount;
      } else if (t.type === 'income') {
        cashExpected += t.amount;
      }
    }
  });

  // Process Udhaar
  udhaarEntries.forEach(u => {
    const uTs = new Date(u.date).getTime();
    if (uTs >= todayStartMs) {
      if (u.type === 'give') {
        udhaarGiven += u.amount;
      } else if (u.type === 'take') {
        udhaarReceived += u.amount;
      }
    }
  });

  // Process Inventory
  inventory.forEach(i => {
    if (i.quantity <= (i.minQuantity || 0)) {
      lowStockCount++;
    }
  });

  // Process Repairs
  repairs.forEach(r => {
    if (r.status === 'pending') {
      pendingRepairs++;
    }
  });

  // Process Warranties
  const sevenDaysFromNow = todayStartMs + (7 * 24 * 60 * 60 * 1000);
  warranties.forEach(w => {
    if (w.status === 'active') {
      const saleDateMs = new Date(w.saleDate).getTime();
      const expireMs = saleDateMs + (w.warrantyMonths * 30 * 24 * 60 * 60 * 1000);
      if (expireMs >= todayStartMs && expireMs <= sevenDaysFromNow) {
        activeWarranties++;
      }
    }
  });

  return {
    todaySales,
    todayExpenses,
    profitEstimate,
    cashExpected,
    udhaarGiven,
    udhaarReceived,
    lowStockCount,
    pendingRepairs,
    activeWarranties
  };
}

export function useDailyClosingData(context: 'personal' | 'business'): DailyClosingData | null {
  return useLiveQuery(async () => {
    const today = startOfDay(new Date());
    const todayStartMs = today.getTime();
    
    // We only need to fetch the relevant context
    const [invoices, transactions, udhaarEntries, inventory, repairs, warranties] = await Promise.all([
      db.invoices.where('context').equals(context).toArray(),
      db.transactions.where('context').equals(context).toArray(),
      db.udhaarEntries.where('context').equals(context).toArray().catch(() => db.udhaarEntries.toArray()),
      db.inventory.where('context').equals(context).toArray(),
      db.repairJobs.where('context').equals(context).toArray().catch(() => db.repairJobs.toArray()),
      db.warranties.where('context').equals(context).toArray().catch(() => db.warranties.toArray())
    ]);

    return calculateDailyClosingData(
      invoices,
      transactions,
      udhaarEntries as UdhaarEntry[],
      inventory,
      repairs as RepairJob[],
      warranties as Warranty[],
      todayStartMs
    );
  }, [context]);
}
