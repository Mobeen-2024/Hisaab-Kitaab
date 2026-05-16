import React, { useState, useEffect } from 'react';
import { SettingsService } from '../services/SettingsService';
import { Settings as SettingsIcon, Users, Smartphone, Upload } from 'lucide-react';
import ManageUsers from './ManageUsers';
import { useSettings } from '../contexts/SettingsContext';
import { useUIStore } from '../lib/store';
import { useAppSettings } from '../hooks/useData';

// Sub-components
import GeneralSettings from './Settings/GeneralSettings';
import AISettings from './Settings/AISettings';
import DataManagement from './Settings/DataManagement';

export default function Settings() {
  const { lang, currency } = useSettings();
  const { setImportModalOpen } = useUIStore();
  const settingsObj = useAppSettings();
  
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('20:00');
  const [tempApiKey, setTempApiKey] = useState('');
  const [isKeySaved, setIsKeySaved] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, type: 'clear' | 'reset' }>({
    isOpen: false,
    type: 'clear'
  });

  useEffect(() => {
    if (settingsObj) {
      setReminderEnabled(settingsObj.reminderEnabled || false);
      setReminderTime(settingsObj.reminderTime || '20:00');
      if (settingsObj.geminiApiKey && !tempApiKey) {
        setTempApiKey(settingsObj.geminiApiKey);
      }
    }
  }, [settingsObj]);

  const handleSaveReminder = async () => {
    if (settingsObj && settingsObj.id) {
      await SettingsService.update(settingsObj.id, {
        reminderEnabled,
        reminderTime
      });
    }
  };

  useEffect(() => {
    if (settingsObj) {
      handleSaveReminder();
    }
  }, [reminderEnabled, reminderTime]);

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 pb-20 md:pb-0">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 sm:p-8 md:p-10 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3 mb-6">
            <SettingsIcon className="text-slate-400" />
            Settings
          </h2>

          <div className="space-y-6 max-w-2xl">
            {/* App Settings Group */}
            <div className="bg-[#1E293B]/30 p-4 lg:p-6 rounded-2xl border border-white/5 space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="p-3 bg-slate-500/20 text-slate-400 border border-slate-500/20 rounded-xl shrink-0">
                  <SettingsIcon size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white mb-1">App Settings</h3>
                  <p className="text-sm text-slate-400">Reminders, security, and backups</p>
                </div>
              </div>

              <GeneralSettings 
                reminderEnabled={reminderEnabled} 
                setReminderEnabled={setReminderEnabled} 
                reminderTime={reminderTime} 
                setReminderTime={setReminderTime} 
              />

              <AISettings 
                tempApiKey={tempApiKey} 
                setTempApiKey={setTempApiKey} 
                isKeySaved={isKeySaved} 
                setIsKeySaved={setIsKeySaved} 
                settingsObj={settingsObj} 
              />

              {/* Statement Import Section */}
              <div className="bg-[#0F172A]/50 p-4 lg:p-5 rounded-xl border border-blue-500/10 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl shrink-0">
                    <Smartphone size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">Import Statements</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Upload .csv files from Easypaisa, JazzCash, or your Bank to automatically fill your ledger history.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setImportModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-white rounded-xl text-sm font-bold transition-colors"
                >
                  <Upload size={18} className="text-blue-400" />
                  <span>Import Bank/Wallet Data</span>
                </button>
              </div>

              <DataManagement 
                setImportModalOpen={setImportModalOpen} 
                confirmModal={confirmModal} 
                setConfirmModal={setConfirmModal} 
              />
            </div>

            {/* Multi-User / Family Access */}
            <div className="bg-[#1E293B]/30 p-4 lg:p-6 rounded-2xl border border-white/5 space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="p-3 bg-pink-500/20 text-pink-400 border border-pink-500/20 rounded-xl shrink-0">
                  <Users size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white mb-1">Multi-User Access</h3>
                  <p className="text-sm text-slate-400">Share with family or staff</p>
                </div>
              </div>

              <div className="px-2">
                <ManageUsers
                  onClose={() => { }}
                  activeContext={settingsObj?.activeContext || 'personal'}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
