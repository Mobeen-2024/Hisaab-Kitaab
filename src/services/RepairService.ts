import { db } from '../db';
import { RepairJobSchema } from '../models/schemas';
import type { RepairJob } from '../db';
import { TransactionService } from './TransactionService';
import { InvoiceService } from './InvoiceService';

export const RepairService = {
  async add(input: Omit<RepairJob, 'id' | 'createdAt' | 'updatedAt'>) {
    const nowStr = new Date().toISOString();
    const validated = RepairJobSchema.parse({
      ...input,
      createdAt: nowStr,
      updatedAt: nowStr
    });
    
    return await db.repairJobs.add(validated as RepairJob);
  },

  async update(id: number, input: Partial<RepairJob>) {
    const validated = RepairJobSchema.partial().parse({
      ...input,
      updatedAt: new Date().toISOString()
    });
    
    return await db.repairJobs.update(id, validated);
  },

  async getAllByContext(context: 'personal' | 'business') {
    return await db.repairJobs.where('context').equals(context).reverse().toArray();
  },

  async deliverAndPay(id: number) {
    return await db.transaction('rw', [db.repairJobs, db.transactions, db.categories, db.customers, db.auditLogs], async () => {
      const job = await db.repairJobs.get(id);
      if (!job) throw new Error('Repair job not found');
      if (job.status === 'delivered') throw new Error('Already delivered');

      const cat = await InvoiceService.getOrCreateSalesCategory(job.context);

      const transactionId = await TransactionService.add({
        amount: job.estimatedCost,
        type: 'income',
        categoryId: cat.id!,
        context: job.context,
        date: new Date().toLocaleDateString('en-CA'),
        description: `Repair Job: ${job.deviceModel} - ${job.issueDescription}`,
        paymentMethod: 'cash',
        originalCurrency: 'PKR',
        originalAmount: job.estimatedCost,
        exchangeRate: 1,
        source: 'repair',
        sourceId: job.id,
        customerId: job.customerId > 0 ? job.customerId : undefined
      });

      await db.repairJobs.update(id, {
        status: 'delivered',
        transactionId,
        updatedAt: new Date().toISOString()
      });

      return transactionId;
    });
  },

  async delete(id: number) {
    return await db.repairJobs.delete(id);
  }
};
