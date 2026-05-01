import Dexie, { Table } from 'dexie';
import { Lang } from './lib/i18n';

export interface Category {
  id?: number;
  name: string;
  type: 'income' | 'expense';
  context: 'personal' | 'business';
}

export interface Customer {
  id?: number;
  name: string;
  phone: string;
  balance: number;
  type?: 'customer' | 'supplier';
  createdAt: string;
}

export interface InventoryItem {
  id?: number;
  name: string;
  quantity: number;
  minQuantity: number;
  unitPrice: number;
  context: 'personal' | 'business';
}

export interface Transaction {
  id?: number;
  amount: number;
  type: 'income' | 'expense';
  categoryId: number;
  context: 'personal' | 'business';
  date: string;
  description: string;
  customerId?: number;
  paymentMethod?: 'cash' | 'bank' | 'mobile_wallet';
  originalCurrency?: string;
  originalAmount?: number;
  exchangeRate?: number;
  source?: 'manual' | 'voice' | 'easypaisa' | 'jazzcash' | 'bank_import' | 'pdf' | 'ai';
  importReferenceId?: string;
}

export interface UdhaarEntry {
  id?: number;
  customerId: number;
  type: 'give' | 'receive'; // give = gave goods/money (increase their debt), receive = got paid (decrease their debt)
  amount: number;
  date: string;
  dueDate?: string;
  description: string;
  isCompleted?: boolean;
  originalCurrency?: string;
  originalAmount?: number;
  exchangeRate?: number;
}

export interface Goal {
  id?: number;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  context: 'personal' | 'business';
}

export interface Budget {
  id?: number;
  month: string; // 'YYYY-MM'
  amount: number;
  context: 'personal' | 'business';
}

export interface AppSettings {
  id?: number;
  language: Lang;
  currency: string;
  highlightedCategoryId?: number;
  ownerName?: string;
  ownerEmail?: string;
  ownerDob?: string;
  ownerAvatar?: string;
  ownerPhone?: string;
  ownerCountryCode?: string;
  activeContext?: 'personal' | 'business';
  reminderEnabled?: boolean;
  reminderTime?: string;
  activeUserId?: number; // Added to track current user
  geminiApiKey?: string; // For AI features
}

export interface AppUser {
  id?: number;
  name: string;
  role: 'owner' | 'spouse' | 'cashier' | 'employee';
  contextAccess: 'personal' | 'business' | 'both';
  passcode: string; 
  avatar?: string;
}

export interface Message {
  id?: number;
  chatId: string; // Could be 'ai' or customerId
  sender: 'user' | 'ai' | 'system';
  content: string;
  timestamp: string;
}

export interface AuditLog {
  id?: number;
  entityType: 'transaction' | 'customer' | 'udhaar' | 'goal' | 'budget' | 'inventory';
  entityId: number;
  action: 'create' | 'update' | 'delete';
  timestamp: string;
  details?: string;
  context?: 'personal' | 'business';
}

export class PaisaTrackDB extends Dexie {
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

  constructor() {
    super('PaisaTrackDB');
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

    this.on('ready', () => {
      const tablesToAudit = ['transactions', 'customers', 'udhaarEntries', 'goals', 'budgets', 'inventory'];
      
      for (const tableName of tablesToAudit) {
        const table = this.table(tableName);
        
        table.hook('creating', (primKey, obj, transaction) => {
          transaction.on('complete', () => {
            this.auditLogs.add({
              entityType: tableName as any,
              entityId: primKey || obj.id || 0,
              action: 'create',
              timestamp: new Date().toISOString(),
              context: obj.context || undefined
            }).catch(console.error);
          });
        });

        table.hook('updating', (modifications, primKey, obj, transaction) => {
          transaction.on('complete', () => {
            this.auditLogs.add({
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
          transaction.on('complete', () => {
            this.auditLogs.add({
              entityType: tableName as any,
              entityId: primKey || obj.id || 0,
              action: 'delete',
              timestamp: new Date().toISOString(),
              context: obj.context || undefined
            }).catch(console.error);
          });
        });
      }
    });
  }

  async exportData() {
    const data: any = {};
    for (const table of this.tables) {
      data[table.name] = await table.toArray();
    }
    
    // Create encrypted-like wrapper or just serialize
    const payload = JSON.stringify({
      version: 1,
      timestamp: new Date().toISOString(),
      data
    });
    
    // We could apply AES encryption here using SubtleCrypto, but base64 encoding it provides a simple binary-like format
    return btoa(unescape(encodeURIComponent(payload)));
  }

  async importData(base64Payload: string) {
    try {
      const payload = decodeURIComponent(escape(atob(base64Payload)));
      const parsed = JSON.parse(payload);
      
      if (!parsed.data) throw new Error("Invalid backup file");

      await this.transaction('rw', this.tables, async () => {
        for (const table of this.tables) {
          if (parsed.data[table.name]) {
            await table.clear();
            await table.bulkAdd(parsed.data[table.name]);
          }
        }
      });
      return true;
    } catch (e) {
      console.error("Backup recovery failed:", e);
      return false;
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
    } catch(e) {
      console.error("Failed to log audit", e);
    }
  }
}

export const db = new PaisaTrackDB();

// Populate initial categories and settings
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
    currency: 'PKR'
  });
});
