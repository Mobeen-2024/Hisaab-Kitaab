import Dexie, { Table } from 'dexie';
import { encryptData, decryptData } from './lib/encryption';
import {
  Category,
  Customer,
  InventoryItem,
  Transaction,
  UdhaarEntry,
  Goal,
  Budget,
  AppSettings,
  AppUser,
  Message,
  AuditLog
} from './models';

export type {
  Category,
  Customer,
  InventoryItem,
  Transaction,
  UdhaarEntry,
  Goal,
  Budget,
  AppSettings,
  AppUser,
  Message,
  AuditLog
};

export interface SyncQueueItem {
  id?: number;
  entityType: string;
  remoteId: string;
  action: 'UPSERT' | 'DELETE';
  payload?: any;
  timestamp: string;
  retryCount?: number;
  lastAttemptAt?: string;
  orphaned?: boolean;
}

export class HisaibKItaibDB extends Dexie {
  isImporting = false;
  transactions!: Table<Transaction, number>;
  categories!: Table<Category, number>;
  settings!: Table<AppSettings, number>;
  customers!: Table<Customer, number>;
  udhaarEntries!: Table<UdhaarEntry, number>;
  goals!: Table<Goal, number>;
  budgets!: Table<Budget, number>;
  inventory!: Table<InventoryItem, number>;
  auditLogs!: Table<AuditLog, number>;
  appUsers!: Table<AppUser, number>;
  messages!: Table<Message, number>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super('HisaibKItaibDB');
    const dbInstance = this;
    this.version(1).stores({
      transactions: '++id, type, categoryId, context, date',
      categories: '++id, type, context',
      settings: '++id'
    });
    this.version(2).stores({
      transactions: '++id, type, categoryId, context, date, customerId',
      categories: '++id, type, context',
      settings: '++id',
      customers: '++id, name, phone, balance'
    });
    this.version(3).stores({
      udhaarEntries: '++id, customerId, type, date, dueDate, isCompleted'
    });
    this.version(4).stores({
      goals: '++id, context',
      budgets: '++id, month, context'
    });
    this.version(5).stores({
      inventory: '++id, context',
      customers: '++id, name, phone, balance, type'
    });
    this.version(6).stores({
      auditLogs: '++id, entityType, entityId, action, timestamp, context'
    });
    this.version(7).stores({
      appUsers: '++id, role, contextAccess'
    });
    this.version(8).stores({
      messages: '++id, chatId, sender, timestamp'
    });
    this.version(9).stores({
      transactions: '++id, type, categoryId, context, date, customerId, source, importReferenceId'
    });
    this.version(10).stores({
      udhaarEntries: '++id, customerId, type, date, dueDate, context, transactionId, isCompleted'
    });
    this.version(11).stores({
      syncQueue: '++id, entityType, remoteId, action, timestamp'
    });
    // Version 12: compound index for efficient date-range queries scoped by context
    // Used by: getByDateRange, getMonthTransactions, getLast7Days
    this.version(12).stores({
      transactions: '++id, type, categoryId, context, date, customerId, source, importReferenceId, [context+date]'
    });
    // Version 13: index remoteId for all synchronized tables to prevent full scans / query errors
    this.version(13).stores({
      transactions: '++id, type, categoryId, context, date, customerId, source, importReferenceId, [context+date], remoteId',
      categories: '++id, type, context, remoteId',
      settings: '++id, remoteId',
      customers: '++id, name, phone, balance, type, remoteId',
      udhaarEntries: '++id, customerId, type, date, dueDate, context, transactionId, isCompleted, remoteId',
      goals: '++id, context, remoteId',
      budgets: '++id, month, context, remoteId',
      inventory: '++id, context, remoteId',
      auditLogs: '++id, entityType, entityId, action, timestamp, context, remoteId',
      appUsers: '++id, role, contextAccess, remoteId',
      messages: '++id, chatId, sender, timestamp, remoteId',
      syncQueue: '++id, entityType, remoteId, action, timestamp'
    });
    // Version 14: index orphaned in syncQueue for query banner performance
    this.version(14).stores({
      transactions: '++id, type, categoryId, context, date, customerId, source, importReferenceId, [context+date], remoteId',
      categories: '++id, type, context, remoteId',
      settings: '++id, remoteId',
      customers: '++id, name, phone, balance, type, remoteId',
      udhaarEntries: '++id, customerId, type, date, dueDate, context, transactionId, isCompleted, remoteId',
      goals: '++id, context, remoteId',
      budgets: '++id, month, context, remoteId',
      inventory: '++id, context, remoteId',
      auditLogs: '++id, entityType, entityId, action, timestamp, context, remoteId',
      appUsers: '++id, role, contextAccess, remoteId',
      messages: '++id, chatId, sender, timestamp, remoteId',
      syncQueue: '++id, entityType, remoteId, action, timestamp, orphaned'
    });

