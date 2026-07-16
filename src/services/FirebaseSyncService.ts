import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  initializeFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';
import Dexie from 'dexie';
import { db } from '../db';
// Use the Firebase config from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let app: any;
let firestore: any;
let auth: any;
let isFirebaseInitialized = false;

try {
  // Only initialize if the user has provided actual config
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'paste_here' || firebaseConfig.apiKey.includes('your_api_key')) {
    throw new Error('Firebase config is missing or invalid');
  }
  
  // Initialize Firebase App
  app = initializeApp(firebaseConfig);
  
  // Initialize Firestore
  firestore = initializeFirestore(app, {});
  
  // Initialize Auth
  auth = getAuth(app);
  
  isFirebaseInitialized = true;
} catch (error) {
  console.warn("Firebase initialization skipped or failed. Cloud Sync will not be available:", error);
  // Provide mock objects so top-level app code doesn't crash on undefined properties
  app = {};
  firestore = {};
  auth = { currentUser: null };
  isFirebaseInitialized = false;
}

// Keep track of active Firestore listener unsubscribers
let activeListeners: (() => void)[] = [];

// Helper to sanitize payload for Firestore (removes undefined, strips symbols/functions)
export function sanitizeForFirestore(value: any): any {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.map((item) => {
      const sanitized = sanitizeForFirestore(item);
      return sanitized === undefined ? null : sanitized;
    });
  }

  if (typeof value === 'object') {
    const output: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      const sanitized = sanitizeForFirestore(val);
      if (sanitized !== undefined) {
        output[key] = sanitized;
      }
    }
    return output;
  }

  if (typeof value === 'function') return undefined;
  if (typeof value === 'symbol') return undefined;

  return value;
}

// Development helper to find undefined paths for debugging
export function findUndefinedPaths(obj: any, path: string = ''): string[] {
  let paths: string[] = [];
  if (obj === undefined) {
    paths.push(path);
    return paths;
  }
  if (obj === null || typeof obj !== 'object' || obj instanceof Date) {
    return paths;
  }
  
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      paths = paths.concat(findUndefinedPaths(item, `${path}[${index}]`));
    });
  } else {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      paths = paths.concat(findUndefinedPaths(value, currentPath));
    }
  }
  return paths;
}

// Flags and interval for background queue processing
let queueIntervalId: any = null;

