import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { db } from '../../db';
import { WarrantyService } from '../WarrantyService';
import { InventoryService } from '../InventoryService';
import { CustomerService } from '../CustomerService';

vi.mock('../FirebaseSyncService', () => ({
  FirebaseSyncService: {
    triggerQueueProcessing: vi.fn(),
  }
}));

describe('WarrantyService regression tests', () => {
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
    await db.warranties.clear();
    await db.inventory.clear();
    await db.customers.clear();
    db.isImporting = false;
  });

  afterEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 150));
  });

  afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    db.close();
    console.error = originalConsoleError;
  });

  it('creates a warranty with correct serial number and active status', async () => {
    const itemId = await InventoryService.add({
      name: 'Solar Panel 250W',
      category: 'Solar',
      quantity: 5,
      minQuantity: 1,
      unitPrice: 15000,
      costPrice: 12000,
      context: 'business',
    });

    const custId = await CustomerService.add({
      name: 'Solar Customer',
      phone: '0300-1234567',
      balance: 0,
      createdAt: new Date().toISOString(),
      type: 'customer',
    });

    const saleDate = new Date().toISOString().split('T')[0];
    const warrantyId = await WarrantyService.add({
      itemId,
      customerId: custId,
      serialNumber: 'SP-2026-001',
      saleDate,
      warrantyMonths: 24,
      status: 'active',
      context: 'business',
    });

    expect(warrantyId).toBeDefined();
    const warranty = await db.warranties.get(warrantyId);
    expect(warranty?.serialNumber).toBe('SP-2026-001');
    expect(warranty?.warrantyMonths).toBe(24);
    expect(warranty?.status).toBe('active');
  });

  it('getCalculatedStatus returns active for warranty within period', () => {
    const saleDate = new Date().toISOString().split('T')[0];
    const warranty = {
      id: 1,
      itemId: 1,
      customerId: 1,
      serialNumber: 'TEST-001',
      saleDate,
      warrantyMonths: 12,
      status: 'active' as const,
      context: 'business' as const,
    };
    expect(WarrantyService.getCalculatedStatus(warranty)).toBe('active');
  });

  it('getCalculatedStatus returns expired for past warranty', () => {
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 2);
    const saleDate = pastDate.toISOString().split('T')[0];

    const warranty = {
      id: 2,
      itemId: 1,
      customerId: 1,
      serialNumber: 'EXPIRED-001',
      saleDate,
      warrantyMonths: 12, // 1 year warranty but sold 2 years ago
      status: 'active' as const,
      context: 'business' as const,
    };
    expect(WarrantyService.getCalculatedStatus(warranty)).toBe('expired');
  });

  it('getCalculatedStatus returns claimed regardless of dates', () => {
    const saleDate = new Date().toISOString().split('T')[0];
    const warranty = {
      id: 3,
      itemId: 1,
      customerId: 1,
      serialNumber: 'CLAIMED-001',
      saleDate,
      warrantyMonths: 24,
      status: 'claimed' as const,
      context: 'business' as const,
    };
    expect(WarrantyService.getCalculatedStatus(warranty)).toBe('claimed');
  });
});
