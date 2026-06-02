import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { db } from '../../db';
import { AppUserService } from '../AppUserService';

describe('AppUserService Tests', () => {
  const originalConsoleError = console.error;

  beforeEach(async () => {
    console.error = (...args: any[]) => {
      const msg = args.join(' ');
      if (msg.includes('NotFoundError') || msg.includes('DatabaseClosedError')) return;
      originalConsoleError(...args);
    };

    db.close();
    await Dexie.delete('HisaibKItaibDB');
    await db.open();
    await db.appUsers.clear();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  it('adds a user with a secure hashed passcode and no plain text passcode', async () => {
    const userId = await AppUserService.add({
      name: 'Admin User',
      role: 'owner',
      contextAccess: 'both',
      passcode: '1234'
    });

    const user = await db.appUsers.get(userId);
    expect(user).toBeDefined();
    expect(user?.passcode).toBeUndefined(); // Plain passcode field must be deleted/undefined
    expect(user?.passcodeHash).toBeDefined();
    expect(user?.passcodeSalt).toBeDefined();
  });

  it('migrates plain text passcodes to PBKDF2 passcodeHash and passcodeSalt on verification', async () => {
    // Manually insert legacy user with plain text passcode
    const userId = await db.appUsers.add({
      name: 'Legacy User',
      role: 'cashier',
      passcode: '5555'
    } as any);

    // Verify passcode
    const verified = await AppUserService.verifyAndMigrate(userId as number, '5555');
    expect(verified).toBe(true);

    // Verify migration took place
    const migratedUser = await db.appUsers.get(userId as number);
    expect(migratedUser?.passcode).toBeUndefined(); // Should be cleaned up
    expect(migratedUser?.passcodeHash).toBeDefined();
    expect(migratedUser?.passcodeSalt).toBeDefined();

    // Verify next login works with newly hashed passcode
    const secondLogin = await AppUserService.verifyAndMigrate(userId as number, '5555');
    expect(secondLogin).toBe(true);
  });

  it('rejects incorrect passcodes', async () => {
    const userId = await AppUserService.add({
      name: 'Test User',
      role: 'owner',
      contextAccess: 'both',
      passcode: '9999'
    });

    const verified = await AppUserService.verifyAndMigrate(userId as number, '0000');
    expect(verified).toBe(false);
  });
});
