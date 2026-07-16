import { describe, it, expect } from 'vitest';
import { calculateDailyClosingData } from '../hooks/useDailyClosingData';
import { Invoice, Transaction, UdhaarEntry, InventoryItem, RepairJob, Warranty } from '../models';

describe('calculateDailyClosingData', () => {
  it('correctly aggregates daily totals from all modules', () => {
    const todayStartMs = new Date('2026-07-16T00:00:00Z').getTime();

    // Setup dummy data
    const invoices: Invoice[] = [
      {
        id: 1,
        customerId: 1,
        type: 'invoice',
        subtotal: 30,
        tax: 0,
        discount: 0,
        total: 30,
        createdAt: '2026-07-16T10:00:00Z',
        context: 'business',
        items: [
          { itemId: 101, description: 'Product A', quantity: 2, unitPrice: 15, total: 30 }
        ]
      },
      {
        // Yesterday's invoice, should be ignored
        id: 2,
        customerId: 1,
        type: 'invoice',
        subtotal: 100,
        tax: 0,
        discount: 0,
        total: 100,
        createdAt: '2026-07-15T10:00:00Z',
        context: 'business'
      }
    ];

    const inventory: InventoryItem[] = [
      {
        id: 101,
        name: 'Product A',
        category: 'Test',
        quantity: 5,
        minQuantity: 10, // low stock
        costPrice: 10,
        unitPrice: 15,
        context: 'business'
      },
      {
        id: 102,
        name: 'Product B',
        category: 'Test',
        quantity: 20,
        minQuantity: 5, // normal
        unitPrice: 50,
        context: 'business'
      }
    ];

    const transactions: Transaction[] = [
      {
        id: 1,
        type: 'income',
        amount: 30,
        date: '2026-07-16T10:00:00Z',
        description: 'Test income',
        context: 'business',
        categoryId: 1
      },
      {
        id: 2,
        type: 'expense',
        amount: 5,
        date: '2026-07-16T12:00:00Z',
        description: 'Test expense',
        context: 'business',
        categoryId: 2
      }
    ];

    const udhaar: UdhaarEntry[] = [
      {
        id: 1,
        customerId: 1,
        type: 'give',
        amount: 50,
        date: '2026-07-16T11:00:00Z',
        dueDate: '2026-08-01',
        description: 'Test give',
        context: 'business',
        isCompleted: false
      },
      {
        id: 2,
        customerId: 2,
        type: 'receive',
        amount: 20,
        date: '2026-07-16T13:00:00Z',
        dueDate: '',
        description: 'Test receive',
        context: 'business',
        isCompleted: true
      }
    ];

    const repairs: RepairJob[] = [
      {
        id: 1,
        customerId: 1,
        deviceModel: 'Phone',
        issueDescription: 'Screen',
        status: 'pending',
        estimatedCost: 100,
        createdAt: '2026-07-15T00:00:00Z',
        context: 'business'
      },
      {
        id: 2,
        customerId: 2,
        deviceModel: 'Phone 2',
        issueDescription: 'Battery',
        status: 'delivered',
        estimatedCost: 50,
        createdAt: '2026-07-16T00:00:00Z',
        context: 'business'
      }
    ];

    const warranties: Warranty[] = [
      {
        id: 1,
        itemId: 101,
        customerId: 1,
        serialNumber: 'SN123',
        saleDate: '2026-06-18T00:00:00Z',
        warrantyMonths: 1, // 30 days -> expires ~2026-07-18
        status: 'active',
        context: 'business'
      }
    ];

    const result = calculateDailyClosingData(
      invoices,
      transactions,
      udhaar,
      inventory,
      repairs,
      warranties,
      todayStartMs
    );

    // Sales: Invoice 1 total is 30
    expect(result.todaySales).toBe(30);

    // Profit: 2 qty * (15 unitPrice - 10 costPrice) = 10
    expect(result.profitEstimate).toBe(10);

    // Expenses: Transaction 2 is 5
    expect(result.todayExpenses).toBe(5);

    // Cash: Income (30) - Expense (5) = 25
    expect(result.cashExpected).toBe(25);

    // Udhaar Given (50) & Received (20)
    expect(result.udhaarGiven).toBe(50);
    expect(result.udhaarReceived).toBe(20);

    // Low Stock: Product A (5 <= 10)
    expect(result.lowStockCount).toBe(1);

    // Pending Repairs: 1
    expect(result.pendingRepairs).toBe(1);

    // Active Warranties: 1 (saleDate + 30 days is 2026-07-18, expiring within 7 days of 2026-07-16)
    expect(result.activeWarranties).toBe(1);
  });
});
