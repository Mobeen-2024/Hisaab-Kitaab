/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../db';
import { calculateUdhaarIntelligence } from '../hooks/useUdhaarIntelligence';
import { subDays, addDays } from 'date-fns';

describe('useUdhaarIntelligence logic', () => {
  beforeEach(async () => {
    // Clear the DB
    await db.customers.clear();
    await db.udhaarEntries.clear();
  });

  it('should return default intelligence if no customer found', async () => {
    const result = await calculateUdhaarIntelligence(999, 'Test');
    expect(result.riskLevel).toBe('low');
    expect(result.recommendedCreditLimit).toBe(5000);
  });

  it('should calculate correct logic for on-time customer', async () => {
    const customerId = await db.customers.add({ 
      name: 'Ali', phone: '123', balance: 0, type: 'customer', 
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    });
    
    await db.udhaarEntries.add({
      customerId, amount: 1000, type: 'give', date: new Date().toISOString(), 
      dueDate: addDays(new Date(), 5).toISOString(), isCompleted: false, context: 'business', 
      originalCurrency: 'PKR', originalAmount: 1000, exchangeRate: 1, description: '', 
      updatedAt: new Date().toISOString()
    });

    const result = await calculateUdhaarIntelligence(customerId, 'Ali');
    expect(result.overdueAmount).toBe(0);
    expect(result.riskLevel).toBe('low');
    expect(result.recommendedCreditLimit).toBe(5000);
  });

  it('should identify high risk overdue customer using FIFO', async () => {
    const customerId = await db.customers.add({ 
      name: 'Zaid', phone: '123', balance: 6000, type: 'customer', 
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), 
      initialBalance: 1000
    });
    
    // Give 5000 20 days ago, due 15 days ago
    await db.udhaarEntries.add({
      customerId, amount: 5000, type: 'give', date: subDays(new Date(), 20).toISOString(), 
      dueDate: subDays(new Date(), 15).toISOString(), isCompleted: false, context: 'business', 
      originalCurrency: 'PKR', originalAmount: 5000, exchangeRate: 1, description: '', 
      updatedAt: new Date().toISOString()
    });

    const result = await calculateUdhaarIntelligence(customerId, 'Zaid');
    expect(result.overdueAmount).toBe(5000); 
    expect(result.maxOverdueDays).toBe(15);
    expect(result.riskLevel).toBe('high');
    expect(result.recommendedCreditLimit).toBe(0);
    expect(result.paymentBehavior).toBe('Frequently late or severely overdue');
  });

  it('should calculate recommended credit limit correctly with paid back entries', async () => {
     const customerId = await db.customers.add({ 
       name: 'Sara', phone: '123', balance: 0, type: 'customer', 
       createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
     });
     
     await db.udhaarEntries.add({ 
       customerId, amount: 10000, type: 'receive', date: new Date().toISOString(), 
       isCompleted: true, context: 'business', originalCurrency: 'PKR', 
       originalAmount: 10000, exchangeRate: 1, description: '', 
       updatedAt: new Date().toISOString() 
     });
     
     const result = await calculateUdhaarIntelligence(customerId, 'Sara');
     expect(result.recommendedCreditLimit).toBe(6000);
  });
});
