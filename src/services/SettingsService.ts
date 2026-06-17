import { db, AppSettings } from '../db';
import { AppSettingsSchema } from '../models/schemas';

export const SettingsService = {
  async get() {
    return await db.settings.toCollection().first() || null;
  },

  async update(idOrChanges: number | Partial<AppSettings>, changes?: Partial<AppSettings>) {
    const data = typeof idOrChanges === 'number' ? changes! : idOrChanges;
    AppSettingsSchema.partial().parse(data);

    if (typeof idOrChanges === 'number') {
      return await db.settings.update(idOrChanges, changes!);
    }
    const settings = await this.get();
    if (settings && settings.id) {
      return await db.settings.update(settings.id, idOrChanges);
    } else {
      return await db.settings.add(idOrChanges as AppSettings);
    }
  },

  async exportData(password?: string) {
    return await db.exportData(password);
  },

  async importData(data: string, password?: string) {
    return await db.importData(data, password);
  },

  async factoryReset() {
    return await db.delete();
  }
};
