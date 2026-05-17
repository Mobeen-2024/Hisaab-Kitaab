import { db, InventoryItem } from '../db';
import { InventoryItemSchema } from '../models/schemas';

export type InventoryItemInput = InventoryItem;

export const InventoryService = {
  async add(input: Omit<InventoryItem, 'id'>) {
    const validated = InventoryItemSchema.parse(input);
    return await db.inventory.add(validated as InventoryItem);
  },

  async restock(id: number, additionalQty: number) {
    if (!Number.isFinite(additionalQty) || additionalQty <= 0)
      throw new Error('Invalid quantity provided for restock');
      
    const item = await db.inventory.get(id);
    if (!item) throw new Error('Inventory item not found');
    
    const newQty = item.quantity + additionalQty;
    return await db.inventory.update(id, { quantity: newQty });
  },

  async updateQuantity(id: number, delta: number) {
    const item = await db.inventory.get(id);
    if (!item) throw new Error('Inventory item not found');
    
    const newQty = item.quantity + delta;
    if (newQty < 0) throw new Error(`Insufficient stock for "${item.name}"`);
    
    return await db.inventory.update(id, { quantity: newQty });
  },

  async upsert(data: Omit<InventoryItem, 'id'>, id?: number) {
    const validated = InventoryItemSchema.parse(data);
    if (id) {
      return await db.inventory.update(id, validated);
    } else {
      return await db.inventory.add(validated as InventoryItem);
    }
  },

  async getAllByContext(context: 'personal' | 'business') {
    return await db.inventory.where('context').equals(context).toArray();
  },

  async delete(id: number) {
    const item = await db.inventory.get(id);
    if (!item) throw new Error('Item not found');
    return await db.inventory.delete(id);
  },

  async getByContext(context: 'personal' | 'business') {
    return await db.inventory.where('context').equals(context).toArray();
  },

  async getAll() {
    return await db.inventory.toArray();
  },

  async hasLowStock(context: 'personal' | 'business') {
    const items = await this.getByContext(context);
    return items.some(i => i.quantity <= i.minQuantity);
  },

  async search(query: string, context: 'personal' | 'business') {
    const q = query.toLowerCase();
    const items = await this.getByContext(context);
    return items.filter(i => i.name.toLowerCase().includes(q));
  }
};
