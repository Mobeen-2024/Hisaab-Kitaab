import { db } from '../db';
import { WarrantySchema } from '../models/schemas';
import type { Warranty } from '../db';

export const WarrantyService = {
  async add(input: Omit<Warranty, 'id'>) {
    const validated = WarrantySchema.parse(input);
    return await db.warranties.add(validated as Warranty);
  },

  async update(id: number, input: Partial<Warranty>) {
    const validated = WarrantySchema.partial().parse(input);
    return await db.warranties.update(id, validated);
  },

  async getAllByContext(context: 'personal' | 'business') {
    return await db.warranties.where('context').equals(context).reverse().toArray();
  },

  async delete(id: number) {
    return await db.warranties.delete(id);
  },

  // Helper to calculate status based on date
  getCalculatedStatus(warranty: Warranty): 'active' | 'expired' | 'claimed' {
    if (warranty.status === 'claimed') return 'claimed';
    
    const saleDate = new Date(warranty.saleDate);
    const expiryDate = new Date(saleDate.setMonth(saleDate.getMonth() + warranty.warrantyMonths));
    const now = new Date();

    if (now > expiryDate) {
      return 'expired';
    }
    return 'active';
  }
};
