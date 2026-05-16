import { z } from 'zod';
import { db } from '../db';
import { Category } from '../models';

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50, 'Category name is too long').trim(),
  type: z.enum(['income', 'expense']),
  context: z.enum(['personal', 'business'])
});

export const CategoryService = {
  async getAll(context?: 'personal' | 'business') {
    if (context) {
      return await db.categories.where('context').equals(context).toArray();
    }
    return await db.categories.toArray();
  },

  async add(category: Omit<Category, 'id'>) {
    const validatedData = categorySchema.parse(category);
    return await db.categories.add(validatedData as Category);
  },

  async checkUsage(id: number): Promise<boolean> {
    const transactionCount = await db.transactions.where('categoryId').equals(id).count();
    return transactionCount > 0;
  },

  async delete(id: number) {
    const inUse = await CategoryService.checkUsage(id);
    if (inUse) {
      throw new Error('Cannot delete category: It is currently used in one or more transactions.');
    }
    return await db.categories.delete(id);
  }
};
