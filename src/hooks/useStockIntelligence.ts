import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { InventoryItem } from '../models';
import { subDays } from 'date-fns';

export interface StockIntelligence {
  velocity: 'fast_moving' | 'slow_moving' | 'dead_stock' | 'normal';
  salesLast30Days: number;
  marginWarning: boolean;
  suggestedPrice: number;
  currentMarginPercent: number;
}

export type EnrichedInventoryItem = InventoryItem & { intelligence: StockIntelligence };

export async function calculateGlobalStockIntelligence(context: 'business' | 'personal'): Promise<EnrichedInventoryItem[]> {
  const items = await db.inventory.where('context').equals(context).toArray();
  
  const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
  
  const invoices = await db.invoices
    .where('context').equals(context)
    .filter(inv => inv.createdAt >= thirtyDaysAgo)
    .toArray();
      
  const salesMap = new Map<number, number>();
  for (const inv of invoices) {
    if (inv.items) {
      for (const line of inv.items) {
        if (line.itemId) {
          salesMap.set(line.itemId, (salesMap.get(line.itemId) || 0) + line.quantity);
        }
      }
    }
  }
  
  const salesArray = Array.from(salesMap.values()).filter(s => s > 0);
  salesArray.sort((a, b) => a - b);
  
  const p80 = salesArray.length > 0 ? salesArray[Math.floor(salesArray.length * 0.8)] : 0;
  const p20 = salesArray.length > 0 ? salesArray[Math.floor(salesArray.length * 0.2)] : 0;
  
  const enriched: EnrichedInventoryItem[] = items.map(item => {
    const sales = salesMap.get(item.id!) || 0;
    let velocity: StockIntelligence['velocity'] = 'normal';
    
    if (sales === 0 && item.quantity > 0) {
      velocity = 'dead_stock';
    } else if (sales > 0 && sales >= p80 && p80 > 0 && sales >= 5) {
      // Must sell at least 5 to be considered fast moving globally
      velocity = 'fast_moving';
    } else if (sales > 0 && sales <= p20) {
      velocity = 'slow_moving';
    }
    
    const costPrice = item.costPrice || 0;
    const currentMargin = costPrice > 0 ? ((item.unitPrice - costPrice) / costPrice) * 100 : 100;
    const marginWarning = costPrice > 0 && currentMargin < 10;
    const suggestedPrice = costPrice > 0 ? Math.ceil(costPrice * 1.20) : item.unitPrice;
    
    return {
      ...item,
      intelligence: {
        velocity,
        salesLast30Days: sales,
        marginWarning,
        suggestedPrice,
        currentMarginPercent: currentMargin
      }
    };
  });
  
  return enriched;
}

export function useGlobalStockIntelligence(context: 'business' | 'personal') {
  return useLiveQuery(() => calculateGlobalStockIntelligence(context), [context], []);
}
