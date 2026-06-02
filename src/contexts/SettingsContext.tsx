import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AppSettings, db } from '../db';
import { Lang, isRTL } from '../lib/i18n';
import { SettingsService } from '../services/SettingsService';
import { AppUserService } from '../services/AppUserService';
import { AppUser } from '../models';

interface SettingsContextType {
  lang: Lang;
  currency: string;
  activeContext: 'personal' | 'business';
  rtl: boolean;
  ownerName: string;
  ownerAvatar: string | null;
  activeRole: string;
  activeUser: AppUser | null;
  canAccessPersonal: boolean;
  canAccessBusiness: boolean;
  canViewReports: boolean;
  canViewPlanner: boolean;
  canViewSmart: boolean;
  canManageUsers: boolean;
  canAddEntries: boolean;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  isLoading: boolean;
  dbError: Error | null;
  resetDatabase: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [dbError, setDbError] = useState<Error | null>(null);

  useEffect(() => {
    // Proactively initialize and test the Dexie connection on system boot
    db.open().catch((err) => {
      console.error("Dexie database failed to open on boot:", err);
      setDbError(err);
    });
  }, []);

  const settingsObj = useLiveQuery(() => SettingsService.get());
  const users = useLiveQuery(() => AppUserService.getAll()) || [];
  
  // Bypass loading block if the database is in a crashed state so fallbacks can mount
  const isLoading = settingsObj === undefined && !dbError;

  const lang = (settingsObj?.language || 'en') as Lang;
  const currency = settingsObj?.currency || 'PKR';
  const activeContext = settingsObj?.activeContext || 'business';
  const rtl = isRTL(lang);
  const ownerName = settingsObj?.ownerName || 'Mobeen';
  const ownerAvatar = settingsObj?.ownerAvatar || null;
  
  const activeUser = users.find(u => u.id === settingsObj?.activeUserId) || null;
  // If no user exists yet, default to owner role
  const activeRole = activeUser ? activeUser.role : 'owner';

  // Permission Flags Enforcements
  // 1. Owner has absolute access to everything
  // 2. Spouse can access personal & business if contextAccess allows
  // 3. Cashier can access business only
  // 4. Employee can access only assigned contextAccess
  const isOwner = activeRole === 'owner' || users.length === 0;
  
  const canAccessPersonal = isOwner || (activeUser?.contextAccess === 'personal' || activeUser?.contextAccess === 'both');
  const canAccessBusiness = isOwner || (activeUser?.contextAccess === 'business' || activeUser?.contextAccess === 'both');

  // Page level permissions
  const canViewReports = activeRole === 'owner' || activeRole === 'spouse';
  const canViewPlanner = activeRole === 'owner' || activeRole === 'spouse';
  const canViewSmart = activeRole === 'owner' || activeRole === 'spouse';
  const canManageUsers = activeRole === 'owner';
  
  // Cashier and employee might have different write access, cashier can add entries.
  const canAddEntries = activeRole !== 'employee';

  const updateSetting = async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    if (key === 'activeContext') {
      const targetContext = value as 'personal' | 'business';
      if (targetContext === 'personal' && !canAccessPersonal) {
        throw new Error('Access Denied: You do not have access to Personal context.');
      }
      if (targetContext === 'business' && !canAccessBusiness) {
        throw new Error('Access Denied: You do not have access to Business context.');
      }
    }
    await SettingsService.update({ [key]: value });
  };

  const resetDatabase = async () => {
    try {
      await db.delete();
      window.location.reload();
    } catch (err) {
      console.error("Failed to delete Dexie database, using native indexedDB drop:", err);
      // Hard fallback database purge
      indexedDB.deleteDatabase('HisaibKItaibDB');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  const value = {
    lang,
    currency,
    activeContext,
    rtl,
    ownerName,
    ownerAvatar,
    activeRole,
    activeUser,
    canAccessPersonal,
    canAccessBusiness,
    canViewReports,
    canViewPlanner,
    canViewSmart,
    canManageUsers,
    canAddEntries,
    updateSetting,
    isLoading,
    dbError,
    resetDatabase
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