export const FirebaseSyncService = {
  isProcessingQueue: false,

  // Check if Firebase sync is enabled in settings
  isEnabled(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem('firebase_sync_enabled') === 'true';
  },

  // Get current authenticated user
  getCurrentUser(): User | null {
    return auth.currentUser;
  },

  // Perform Firebase registration and auto-sign in
  async register(email: string, password: string): Promise<User> {
    if (!isFirebaseInitialized) {
      throw new Error("Cloud Sync is not configured. Please add your Firebase API keys to .env.local to enable Cloud Sync.");
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      localStorage.setItem('firebase_sync_enabled', 'true');
      localStorage.setItem('firebase_sync_email', email);
      
      // Start the sync listeners
      this.startSync(userCredential.user.uid);
      
      // Initial upload of existing local data
      await this.uploadAllLocalData(userCredential.user.uid);
      
      return userCredential.user;
    } catch (error: any) {
      console.error("Firebase registration failed:", error);
      throw new Error(error.message || "Failed to register account.");
    }
  },

  // Perform Firebase sign in
  async login(email: string, password: string): Promise<User> {
    if (!isFirebaseInitialized) {
      throw new Error("Cloud Sync is not configured. Please add your Firebase API keys to .env.local to enable Cloud Sync.");
    }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      localStorage.setItem('firebase_sync_enabled', 'true');
      localStorage.setItem('firebase_sync_email', email);
      
      // Start the sync listeners
      this.startSync(userCredential.user.uid);
      
      // Initial upload/download sync
      await this.uploadAllLocalData(userCredential.user.uid);
      
      return userCredential.user;
    } catch (error: any) {
      console.error("Firebase login failed:", error);
      throw new Error(error.message || "Failed to sign in. Please check your credentials.");
    }
  },

  // Log out and stop all sync listeners
  async logout(): Promise<void> {
    try {
      this.stopSync();
      await signOut(auth);
      localStorage.removeItem('firebase_sync_enabled');
      localStorage.removeItem('firebase_sync_email');
    } catch (error) {
      console.error("Firebase logout failed:", error);
      throw error;
    }
  },

  // Local helper to ensure every local record has a remoteId (UUID)
  async ensureLocalRemoteIds(): Promise<void> {
    const tables = [
      { name: 'transactions', dbTable: db.transactions },
      { name: 'customers', dbTable: db.customers },
      { name: 'categories', dbTable: db.categories },
      { name: 'inventory', dbTable: db.inventory },
      { name: 'udhaarEntries', dbTable: db.udhaarEntries },
      { name: 'goals', dbTable: db.goals },
      { name: 'budgets', dbTable: db.budgets },
      { name: 'appUsers', dbTable: db.appUsers },
      { name: 'messages', dbTable: db.messages },
      { name: 'auditLogs', dbTable: db.auditLogs }
    ];

    for (const table of tables) {
      const items = await table.dbTable.toArray();
      await db.transaction('rw', table.dbTable, async () => {
        (Dexie.currentTransaction as any)._isRemoteSync = true;
        for (const item of items) {
          if (!item.remoteId) {
            const remoteId = typeof crypto !== 'undefined' && crypto.randomUUID 
              ? crypto.randomUUID() 
              : Math.random().toString(36).substring(2) + Date.now().toString(36);
            await table.dbTable.update(item.id!, { remoteId });
          }
        }
      });
    }
  },



  // Upload all local data to Firestore (runs on initial login/registration)
  async uploadAllLocalData(userId: string): Promise<void> {
    try {
      await this.ensureLocalRemoteIds();

      const tables = [
        { path: 'transactions', dbTable: db.transactions },
        { path: 'customers', dbTable: db.customers },
        { path: 'categories', dbTable: db.categories },
        { path: 'inventory', dbTable: db.inventory },
        { path: 'udhaarEntries', dbTable: db.udhaarEntries },
        { path: 'goals', dbTable: db.goals },
        { path: 'budgets', dbTable: db.budgets },
        { path: 'appUsers', dbTable: db.appUsers },
        { path: 'messages', dbTable: db.messages },
        { path: 'auditLogs', dbTable: db.auditLogs }
      ];

      for (const table of tables) {
        const items = await table.dbTable.toArray();
        if (items.length === 0) continue;

        // Batch writes in chunks of 500 documents (Firestore limit)
        const chunkSize = 400;
        for (let i = 0; i < items.length; i += chunkSize) {
          const chunk = items.slice(i, i + chunkSize);
          const batch = writeBatch(firestore);

          for (const item of chunk) {
            if (item.remoteId) {
              const docRef = doc(firestore, `users/${userId}/${table.path}/${item.remoteId}`);
              // Strip local database autoincrement ID to keep Firestore clean
              const { id, ...firebaseData } = item;
              let finalData = firebaseData as any;
              if (table.path === 'appUsers') {
                const { passcodeHash, passcodeSalt, passcode, ...safe } = firebaseData as any;
                finalData = safe;
              }
              const sanitizedData = sanitizeForFirestore(finalData);
              batch.set(docRef, sanitizedData, { merge: true });
            }
          }
          await batch.commit();
        }
      }

      // Sync settings
      const settings = await db.settings.toArray();
      if (settings.length > 0) {
        const docRef = doc(firestore, `users/${userId}/settings/profile`);
        const { id, ...firebaseSettings } = settings[0];
        const { geminiApiKey, ...cleanSettings } = firebaseSettings as any;
        const sanitizedSettings = sanitizeForFirestore(cleanSettings);
        await setDoc(docRef, sanitizedSettings, { merge: true });
      }

      console.log("Initial local database sync upload complete.");
    } catch (e) {
      console.error("Error during initial data upload:", e);
    }
  },

  // Helper to save a single record to Firestore (offline-first, queued automatically by SDK)
  async saveToFirestore(collectionName: string, remoteId: string, data: any): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      const user = auth.currentUser;
      if (!user) return;

      const docRef = collectionName === 'settings'
        ? doc(firestore, `users/${user.uid}/settings/profile`)
        : doc(firestore, `users/${user.uid}/${collectionName}/${remoteId}`);
      // Remove auto-increment local id if present
      const { id, ...cleanData } = data;
      let dataToSet = cleanData;
      if (collectionName === 'settings') {
        const { geminiApiKey, ...rest } = cleanData;
        dataToSet = rest;
      }
      const sanitizedDataToSet = sanitizeForFirestore(dataToSet);
      await setDoc(docRef, sanitizedDataToSet, { merge: true });
    } catch (e) {
      console.error(`Error saving to Firestore [${collectionName}]:`, e);
    }
  },

  // Helper to delete a single record from Firestore (offline-first, queued automatically)
  async deleteFromFirestore(collectionName: string, remoteId: string): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      const user = auth.currentUser;
      if (!user) return;

      const docRef = collectionName === 'settings'
        ? doc(firestore, `users/${user.uid}/settings/profile`)
        : doc(firestore, `users/${user.uid}/${collectionName}/${remoteId}`);
      await deleteDoc(docRef);
    } catch (e) {
      console.error(`Error deleting from Firestore [${collectionName}]:`, e);
    }
  },

  // Clear all user data from Firestore
  async clearCloudData(userId: string): Promise<void> {
    const collectionsToClear = [
      'transactions', 'customers', 'categories', 'inventory', 
      'udhaarEntries', 'goals', 'budgets', 'appUsers', 'messages', 'auditLogs'
    ];
    for (const colName of collectionsToClear) {
      try {
        const colRef = collection(firestore, `users/${userId}/${colName}`);
        const snapshot = await getDocs(colRef);
        if (snapshot.empty) continue;
        
        const chunkSize = 400;
        for (let i = 0; i < snapshot.docs.length; i += chunkSize) {
          const chunk = snapshot.docs.slice(i, i + chunkSize);
          const batch = writeBatch(firestore);
          chunk.forEach(docSnap => batch.delete(docSnap.ref));
          await batch.commit();
        }
      } catch (e) {
        console.error(`Error clearing cloud collection [${colName}]:`, e);
        throw e;
      }
    }

    // Clear settings doc if it exists
    try {
      const settingsRef = doc(firestore, `users/${userId}/settings/profile`);
      await deleteDoc(settingsRef);
    } catch (e) {
      console.error("Error clearing cloud settings:", e);
      throw e;
    }
  },

  // Start queue processing interval
  startQueueTimer() {
    if (queueIntervalId) return;
    queueIntervalId = setInterval(() => {
      this.triggerQueueProcessing();
    }, 5000);
    this.triggerQueueProcessing();
  },

  // Stop queue processing interval
  stopQueueTimer() {
    if (queueIntervalId) {
      clearInterval(queueIntervalId);
      queueIntervalId = null;
    }
  },

  // Start real-time Firestore listeners to sync down changes to Dexie
  async startSync(userId: string): Promise<void> {
    // Prevent starting duplicate listeners
    this.stopSync();

    // Process pending full sync if applicable
    const success = await this.processPendingFullSync(userId);
    if (!success) {
      console.warn("[Sync] Pending full sync failed. Listeners will not be started until it succeeds.");
      return;
    }

    this.startQueueTimer();

    console.log("Starting Firebase real-time listeners for user:", userId);

    const collectionsToSync = [
      { name: 'transactions', dbTable: db.transactions },
      { name: 'customers', dbTable: db.customers },
      { name: 'categories', dbTable: db.categories },
      { name: 'inventory', dbTable: db.inventory },
      { name: 'udhaarEntries', dbTable: db.udhaarEntries },
      { name: 'goals', dbTable: db.goals },
      { name: 'budgets', dbTable: db.budgets },
      { name: 'appUsers', dbTable: db.appUsers },
      { name: 'messages', dbTable: db.messages },
      { name: 'auditLogs', dbTable: db.auditLogs }
    ];

    for (const col of collectionsToSync) {
      const colRef = collection(firestore, `users/${userId}/${col.name}`);
      const unsub = onSnapshot(colRef, async (snapshot) => {
        try {
          await db.transaction('rw', col.dbTable, async () => {
            (Dexie.currentTransaction as any)._isRemoteSync = true;
            
            const changes = snapshot.docChanges();
            if (changes.length === 0) return;

            const remoteIds = changes.map(c => c.doc.id);
            const localRecords = await col.dbTable.where('remoteId').anyOf(remoteIds).toArray();
            const localRecordMap = new Map(localRecords.map(r => [(r as any).remoteId, r]));

            const toPut: any[] = [];
            const toAdd: any[] = [];
            const idsToDelete: any[] = [];
            const auditLogsToAdd: any[] = [];
            let conflictOccurred = false;

            for (const change of changes) {
              const docData = change.doc.data();
              const remoteId = change.doc.id;
              
              const localRecord = localRecordMap.get(remoteId);

              if (change.type === 'added' || change.type === 'modified') {
                const fullRecord = { ...docData, remoteId } as any;

                if (localRecord) {
                  // Keep local autoincrement id
                  fullRecord.id = (localRecord as any).id;
                  
                  const remoteUpdatedAt = docData.updatedAt ?? '';
                  const localUpdatedAt = (localRecord as any).updatedAt ?? '';

                  if (remoteUpdatedAt > localUpdatedAt) {
                    toPut.push(fullRecord);
                    auditLogsToAdd.push({
                      entityType: col.name as any,
                      entityId: (localRecord as any).id!,
                      action: 'update',
                      timestamp: new Date().toISOString(),
                      details: `Conflict resolved: remote (${remoteUpdatedAt}) > local (${localUpdatedAt})`,
                      context: (localRecord as any).context
                    });
                    conflictOccurred = true;
                  } else if (remoteUpdatedAt === '' && localUpdatedAt === '') {
                    const isDifferent = Object.keys(docData).some(
                      key => JSON.stringify(docData[key]) !== JSON.stringify((localRecord as any)[key])
                    );
                    if (isDifferent) {
                      toPut.push(fullRecord);
                    }
                  }
                } else {
                  // New record from another device - add to Dexie, letting Dexie generate local ID
                  toAdd.push(fullRecord);
                }
              } else if (change.type === 'removed') {
                if (localRecord) {
                  idsToDelete.push((localRecord as any).id!);
                }
              }
            }

            if (toPut.length > 0) {
              await col.dbTable.bulkPut(toPut);
            }
            if (toAdd.length > 0) {
              await col.dbTable.bulkAdd(toAdd);
            }
            if (idsToDelete.length > 0) {
              await col.dbTable.bulkDelete(idsToDelete);
            }
            if (auditLogsToAdd.length > 0) {
              db.auditLogs.bulkAdd(auditLogsToAdd).catch(() => {});
            }
            if (conflictOccurred) {
              window.dispatchEvent(new CustomEvent('hk:sync-conflict', { detail: { col: col.name } }));
            }
          });
        } catch (e) {
          console.error(`Error processing real-time snapshot for [${col.name}]:`, e);
        }
      }, (error) => {
        console.error(`Firestore listener error [${col.name}]:`, error);
      });

      activeListeners.push(unsub);
    }

    // Sync Settings Singleton document
    const settingsRef = doc(firestore, `users/${userId}/settings/profile`);
    const settingsUnsub = onSnapshot(settingsRef, async (snapshot) => {
      if (snapshot.exists()) {
        try {
          const docData = snapshot.data();
          await db.transaction('rw', db.settings, async () => {
            (Dexie.currentTransaction as any)._isRemoteSync = true;
            const localSettings = await db.settings.toCollection().first();
            if (localSettings) {
              const isDifferent = Object.keys(docData).some(
                key => JSON.stringify(docData[key]) !== JSON.stringify((localSettings as any)[key])
              );
              if (isDifferent) {
                await db.settings.update(localSettings.id!, docData);
              }
            } else {
              await db.settings.add(docData as any);
            }
          });
        } catch (e) {
          console.error("Error syncing settings doc:", e);
        }
      }
    });

    activeListeners.push(settingsUnsub);
  },

  // Stop all listeners
  stopSync(): void {
    this.stopQueueTimer();
    if (activeListeners.length > 0) {
      console.log("Stopping active Firebase sync listeners.");
      activeListeners.forEach(unsub => unsub());
      activeListeners = [];
    }
  },

  hasPendingFullSync(): boolean {
    return localStorage.getItem('firebase_needs_full_sync') === 'true';
  },

  clearPendingFullSync(): void {
    localStorage.removeItem('firebase_needs_full_sync');
    localStorage.removeItem('firebase_needs_full_sync_user_id');
    localStorage.removeItem('firebase_needs_full_sync_created_at');
  },

  _isProcessingFullSync: false,

  async processPendingFullSync(userId: string): Promise<boolean> {
    if (!this.hasPendingFullSync()) return true;

    const pendingUserId = localStorage.getItem('firebase_needs_full_sync_user_id');
    if (pendingUserId && pendingUserId !== userId) {
      console.warn(`[Sync] Pending full sync is for user ${pendingUserId}, but current user is ${userId}. Ignoring.`);
      // Do not clear the flag, just surface issue/skip. 
      return false; 
    }

    if (this._isProcessingFullSync) return false;
    this._isProcessingFullSync = true;

    console.log("[Sync] Offline restore detected. Performing full sync now.");
    // Ensure listeners are stopped before wipe
    this.stopSync();

    try {
      await this.clearCloudData(userId);
      await this.uploadAllLocalData(userId);
      this.clearPendingFullSync();
      return true;
    } catch (error) {
      console.error("[Sync] Failed to perform full sync after restore:", error);
      return false;
    } finally {
      this._isProcessingFullSync = false;
    }
  },

  _isOnlineListenerAdded: false,

  // Automatically start sync on page load if enabled
  initSyncOnAuth(): void {
    if (!this._isOnlineListenerAdded) {
      this._isOnlineListenerAdded = true;
      window.addEventListener('online', () => {
        if (this.isEnabled() && auth.currentUser) {
          this.startSync(auth.currentUser.uid);
        }
      });
    }

    onAuthStateChanged(auth, async (user) => {
      if (user && this.isEnabled()) {
        this.startSync(user.uid);
      } else {
        this.stopSync();
      }
    });
  },

  triggerQueueProcessing(): void {
    this.processQueue().catch(console.error);
  },

  async processQueue(): Promise<void> {
    if (this.isProcessingQueue) {
      return;
    }
    this.isProcessingQueue = true;

    try {
      if (!this.isEnabled()) return;
      if (!navigator.onLine) return;
      
      const user = auth.currentUser;
      if (!user) return;

      const queueItems = await db.syncQueue.orderBy('timestamp').limit(100).toArray();
      if (queueItems.length === 0) {
        return;
      }

      // Group by key (entityType + ':' + remoteId)
      const grouped = new Map<string, typeof queueItems>();
      for (const item of queueItems) {
        const key = `${item.entityType}:${item.remoteId}`;
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key)!.push(item);
      }

      const deduplicatedItems: typeof queueItems = [];
      const idsToDelete: number[] = [];

      for (const [key, items] of grouped.entries()) {
        const latestItem = items[items.length - 1];
        const hasDelete = items.some(i => i.action === 'DELETE');
        
        if (hasDelete) {
          const deleteItem = items.find(i => i.action === 'DELETE');
          if (deleteItem) {
            deduplicatedItems.push(deleteItem);
            items.forEach(i => {
              if (i.id !== deleteItem.id && i.id !== undefined) {
                idsToDelete.push(i.id);
              }
            });
          }
        } else {
          deduplicatedItems.push(latestItem);
          items.forEach(i => {
            if (i.id !== latestItem.id && i.id !== undefined) {
              idsToDelete.push(i.id);
            }
          });
        }
      }

      if (idsToDelete.length > 0) {
        await db.syncQueue.bulkDelete(idsToDelete);
      }

      const nowStr = new Date().toISOString();
      const nowMs = Date.now();

      for (const item of deduplicatedItems) {
        if (item.orphaned) continue;

        if (item.retryCount !== undefined && item.retryCount >= 10) {
          await db.syncQueue.update(item.id!, { orphaned: true });
          continue;
        }

        if (item.lastAttemptAt && item.retryCount !== undefined) {
          const backoffTime = Math.min(Math.pow(2, item.retryCount) * 5000, 3600000);
          const lastAttempt = new Date(item.lastAttemptAt).getTime();
          if (nowMs - lastAttempt < backoffTime) {
            continue;
          }
        }

        try {
          const docRef = item.entityType === 'settings'
            ? doc(firestore, `users/${user.uid}/settings/profile`)
            : doc(firestore, `users/${user.uid}/${item.entityType}/${item.remoteId}`);

          if (item.action === 'UPSERT') {
            const { id, _isRemoteSync, ...cleanPayload } = item.payload || {};
            let dataToSet = cleanPayload;
            if (item.entityType === 'settings') {
              const { geminiApiKey, ...rest } = cleanPayload;
              dataToSet = rest;
            } else if (item.entityType === 'appUsers') {
              const { passcodeHash, passcodeSalt, passcode, ...rest } = cleanPayload;
              dataToSet = rest;
            }

            const sanitizedDataToSet = sanitizeForFirestore(dataToSet);

            await setDoc(docRef, sanitizedDataToSet, { merge: true });
          } else if (item.action === 'DELETE') {
            await deleteDoc(docRef);
          }

          if (item.id !== undefined) {
            await db.syncQueue.delete(item.id);
          }
        } catch (err: any) {
          console.warn('[Sync] Upload failed', {
            entityType: item.entityType,
            remoteId: item.remoteId,
            errorCode: err?.code,
            errorMessage: err?.message,
          });

          await db.syncQueue.update(item.id!, {
            retryCount: (item.retryCount || 0) + 1,
            lastAttemptAt: nowStr
          });
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }
};
