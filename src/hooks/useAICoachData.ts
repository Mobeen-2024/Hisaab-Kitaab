import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Invoice, Transaction, UdhaarEntry, InventoryItem, RepairJob } from '../models/schemas';

export interface AICoachData {
  totalSales: number;
  totalExpenses: number;
  profitEstimate: number;
  totalReceivables: number;
  totalPayables: number;
  inventoryValue: number;
  pendingRepairsValue: number;
}

export function calculateAICoachData(
  invoices: Invoice[],
  transactions: Transaction[],
  udhaarEntries: UdhaarEntry[],
  inventory: InventoryItem[],
  repairs: RepairJob[]
): AICoachData {
  let totalSales = 0;
  let totalExpenses = 0;
  let profitEstimate = 0;
  let totalReceivables = 0;
  let totalPayables = 0;
  let inventoryValue = 0;
  let pendingRepairsValue = 0;

  invoices.forEach(inv => {
    if (inv.type === 'invoice') {
      totalSales += inv.total;
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

  transactions.forEach(t => {
    if (t.type === 'expense') {
      totalExpenses += t.amount;
    }
  });

  udhaarEntries.forEach(u => {
    if (u.type === 'give') {
      totalReceivables += u.amount;
    } else if (u.type === 'take') {
      totalPayables += u.amount;
    }
  });

  inventory.forEach(i => {
    const cost = i.costPrice || 0;
    inventoryValue += (cost * i.quantity);
  });

  repairs.forEach(r => {
    if (r.status === 'pending') {
      pendingRepairsValue += r.estimatedCost;
    }
  });

  return {
    totalSales,
    totalExpenses,
    profitEstimate,
    totalReceivables,
    totalPayables,
    inventoryValue,
    pendingRepairsValue
  };
}

export function useAICoachData(activeContext: string) {
  return useLiveQuery(async () => {
    const invoices = await db.invoices.toArray();
    const transactions = await db.transactions.filter(t => t.context === activeContext).toArray();
    const udhaarEntries = await db.udhaarEntries.filter(u => u.context === activeContext).toArray();
    const inventory = await db.inventory.toArray();
    const repairs = await db.repairJobs.toArray();

    return calculateAICoachData(invoices, transactions, udhaarEntries, inventory, repairs);
  }, [activeContext], {
    totalSales: 0,
    totalExpenses: 0,
    profitEstimate: 0,
    totalReceivables: 0,
    totalPayables: 0,
    inventoryValue: 0,
    pendingRepairsValue: 0
  });
}
