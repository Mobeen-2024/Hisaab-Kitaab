import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { db } from '../../db';
import { TransactionService } from '../TransactionService';
import { CustomerService } from '../CustomerService';

vi.mock('../FirebaseSyncService', () => ({
  FirebaseSyncService: {
    triggerQueueProcessing: vi.fn(),
  }
}));

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
    db.isImporting = true;
    await db.open();
    db.isImporting = false;

    db.isImporting = true;
    await db.transactions.clear();
    await db.customers.clear();
    await db.categories.clear();

    db.isImporting = true;
    await db.categories.bulkAdd([
      { id: 1, name: 'Sales', type: 'income', context: 'business' },
      { id: 2, name: 'Groceries', type: 'expense', context: 'personal' },
    ]);
    db.isImporting = false;
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

  it('queues transactions for sync with exact shape and skips remote/import mode', async () => {
    const syncSpy = vi.spyOn(db.syncQueue, 'add');
    
    // 1. Normal local add
    const txId = await TransactionService.add({
      amount: 54,
      type: 'income',
      categoryId: 1,
      context: 'business',
      date: '2026-06-03',
      description: 'sync queue visibility test',
      paymentMethod: 'cash'
    });

    // Wait for async hooks to execute
    await new Promise(r => setTimeout(r, 100));

    // Verify it created a syncQueue item with correct shape
    expect(syncSpy).toHaveBeenCalled();
    const calls = syncSpy.mock.calls;
    
    const txCall = calls.find(call => call[0] && call[0].entityType === 'transactions');
    expect(txCall).toBeDefined();

    if (txCall) {
      const payload = txCall[0];
      expect(payload.action).toBe('UPSERT');
      expect(payload.timestamp).toBeDefined(); // Timestamp must exist
      expect(typeof payload.timestamp).toBe('string');
      expect(payload.remoteId).toBeDefined();
    }

    syncSpy.mockClear();

    // 2. Import mode does not queue
    db.isImporting = true;
    await TransactionService.add({
      amount: 100,
      type: 'income',
      categoryId: 1,
      context: 'business',
      date: '2026-06-03',
      description: 'Import test',
      paymentMethod: 'cash'
    });
    db.isImporting = false;
    
    await new Promise(r => setTimeout(r, 100));
    
    const importCalls = syncSpy.mock.calls.filter(call => call[0] && call[0].entityType === 'transactions');
    expect(importCalls.length).toBe(0);

    syncSpy.mockClear();

    // 3. Remote Sync mode does not queue
    await db.transaction('rw', db.transactions, async () => {
      if (Dexie.currentTransaction) {
        (Dexie.currentTransaction as any)._isRemoteSync = true;
      }
      await db.transactions.add({
        amount: 200,
        type: 'income',
        categoryId: 1,
        context: 'business',
        date: '2026-06-03',
        description: 'Remote Sync test',
        paymentMethod: 'cash'
      });
    });

    await new Promise(r => setTimeout(r, 100));

    const remoteCalls = syncSpy.mock.calls.filter(call => call[0] && call[0].entityType === 'transactions');
    expect(remoteCalls.length).toBe(0);
    
    syncSpy.mockRestore();
  });
});