    const tablesToAudit = [
      'transactions',
      'customers',
      'udhaarEntries',
      'goals',
      'budgets',
      'inventory',
      'categories',
      'appUsers',
      'messages',
      'settings'
    ];

    this.auditLogs.hook('creating', function (primKey, obj, transaction) {
      if (!dbInstance.isOpen() || dbInstance.isImporting) return;
      if (Dexie.currentTransaction && (Dexie.currentTransaction as any)._isRemoteSync) return;
      if (!obj.remoteId) {
        obj.remoteId = typeof crypto !== 'undefined' && crypto.randomUUID 
          ? crypto.randomUUID() 
          : Math.random().toString(36).substring(2) + Date.now().toString(36);
      }

      const queueItem = {
        entityType: 'auditLogs',
        remoteId: obj.remoteId,
        action: 'UPSERT' as const,
        payload: obj,
        timestamp: new Date().toISOString(),
        retryCount: 0,
        orphaned: false
      };

      transaction.on('complete', () => {
        setTimeout(async () => {
          try {
            await db.syncQueue.add(queueItem);
            const { FirebaseSyncService } = await import('./services/FirebaseSyncService');
            FirebaseSyncService?.triggerQueueProcessing?.();
          } catch (error) {
            console.error(error);
          }
        }, 0);
      });
    });

    this.auditLogs.hook('updating', (modifications, primKey, obj, transaction) => {
      if (!dbInstance.isOpen() || dbInstance.isImporting) return;
      if (Dexie.currentTransaction && (Dexie.currentTransaction as any)._isRemoteSync) return;
      const updatedObj = { ...obj, ...modifications };
      if (updatedObj.remoteId) {
        const queueItem = {
          entityType: 'auditLogs',
          remoteId: updatedObj.remoteId,
          action: 'UPSERT' as const,
          payload: updatedObj,
          timestamp: new Date().toISOString(),
          retryCount: 0,
          orphaned: false
        };

        transaction.on('complete', () => {
          setTimeout(async () => {
            try {
              await dbInstance.syncQueue.add(queueItem);
              const { FirebaseSyncService } = await import('./services/FirebaseSyncService');
              FirebaseSyncService?.triggerQueueProcessing?.();
            } catch (error) {
              console.error(error);
            }
          }, 0);
        });
      }
    });

    this.auditLogs.hook('deleting', (primKey, obj, transaction) => {
      if (!dbInstance.isOpen() || dbInstance.isImporting) return;
      if (Dexie.currentTransaction && (Dexie.currentTransaction as any)._isRemoteSync) return;
      if (obj.remoteId) {
        const queueItem = {
          entityType: 'auditLogs',
          remoteId: obj.remoteId,
          action: 'DELETE' as const,
          timestamp: new Date().toISOString(),
          retryCount: 0,
          orphaned: false
        };

        transaction.on('complete', () => {
          setTimeout(async () => {
            try {
              await dbInstance.syncQueue.add(queueItem);
              const { FirebaseSyncService } = await import('./services/FirebaseSyncService');
              FirebaseSyncService?.triggerQueueProcessing?.();
            } catch (error) {
              console.error(error);
            }
          }, 0);
        });
      }
    });

