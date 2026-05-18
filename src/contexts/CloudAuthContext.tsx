import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { FirebaseSyncService } from '../services/FirebaseSyncService';

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
  const [isSyncEnabled, setIsSyncEnabled] = useState(FirebaseSyncService.isEnabled());

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
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

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    await FirebaseSyncService.login(email, password);
    setIsSyncEnabled(true);
  };

  const register = async (email: string, password: string) => {
    await FirebaseSyncService.register(email, password);
    setIsSyncEnabled(true);
  };

  const logout = async () => {
    await FirebaseSyncService.logout();
    setIsSyncEnabled(false);
  };

  return (
    <CloudAuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isSyncEnabled,
      loading,
      login,
      register,
      logout
    }}>
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
