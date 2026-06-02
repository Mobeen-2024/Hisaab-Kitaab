import Dexie, { Table } from 'dexie';
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

    this.on('ready', () => {
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

      for (const tableName of tablesToAudit) {
        const table = this.table(tableName);

        table.hook('creating', function (primKey, obj) {
          if (db.isImporting) return;
          if (Dexie.currentTransaction && (Dexie.currentTransaction as any)._isRemoteSync) return;
          if (!obj.remoteId) {
            obj.remoteId = typeof crypto !== 'undefined' && crypto.randomUUID 
              ? crypto.randomUUID() 
              : Math.random().toString(36).substring(2) + Date.now().toString(36);
          }

          this.onsuccess = (resultKey) => {
            // Add to sync queue
            db.syncQueue.add({
              entityType: tableName,
              remoteId: obj.remoteId,
              action: 'UPSERT',
              payload: obj,
              timestamp: new Date().toISOString()
            }).then(() => {
              import('./services/FirebaseSyncService').then(({ FirebaseSyncService }) => {
                FirebaseSyncService.triggerQueueProcessing();
              }).catch(console.error);
            }).catch(console.error);

            Dexie.ignoreTransaction(() => {
              db.auditLogs.add({
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
          if (db.isImporting) return;
          if (Dexie.currentTransaction && (Dexie.currentTransaction as any)._isRemoteSync) return;
          // Merge modifications into copy of obj to sync complete data
          const updatedObj = { ...obj, ...modifications };
          if (updatedObj.remoteId) {
            db.syncQueue.add({
              entityType: tableName,
              remoteId: updatedObj.remoteId,
              action: 'UPSERT',
              payload: updatedObj,
              timestamp: new Date().toISOString()
            }).then(() => {
              import('./services/FirebaseSyncService').then(({ FirebaseSyncService }) => {
                FirebaseSyncService.triggerQueueProcessing();
              }).catch(console.error);
            }).catch(console.error);
          }

          Dexie.ignoreTransaction(() => {
            db.auditLogs.add({
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
          if (db.isImporting) return;
          if (Dexie.currentTransaction && (Dexie.currentTransaction as any)._isRemoteSync) return;
          if (obj.remoteId) {
            db.syncQueue.add({
              entityType: tableName,
              remoteId: obj.remoteId,
              action: 'DELETE',
              timestamp: new Date().toISOString()
            }).then(() => {
              import('./services/FirebaseSyncService').then(({ FirebaseSyncService }) => {
                FirebaseSyncService.triggerQueueProcessing();
              }).catch(console.error);
            }).catch(console.error);
          }

          Dexie.ignoreTransaction(() => {
            db.auditLogs.add({
              entityType: tableName as any,
              entityId: primKey || obj.id || 0,
              action: 'delete',
              timestamp: new Date().toISOString(),
              context: obj.context || undefined
            }).catch(console.error);
          });
        });
      }

      // Non-blocking background legacy backfill
      setTimeout(async () => {
        try {
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
                .filter(tx => tx.source === 'legacy_backfill' && tx.sourceId === entry.id)
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
        } catch (error) {
          console.warn("Background legacy backfill encountered an issue:", error);
        }
      }, 1500);
    });
  }

  async exportData() {
    const data: any = {};
    for (const table of this.tables) {
      data[table.name] = await table.toArray();
    }

    const payload = JSON.stringify({
      version: 1,
      timestamp: new Date().toISOString(),
      data
    });

    const uint8Array = new TextEncoder().encode(payload);
    let binary = '';
    const len = uint8Array.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
  }

  async importData(base64Payload: string) {
    try {
      this.isImporting = true;
      const binary = atob(base64Payload);
      const uint8Array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        uint8Array[i] = binary.charCodeAt(i);
      }
      const payload = new TextDecoder().decode(uint8Array);
      const parsed = JSON.parse(payload);

      if (!parsed.data) throw new Error("Invalid backup file");

      if (parsed.version && parsed.version !== 1) {
        const confirmed = window.confirm(
          `This backup was created with schema version ${parsed.version}. Your current database is version 9. Some fields may not be compatible. Proceed with import?`
        );
        if (!confirmed) return false;
      }

      await this.transaction('rw', this.tables, async () => {
        for (const table of this.tables) {
          if (parsed.data[table.name]) {
            await table.clear();
            await table.bulkAdd(parsed.data[table.name]);
          }
        }
      });

      // Post-import sync upload to Firestore in a batched, safe manner
      import('./services/FirebaseSyncService').then(({ FirebaseSyncService }) => {
        const user = FirebaseSyncService.getCurrentUser();
        if (user && FirebaseSyncService.isEnabled()) {
          FirebaseSyncService.uploadAllLocalData(user.uid).catch(console.error);
        }
      }).catch(console.error);

      return true;
    } catch (e) {
      console.error("Backup recovery failed:", e);
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
