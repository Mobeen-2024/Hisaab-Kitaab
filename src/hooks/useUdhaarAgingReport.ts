import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { differenceInDays } from 'date-fns';

export interface AgingBucket {
  label: string;
  amount: number;
}

const defaultReport: AgingBucket[] = [
  { label: '0-30 Days', amount: 0 },
  { label: '31-60 Days', amount: 0 },
  { label: '61-90 Days', amount: 0 },
  { label: '90+ Days', amount: 0 }
];

export function useUdhaarAgingReport() {
  return useLiveQuery(
    async () => {
      const now = new Date();
      const customers = await db.customers.toArray();
      const allEntries = await db.udhaarEntries.toArray();

      let bucket0_30 = 0;
      let bucket31_60 = 0;
      let bucket61_90 = 0;
      let bucket90Plus = 0;

      for (const customer of customers) {
        if (customer.balance <= 0) continue; // Only process those who owe us

        const entries = allEntries.filter(e => e.customerId === customer.id);
        entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let totalReceived = entries.filter(e => e.type === 'receive').reduce((sum, e) => sum + e.amount, 0);
        if (customer.initialBalance && customer.initialBalance < 0) {
          totalReceived += Math.abs(customer.initialBalance);
        }

        const giveEntries: { amount: number; dueDate?: string }[] = [];
        if (customer.initialBalance && customer.initialBalance > 0) {
          giveEntries.push({ amount: customer.initialBalance, dueDate: undefined });
        }
        giveEntries.push(...entries.filter(e => e.type === 'give').map(e => ({ amount: e.amount, dueDate: e.dueDate })));

        const unpaidEntries: (typeof giveEntries[0] & { remaining: number })[] = [];

        for (const entry of giveEntries) {
          if (totalReceived >= entry.amount) {
            totalReceived -= entry.amount;
          } else {
            unpaidEntries.push({ ...entry, remaining: entry.amount - totalReceived });
            totalReceived = 0;
          }
        }

        for (const entry of unpaidEntries) {
          if (entry.dueDate) {
            const dueDate = new Date(entry.dueDate);
            if (dueDate < now) {
              const days = differenceInDays(now, dueDate);
              if (days <= 30) {
                bucket0_30 += entry.remaining;
              } else if (days <= 60) {
                bucket31_60 += entry.remaining;
              } else if (days <= 90) {
                bucket61_90 += entry.remaining;
              } else {
                bucket90Plus += entry.remaining;
              }
            }
          }
        }
      }

      return [
        { label: '0-30 Days', amount: bucket0_30 },
        { label: '31-60 Days', amount: bucket31_60 },
        { label: '61-90 Days', amount: bucket61_90 },
        { label: '90+ Days', amount: bucket90Plus }
      ];
    },
    [],
    defaultReport
  );
}
