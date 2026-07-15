import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { db } from '../../db';
import { RepairService } from '../RepairService';
import { CustomerService } from '../CustomerService';

vi.mock('../FirebaseSyncService', () => ({
  FirebaseSyncService: {
    triggerQueueProcessing: vi.fn(),
  }
}));

// Mock TransactionService to return a fake transaction ID — this avoids the 
// Dexie live-query cache middleware issue with compound rw transactions in fake-indexeddb.
vi.mock('../TransactionService', () => ({
  TransactionService: {
    add: vi.fn().mockResolvedValue(42),
  }
}));

// Mock InvoiceService.getOrCreateSalesCategory to return a fake category
vi.mock('../InvoiceService', () => ({
  InvoiceService: {
    getOrCreateSalesCategory: vi.fn().mockResolvedValue({ id: 1, name: 'Sales / POS', type: 'income', context: 'business' }),
  }
}));

import { TransactionService } from '../TransactionService';

const suppressDbErrors = (originalFn: (...args: any[]) => void) =>
  (...args: any[]) => {
    const msg = args.join(' ');
    if (msg.includes('NotFoundError') || msg.includes('DatabaseClosedError')) return;
    originalFn(...args);
  };

describe('RepairService regression tests', () => {
  const originalConsoleError = console.error;

  beforeEach(async () => {
    console.error = suppressDbErrors(originalConsoleError);

    try { db.close(); } catch { /* ignore */ }
    await Dexie.delete('HisaibKItaibDB');
    db.isImporting = true;
    await db.open();
    db.isImporting = false;

    await new Promise(resolve => setTimeout(resolve, 50));
    vi.clearAllMocks();
    vi.mocked(TransactionService.add).mockResolvedValue(42);
  });

  afterEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    console.error = originalConsoleError;
  });

  afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    try { db.close(); } catch { /* ignore */ }
  });

  it('creates a repair job with pending status', async () => {
    const custId = await CustomerService.add({
      name: 'Test Customer',
      phone: '0300-0000000',
      balance: 0,
      createdAt: new Date().toISOString(),
      type: 'customer',
    });

    const jobId = await RepairService.add({
      customerId: custId,
      deviceModel: 'Samsung Galaxy S10',
      issueDescription: 'Screen cracked',
      status: 'pending',
      estimatedCost: 5000,
      context: 'business',
    });

    expect(jobId).toBeDefined();
    const job = await db.repairJobs.get(jobId);
    expect(job?.status).toBe('pending');
    expect(job?.transactionId).toBeUndefined();
  });

  it('deliverAndPay creates income transaction once and sets status to delivered', async () => {
    const custId = await CustomerService.add({
      name: 'Repair Customer',
      phone: '0311-1111111',
      balance: 0,
      createdAt: new Date().toISOString(),
      type: 'customer',
    });

    const jobId = await RepairService.add({
      customerId: custId,
      deviceModel: 'iPhone 14',
      issueDescription: 'Battery replacement',
      status: 'pending',
      estimatedCost: 8000,
      context: 'business',
    });

    const txId = await RepairService.deliverAndPay(jobId);
    expect(txId).toBe(42); // Mocked transaction ID

    // Verify income transaction was requested with correct params
    expect(TransactionService.add).toHaveBeenCalledWith(expect.objectContaining({
      amount: 8000,
      type: 'income',
      source: 'repair',
      sourceId: jobId,
      customerId: custId,
    }));

    const job = await db.repairJobs.get(jobId);
    expect(job?.status).toBe('delivered');
    expect(job?.transactionId).toBe(42);
  });

  it('deliverAndPay throws if already delivered — prevents duplicate income', async () => {
    const custId = await CustomerService.add({
      name: 'No Dup Customer',
      phone: '0322-2222222',
      balance: 0,
      createdAt: new Date().toISOString(),
      type: 'customer',
    });

    const jobId = await RepairService.add({
      customerId: custId,
      deviceModel: 'Laptop',
      issueDescription: 'Keyboard fix',
      status: 'pending',
      estimatedCost: 3000,
      context: 'business',
    });

    // First delivery — should succeed
    await RepairService.deliverAndPay(jobId);

    // TransactionService.add must have been called exactly once
    expect(TransactionService.add).toHaveBeenCalledTimes(1);

    // Second delivery attempt — must throw, no second TransactionService.add call
    await expect(RepairService.deliverAndPay(jobId)).rejects.toThrow('Already delivered');

    // TransactionService.add still only called once
    expect(TransactionService.add).toHaveBeenCalledTimes(1);
  });

  it('changing status to ready does NOT create an income transaction', async () => {
    const custId = await CustomerService.add({
      name: 'Status Test Customer',
      phone: '0333-3333333',
      balance: 0,
      createdAt: new Date().toISOString(),
      type: 'customer',
    });

    const jobId = await RepairService.add({
      customerId: custId,
      deviceModel: 'Tablet',
      issueDescription: 'Touch screen repair',
      status: 'pending',
      estimatedCost: 4000,
      context: 'business',
    });

    // Status change to ready — no income should be created
    await RepairService.update(jobId, { status: 'ready' });

    const job = await db.repairJobs.get(jobId);
    expect(job?.status).toBe('ready');

    // TransactionService.add must NOT have been called
    expect(TransactionService.add).not.toHaveBeenCalled();
  });
});
