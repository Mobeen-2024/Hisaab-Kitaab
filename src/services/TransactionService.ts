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
  },

  async getByContext(context: 'personal' | 'business') {
    return await db.transactions.where('context').equals(context).reverse().toArray();
  },

  async getAll() {
    return await db.transactions.reverse().toArray();
  },

  async getByDate(date: string, context: 'personal' | 'business') {
    return await db.transactions.where('date').equals(date).filter(t => t.context === context).toArray();
  },

  async getLastUsedCategory(type: 'expense' | 'income', context: 'personal' | 'business') {
    return await db.transactions
      .orderBy('id')
      .reverse()
      .filter((t) => t.type === type && t.context === context)
      .first();
  },

  async search(query: string, context: 'personal' | 'business') {
    const q = query.toLowerCase();
    const txs = await this.getByContext(context);
    return txs.filter(t => 
      (t.description?.toLowerCase().includes(q)) ||
      (t.amount.toString().includes(q))
    );
  }
};
