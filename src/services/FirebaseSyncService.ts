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
import { db } from '../db';
import firebaseConfigJson from '../../firebase-applet-config.json';

// Use the Firebase config from root
const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore using custom database ID from config
const firestore = initializeFirestore(app, {}, firebaseConfigJson.firestoreDatabaseId);

// Initialize Auth
const auth = getAuth(app);

// Keep track of active Firestore listener unsubscribers
let activeListeners: (() => void)[] = [];

// Flag to prevent sync loops
let isSyncingDown = false;

export const FirebaseSyncService = {
  // Check if Firebase sync is enabled in settings
  isEnabled(): boolean {
    return localStorage.getItem('firebase_sync_enabled') === 'true';
  },

  // Get current authenticated user
  getCurrentUser(): User | null {
    return auth.currentUser;
  },

  // Perform Firebase registration and auto-sign in
  async register(email: string, password: string): Promise<User> {
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
      { name: 'messages', dbTable: db.messages }
    ];

    for (const table of tables) {
      const items = await table.dbTable.toArray();
      for (const item of items) {
        if (!item.remoteId) {
          const remoteId = crypto.randomUUID();
          await table.dbTable.update(item.id!, { remoteId });
        }
      }
    }
  },

  // Upload all local data to Firestore (runs on initial login/registration)
  async uploadAllLocalData(userId: string): Promise<void> {
    try {
      isSyncingDown = true;
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
        { path: 'messages', dbTable: db.messages }
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
        await setDoc(docRef, firebaseSettings, { merge: true });
      }

      console.log("Initial local database sync upload complete.");
    } catch (e) {
      console.error("Error during initial data upload:", e);
    } finally {
      isSyncingDown = false;
    }
  },

  // Helper to save a single record to Firestore (offline-first, queued automatically by SDK)
  async saveToFirestore(collectionName: string, remoteId: string, data: any): Promise<void> {
    if (!this.isEnabled()) return;
    if (isSyncingDown) return;

    try {
      const user = auth.currentUser;
      if (!user) return;

      const docRef = doc(firestore, `users/${user.uid}/${collectionName}/${remoteId}`);
      // Remove auto-increment local id if present
      const { id, ...cleanData } = data;
      await setDoc(docRef, cleanData, { merge: true });
    } catch (e) {
      console.error(`Error saving to Firestore [${collectionName}]:`, e);
    }
  },

  // Helper to delete a single record from Firestore (offline-first, queued automatically)
  async deleteFromFirestore(collectionName: string, remoteId: string): Promise<void> {
    if (!this.isEnabled()) return;
    if (isSyncingDown) return;

    try {
      const user = auth.currentUser;
      if (!user) return;

      const docRef = doc(firestore, `users/${user.uid}/${collectionName}/${remoteId}`);
      await deleteDoc(docRef);
    } catch (e) {
      console.error(`Error deleting from Firestore [${collectionName}]:`, e);
    }
  },

  // Start real-time Firestore listeners to sync down changes to Dexie
  startSync(userId: string): void {
    // Prevent starting duplicate listeners
    this.stopSync();

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
      { name: 'messages', dbTable: db.messages }
    ];

    for (const col of collectionsToSync) {
      const colRef = collection(firestore, `users/${userId}/${col.name}`);
      const unsub = onSnapshot(colRef, async (snapshot) => {
        isSyncingDown = true;
        try {
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
        } catch (e) {
          console.error(`Error processing real-time snapshot for [${col.name}]:`, e);
        } finally {
          isSyncingDown = false;
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
        isSyncingDown = true;
        try {
          const docData = snapshot.data();
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
        } catch (e) {
          console.error("Error syncing settings doc:", e);
        } finally {
          isSyncingDown = false;
        }
      }
    });

    activeListeners.push(settingsUnsub);
  },

  // Stop all listeners
  stopSync(): void {
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
  }
};
