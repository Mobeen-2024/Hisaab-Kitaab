import { db } from '../db';
import { Customer, CustomerSchema } from '../models';

export type CustomerInput = Omit<Customer, 'id' | 'createdAt'> & { id?: number; createdAt?: string };

export const CustomerService = {
  async add(input: CustomerInput) {
    const dataToValidate = {
      ...input,
      createdAt: input.createdAt || new Date().toISOString(),
      balance: input.balance ?? 0
    };
    
    const validated = CustomerSchema.parse(dataToValidate);
    return await db.customers.add(validated as Customer);
  },

  async update(id: number, input: Partial<CustomerInput>) {
    if (input.name === '') throw new Error('Name cannot be empty');
    const result = await db.customers.update(id, input);
    await this.syncBalance(id);
    return result;
  },

  async syncBalance(customerId: number) {
    const customer = await db.customers.get(customerId);
    if (!customer) return;

    const isSupplier = customer.type === 'supplier';
    
    // Sum from Udhaar entries
    const entries = await db.udhaarEntries.where('customerId').equals(customerId).toArray();
    let balance = entries.reduce((sum, entry) => {
      if (isSupplier) {
        return sum + (entry.type === 'receive' ? entry.amount : -entry.amount);
      } else {
        return sum + (entry.type === 'give' ? entry.amount : -entry.amount);
      }
    }, 0);

    // Sum from Transactions (Payments)
    const transactions = await db.transactions.where('customerId').equals(customerId).toArray();
    balance += transactions.reduce((sum, tx) => {
      if (isSupplier) {
        // Payment to supplier (Expense) decreases debt
        // Return from supplier (Income) increases debt? Usually transactions are payments.
        return sum + (tx.type === 'income' ? tx.amount : -tx.amount);
      } else {
        // Payment from customer (Income) decreases debt
        // Refund to customer (Expense) increases debt? 
        return sum + (tx.type === 'expense' ? tx.amount : -tx.amount);
      }
    }, 0);

    await db.customers.update(customerId, { balance });
    return balance;
  },

  async delete(id: number, force = false) {
    const customer = await db.customers.get(id);
    if (!customer) throw new Error('Customer not found');

    if (Math.abs(customer.balance) > 0.01 && !force) {
      throw new Error(`Cannot delete customer with active balance (${customer.balance.toFixed(2)}). Clear balance first or use force delete.`);
    }

    const txIds = await db.transactions.where('customerId').equals(id).primaryKeys();
    const udhaarIds = await db.udhaarEntries.where('customerId').equals(id).primaryKeys();

    return await db.transaction('rw', [db.transactions, db.udhaarEntries, db.customers], async () => {
      if (txIds.length > 0) await db.transactions.bulkDelete(txIds);
      if (udhaarIds.length > 0) await db.udhaarEntries.bulkDelete(udhaarIds);
      await db.customers.delete(id);
    });
  },

  async getAll() {
    return await db.customers.toArray();
  },

  async search(query: string) {
    const q = query.toLowerCase();
    const all = await this.getAll();
    return all.filter(c => 
      c.name.toLowerCase().includes(q) || 
      (c.phone && c.phone.includes(q))
    );
  }
};
