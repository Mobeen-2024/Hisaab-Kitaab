import { useLiveQuery } from 'dexie-react-hooks';
import type {
  Transaction,
  Customer,
  Category,
  UdhaarEntry,
  InventoryItem,
  Goal,
  Budget,
  AppSettings,
  AppUser,
  Message,
  AuditLog
} from '../models';
import { TransactionService } from '../services/TransactionService';
import { CustomerService } from '../services/CustomerService';
import { InventoryService } from '../services/InventoryService';
import { UdhaarService } from '../services/UdhaarService';
import { PlannerService } from '../services/PlannerService';
import { MessageService } from '../services/MessageService';
import { SettingsService } from '../services/SettingsService';
import { AuditService } from '../services/AuditService';
import { AppUserService } from '../services/AppUserService';
import { CategoryService } from '../services/CategoryService';
import { db } from '../db';

export function useTransactions(context?: 'personal' | 'business') {
  return useLiveQuery(
    () => {
      if (context) {
        return TransactionService.getByContext(context);
      }
      return TransactionService.getAll();
    },
    [context],
    [] as Transaction[]
  );
}

export function useMonthTransactions(context: 'personal' | 'business', month: string) {
  return useLiveQuery(
    () => {
      const startDate = `${month}-01`;
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + 1);
      const endDate = date.toISOString().split('T')[0];
      return TransactionService.getByDateRange(context, startDate, endDate, false);
    },
    [context, month],
    [] as Transaction[]
  );
}

export function useDateRangeTransactions(context: 'personal' | 'business', startDate: string, endDate: string, includeUpperBound = false) {
  return useLiveQuery(
    () => TransactionService.getByDateRange(context, startDate, endDate, includeUpperBound),
    [context, startDate, endDate, includeUpperBound],
    [] as Transaction[]
  );
}

export function useLast7DaysTransactions(context: 'personal' | 'business') {
  return useLiveQuery(
    () => TransactionService.getLast7DaysTransactions(context),
    [context],
    [] as Transaction[]
  );
}

export function useTotalBankBalance(context: 'personal' | 'business') {
  return useLiveQuery(
    async () => {
      let balance = 0;
      await db.transactions.where('context').equals(context).each(t => {
        balance += t.type === 'income' ? t.amount : -t.amount;
      });
      return balance;
    },
    [context],
    0
  );
}

export function useTransactionDates() {
  return useLiveQuery(
    async () => {
      // Get all unique dates from the date index
      const dates = await db.transactions.orderBy('date').uniqueKeys();
      return dates as string[];
    },
    [],
    [] as string[]
  );
}

export function useContextStats() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  return useLiveQuery(
    async () => {
      let bRev = 0, bCost = 0, pInc = 0, pExp = 0, pMonInc = 0, pMonExp = 0;
      await db.transactions.each(t => {
        if (t.context === 'business') {
          if (t.type === 'income') bRev += t.amount;
          else if (t.type === 'expense') bCost += t.amount;
        } else if (t.context === 'personal') {
          if (t.type === 'income') {
            pInc += t.amount;
            if (t.date.startsWith(currentMonth)) pMonInc += t.amount;
          } else if (t.type === 'expense') {
            pExp += t.amount;
            if (t.date.startsWith(currentMonth)) pMonExp += t.amount;
          }
        }
      });
      return { businessRevenue: bRev, businessCost: bCost, personalIncome: pInc, personalExpense: pExp, personalMonthlyIncome: pMonInc, personalMonthlyExpense: pMonExp };
    },
    [],
    { businessRevenue: 0, businessCost: 0, personalIncome: 0, personalExpense: 0, personalMonthlyIncome: 0, personalMonthlyExpense: 0 }
  );
}

export function useCurrentMonthTransactions(context: 'personal' | 'business') {
  const currentMonth = new Date().toISOString().substring(0, 7); // 'yyyy-MM'
  return useMonthTransactions(context, currentMonth);
}

export function useCustomerTransactions(customerId?: number) {
  return useLiveQuery(
    () => {
      if (customerId) {
        return db.transactions.where('customerId').equals(customerId).reverse().toArray();
      }
      return Promise.resolve([]);
    },
    [customerId],
    [] as Transaction[]
  );
}

export function useRecentTransactions(limit = 50) {
  return useLiveQuery(
    () => TransactionService.getRecent(limit),
    [limit],
    [] as Transaction[]
  );
}

export function useRecentTransactionsByContext(context: 'personal' | 'business', limit = 25) {
  return useLiveQuery(
    () => TransactionService.getRecentByContext(context, limit),
    [context, limit],
    [] as Transaction[]
  );
}

export function useTodayTransactions(context: 'personal' | 'business') {
  const today = new Date().toLocaleDateString('en-CA');
  return useLiveQuery(
    () => TransactionService.getByDate(today, context),
    [context, today],
    [] as Transaction[]
  );
}

export function useCustomers() {
  return useLiveQuery(
    () => CustomerService.getAll(),
    [],
    [] as Customer[]
  );
}

export function useCategories(context?: 'personal' | 'business') {
  return useLiveQuery(
    () => CategoryService.getAll(context),
    [context],
    [] as Category[]
  );
}

export function useUdhaarEntries(customerId?: number) {
  return useLiveQuery(
    () => {
      if (customerId) {
        return UdhaarService.getByCustomer(customerId);
      }
      return UdhaarService.getAll();
    },
    [customerId],
    [] as UdhaarEntry[]
  );
}

export function useInventory(context?: 'personal' | 'business') {
  return useLiveQuery(
    () => {
      if (context) {
        return InventoryService.getByContext(context);
      }
      return InventoryService.getAll();
    },
    [context],
    [] as InventoryItem[]
  );
}

export function useHasLowStock(context: 'personal' | 'business') {
  return useLiveQuery(
    () => InventoryService.hasLowStock(context),
    [context],
    false
  );
}

export function useGoals(context?: 'personal' | 'business') {
  return useLiveQuery(
    () => {
      if (context) {
        return PlannerService.getGoalsByContext(context);
      }
      return PlannerService.getAllGoals();
    },
    [context],
    [] as Goal[]
  );
}

export function useBudgets(context?: 'personal' | 'business', month?: string) {
  return useLiveQuery(
    () => PlannerService.getBudgets(context, month),
    [context, month],
    [] as Budget[]
  );
}

export function useAppSettings() {
  return useLiveQuery(
    () => SettingsService.get(),
    [],
    null as AppSettings | null
  );
}

export function useAppUsers() {
  return useLiveQuery(
    () => AppUserService.getAll(),
    [],
    [] as AppUser[]
  );
}

export function useMessages(chatId?: string) {
  return useLiveQuery(
    () => {
      if (chatId) {
        return MessageService.getAllByChatId(chatId);
      }
      return MessageService.getAll();
    },
    [chatId],
    [] as Message[]
  );
}

export function useAuditLogs(context?: 'personal' | 'business') {
  return useLiveQuery(
    () => AuditService.getAll(context),
    [context],
    [] as AuditLog[]
  );
}
