import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { db } from '../../db';
import { FirebaseSyncService } from '../FirebaseSyncService';

// Mock Firebase Modules
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

const mockBatchCommit = vi.fn().mockResolvedValue(undefined);
const mockBatchSet = vi.fn();
const mockBatchDelete = vi.fn();

vi.mock('firebase/firestore', () => ({
  initializeFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn((_db, path) => ({ path })),
  setDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  onSnapshot: vi.fn(() => () => {}),
  getDocs: vi.fn().mockResolvedValue({ docs: [], empty: true }),
  writeBatch: vi.fn(() => ({
    set: mockBatchSet,
    delete: mockBatchDelete,
    commit: mockBatchCommit,
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

vi.mock('../../firebase-applet-config.json', () => ({
  default: {
    apiKey: 'mock-key',
    authDomain: 'mock-domain',
    projectId: 'mock-project',
    firestoreDatabaseId: 'mock-db'
  }
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
    await db.open();

    await db.syncQueue.clear();
    await db.settings.clear();
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
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it('does not process queue when offline', async () => {
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
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it('processes upsert/delete actions and clears the local queue when online', async () => {
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

    // Verify mock Firestore batch interactions
    expect(mockBatchSet).toHaveBeenCalled();
    expect(mockBatchDelete).toHaveBeenCalled();
    expect(mockBatchCommit).toHaveBeenCalled();

    // Local sync queue must now be empty
    const count = await db.syncQueue.count();
    expect(count).toBe(0);
  });

  it('removes geminiApiKey from settings payload before syncing', async () => {
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

    // Verify batch set was called
    expect(mockBatchSet).toHaveBeenCalled();
    const callArgs = mockBatchSet.mock.calls[0];
    const syncedPayload = callArgs[1];

    // Assert API key is stripped from synchronized payload
    expect(syncedPayload.geminiApiKey).toBeUndefined();
    expect(syncedPayload.currency).toBe('PKR');
  });
});
