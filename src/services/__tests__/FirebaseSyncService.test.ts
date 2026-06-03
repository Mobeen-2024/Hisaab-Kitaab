import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { db } from '../../db';
import { FirebaseSyncService, sanitizeForFirestore } from '../FirebaseSyncService';

// Mock Firebase Modules
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

import { setDoc, deleteDoc } from 'firebase/firestore';

vi.mock('firebase/firestore', () => ({
  initializeFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn((_db, path) => ({ path })),
  setDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  onSnapshot: vi.fn(() => () => {}),
  getDocs: vi.fn().mockResolvedValue({ docs: [], empty: true }),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  })),
  enableNetwork: vi.fn(),
  disableNetwork: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: { uid: 'test-uid' },
  })),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));



// Mock localStorage
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

describe('sanitizeForFirestore', () => {
  it('removes top-level undefined', () => {
    expect(sanitizeForFirestore(undefined)).toBeUndefined();
  });

  it('keeps null', () => {
    expect(sanitizeForFirestore(null)).toBeNull();
  });

  it('converts Date to ISO string', () => {
    const d = new Date('2023-01-01T00:00:00Z');
    expect(sanitizeForFirestore(d)).toBe('2023-01-01T00:00:00.000Z');
  });

  it('removes undefined keys from object', () => {
    const obj = { a: 1, b: undefined, c: 3 };
    expect(sanitizeForFirestore(obj)).toEqual({ a: 1, c: 3 });
  });

  it('converts undefined in arrays to null', () => {
    const arr = [1, undefined, 3];
    expect(sanitizeForFirestore(arr)).toEqual([1, null, 3]);
  });

  it('recursively sanitizes nested objects and arrays', () => {
    const obj = {
      nestedObj: {
        x: undefined,
        y: [undefined, { z: undefined, w: 5 }]
      }
    };
    expect(sanitizeForFirestore(obj)).toEqual({
      nestedObj: {
        y: [null, { w: 5 }]
      }
    });
  });

  it('removes symbols and functions', () => {
    const obj = {
      fn: () => {},
      sym: Symbol('test'),
      valid: 'value'
    };
    expect(sanitizeForFirestore(obj)).toEqual({ valid: 'value' });
  });
});

