import { describe, it, expect } from 'vitest';
import { calculateAICoachData } from '../hooks/useAICoachData';
import { Invoice, Transaction, UdhaarEntry, InventoryItem, RepairJob } from '../models/schemas';

describe('useAICoachData', () => {
  it('correctly aggregates business metrics across all modules', () => {
    const mockInvoices: Partial<Invoice>[] = [
      {
        id: 1,
        type: 'invoice',
        total: 1500,
        createdAt: '2023-01-01T10:00:00Z',
        items: [
          { id: '1', itemId: 1, quantity: 2, unitPrice: 750, name: 'Item 1' }
        ]
      }
    ];

    const mockInventory: Partial<InventoryItem>[] = [
      { id: 1, name: 'Item 1', quantity: 10, costPrice: 500, minQuantity: 2 },
      { id: 2, name: 'Item 2', quantity: 5, costPrice: 200, minQuantity: 1 } // Total inv value = (10*500) + (5*200) = 5000 + 1000 = 6000
    ];

    // Profit from invoice = (750 - 500) * 2 = 500

    const mockTransactions: Partial<Transaction>[] = [
      { id: 1, type: 'expense', amount: 300, date: '2023-01-01T12:00:00Z', categoryId: 1, context: 'business' }
    ];

    const mockUdhaarEntries: Partial<UdhaarEntry>[] = [
      { id: 1, type: 'give', amount: 1000, date: '2023-01-01T10:00:00Z', customerId: 1, context: 'business' },
      { id: 2, type: 'take', amount: 400, date: '2023-01-01T11:00:00Z', customerId: 2, context: 'business' }
    ];

    const mockRepairs: Partial<RepairJob>[] = [
      { id: 1, status: 'pending', estimatedCost: 2000 },
      { id: 2, status: 'ready', estimatedCost: 1500 }
    ];

    const result = calculateAICoachData(
      mockInvoices as Invoice[],
      mockTransactions as Transaction[],
      mockUdhaarEntries as UdhaarEntry[],
      mockInventory as InventoryItem[],
      mockRepairs as RepairJob[]
    );

    expect(result.totalSales).toBe(1500);
    expect(result.profitEstimate).toBe(500);
    expect(result.totalExpenses).toBe(300);
    expect(result.totalReceivables).toBe(1000);
    expect(result.totalPayables).toBe(400);
    expect(result.inventoryValue).toBe(6000);
    expect(result.pendingRepairsValue).toBe(2000);
  });
});
