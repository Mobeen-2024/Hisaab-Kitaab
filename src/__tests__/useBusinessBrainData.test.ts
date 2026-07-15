/**
 * @vitest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { useBusinessBrainData } from '../hooks/useBusinessBrainData';
import * as useData from '../hooks/useData';
import { subDays, subWeeks, startOfWeek } from 'date-fns';
import { vi, describe, beforeEach, it, expect } from 'vitest';

vi.mock('../hooks/useData', () => ({
  useTransactions: vi.fn(),
  useCustomers: vi.fn(),
  useUdhaarEntries: vi.fn(),
  useInventory: vi.fn(),
}));

describe('useBusinessBrainData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return default values when no data exists', () => {
    (useData.useTransactions as ReturnType<typeof vi.fn>).mockReturnValue([]);
    (useData.useCustomers as ReturnType<typeof vi.fn>).mockReturnValue([]);
    (useData.useUdhaarEntries as ReturnType<typeof vi.fn>).mockReturnValue([]);
    (useData.useInventory as ReturnType<typeof vi.fn>).mockReturnValue([]);

    const { result } = renderHook(() => useBusinessBrainData('business'));

    expect(result.current.healthScore).toBe(65); // 50 base + 10 positive cashflow + 5 no severe overdue
    expect(result.current.actionList).toEqual([]);
    expect(result.current.profitLeaks).toEqual([]);
    expect(result.current.udhaarRisks).toEqual([]);
    expect(result.current.lowStockItems).toBe(0);
    expect(result.current.cashflowWarning).toBe(false);
  });

  it('should identify cashflow warning and profit leaks', () => {
    const now = new Date();
    const past2Weeks = subWeeks(now, 2); // 2 weeks ago

    // Mock transactions
    (useData.useTransactions as ReturnType<typeof vi.fn>).mockReturnValue([
      // High expense this week in category 1
      { id: 1, type: 'expense', categoryId: 1, amount: 2000, date: now.toISOString(), context: 'business' },
      // Previous expenses in category 1
      { id: 2, type: 'expense', categoryId: 1, amount: 1000, date: past2Weeks.toISOString(), context: 'business' },
      // Income this week
      { id: 3, type: 'income', categoryId: 2, amount: 500, date: now.toISOString(), context: 'business' }
    ]);
    (useData.useCustomers as ReturnType<typeof vi.fn>).mockReturnValue([]);
    (useData.useUdhaarEntries as ReturnType<typeof vi.fn>).mockReturnValue([]);
    (useData.useInventory as ReturnType<typeof vi.fn>).mockReturnValue([]);

    const { result } = renderHook(() => useBusinessBrainData('business'));

    expect(result.current.cashflowWarning).toBe(true); // 2000 expense > 500 income
    expect(result.current.profitLeaks.length).toBe(1);
    expect(result.current.profitLeaks[0].categoryId).toBe(1);
    expect(result.current.profitLeaks[0].percentageIncrease).toBeGreaterThan(20);
  });

  it('should identify udhaar risks and action items', () => {
    const now = new Date();
    const overdueDate = subDays(now, 10).toISOString();
    const dueDateTomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    (useData.useTransactions as ReturnType<typeof vi.fn>).mockReturnValue([]);
    (useData.useCustomers as ReturnType<typeof vi.fn>).mockReturnValue([
      { id: 1, name: 'Customer A', balance: 1000, type: 'customer' }
    ]);
    (useData.useUdhaarEntries as ReturnType<typeof vi.fn>).mockReturnValue([
      { id: 101, customerId: 1, amount: 1000, isCompleted: false, dueDate: overdueDate, context: 'business' },
      { id: 102, customerId: 1, amount: 200, isCompleted: false, dueDate: dueDateTomorrow, context: 'business' }
    ]);
    (useData.useInventory as ReturnType<typeof vi.fn>).mockReturnValue([]);

    const { result } = renderHook(() => useBusinessBrainData('business'));

    expect(result.current.actionList.length).toBe(2);
    expect(result.current.actionList[0].urgent).toBe(true); // The 10 day overdue one should be urgent
    expect(result.current.udhaarRisks.length).toBe(1); // 10 days overdue, >500 amount
    expect(result.current.udhaarRisks[0].customerId).toBe(1);
  });

  it('should identify low stock items', () => {
    (useData.useTransactions as ReturnType<typeof vi.fn>).mockReturnValue([]);
    (useData.useCustomers as ReturnType<typeof vi.fn>).mockReturnValue([]);
    (useData.useUdhaarEntries as ReturnType<typeof vi.fn>).mockReturnValue([]);
    (useData.useInventory as ReturnType<typeof vi.fn>).mockReturnValue([
      { id: 1, name: 'Item A', quantity: 5, minStockLevel: 10, context: 'business' },
      { id: 2, name: 'Item B', quantity: 20, minStockLevel: 10, context: 'business' }
    ]);

    const { result } = renderHook(() => useBusinessBrainData('business'));

    expect(result.current.lowStockItems).toBe(1);
    expect(result.current.actionList.some(a => a.type === 'low_stock')).toBe(true);
  });
});
