import { db, UdhaarEntry } from '../db';
import { UdhaarEntrySchema } from '../models';
import { CustomerService } from './CustomerService';

export type UdhaarEntryInput = UdhaarEntry;

export const UdhaarService = {
  async add(input: UdhaarEntryInput) {
    const validated = UdhaarEntrySchema.parse(input);
    const id = await db.udhaarEntries.add(validated as UdhaarEntry);
    await CustomerService.syncBalance(validated.customerId);
    return id;
  },

  async getAll() {
    return await db.udhaarEntries.reverse().toArray();
  },

  async getByCustomer(customerId: number) {
    return await db.udhaarEntries.where('customerId').equals(customerId).reverse().toArray();
  },

  async delete(id: number) {
    const entry = await db.udhaarEntries.get(id);
    if (!entry) return;
    
    await db.udhaarEntries.delete(id);
    await CustomerService.syncBalance(entry.customerId);
  },

  async markAsCompleted(id: number) {
    const entry = await db.udhaarEntries.get(id);
    if (!entry) return;

    const result = await db.udhaarEntries.update(id, { isCompleted: true });
    // isCompleted doesn't affect balance in this logic, but good to have hooks
    return result;
  },

  async getLastUsedCustomer(type: 'give' | 'receive') {
    return await db.udhaarEntries
      .where('type')
      .equals(type)
      .reverse()
      .first();
  }
};
