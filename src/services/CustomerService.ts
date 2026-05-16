import { db, Customer } from '../db';
import { z } from 'zod';

export const CustomerSchema = z.object({
  name: z.string().min(1),
  phone: z.string(),
  type: z.enum(['customer', 'supplier']).default('customer'),
  balance: z.number().default(0),
  createdAt: z.string().optional(),
});

export type CustomerInput = z.infer<typeof CustomerSchema>;

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
    // Also delete related transactions and udhaar entries
    const txs = await db.transactions.toArray();
    const txIds = txs.filter(t => Number(t.customerId) === id).map(t => t.id).filter((id): id is number => id !== undefined);
    if (txIds.length > 0) await db.transactions.bulkDelete(txIds);
    
    const entries = await db.udhaarEntries.toArray();
    const entryIds = entries.filter(e => Number(e.customerId) === id).map(e => e.id).filter((id): id is number => id !== undefined);
    if (entryIds.length > 0) await db.udhaarEntries.bulkDelete(entryIds);
    
    return await db.customers.delete(id);
  },

  async getAll() {
    return await db.customers.toArray();
  }
};