    for (const tableName of tablesToAudit) {
      const table = this.table(tableName);

      table.hook('creating', function (primKey, obj, transaction) {
        if (!dbInstance.isOpen() || dbInstance.isImporting) return;
        if (Dexie.currentTransaction && (Dexie.currentTransaction as any)._isRemoteSync) return;
        
        if (!obj.remoteId) {
          obj.remoteId = typeof crypto !== 'undefined' && crypto.randomUUID 
            ? crypto.randomUUID() 
            : Math.random().toString(36).substring(2) + Date.now().toString(36);
        }

        const queueItem = {
          entityType: tableName,
          remoteId: obj.remoteId,
          action: 'UPSERT' as const,
          payload: obj,
          timestamp: new Date().toISOString(),
          retryCount: 0,
          orphaned: false
        };

        transaction.on('complete', () => {
          setTimeout(async () => {
            try {
              await dbInstance.syncQueue.add(queueItem);
              const { FirebaseSyncService } = await import('./services/FirebaseSyncService');
              FirebaseSyncService?.triggerQueueProcessing?.();
            } catch (error) {
              console.error(error);
            }
          }, 0);
        });

        this.onsuccess = (resultKey) => {
          Dexie.ignoreTransaction(() => {
            dbInstance.auditLogs.add({
              entityType: tableName as any,
              entityId: resultKey as number,
              action: 'create',
              timestamp: new Date().toISOString(),
              context: obj.context || undefined
            }).catch(console.error);
          });
        };
      });

      table.hook('updating', (modifications, primKey, obj, transaction) => {
        if (!dbInstance.isOpen() || dbInstance.isImporting) return;
        if (Dexie.currentTransaction && (Dexie.currentTransaction as any)._isRemoteSync) return;
        // Merge modifications into copy of obj to sync complete data
        const updatedObj = { ...obj, ...modifications };
        if (updatedObj.remoteId) {
          const queueItem = {
            entityType: tableName,
            remoteId: updatedObj.remoteId,
            action: 'UPSERT' as const,
            payload: updatedObj,
            timestamp: new Date().toISOString(),
            retryCount: 0,
            orphaned: false
          };

          transaction.on('complete', () => {
            setTimeout(async () => {
              try {
                await dbInstance.syncQueue.add(queueItem);
                const { FirebaseSyncService } = await import('./services/FirebaseSyncService');
                FirebaseSyncService?.triggerQueueProcessing?.();
              } catch (error) {
                console.error(error);
              }
            }, 0);
          });
        }

        Dexie.ignoreTransaction(() => {
          dbInstance.auditLogs.add({
            entityType: tableName as any,
            entityId: primKey || obj.id || 0,
            action: 'update',
            timestamp: new Date().toISOString(),
            details: JSON.stringify(Object.keys(modifications)),
            context: obj.context || undefined
          }).catch(console.error);
        });
      });

      table.hook('deleting', (primKey, obj, transaction) => {
        if (!dbInstance.isOpen() || dbInstance.isImporting) return;
        if (Dexie.currentTransaction && (Dexie.currentTransaction as any)._isRemoteSync) return;
        if (obj.remoteId) {
          const queueItem = {
            entityType: tableName,
            remoteId: obj.remoteId,
            action: 'DELETE' as const,
            timestamp: new Date().toISOString(),
            retryCount: 0,
            orphaned: false
          };

          transaction.on('complete', () => {
            setTimeout(async () => {
              try {
                await dbInstance.syncQueue.add(queueItem);
                const { FirebaseSyncService } = await import('./services/FirebaseSyncService');
                FirebaseSyncService?.triggerQueueProcessing?.();
              } catch (error) {
                console.error(error);
              }
            }, 0);
          });
        }

        Dexie.ignoreTransaction(() => {
          dbInstance.auditLogs.add({
            entityType: tableName as any,
            entityId: primKey || obj.id || 0,
            action: 'delete',
            timestamp: new Date().toISOString(),
            context: obj.context || undefined
          }).catch(console.error);
        });
      });
    }

