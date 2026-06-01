import { db, UdhaarEntry } from '../db';
import { UdhaarEntrySchema } from '../models';
import { CustomerService } from './CustomerService';
import { TransactionService } from './TransactionService';

export type UdhaarEntryInput = UdhaarEntry;

export const UdhaarService = {
  async getOrCreateUdhaarCategory(type: 'income' | 'expense', context: 'personal' | 'business') {
    const name = type === 'income' ? 'Udhaar Received' : 'Udhaar Given';
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

  async add(input: UdhaarEntryInput) {
    const validated = UdhaarEntrySchema.parse(input);
    const context = validated.context || 'business';

    // Create corresponding transaction
    // 'give' = lent money / paid supplier (Expense)
    // 'receive' = got payment / borrowed money (Income)
    const txType = validated.type === 'give' ? 'expense' : 'income';
    const cat = await this.getOrCreateUdhaarCategory(txType, context);

    const customer = await db.customers.get(validated.customerId);
    const customerName = customer ? customer.name : 'Unknown';
    const txDesc = validated.description
      ? `Udhaar (${validated.type === 'give' ? 'Given to' : 'Received from'} ${customerName}): ${validated.description}`
      : `Udhaar (${validated.type === 'give' ? 'Given to' : 'Received from'} ${customerName})`;

    const txId = await TransactionService.add({
      amount: validated.amount,
      type: txType,
      categoryId: cat.id!,
      context: context,
      date: validated.date,
      description: txDesc,
      customerId: validated.customerId,
      paymentMethod: 'cash',
      originalCurrency: validated.originalCurrency || 'PKR',
      originalAmount: validated.originalAmount || validated.amount,
      exchangeRate: validated.exchangeRate || 1,
      source: 'udhaar'
    });

    validated.transactionId = txId;
    validated.context = context;

    const id = await db.udhaarEntries.add(validated as UdhaarEntry);
    
    // Update the transaction's sourceId with the newly created UdhaarEntry ID
    await TransactionService.update(txId, { sourceId: id });
    
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
    
    if (entry.transactionId) {
      await TransactionService.delete(entry.transactionId).catch(console.error);
    }
    
    await db.udhaarEntries.delete(id);
    await CustomerService.syncBalance(entry.customerId);
  },

  async markAsCompleted(id: number) {
    const entry = await db.udhaarEntries.get(id);
    if (!entry) return;

    const result = await db.udhaarEntries.update(id, { isCompleted: true });
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
