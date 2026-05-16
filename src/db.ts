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

export class HisaabKitaabDB extends Dexie {
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
    super('HisaabKitaabDB');
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
        
        table.hook('creating', function(primKey, obj) {
          // Use onsuccess to capture the auto-incremented primary key
          this.onsuccess = (resultKey) => {
            db.auditLogs.add({
              entityType: tableName as any,
              entityId: resultKey as number,
              action: 'create',
              timestamp: new Date().toISOString(),
              context: obj.context || undefined
            }).catch(console.error);
          };
        });

        table.hook('updating', (modifications, primKey, obj, transaction) => {
          db.auditLogs.add({
            entityType: tableName as any,
            entityId: primKey || obj.id || 0,
            action: 'update',
            timestamp: new Date().toISOString(),
            details: JSON.stringify(Object.keys(modifications)),
            context: obj.context || undefined
          }).catch(console.error);
        });

        table.hook('deleting', (primKey, obj, transaction) => {
          db.auditLogs.add({
            entityType: tableName as any,
            entityId: primKey || obj.id || 0,
            action: 'delete',
            timestamp: new Date().toISOString(),
            context: obj.context || undefined
          }).catch(console.error);
        });
      }
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

  async getCustomerBalance(customerId: number): Promise<number> {
    const customer = await this.customers.get(customerId);
    if (!customer) return 0;
    
    const isSupplier = customer.type === 'supplier';
    const entries = await this.udhaarEntries.where('customerId').equals(customerId).toArray();
    
    return entries.reduce((sum, entry) => {
      if (isSupplier) {
        // For supplier: receive (goods) increases what we owe (+), give (payment) decreases what we owe (-)
        return sum + (entry.type === 'receive' ? entry.amount : -entry.amount);
      } else {
        // For customer: give (money/goods) increases what they owe (+), receive (payment) decreases what they owe (-)
        return sum + (entry.type === 'give' ? entry.amount : -entry.amount);
      }
    }, 0);
  }
}

export const db = new HisaabKitaabDB();

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
