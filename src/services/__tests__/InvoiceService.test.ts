import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { db } from '../../db';
import { InvoiceService } from '../InvoiceService';
import { CustomerService } from '../CustomerService';

vi.mock('../FirebaseSyncService', () => ({
  FirebaseSyncService: {
    triggerQueueProcessing: vi.fn(),
  }
}));

// Mock TransactionService to avoid live-query cache middleware issues in fake-indexeddb
vi.mock('../TransactionService', () => ({
  TransactionService: {
    add: vi.fn().mockResolvedValue(99),
  }
}));

// Mock InventoryService.updateQuantity to isolate the POS logic
vi.mock('../InventoryService', () => ({
  InventoryService: {
    add: vi.fn().mockResolvedValue(1),
    updateQuantity: vi.fn().mockResolvedValue(undefined),
  }
}));

import { TransactionService } from '../TransactionService';
import { InventoryService } from '../InventoryService';

const suppressDbErrors = (originalFn: (...args: any[]) => void) =>
  (...args: any[]) => {
    const msg = args.join(' ');
    if (msg.includes('NotFoundError') || msg.includes('DatabaseClosedError')) return;
    originalFn(...args);
  };

describe('InvoiceService (POS) regression tests', () => {
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
    vi.mocked(TransactionService.add).mockResolvedValue(99);
    vi.mocked(InventoryService.updateQuantity).mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    console.error = originalConsoleError;
  });

  afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    try { db.close(); } catch { /* ignore */ }
  });

  it('POS cash sale creates an income transaction and attempts stock deduction', async () => {
    const custId = await CustomerService.add({
      name: 'Walk-in Customer',
      phone: '',
      balance: 0,
      createdAt: new Date().toISOString(),
      type: 'customer',
    });

    const invoiceId = await InvoiceService.create({
      customerId: custId,
      type: 'invoice',
      subtotal: 1000,
      tax: 0,
      discount: 0,
      total: 1000,
      context: 'business',
      items: [
        {
          itemId: 1,
          description: 'Widget A',
          quantity: 2,
          unitPrice: 500,
          total: 1000,
        }
      ]
    });

    expect(invoiceId).toBeDefined();

    // Verify income transaction was created for the correct amount
    expect(TransactionService.add).toHaveBeenCalledWith(expect.objectContaining({
      amount: 1000,
      type: 'income',
      source: 'pos',
      customerId: custId,
    }));

    // Verify stock deduction was attempted for each item
    expect(InventoryService.updateQuantity).toHaveBeenCalledWith(1, -2);

    // Verify the invoice was saved
    const invoice = await db.invoices.get(invoiceId);
    expect(invoice?.total).toBe(1000);
    expect(invoice?.type).toBe('invoice');
    expect(invoice?.transactionId).toBe(99);
  });

  it('quotation does NOT create income transaction or deduct stock', async () => {
    const custId = await CustomerService.add({
      name: 'Quote Customer',
      phone: '',
      balance: 0,
      createdAt: new Date().toISOString(),
      type: 'customer',
    });

    const invoiceId = await InvoiceService.create({
      customerId: custId,
      type: 'quotation',
      subtotal: 2000,
      tax: 0,
      discount: 0,
      total: 2000,
      context: 'business',
      items: [
        {
          itemId: 2,
          description: 'Product X',
          quantity: 3,
          unitPrice: 667,
          total: 2000,
        }
      ]
    });

    const invoice = await db.invoices.get(invoiceId);
    expect(invoice?.type).toBe('quotation');

    // No income transaction for quotation
    expect(TransactionService.add).not.toHaveBeenCalled();

    // No stock deduction for quotation
    expect(InventoryService.updateQuantity).not.toHaveBeenCalled();
  });
});
