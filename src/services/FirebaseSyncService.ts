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

// Flags and interval for background queue processing
let isProcessingQueue = false;
let queueIntervalId: any = null;

export const FirebaseSyncService = {
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
              batch.set(docRef, firebaseData, { merge: true });
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
        await setDoc(docRef, cleanSettings, { merge: true });
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
      await setDoc(docRef, dataToSet, { merge: true });
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
  startSync(userId: string): void {
    // Prevent starting duplicate listeners
    this.stopSync();

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
            for (const change of snapshot.docChanges()) {
              const docData = change.doc.data();
              const remoteId = change.doc.id;
              
              // Map Firestore doc ID to remoteId field
              const localRecord = await col.dbTable.where('remoteId').equals(remoteId).first();

              if (change.type === 'added' || change.type === 'modified') {
                const fullRecord = { ...docData, remoteId } as any;

                if (localRecord) {
                  // Keep local autoincrement id
                  fullRecord.id = localRecord.id;
                  
                  // Only update if there's an actual difference to avoid endless update loops
                  const isDifferent = Object.keys(docData).some(
                    key => JSON.stringify(docData[key]) !== JSON.stringify((localRecord as any)[key])
                  );
                  
                  if (isDifferent) {
                    await col.dbTable.put(fullRecord);
                  }
                } else {
                  // New record from another device - add to Dexie, letting Dexie generate local ID
                  await col.dbTable.add(fullRecord);
                }
              } else if (change.type === 'removed') {
                if (localRecord) {
                  await col.dbTable.delete(localRecord.id!);
                }
              }
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

  // Automatically start sync on page load if enabled
  initSyncOnAuth(): void {
    onAuthStateChanged(auth, (user) => {
      if (user && this.isEnabled()) {
        this.startSync(user.uid);
      } else {
        this.stopSync();
      }
    });
  },

  triggerQueueProcessing(): void {
    if (isProcessingQueue) return;
    isProcessingQueue = true;
    this.processQueue()
      .catch(console.error)
      .finally(() => {
        isProcessingQueue = false;
      });
  },

  async processQueue(): Promise<void> {
    if (!this.isEnabled()) return;
    if (!navigator.onLine) return;
    
    const user = auth.currentUser;
    if (!user) return;

    // Load up to 500 items from the syncQueue table
    const items = await db.syncQueue.limit(500).toArray();
    if (items.length === 0) return;

    try {
      const batch = writeBatch(firestore);

      // Group/consolidate items by document path, keeping only the latest one
      const consolidatedMap = new Map<string, typeof items[0]>();
      for (const item of items) {
        const pathKey = item.entityType === 'settings'
          ? 'settings/profile'
          : `${item.entityType}/${item.remoteId}`;
        consolidatedMap.set(pathKey, item);
      }

      for (const item of consolidatedMap.values()) {
        const docRef = item.entityType === 'settings'
          ? doc(firestore, `users/${user.uid}/settings/profile`)
          : doc(firestore, `users/${user.uid}/${item.entityType}/${item.remoteId}`);

        if (item.action === 'UPSERT') {
          const { id, _isRemoteSync, ...cleanPayload } = item.payload || {};
          let dataToSet = cleanPayload;
          if (item.entityType === 'settings') {
            const { geminiApiKey, ...rest } = cleanPayload;
            dataToSet = rest;
          }
          batch.set(docRef, dataToSet, { merge: true });
        } else if (item.action === 'DELETE') {
          batch.delete(docRef);
        }
      }

      await batch.commit();

      // Successfully processed this batch, delete them from the sync queue table
      const idsToDelete = items.map(item => item.id).filter((id): id is number => id !== undefined);
      if (idsToDelete.length > 0) {
        await db.syncQueue.bulkDelete(idsToDelete);
      }

      // If we processed 500 items, there might be more, trigger next batch immediately
      if (items.length === 500) {
        setTimeout(() => this.triggerQueueProcessing(), 0);
      }
    } catch (error) {
      console.error("Failed to process sync queue batch:", error);
      // Wait for next interval or manual trigger to retry
    }
  }
};
