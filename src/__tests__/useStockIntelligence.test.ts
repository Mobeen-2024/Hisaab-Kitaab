import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateGlobalStockIntelligence } from '../hooks/useStockIntelligence';
import { db } from '../db';

vi.mock('../db', () => ({
  db: {
    inventory: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      toArray: vi.fn()
    },
    invoices: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      toArray: vi.fn()
    }
  }
}));

describe('calculateGlobalStockIntelligence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calculates velocity and margins correctly', async () => {
    const mockItems = [
      { id: 1, name: 'Dead Item', quantity: 10, unitPrice: 100, costPrice: 80, minQuantity: 2 },
      { id: 2, name: 'Fast Item', quantity: 50, unitPrice: 200, costPrice: 100, minQuantity: 10 },
      { id: 3, name: 'Slow Item', quantity: 20, unitPrice: 150, costPrice: 100, minQuantity: 5 },
      { id: 4, name: 'Margin Warning', quantity: 5, unitPrice: 105, costPrice: 100, minQuantity: 2 }
    ];

    const mockInvoices = [
      { items: [{ itemId: 2, quantity: 15 }] },
      { items: [{ itemId: 3, quantity: 1 }] },
      { items: [{ itemId: 4, quantity: 2 }] }
    ];

    (db.inventory.toArray as any).mockResolvedValue(mockItems);
    (db.invoices.toArray as any).mockResolvedValue(mockInvoices);

    const result = await calculateGlobalStockIntelligence('business', mockItems as any, mockInvoices as any);

    expect(result).toHaveLength(4);

    // Dead item (0 sales, quantity > 0)
    expect(result[0].intelligence.velocity).toBe('dead_stock');
    expect(result[0].intelligence.salesLast30Days).toBe(0);

    // Fast item (top 80th percentile and sales >= 5)
    // Sales: Fast:15, Margin:2, Slow:1. Array: [1, 2, 15]. p80 is 15.
    expect(result[1].intelligence.velocity).toBe('fast_moving');
    expect(result[1].intelligence.salesLast30Days).toBe(15);
    
    // Slow item (bottom 20th percentile) -> p20 is 1.
    expect(result[2].intelligence.velocity).toBe('slow_moving');
    expect(result[2].intelligence.salesLast30Days).toBe(1);

    // Margin warning item (unit=105, cost=100 -> 5% margin)
    expect(result[3].intelligence.marginWarning).toBe(true);
    expect(result[3].intelligence.currentMarginPercent).toBe(5);
    expect(result[3].intelligence.suggestedPrice).toBe(120); // 100 * 1.20
  });

  it('handles items with no cost price gracefully', async () => {
    const mockItems = [
      { id: 1, name: 'No Cost', quantity: 10, unitPrice: 100, minQuantity: 2 } // no costPrice
    ];

    (db.inventory.toArray as any).mockResolvedValue(mockItems);
    (db.invoices.toArray as any).mockResolvedValue([]);

    const result = await calculateGlobalStockIntelligence('business', mockItems as any, []);

    expect(result[0].intelligence.marginWarning).toBe(false);
    expect(result[0].intelligence.currentMarginPercent).toBe(100);
    expect(result[0].intelligence.suggestedPrice).toBe(100);
  });
});