describe('FirebaseSyncService Tests', () => {
  const originalConsoleError = console.error;

  beforeEach(async () => {
    console.error = (...args: any[]) => {
      const msg = args.join(' ');
      if (msg.includes('NotFoundError') || msg.includes('DatabaseClosedError')) return;
      originalConsoleError(...args);
    };

    db.close();
    await Dexie.delete('HisaibKItaibDB');
    db.isImporting = true;
    await db.open();
    db.isImporting = false;

    await new Promise(resolve => setTimeout(resolve, 100));
    db.isImporting = true;
    await db.syncQueue.clear();
    await db.settings.clear();
    db.isImporting = false;
    localStorage.clear();
    vi.clearAllMocks();
    
    // Set standard mock behaviors
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
    });
  });

  afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    db.close();
    console.error = originalConsoleError;
  });

  it('does not process queue when sync is disabled', async () => {
    await db.syncQueue.clear();
    localStorage.setItem('firebase_sync_enabled', 'false');

    await db.syncQueue.add({
      action: 'UPSERT',
      entityType: 'transactions',
      remoteId: 'remote-1',
      timestamp: new Date().toISOString(),
      payload: { amount: 100, description: 'Lunch' }
    });

    await FirebaseSyncService.processQueue();

    // Sync queue must still have 1 item
    const count = await db.syncQueue.count();
    expect(count).toBe(1);
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('does not process queue when offline', async () => {
    await db.syncQueue.clear();
    localStorage.setItem('firebase_sync_enabled', 'true');
    Object.defineProperty(navigator, 'onLine', { value: false });

    await db.syncQueue.add({
      action: 'UPSERT',
      entityType: 'transactions',
      remoteId: 'remote-2',
      timestamp: new Date().toISOString(),
      payload: { amount: 200, description: 'Dinner' }
    });

    await FirebaseSyncService.processQueue();

    // Sync queue must still have 1 item
    const count = await db.syncQueue.count();
    expect(count).toBe(1);
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('processes upsert/delete actions and clears the local queue when online', async () => {
    await db.syncQueue.clear();
    localStorage.setItem('firebase_sync_enabled', 'true');
    Object.defineProperty(navigator, 'onLine', { value: true });

    // Queue one upsert and one delete
    await db.syncQueue.bulkAdd([
      {
        action: 'UPSERT',
        entityType: 'transactions',
        remoteId: 'tx-1',
        timestamp: new Date().toISOString(),
        payload: { amount: 300, description: 'Breakfast' }
      },
      {
        action: 'DELETE',
        entityType: 'customers',
        remoteId: 'cust-1',
        timestamp: new Date().toISOString(),
        payload: {}
      }
    ]);

    await FirebaseSyncService.processQueue();

    // Verify mock Firestore interactions
    expect(setDoc).toHaveBeenCalled();
    expect(deleteDoc).toHaveBeenCalled();

    // Local sync queue must now be empty
    const count = await db.syncQueue.count();
    expect(count).toBe(0);
  });

  it('removes geminiApiKey from settings payload before syncing', async () => {
    await db.syncQueue.clear();
    localStorage.setItem('firebase_sync_enabled', 'true');
    Object.defineProperty(navigator, 'onLine', { value: true });

    // Queue a settings synchronization containing sensitive Gemini API Key
    await db.syncQueue.add({
      action: 'UPSERT',
      entityType: 'settings',
      remoteId: 'settings-profile',
      timestamp: new Date().toISOString(),
      payload: {
        currency: 'PKR',
        activeContext: 'business',
        geminiApiKey: 'super-secret-key-12345'
      }
    });

    await FirebaseSyncService.processQueue();

    // Verify setDoc was called
    expect(setDoc).toHaveBeenCalled();
    const callArgs = vi.mocked(setDoc).mock.calls[0];
    const syncedPayload = callArgs[1] as any;

    // Assert API key is stripped from synchronized payload
    expect(syncedPayload.geminiApiKey).toBeUndefined();
    expect(syncedPayload.currency).toBe('PKR');
  });

  it('calling triggerQueueProcessing multiple times only runs one processQueue at a time', async () => {
    await db.syncQueue.clear();
    localStorage.setItem('firebase_sync_enabled', 'true');
    Object.defineProperty(navigator, 'onLine', { value: true });

    let resolveSetDoc: (value: any) => void;
    const slowSetDocPromise = new Promise(resolve => { resolveSetDoc = resolve; });
    vi.mocked(setDoc).mockReturnValueOnce(slowSetDocPromise as Promise<void>);

    await db.syncQueue.add({
      action: 'UPSERT',
      entityType: 'transactions',
      remoteId: 'tx-lock-1',
      timestamp: new Date().toISOString(),
      payload: { amount: 100 }
    });

    // Fire two concurrently
    const p1 = FirebaseSyncService.processQueue();
    const p2 = FirebaseSyncService.processQueue();
    
    // Release the first one
    resolveSetDoc!(undefined);
    await Promise.all([p1, p2]);

    // setDoc should only be called once because the second skipped
    expect(setDoc).toHaveBeenCalledTimes(1);
    
    const count = await db.syncQueue.count();
    expect(count).toBe(0);
  });

  it('keeps syncQueue item on upload failure', async () => {
    await db.syncQueue.clear();
    localStorage.setItem('firebase_sync_enabled', 'true');
    Object.defineProperty(navigator, 'onLine', { value: true });

    // Mock upload failure
    vi.mocked(setDoc).mockRejectedValueOnce(new Error('Network error'));

    await db.syncQueue.add({
      action: 'UPSERT',
      entityType: 'transactions',
      remoteId: 'tx-fail-1',
      timestamp: new Date().toISOString(),
      payload: { amount: 500 }
    });

    await FirebaseSyncService.processQueue();

    // Verify setDoc was attempted
    expect(setDoc).toHaveBeenCalledTimes(1);

    // Sync queue must still have 1 item
    const count = await db.syncQueue.count();
    expect(count).toBe(1);
  });
});
