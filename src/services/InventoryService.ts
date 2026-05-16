import { db, InventoryItem } from '../db';
import { z } from 'zod';

export const InventoryItemSchema = z.object({
  name: z.string().min(1),
  category: z.string(),
  quantity: z.number(),
  minQuantity: z.number(),
  unitPrice: z.number(),
  context: z.enum(['personal', 'business']),
});

export type InventoryItemInput = z.infer<typeof InventoryItemSchema>;

export const InventoryService = {
  async add(input: InventoryItemInput) {
    const validated = InventoryItemSchema.parse(input);
    return await db.inventory.add(validated as InventoryItem);
  },

  async restock(id: number, additionalQty: number) {
    if (!Number.isFinite(additionalQty) || additionalQty <= 0)
      throw new Error('Invalid quantity');
    const item = await db.inventory.get(id);
    if (!item) throw new Error('Item not found');
    return db.inventory.update(id, { quantity: item.quantity + additionalQty });
  },

  async upsert(data: InventoryItemInput, id?: number) {
    const validated = InventoryItemSchema.parse(data);
    return id ? db.inventory.update(id, validated) : db.inventory.add(validated as InventoryItem);
  },

  async getAllByContext(context: 'personal' | 'business') {
    return await db.inventory.where('context').equals(context).toArray();
  },

  async delete(id: number) {
    return await db.inventory.delete(id);
  }
};
