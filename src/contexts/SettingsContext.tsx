import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AppSettings, db } from '../db';
import { Lang, isRTL } from '../lib/i18n';
import { SettingsService } from '../services/SettingsService';
import { AppUserService } from '../services/AppUserService';

interface SettingsContextType {
  lang: Lang;
  currency: string;
  activeContext: 'personal' | 'business';
  rtl: boolean;
  ownerName: string;
  ownerAvatar: string | null;
  activeRole: string;
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
  
  const activeUser = users.find(u => u.id === settingsObj?.activeUserId);
  const activeRole = activeUser?.role || 'owner';

  const updateSetting = async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
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
