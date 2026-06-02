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
