import React, { createContext, useContext, ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, AppSettings } from '../db';
import { Lang, isRTL } from '../lib/i18n';

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
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const settingsObj = useLiveQuery(() => db.settings.toCollection().first());
  const users = useLiveQuery(() => db.appUsers.toArray()) || [];
  
  const isLoading = settingsObj === undefined;

  const lang = (settingsObj?.language || 'en') as Lang;
  const currency = settingsObj?.currency || 'PKR';
  const activeContext = settingsObj?.activeContext || 'business';
  const rtl = isRTL(lang);
  const ownerName = settingsObj?.ownerName || 'Arsalan Khan';
  const ownerAvatar = settingsObj?.ownerAvatar || null;
  
  const activeUser = users.find(u => u.id === settingsObj?.activeUserId);
  const activeRole = activeUser?.role || 'owner';

  const updateSetting = async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    if (settingsObj?.id) {
      await db.settings.update(settingsObj.id, { [key]: value });
    } else {
      await db.settings.add({ language: 'en', currency: 'PKR', activeContext: 'business', [key]: value } as AppSettings);
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
    isLoading
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