    this.on('ready', () => {
      // Non-blocking background legacy backfill
      setTimeout(async () => {
        try {
          const settings = await this.settings.toCollection().first();
          if (settings && (settings as any).backfillVersion >= 1) {
            return;
          }

          const entries = await this.udhaarEntries.toArray();
          for (const entry of entries) {
            let changed = false;
            let context = entry.context;
            if (!context) {
              context = 'business';
              changed = true;
            }

            if (!entry.transactionId) {
              const existingTx = await this.transactions
                .where('source')
                .equals('legacy_backfill')
                .and(tx => tx.sourceId === entry.id)
                .first();

              if (existingTx) {
                entry.transactionId = existingTx.id;
                entry.context = existingTx.context;
                changed = true;
              } else {
                const txType = entry.type === 'give' ? 'expense' : 'income';
                const catName = txType === 'income' ? 'Udhaar Received' : 'Udhaar Given';
                let cat = await this.categories
                  .where('context')
                  .equals(context)
                  .and(c => c.type === txType && c.name === catName)
                  .first();

                if (!cat) {
                  const newCatId = await this.categories.add({ name: catName, type: txType, context });
                  cat = { id: newCatId, name: catName, type: txType, context };
                }

                const customer = await this.customers.get(entry.customerId);
                const customerName = customer ? customer.name : 'Unknown';
                const txDesc = entry.description
                  ? `Udhaar (${entry.type === 'give' ? 'Given to' : 'Received from'} ${customerName}): ${entry.description}`
                  : `Udhaar (${entry.type === 'give' ? 'Given to' : 'Received from'} ${customerName})`;

                const txId = await this.transactions.add({
                  amount: entry.amount,
                  type: txType,
                  categoryId: cat.id!,
                  context: context,
                  date: entry.date,
                  description: txDesc,
                  customerId: entry.customerId,
                  paymentMethod: 'cash',
                  originalCurrency: entry.originalCurrency || 'PKR',
                  originalAmount: entry.originalAmount || entry.amount,
                  exchangeRate: entry.exchangeRate || 1,
                  source: 'legacy_backfill',
                  sourceId: entry.id
                });

                entry.transactionId = txId;
                entry.context = context;
                changed = true;
              }
            }

            if (changed) {
              await this.udhaarEntries.put(entry);
            }
          }

          if (settings) {
            await Dexie.ignoreTransaction(async () => {
              await dbInstance.transaction('rw', dbInstance.settings, async (tx) => {
                (tx as any)._isRemoteSync = true;
                await dbInstance.settings.update(settings.id!, { backfillVersion: 1 } as any);
              });
            });
          }
        } catch (error) {
          console.warn("Background legacy backfill encountered an issue:", error);
        }
      }, 1500);

      // Non-blocking background updatedAt backfill (Decision #4)
      setTimeout(async () => {
        try {
          const settings = await this.settings.toCollection().first();
          if (settings && (settings as any).backfillUpdatedAtVersion >= 1) {
            return;
          }

          await dbInstance.transaction('rw', tablesToAudit.map(t => this.table(t)), async (tx) => {
            (tx as any)._isRemoteSync = true;
            for (const tableName of tablesToAudit) {
              const table = this.table(tableName);
              const items = await table.toArray();
              for (const item of items) {
                if (!(item as any).updatedAt) {
                  const now = new Date().toISOString();
                  const fallbackVal = (item as any).createdAt ?? (item as any).date ?? (item as any).timestamp ?? now;
                  await table.update(item.id!, { updatedAt: fallbackVal });
                }
              }
            }
          });

          if (settings) {
            await Dexie.ignoreTransaction(async () => {
              await dbInstance.transaction('rw', dbInstance.settings, async (tx) => {
                (tx as any)._isRemoteSync = true;
                await dbInstance.settings.update(settings.id!, { backfillUpdatedAtVersion: 1 } as any);
              });
            });
          }
        } catch (error) {
          console.warn("Background updatedAt backfill encountered an issue:", error);
        }
      }, 2000);
    });
  }

  async exportData(password?: string) {
    const data: any = {};
    for (const table of this.tables) {
      if (table.name === 'syncQueue') continue;
      let rows = await table.toArray();
      if (table.name === 'settings') {
        // Strip AI API key — must never leave the device
        rows = rows.map(r => {
          const { geminiApiKey, ...rest } = r as any;
          return rest;
        });
      }
      if (table.name === 'appUsers') {
        // Strip credential fields — passcodeHash and passcodeSalt are device-only secrets.
        // On restore, users will need to set new PINs.
        rows = rows.map(r => {
          const { passcodeHash, passcodeSalt, passcode, ...rest } = r as any;
          return rest;
        });
      }
      data[table.name] = rows;
    }

    const payload = JSON.stringify({
      version: 1,
      dbSchemaVersion: 14,
      timestamp: new Date().toISOString(),
      warning: 'This backup contains sensitive financial data. Store it securely. User PINs are not included — users must set new PINs after restore.',
      data
    });

    return await encryptData(payload, password);
  }

  async importData(base64Payload: string, password?: string) {
    let syncWasEnabled = false;
    try {
      const { FirebaseSyncService } = await import('./services/FirebaseSyncService');
      syncWasEnabled = FirebaseSyncService?.isEnabled?.();
      if (syncWasEnabled && FirebaseSyncService?.stopSync) {
        FirebaseSyncService.stopSync();
      }

      this.isImporting = true;
      const payload = await decryptData(base64Payload, password);
      const parsed = JSON.parse(payload);

      if (!parsed.data) throw new Error("Invalid backup file");

      const backupVersion = parsed.dbSchemaVersion || parsed.version || 1;
      if (backupVersion !== 14) {
        const confirmed = window.confirm(
          `This backup was created with schema version ${backupVersion}. Your current database is version 14. Some fields may not be compatible. Proceed with import?`
        );
        if (!confirmed) return false;
      }

      // Pre-process items to ensure updatedAt exists
      const nowStr = new Date().toISOString();
      for (const tableName of Object.keys(parsed.data)) {
        const items = parsed.data[tableName];
        for (const item of items) {
          if (!item.updatedAt && tableName !== 'syncQueue') {
            item.updatedAt = item.createdAt ?? item.date ?? item.timestamp ?? nowStr;
          }
        }
      }

      // Flag that an import occurred. The sync service and UI will handle cloud sync and PIN resets on reload.
      localStorage.setItem('firebase_needs_full_sync', 'true');
      localStorage.setItem('needs_owner_pin_reset', 'true');

      await this.transaction('rw', this.tables, async () => {
        for (const table of this.tables) {
          if (table.name === 'syncQueue') continue;
          if (parsed.data[table.name]) {
            await table.clear();
            await table.bulkAdd(parsed.data[table.name]);
          }
        }
      });

      return true;
    } catch (e: any) {
      console.error("Backup recovery failed:", e);
      if (e && e.message) throw e;
      return false;
    } finally {
      this.isImporting = false;
    }
  }

  async logAudit(entityType: AuditLog['entityType'], entityId: number, action: AuditLog['action'], details?: string, context?: AuditLog['context']) {
    try {
      await this.auditLogs.add({
        entityType,
        entityId,
        action,
        timestamp: new Date().toISOString(),
        details,
        context
      });
    } catch (e) {
      console.error("Failed to log audit", e);
    }
  }
}

export const db = new HisaibKItaibDB();

db.on('populate', async () => {
  await db.categories.bulkAdd([
    { name: 'Daily Milk Sales', type: 'income', context: 'business' },
    { name: 'Retail Shop', type: 'income', context: 'business' },
    { name: 'Salary', type: 'income', context: 'personal' },
    { name: 'Groceries', type: 'expense', context: 'personal' },
    { name: 'Utility Bills (Bijli/Sui Gas)', type: 'expense', context: 'personal' },
    { name: 'Transport', type: 'expense', context: 'personal' },
    { name: 'Cattle Feed (Chara)', type: 'expense', context: 'business' },
  ]);

  await db.settings.add({
    language: 'en',
    currency: 'PKR',
    activeContext: 'business'
  });
});
