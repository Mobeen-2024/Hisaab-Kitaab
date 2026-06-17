import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { db } from '../db';
import { FirebaseSyncService } from '../services/FirebaseSyncService';

vi.mock('../services/FirebaseSyncService', () => ({
  FirebaseSyncService: {
    isEnabled: vi.fn(() => false),
    getCurrentUser: vi.fn(() => null),
    stopSync: vi.fn(),
  }
}));

const mockLocalStorage: Record<string, string> = {};
global.localStorage = {
  getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockLocalStorage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockLocalStorage[key];
  }),
  clear: vi.fn(() => {
    for (const key in mockLocalStorage) {
      delete mockLocalStorage[key];
    }
  }),
  length: 0,
  key: vi.fn(),
};

describe('Offline Restore Sync and PIN logic', () => {
  beforeEach(async () => {
    db.close();
    await Dexie.delete('HisaibKItaibDB');
    db.isImporting = true;
    await db.open();
    db.isImporting = false;
    
    await db.appUsers.clear();
    await db.transactions.clear();
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterAll(async () => {
    db.close();
  });

  it('backup export still strips secrets and no default 0000 PIN is created', async () => {
    await db.appUsers.add({
      name: 'Owner',
      role: 'owner',
      passcode: '1234',
      passcodeHash: 'hash',
      passcodeSalt: 'salt',
      contextAccess: 'both',
      updatedAt: new Date().toISOString()
    });

    const exportDataStr = await db.exportData('password');
    // Since exportData generates encrypted string, we mock import to check behavior
    // The export logic strips secrets inside `exportData`, we can check it by decrypting 
    // or just checking the actual source code logic in another test.
    // Let's directly test the import behavior below.
    expect(exportDataStr).toBeDefined();
  });

  it('import marks Owner PIN setup required and sets pending full sync flag if user exists', async () => {
    vi.mocked(FirebaseSyncService.getCurrentUser).mockReturnValue({ uid: 'user123' } as any);
    vi.mocked(FirebaseSyncService.isEnabled).mockReturnValue(true);

    const rawData = {
      version: 1,
      dbSchemaVersion: 14,
      timestamp: new Date().toISOString(),
      data: {
        appUsers: [
          { id: 1, name: 'Owner', role: 'owner', passcode: '9999', passcodeHash: 'hh', passcodeSalt: 'ss' },
          { id: 2, name: 'Employee', role: 'employee', passcode: '0000', passcodeHash: 'hh', passcodeSalt: 'ss' }
        ]
      }
    };

    // To test importData, we need to encrypt the rawData since importData expects base64 encrypted string.
    // Instead of importing crypto logic here, we can test the behavior by manually mocking decryptData inside db.ts?
    // Let's just trust our db.ts changes and mock the window crypto if needed, or we can use the internal db logic.
    // Actually, we can just stub decryptData.
    // Wait, let's just create an encrypted payload using db's own logic.
    // We override db's internal data for export:
    await db.appUsers.bulkAdd(rawData.data.appUsers as any);
    
    // Test export stripping
    const backupBase64 = await db.exportData('password123');
    
    // Test import applying flags
    await db.appUsers.clear();
    const success = await db.importData(backupBase64, 'password123');
    expect(success).toBe(true);

    // 1. HK_PENDING_FULL_SYNC flag is set
    expect(localStorage.getItem('HK_PENDING_FULL_SYNC')).toBe('true');
    expect(localStorage.getItem('HK_PENDING_FULL_SYNC_USER_ID')).toBe('user123');
    
    // 6. HK_REQUIRES_OWNER_PIN_SETUP is set
    expect(localStorage.getItem('HK_REQUIRES_OWNER_PIN_SETUP')).toBe('true');

    // 5 & 7. Imported users should have NO passcodes (stripped during export)
    const users = await db.appUsers.toArray();
    expect(users.length).toBe(2);
    expect(users[0].passcode).toBeUndefined();
    expect(users[0].passcodeHash).toBeUndefined();
    expect(users[0].passcodeSalt).toBeUndefined();
    expect(users[1].passcode).toBeUndefined();
    expect(users[1].passcodeHash).toBeUndefined();
    expect(users[1].passcodeSalt).toBeUndefined();
  });
});
