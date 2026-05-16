import { db, UdhaarEntry } from '../db';
import { UdhaarEntrySchema } from '../models';

export type UdhaarEntryInput = UdhaarEntry;

export const UdhaarService = {
  async add(input: UdhaarEntryInput) {
    const validated = UdhaarEntrySchema.parse(input);
    return await db.udhaarEntries.add(validated as UdhaarEntry);
  },

  async getAll() {
    return await db.udhaarEntries.reverse().toArray();
  },

  async getByCustomer(customerId: number) {
    return await db.udhaarEntries.where('customerId').equals(customerId).reverse().toArray();
  },

  async delete(id: number) {
    return await db.udhaarEntries.delete(id);
  },

  async markAsCompleted(id: number) {
    return await db.udhaarEntries.update(id, { isCompleted: true });
  },

  async getLastUsedCustomer(type: 'give' | 'receive') {
    return await db.udhaarEntries
      .where('type')
      .equals(type)
      .reverse()
      .first();
  }
};
