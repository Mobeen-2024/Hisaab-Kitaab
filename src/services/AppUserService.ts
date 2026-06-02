import { db } from '../db';
import { AppUser } from '../models';
import { hashPasscode, verifyPasscode, generateSalt } from '../lib/passcodeHash';

export const AppUserService = {
  async getAll() {
    return await db.appUsers.toArray();
  },

  async add(user: Omit<AppUser, 'id'>) {
    const userToSave = { ...user } as AppUser;
    if (userToSave.passcode) {
      const salt = generateSalt();
      userToSave.passcodeSalt = salt;
      userToSave.passcodeHash = await hashPasscode(userToSave.passcode, salt);
      delete userToSave.passcode;
    }
    return await db.appUsers.add(userToSave);
  },

  async update(id: number, changes: Partial<AppUser>) {
    const updatedChanges = { ...changes };
    if (updatedChanges.passcode) {
      const salt = generateSalt();
      updatedChanges.passcodeSalt = salt;
      updatedChanges.passcodeHash = await hashPasscode(updatedChanges.passcode, salt);
      delete updatedChanges.passcode;
    }
    return await db.appUsers.update(id, updatedChanges);
  },

  async delete(id: number) {
    return await db.appUsers.delete(id);
  },

  async verifyAndMigrate(userId: number, pin: string): Promise<boolean> {
    const user = await db.appUsers.get(userId);
    if (!user) return false;

    // 1. If user has passcodeHash and passcodeSalt, verify it
    if (user.passcodeHash && user.passcodeSalt) {
      return await verifyPasscode(pin, user.passcodeSalt, user.passcodeHash);
    }

    // 2. Backward compatibility: Simple SHA-256 hash or plain passcode verification
    // A legacy SHA-256 hex hash (from previous task attempt) is 64 hex characters.
    if (user.passcodeHash && !user.passcodeSalt) {
      // Import simple SHA-256 check
      const msgUint8 = new TextEncoder().encode(pin);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const simpleHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      const match = simpleHash === user.passcodeHash;
      if (match) {
        // Migrate to secure PBKDF2 on successful verification
        const salt = generateSalt();
        const hash = await hashPasscode(pin, salt);
        await db.appUsers.update(userId, {
          passcodeHash: hash,
          passcodeSalt: salt,
          passcode: undefined
        });
      }
      return match;
    }

    // 3. Legacy plain text passcode
    if (user.passcode) {
      const match = user.passcode === pin;
      if (match) {
        // Successful login, migrate plain text passcode to PBKDF2 hash + salt
        const salt = generateSalt();
        const hash = await hashPasscode(pin, salt);
        await db.appUsers.update(userId, {
          passcodeHash: hash,
          passcodeSalt: salt,
          passcode: undefined // Clears the plain passcode field
        });
      }
      return match;
    }

    return false;
  }
};
