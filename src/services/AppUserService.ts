import { db } from '../db';
import { AppUser } from '../models';

export const AppUserService = {
  async getAll() {
    return await db.appUsers.toArray();
  },

  async add(user: Omit<AppUser, 'id'>) {
    return await db.appUsers.add(user as AppUser);
  },

  async update(id: number, changes: Partial<AppUser>) {
    return await db.appUsers.update(id, changes);
  },

  async delete(id: number) {
    return await db.appUsers.delete(id);
  }
};
