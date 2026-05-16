import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { 
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

export function useTransactions(context?: 'personal' | 'business') {
  return useLiveQuery(
    () => {
      if (context) {
        return db.transactions.where('context').equals(context).reverse().toArray();
      }
      return db.transactions.reverse().toArray();
    },
    [context],
    [] as Transaction[]
  );
}

export function useRecentTransactions(limit = 50) {
  return useLiveQuery(
    () => db.transactions.reverse().limit(limit).toArray(),
    [limit],
    [] as Transaction[]
  );
}

export function useCustomers() {
  return useLiveQuery(
    () => db.customers.toArray(),
    [],
    [] as Customer[]
  );
}

export function useCategories(context?: 'personal' | 'business') {
  return useLiveQuery(
    () => {
      if (context) {
        return db.categories.where('context').equals(context).toArray();
      }
      return db.categories.toArray();
    },
    [context],
    [] as Category[]
  );
}

export function useUdhaarEntries(customerId?: number) {
  return useLiveQuery(
    () => {
      if (customerId) {
        return db.udhaarEntries.where('customerId').equals(customerId).reverse().toArray();
      }
      return db.udhaarEntries.reverse().toArray();
    },
    [customerId],
    [] as UdhaarEntry[]
  );
}

export function useInventory(context?: 'personal' | 'business') {
  return useLiveQuery(
    () => {
      if (context) {
        return db.inventory.where('context').equals(context).toArray();
      }
      return db.inventory.toArray();
    },
    [context],
    [] as InventoryItem[]
  );
}

export function useGoals(context?: 'personal' | 'business') {
  return useLiveQuery(
    () => {
      if (context) {
        return db.goals.where('context').equals(context).toArray();
      }
      return db.goals.toArray();
    },
    [context],
    [] as Goal[]
  );
}

export function useBudgets(context?: 'personal' | 'business', month?: string) {
  return useLiveQuery(
    () => {
      let collection = db.budgets.toCollection();
      if (month && context) {
        return db.budgets.where({ month, context }).toArray();
      }
      if (context) {
        return db.budgets.where('context').equals(context).toArray();
      }
      return collection.toArray();
    },
    [context, month],
    [] as Budget[]
  );
}

export function useAppSettings() {
  return useLiveQuery(
    () => db.settings.toCollection().first(),
    [],
    null as AppSettings | null
  );
}

export function useAppUsers() {
  return useLiveQuery(
    () => db.appUsers.toArray(),
    [],
    [] as AppUser[]
  );
}

export function useMessages(chatId?: string) {
  return useLiveQuery(
    () => {
      if (chatId) {
        return db.messages.where('chatId').equals(chatId).reverse().toArray();
      }
      return db.messages.reverse().toArray();
    },
    [chatId],
    [] as Message[]
  );
}

export function useAuditLogs(context?: 'personal' | 'business') {
  return useLiveQuery(
    () => {
      if (context) {
        return db.auditLogs.where('context').equals(context).reverse().toArray();
      }
      return db.auditLogs.reverse().toArray();
    },
    [context],
    [] as AuditLog[]
  );
}
