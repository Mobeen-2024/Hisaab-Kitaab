import { db } from '../db';
import { Customer, CustomerSchema } from '../models';

export type CustomerInput = Omit<Customer, 'id' | 'createdAt'> & { id?: number; createdAt?: string };

export const CustomerService = {
  async add(input: CustomerInput) {
    const validated = CustomerSchema.parse(input);
    return await db.customers.add({
      ...validated,
      createdAt: validated.createdAt || new Date().toISOString()
    } as Customer);
  },

  async update(id: number, input: Partial<CustomerInput>) {
    return await db.customers.update(id, input);
  },

  async delete(id: number) {
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
      c.phone.includes(q)
    );
  }
};
