import { db } from '../db';
import { InvoiceSchema } from '../models/schemas';
import type { Invoice } from '../db';
import { TransactionService } from './TransactionService';
import { InventoryService } from './InventoryService';

export const InvoiceService = {
  async getOrCreateSalesCategory(context: 'personal' | 'business') {
    const name = 'Sales / POS';
    const type = 'income';
    let cat = await db.categories
      .where('context')
      .equals(context)
      .and(c => c.type === type && c.name === name)
      .first();

    if (!cat) {
      const id = await db.categories.add({ name, type, context });
      cat = { id, name, type, context };
    }
    return cat;
  },

  async create(input: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) {
    const nowStr = new Date().toISOString();
    const validated = InvoiceSchema.parse({
      ...input,
      createdAt: nowStr,
      updatedAt: nowStr
    });

    return await db.transaction('rw', [db.invoices, db.transactions, db.inventory, db.categories, db.customers, db.auditLogs], async () => {
      let transactionId = validated.transactionId;

      // If it's an invoice (not a quotation) and it's paid, we might want to generate a transaction
      // For POS, we assume immediate payment (cash/card)
      if (validated.type === 'invoice' && !transactionId) {
        const cat = await this.getOrCreateSalesCategory(validated.context);
        
        transactionId = await TransactionService.add({
          amount: validated.total,
          type: 'income',
          categoryId: cat.id!,
          context: validated.context,
          date: new Date().toLocaleDateString('en-CA'),
          description: `POS Sale`,
          paymentMethod: 'cash',
          originalCurrency: 'PKR',
          originalAmount: validated.total,
          exchangeRate: 1,
          source: 'pos',
          customerId: validated.customerId > 0 ? validated.customerId : undefined
        });
      }

      const invoiceToSave = { ...validated, transactionId } as Invoice;
      const invoiceId = await db.invoices.add(invoiceToSave);

      // Deduct stock for all items
      if (validated.type === 'invoice' && validated.items) {
        for (const item of validated.items) {
          if (item.itemId) {
            try {
              // passing negative quantity to reduce stock
              await InventoryService.updateQuantity(item.itemId, -item.quantity);
            } catch (e) {
              console.warn(`Could not deduct stock for item ${item.itemId}:`, e);
              // Ignore insufficient stock errors for now, or throw to abort transaction
              // Let's allow negative stock or just ignore since we don't want to block a sale
              // Actually InventoryService throws if newQty < 0. We'll catch and ignore.
            }
          }
        }
      }

      return invoiceId;
    });
  },

  async getById(id: number) {
    return await db.invoices.get(id);
  },

  async getAllByContext(context: 'personal' | 'business') {
    return await db.invoices.where('context').equals(context).reverse().toArray();
  },
  
  async delete(id: number) {
    // Note: This does not revert stock or delete the associated transaction currently
    return await db.invoices.delete(id);
  }
};
