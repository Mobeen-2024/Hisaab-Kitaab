import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { db } from '../../db';
import { TransactionService } from '../TransactionService';
import { CustomerService } from '../CustomerService';

describe('TransactionService Tests', () => {
  const originalConsoleError = console.error;

  beforeEach(async () => {
    console.error = (...args: any[]) => {
      const msg = args.join(' ');
      if (msg.includes('NotFoundError') || msg.includes('DatabaseClosedError')) return;
      originalConsoleError(...args);
    };

    db.close();
    await Dexie.delete('HisaibKItaibDB');
    await db.open();

    await db.transactions.clear();
    await db.customers.clear();
    await db.categories.clear();

    await db.categories.bulkAdd([
      { id: 1, name: 'Sales', type: 'income', context: 'business' },
      { id: 2, name: 'Groceries', type: 'expense', context: 'personal' },
    ]);
  });

  afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    db.close();
    console.error = originalConsoleError;
  });

  it('adds and validates transactions using Zod schemas', async () => {
    const txId = await TransactionService.add({
      amount: 1500,
      type: 'income',
      categoryId: 1,
      context: 'business',
      date: '2026-06-02',
      description: 'Test Business Income',
      paymentMethod: 'cash'
    });

    expect(txId).toBeDefined();
    const saved = await db.transactions.get(txId);
    expect(saved?.amount).toBe(1500);
    expect(saved?.type).toBe('income');
  });

  it('strictly isolates transactions by context', async () => {
    await TransactionService.add({
      amount: 1000,
      type: 'income',
      categoryId: 1,
      context: 'business',
      date: '2026-06-02',
      description: 'Biz Tx',
      paymentMethod: 'cash'
    });

    await TransactionService.add({
      amount: 250,
      type: 'expense',
      categoryId: 2,
      context: 'personal',
      date: '2026-06-02',
      description: 'Groceries',
      paymentMethod: 'cash'
    });

    const bizOnly = await TransactionService.getByContext('business');
    const personalOnly = await TransactionService.getByContext('personal');

    expect(bizOnly.length).toBe(1);
    expect(bizOnly[0].description).toBe('Biz Tx');

    expect(personalOnly.length).toBe(1);
    expect(personalOnly[0].description).toBe('Groceries');
  });

  it('avoids inserting duplicate importReferenceId during bulkAdd', async () => {
    // Add an existing transaction with reference ID
    await TransactionService.add({
      amount: 500,
      type: 'expense',
      categoryId: 2,
      context: 'personal',
      date: '2026-06-02',
      description: 'Item',
      paymentMethod: 'cash',
      importReferenceId: 'ref-123'
    });

    // Attempt bulk adding transactions, one duplicate reference and one new reference
    const inputList = [
      {
        amount: 500,
        type: 'expense',
        categoryId: 2,
        context: 'personal',
        date: '2026-06-02',
        description: 'Item',
        paymentMethod: 'cash',
        importReferenceId: 'ref-123'
      },
      {
        amount: 750,
        type: 'expense',
        categoryId: 2,
        context: 'personal',
        date: '2026-06-02',
        description: 'New Item',
        paymentMethod: 'cash',
        importReferenceId: 'ref-456'
      }
    ];

    // Filter duplicates exactly like ImportStatementModal.tsx
    const existingRefs = new Set(
      (await TransactionService.getByImportReferences(inputList.map(d => d.importReferenceId).filter(Boolean) as string[]))
      .map(t => t.importReferenceId)
    );

    const newTransactions = inputList.filter(t => 
      !t.importReferenceId || !existingRefs.has(t.importReferenceId)
    );

    expect(newTransactions.length).toBe(1);
    expect(newTransactions[0].importReferenceId).toBe('ref-456');

    if (newTransactions.length > 0) {
      await TransactionService.bulkAdd(newTransactions as any[]);
    }

    const allTxs = await db.transactions.toArray();
    expect(allTxs.length).toBe(2);
  });
});
