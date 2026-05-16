import { db } from '../db';

export const AuditService = {
  async getAll(context?: 'personal' | 'business') {
    if (context) {
      return await db.auditLogs.where('context').equals(context).reverse().toArray();
    }
    return await db.auditLogs.reverse().toArray();
  },

  async clear(context?: 'personal' | 'business') {
    if (context) {
      const ids = await db.auditLogs.where('context').equals(context).primaryKeys();
      return await db.auditLogs.bulkDelete(ids);
    }
    return await db.auditLogs.clear();
  }
};
