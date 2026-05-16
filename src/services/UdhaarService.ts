import { db, UdhaarEntry } from '../db';
import { z } from 'zod';

export const UdhaarEntrySchema = z.object({
  customerId: z.number(),
  type: z.enum(['give', 'receive']),
  amount: z.number().positive(),
  originalCurrency: z.string(),
  originalAmount: z.number().positive(),
  exchangeRate: z.number().positive(),
  date: z.string(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  isCompleted: z.boolean().default(false),
});

export type UdhaarEntryInput = z.infer<typeof UdhaarEntrySchema>;

export const UdhaarService = {
  async add(input: UdhaarEntryInput) {
    const validated = UdhaarEntrySchema.parse(input);
    return await db.udhaarEntries.add(validated as UdhaarEntry);
  },

  async getAll() {
    return await db.udhaarEntries.toArray();
  },

  async delete(id: number) {
    return await db.udhaarEntries.delete(id);
  },

  async markAsCompleted(id: number) {
    return await db.udhaarEntries.update(id, { isCompleted: true });
  }
};
