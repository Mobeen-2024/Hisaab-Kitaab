import { db } from '../db';
import { Category } from '../models';

export const CategoryService = {
  async getAll(context?: 'personal' | 'business') {
    if (context) {
      return await db.categories.where('context').equals(context).toArray();
    }
    return await db.categories.toArray();
  },

  async add(category: Omit<Category, 'id'>) {
    return await db.categories.add(category as Category);
  },

  async delete(id: number) {
    return await db.categories.delete(id);
  }
};
