import { db } from '../db';
import { Transaction, TransactionSchema } from '../models';

export type TransactionInput = Transaction;

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
