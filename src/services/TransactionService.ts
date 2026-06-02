import { db } from '../db';
import Dexie from 'dexie';
import { Transaction, TransactionSchema } from '../models';
import { CustomerService } from './CustomerService';

export type TransactionInput = Transaction;

export const TransactionService = {
  async add(input: TransactionInput) {
    const validated = TransactionSchema.parse(input);
    const id = await db.transactions.add(validated as Transaction);
    if (validated.customerId) {
      await CustomerService.syncBalance(validated.customerId);
    }
    return id;
  },

  async getAllByContext(context: 'personal' | 'business') {
    return await db.transactions.where('context').equals(context).toArray();
  },

  async clearAll() {
    return await db.transactions.clear();
  },

  async update(id: number, input: Partial<TransactionInput>) {
    const tx = await db.transactions.get(id);
    if (!tx) throw new Error("Transaction not found");
    const oldCustomerId = tx.customerId;

    await db.transactions.update(id, input);

    if (oldCustomerId) {
      await CustomerService.syncBalance(oldCustomerId);
    }
    if (input.customerId && input.customerId !== oldCustomerId) {
      await CustomerService.syncBalance(input.customerId);
    }
  },

  async delete(id: number) {
    const tx = await db.transactions.get(id);
    if (!tx) return;

    await db.transactions.delete(id);
    if (tx.customerId) {
      await CustomerService.syncBalance(tx.customerId);
    }
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
  },

  async getPaginatedByContext(context: 'personal' | 'business', page: number, pageSize: number) {
    return await db.transactions
      .where('[context+date]')
      .between([context, Dexie.minKey], [context, Dexie.maxKey])
      .reverse()
      .offset(page * pageSize)
      .limit(pageSize)
      .toArray();
  },

  async countByContext(context: 'personal' | 'business') {
    return await db.transactions
      .where('context')
      .equals(context)
      .count();
  },

  async getByDateRange(context: 'personal' | 'business', startDate: string, endDate: string, includeUpperBound = true) {
    return await db.transactions
      .where('[context+date]')
      .between([context, startDate], [context, endDate], true, includeUpperBound)
      .reverse()
      .toArray();
  },

  async getRecentByContext(context: 'personal' | 'business', limit: number) {
    return await db.transactions
      .where('[context+date]')
      .between([context, Dexie.minKey], [context, Dexie.maxKey])
      .reverse()
      .limit(limit)
      .toArray();
  },

  async getLast7DaysTransactions(context: 'personal' | 'business') {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6); // Includes today
    const startDate = sevenDaysAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];
    return await this.getByDateRange(context, startDate, endDate);
  },

  async searchLimited(context: 'personal' | 'business', query: string, limit = 20) {
    const q = query.toLowerCase();
    // We get a reasonable recent chunk to search on (e.g. 500) so we avoid full table scan
    const txs = await this.getRecentByContext(context, 500);
    return txs
      .filter(t =>
        (t.description?.toLowerCase().includes(q)) ||
        (t.amount.toString().includes(q))
      )
      .slice(0, limit);
  },

  async getByImportReferences(refs: string[]) {
    return await db.transactions.where('importReferenceId').anyOf(refs).toArray();
  },

  async bulkAdd(transactions: Transaction[]) {
    const validated = transactions.map(t => TransactionSchema.parse(t));
    const result = await db.transactions.bulkAdd(validated as Transaction[]);
    // Sync balances for all affected customers
    const customerIds = [...new Set(validated.map(t => t.customerId).filter(Boolean))];
    for (const id of customerIds) {
      await CustomerService.syncBalance(id as number);
    }
    return result;
  }
};
