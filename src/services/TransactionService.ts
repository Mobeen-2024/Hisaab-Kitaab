import { db, Transaction } from '../db';
import { z } from 'zod';

export const TransactionSchema = z.object({
  type: z.enum(['expense', 'income']),
  context: z.enum(['personal', 'business']),
  amount: z.number().positive(),
  originalCurrency: z.string(),
  originalAmount: z.number().positive(),
  exchangeRate: z.number().positive(),
  categoryId: z.number(),
  date: z.string(),
  description: z.string().optional(),
  paymentMethod: z.string().default('cash'),
  customerId: z.number().optional(),
});

export type TransactionInput = z.infer<typeof TransactionSchema>;

export const TransactionService = {
  async add(input: TransactionInput) {
    const validated = TransactionSchema.parse(input);
    return await db.transactions.add(validated as Transaction);
  },

  async getAllByContext(context: 'personal' | 'business') {
    return await db.transactions.where('context').equals(context).toArray();
  },

  async clearAll() {
    return await db.transactions.clear();
  },

  async delete(id: number) {
    return await db.transactions.delete(id);
  },

  async getRecent(limit = 100) {
    return await db.transactions.reverse().limit(limit).toArray();
  }
};
