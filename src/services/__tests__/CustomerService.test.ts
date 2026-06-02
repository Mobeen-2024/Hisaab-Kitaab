import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../db';
import { CustomerService } from '../CustomerService';
import { UdhaarService } from '../UdhaarService';
import { TransactionService } from '../TransactionService';

describe('Customer and Supplier Balance Calculations', () => {
  beforeEach(async () => {
    // Clear databases before each test
    await db.customers.clear();
    await db.udhaarEntries.clear();
    await db.transactions.clear();
    await db.categories.clear();
    
    // Seed some basic categories needed by Udhaar
    await db.categories.bulkAdd([
      { name: 'Daily Milk Sales', type: 'income', context: 'business' },
      { name: 'Retail Shop', type: 'income', context: 'business' },
      { name: 'Salary', type: 'income', context: 'personal' },
      { name: 'Groceries', type: 'expense', context: 'personal' },
      { name: 'Utility Bills (Bijli/Sui Gas)', type: 'expense', context: 'personal' },
      { name: 'Transport', type: 'expense', context: 'personal' },
      { name: 'Cattle Feed (Chara)', type: 'expense', context: 'business' },
    ]);
  });

  it('calculates correct balance for a customer starting with 0 balance', async () => {
    const customerId = await CustomerService.add({
      name: 'Test Customer',
      phone: '1234567890',
      balance: 0,
      createdAt: new Date().toISOString(),
      type: 'customer'
    });

    const customer = await db.customers.get(customerId);
    expect(customer?.balance).toBe(0);
  });

  it('calculates correct balance with initial balance', async () => {
    const customerId = await CustomerService.add({
      name: 'Test Customer',
      phone: '1234567890',
      balance: 500,
      initialBalance: 500,
      createdAt: new Date().toISOString(),
      type: 'customer'
    });

    const customer = await db.customers.get(customerId);
    expect(customer?.balance).toBe(500);
  });

  it('handles giving Udhaar and receiving payments for a customer', async () => {
    const customerId = await CustomerService.add({
      name: 'Ali',
      phone: '12345',
      balance: 0,
      createdAt: new Date().toISOString(),
      type: 'customer'
    });

    // Give Udhaar
    await UdhaarService.add({
      customerId,
      type: 'give',
      amount: 1000,
      date: new Date().toISOString().split('T')[0],
      description: 'Lent money',
      context: 'business'
    });

    let customer = await db.customers.get(customerId);
    expect(customer?.balance).toBe(1000);

    // Receive Payment
    await TransactionService.add({
      amount: 400,
      type: 'income',
      categoryId: 1, // Sales
      context: 'business',
      date: new Date().toISOString().split('T')[0],
      description: 'Ali payment',
      customerId
    });

    customer = await db.customers.get(customerId);
    expect(customer?.balance).toBe(600); // 1000 - 400
  });

  it('correctly calculates supplier balance when receiving Udhaar and paying supplier', async () => {
    const supplierId = await CustomerService.add({
      name: 'Supplier Khan',
      phone: '54321',
      balance: 0,
      createdAt: new Date().toISOString(),
      type: 'supplier'
    });

    // Receive Udhaar (take goods on credit)
    await UdhaarService.add({
      customerId: supplierId,
      type: 'receive',
      amount: 2000,
      date: new Date().toISOString().split('T')[0],
      description: 'Got stock on credit',
      context: 'business'
    });

    let supplier = await db.customers.get(supplierId);
    expect(supplier?.balance).toBe(-2000); // We owe 2000

    // Pay Supplier (expense transaction)
    await TransactionService.add({
      amount: 1500,
      type: 'expense',
      categoryId: 7, // Cattle Feed Expense or similar
      context: 'business',
      date: new Date().toISOString().split('T')[0],
      description: 'Paid cash to Khan',
      customerId: supplierId
    });

    supplier = await db.customers.get(supplierId);
    expect(supplier?.balance).toBe(-500); // We paid 1500, so we only owe 500 now.
  });

  it('recalculates balance correctly when an Udhaar entry is deleted', async () => {
    const customerId = await CustomerService.add({
      name: 'Zahid',
      phone: '999',
      balance: 0,
      createdAt: new Date().toISOString(),
      type: 'customer'
    });

    const udhaarId = await UdhaarService.add({
      customerId,
      type: 'give',
      amount: 1500,
      date: new Date().toISOString().split('T')[0],
      description: 'Lent money',
      context: 'business'
    });

    let customer = await db.customers.get(customerId);
    expect(customer?.balance).toBe(1500);

    // Delete Udhaar
    await UdhaarService.delete(udhaarId);

    customer = await db.customers.get(customerId);
    expect(customer?.balance).toBe(0);
  });
});
