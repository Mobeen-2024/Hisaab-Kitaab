import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { User } from 'firebase/auth';

interface CloudAuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isSyncEnabled: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const CloudAuthContext = createContext<CloudAuthContextType | undefined>(undefined);

export function CloudAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncEnabled, setIsSyncEnabled] = useState(() => !!localStorage.getItem('firebase_sync_email'));

  useEffect(() => {
    // Only import Firebase if sync is enabled locally
    const isSyncEnabledLocal = !!localStorage.getItem('firebase_sync_email');
    if (!isSyncEnabledLocal) {
      setLoading(false);
      return () => {};
    }

    let unsubscribe = () => {};
    
    Promise.all([
      import('firebase/auth'),
      import('../services/FirebaseSyncService')
    ]).then(([{ getAuth, onAuthStateChanged }, { FirebaseSyncService }]) => {
      try {
        const auth = getAuth();
        unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          setUser(currentUser);
          setIsSyncEnabled(FirebaseSyncService.isEnabled());
          setLoading(false);

          // Handle auto-starting real-time sync listeners upon user authentication
          if (currentUser && FirebaseSyncService.isEnabled()) {
            FirebaseSyncService.startSync(currentUser.uid);
          } else {
            FirebaseSyncService.stopSync();
          }
        });
      } catch (error) {
        console.warn('Firebase Auth is not initialized. Skipping Cloud Sync listeners.');
        setLoading(false);
      }
    }).catch((err) => {
      console.warn('Failed to load Firebase chunks:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { FirebaseSyncService } = await import('../services/FirebaseSyncService');
    await FirebaseSyncService.login(email, password);
    setIsSyncEnabled(true);
  };

  const register = async (email: string, password: string) => {
    const { FirebaseSyncService } = await import('../services/FirebaseSyncService');
    await FirebaseSyncService.register(email, password);
    setIsSyncEnabled(true);
  };

  const logout = async () => {
    const { FirebaseSyncService } = await import('../services/FirebaseSyncService');
    await FirebaseSyncService.logout();
    setIsSyncEnabled(false);
  };

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isSyncEnabled,
    loading,
    login,
    register,
    logout
  }), [user, isSyncEnabled, loading]);

  return (
    <CloudAuthContext.Provider value={value}>
      {children}
    </CloudAuthContext.Provider>
  );
}

export function useCloudAuth() {
  const context = useContext(CloudAuthContext);
  if (context === undefined) {
    throw new Error('useCloudAuth must be used within a CloudAuthProvider');
  }
  return context;
}
