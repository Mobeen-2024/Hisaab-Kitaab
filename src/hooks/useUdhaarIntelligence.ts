import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { differenceInDays } from 'date-fns';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface UdhaarIntelligence {
  overdueAmount: number;
  maxOverdueDays: number;
  riskLevel: RiskLevel;
  recommendedCreditLimit: number;
  paymentBehavior: string;
  whatsappTemplate: string;
}

const defaultIntelligence: UdhaarIntelligence = {
  overdueAmount: 0,
  maxOverdueDays: 0,
  riskLevel: 'low',
  recommendedCreditLimit: 5000,
  paymentBehavior: 'Calculating...',
  whatsappTemplate: ''
};

export async function calculateUdhaarIntelligenceSync(customer: any, entries: any[], customerName: string): Promise<UdhaarIntelligence> {
  const now = new Date();
  if (!customer) return defaultIntelligence;
  // sort entries by date (oldest first)
  entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Separate into give and receive to calculate FIFO unpaid debts
  let totalReceived = entries.filter(e => e.type === 'receive').reduce((sum, e) => sum + e.amount, 0);
  if (customer.initialBalance && customer.initialBalance < 0) {
    totalReceived += Math.abs(customer.initialBalance);
  }

  const giveEntries: { amount: number; dueDate?: string }[] = [];
  if (customer.initialBalance && customer.initialBalance > 0) {
    giveEntries.push({ amount: customer.initialBalance, dueDate: undefined });
  }
  giveEntries.push(...entries.filter(e => e.type === 'give').map(e => ({ amount: e.amount, dueDate: e.dueDate })));

  // Apply totalReceived to giveEntries in FIFO order to find which are still unpaid
  const unpaidEntries: (typeof giveEntries[0] & { remaining: number })[] = [];

  for (const entry of giveEntries) {
    if (totalReceived >= entry.amount) {
      totalReceived -= entry.amount;
    } else {
      unpaidEntries.push({ ...entry, remaining: entry.amount - totalReceived });
      totalReceived = 0;
    }
  }

  let overdueAmount = 0;
  let maxOverdueDays = 0;

  for (const entry of unpaidEntries) {
    if (entry.dueDate) {
      const dueDate = new Date(entry.dueDate);
      if (dueDate < now) {
        overdueAmount += entry.remaining;
        const days = differenceInDays(now, dueDate);
        if (days > maxOverdueDays) {
          maxOverdueDays = days;
        }
      }
    }
  }

  let riskLevel: RiskLevel = 'low';
  if (maxOverdueDays > 14 || (overdueAmount > 5000 && maxOverdueDays > 7)) {
    riskLevel = 'high';
  } else if (maxOverdueDays > 0) {
    riskLevel = 'medium';
  }

  // Recommended credit limit
  const totalPaidBack = entries.filter(e => e.type === 'receive').reduce((sum, e) => sum + e.amount, 0);
  let recommendedCreditLimit = 5000 + (totalPaidBack * 0.1);
  if (riskLevel === 'high') recommendedCreditLimit = 0;
  if (riskLevel === 'medium') recommendedCreditLimit = Math.min(recommendedCreditLimit, 5000);

  // Format amounts for display
  const formatAmount = (amt: number) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(amt).replace('PKR', '').trim();

  let paymentBehavior = 'No history yet';
  if (entries.length > 0) {
    if (riskLevel === 'high') {
      paymentBehavior = 'Frequently late or severely overdue';
    } else if (riskLevel === 'medium') {
      paymentBehavior = 'Occasionally pays late';
    } else {
      paymentBehavior = 'Generally pays on time';
    }
  }

  let whatsappTemplate = '';
  if (overdueAmount > 0) {
    if (riskLevel === 'high') {
      whatsappTemplate = `Asalam-o-Alaikum ${customerName}, your balance of Rs ${formatAmount(overdueAmount)} has been overdue for ${maxOverdueDays} days. We request you to please settle this account as soon as possible.`;
    } else if (riskLevel === 'medium') {
      whatsappTemplate = `Asalam-o-Alaikum ${customerName}, your balance of Rs ${formatAmount(overdueAmount)} is overdue by ${maxOverdueDays} days. Kindly arrange the payment soon.`;
    } else {
      whatsappTemplate = `Asalam-o-Alaikum ${customerName}, a friendly reminder for your balance of Rs ${formatAmount(overdueAmount)}. Please pay at your earliest convenience.`;
    }
  } else {
    const balance = Math.abs(customer.balance);
    if (customer.balance > 0) {
      whatsappTemplate = `Asalam-o-Alaikum ${customerName}, a friendly reminder for your upcoming balance of Rs ${formatAmount(balance)}. Please pay at your earliest convenience.`;
    } else {
      whatsappTemplate = `Asalam-o-Alaikum ${customerName}, hope you are doing well!`;
    }
  }

  return {
    overdueAmount,
    maxOverdueDays,
    riskLevel,
    recommendedCreditLimit,
    paymentBehavior,
    whatsappTemplate
  };
}

import { useState, useEffect } from 'react';

export function useUdhaarIntelligence(customerId: number, customerName: string): UdhaarIntelligence {
  const customer = useLiveQuery(() => db.customers.get(customerId), [customerId], null);
  const entries = useLiveQuery(() => db.udhaarEntries.where('customerId').equals(customerId).toArray(), [customerId], null);

  const [intelligence, setIntelligence] = useState<UdhaarIntelligence>(defaultIntelligence);

  useEffect(() => {
    if (customer === null || entries === null) return;
    
    const handler = setTimeout(() => {
      calculateUdhaarIntelligenceSync(customer, entries, customerName).then(setIntelligence);
    }, 150);

    return () => clearTimeout(handler);
  }, [customer, entries, customerName]);

  return intelligence;
}
