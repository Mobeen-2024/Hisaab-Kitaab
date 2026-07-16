import { db, InventoryItem } from '../db';
import { InventoryItemSchema } from '../models/schemas';
import { TransactionService } from './TransactionService';
import { CategoryService } from './CategoryService';

export type InventoryItemInput = InventoryItem;

export const HisaibInventoryService = {
  async getOrCreateInventoryCategory(context: 'personal' | 'business') {
    const name = 'Inventory Restock';
    const type = 'expense';
    return await CategoryService.getOrCreateSystemCategory(name, type, context);
  }
};

export const InventoryService = {
  async add(input: Omit<InventoryItem, 'id'>) {
    const validated = InventoryItemSchema.parse({
      ...input,
      updatedAt: new Date().toISOString()
    });
    return await db.inventory.add(validated as InventoryItem);
  },

  async restock(id: number, additionalQty: number, context: 'personal' | 'business' = 'business') {
    if (!Number.isFinite(additionalQty) || additionalQty <= 0)
      throw new Error('Invalid quantity provided for restock');
      
    return await db.transaction('rw', [db.inventory, db.transactions, db.categories, db.auditLogs], async () => {
      const item = await db.inventory.get(id);
      if (!item) throw new Error('Inventory item not found');
      
      // Add Expense Transaction
      const cat = await HisaibInventoryService.getOrCreateInventoryCategory(context);
      const purchaseCost = item.costPrice ?? item.unitPrice;
      const cost = additionalQty * purchaseCost;
      
      await TransactionService.add({
        amount: cost,
        type: 'expense',
        categoryId: cat.id!,
        context: context,
        date: new Date().toLocaleDateString('en-CA'),
        description: `Restocked ${additionalQty} x ${item.name} @ Rs ${purchaseCost}`,
        paymentMethod: 'cash',
        originalCurrency: 'PKR',
        originalAmount: cost,
        exchangeRate: 1,
        source: 'inventory',
        sourceId: item.id
      });

      const newQty = item.quantity + additionalQty;
      return await db.inventory.update(id, { 
        quantity: newQty,
        updatedAt: new Date().toISOString()
      });
    });
  },

  async updateQuantity(id: number, delta: number) {
    const item = await db.inventory.get(id);
    if (!item) throw new Error('Inventory item not found');
    
    const newQty = item.quantity + delta;
    if (newQty < 0) throw new Error(`Insufficient stock for "${item.name}"`);
    
    return await db.inventory.update(id, { 
      quantity: newQty,
      updatedAt: new Date().toISOString()
    });
  },

  async upsert(data: Omit<InventoryItem, 'id'>, id?: number) {
    const validated = InventoryItemSchema.parse(data);
    const nowStr = new Date().toISOString();
    if (id) {
      return await db.inventory.update(id, {
        ...validated,
        updatedAt: nowStr
      });
    } else {
      return await db.inventory.add({
        ...(validated as InventoryItem),
        updatedAt: nowStr
      });
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
    const count = await db.inventory
      .where('context')
      .equals(context)
      .filter(i => i.quantity <= i.minQuantity)
      .count();
    return count > 0;
  },

  async search(query: string, context: 'personal' | 'business') {
    const q = query.toLowerCase();
    return await db.inventory
      .where('context')
      .equals(context)
      .filter(i => i.name.toLowerCase().includes(q))
      .limit(200)
      .toArray();
  }
};
