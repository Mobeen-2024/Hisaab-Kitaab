import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../db';
import { t } from '../lib/i18n';
import { Shield, Users, Settings as SettingsIcon, Download, Upload, Sparkles, Smartphone, Trash2, AlertTriangle } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import ManageUsers from './ManageUsers';
import { useSettings } from '../contexts/SettingsContext';
import { useUI } from '../contexts/UIContext';

export default function Settings() {
  const { lang, currency, updateSetting } = useSettings();
  const { setIsImportModalOpen } = useUI();
  const settingsObj = useLiveQuery(() => db.settings.get(1));
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('20:00');
  const [tempApiKey, setTempApiKey] = useState('');
  const [isKeySaved, setIsKeySaved] = useState(false);
  const backupInputRef = useRef<HTMLInputElement>(null);
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

  const handleExportData = async () => {
    try {
      const data = await db.exportData();
      const blob = new Blob([data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HisaabKitab_Backup_${new Date().toISOString().split('T')[0]}.bak`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Failed to export data");
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const str = reader.result as string;
        try {
          const success = await db.importData(str);
          if (success) {
            alert("Data restored successfully!");
            window.location.reload();
          } else {
            alert("Backup file is corrupt or invalid.");
          }
        } catch (err) {
          alert("Backup file is corrupt or invalid.");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSaveReminder = async () => {
    if (settingsObj && settingsObj.id) {
      await db.settings.update(settingsObj.id, {
        reminderEnabled,
        reminderTime
      });
    }
  };

  // We should trigger handleSaveReminder whenever they change
  useEffect(() => {
    if (settingsObj) {
      handleSaveReminder();
    }
  }, [reminderEnabled, reminderTime]);


  return (
    <>
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

                {/* Daily Reminder Section */}
                <div className="bg-[#0F172A]/50 p-4 lg:p-5 rounded-xl border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white mb-1">Daily Reminder</h3>
                      <p className="text-xs text-slate-400">"Did you record today's spending?"</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={reminderEnabled}
                        onChange={(e) => {
                          setReminderEnabled(e.target.checked);
                          if (e.target.checked && 'Notification' in window) {
                            Notification.requestPermission();
                          }
                        }}
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                    </label>
                  </div>

                  {reminderEnabled && (
                    <div className="pt-2 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="block text-sm font-medium text-slate-400 mb-2">Time</label>
                      <input
                        type="time"
                        value={reminderTime}
                        onChange={(e) => setReminderTime(e.target.value)}
                        className="w-full bg-[#1E293B] border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* AI Features Section */}
                <div className="bg-[#0F172A]/50 p-4 lg:p-5 rounded-xl border border-indigo-500/10 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white mb-1">AI Features (Gemini)</h3>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Experimental</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs font-medium text-slate-400">Gemini API Key</label>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={tempApiKey}
                          onChange={(e) => {
                            const clean = e.target.value.replace(/[^\x20-\x7E]/g, '').trim();
                            setTempApiKey(clean);
                            setIsKeySaved(false);
                          }}
                          className="flex-1 bg-[#1E293B] border border-white/10 text-white rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-indigo-500/50 outline-none placeholder:text-slate-600"
                          placeholder="AIzaSy..."
                        />
                        <button
                          onClick={async () => {
                            try {
                              const cleanKey = tempApiKey.replace(/[^\x20-\x7E]/g, '').trim();
                              if (!cleanKey.startsWith('AIza')) {
                                alert('This does not look like a valid Google API key. It should start with "AIza".');
                                return;
                              }
                              if (settingsObj?.id) {
                                await db.settings.update(settingsObj.id, { geminiApiKey: cleanKey });
                              } else {
                                await db.settings.put({ id: 1, language: 'en', currency: 'PKR', geminiApiKey: cleanKey });
                              }
                              setTempApiKey(cleanKey);
                              setIsKeySaved(true);
                              setTimeout(() => setIsKeySaved(false), 3000);
                            } catch (e) {
                              console.error('Failed to save API key:', e);
                              alert('Failed to save API key. Please try again.');
                            }
                          }}
                          className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors whitespace-nowrap"
                        >
                          {isKeySaved ? '✓ Saved!' : 'Save Key'}
                        </button>
                      </div>
                      {/* Show currently saved key preview */}
                      {settingsObj?.geminiApiKey && (
                        <p className="text-[11px] text-emerald-400 font-mono">
                          Active key: {settingsObj.geminiApiKey.slice(0, 8)}...{settingsObj.geminiApiKey.slice(-4)}
                          <span className="text-slate-500 ml-2">(length: {settingsObj.geminiApiKey.length})</span>
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <p className="text-[10px] text-slate-500 flex-1">
                          Get a free key from <a href="https://ai.google.dev/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">Google AI Studio → Get API Key</a>. Key must start with "AIza".
                        </p>
                        {settingsObj?.geminiApiKey && (
                          <button
                            onClick={async () => {
                              if (confirm('Clear saved API key and use default from .env?')) {
                                await db.settings.update(settingsObj.id!, { geminiApiKey: undefined });
                                setTempApiKey('');
                                alert('Settings reset! Refreshing...');
                                window.location.reload();
                              }
                            }}
                            className="text-[10px] text-rose-400 hover:text-rose-300 transition-colors"
                          >
                            Reset to Default
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

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
                    type="button"
                    onClick={() => setIsImportModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-white rounded-xl text-sm font-bold transition-colors"
                  >
                    <Upload size={18} className="text-blue-400" />
                    <span>Import Bank/Wallet Data</span>
                  </button>
                </div>

                {/* Trust and Professionalism: Backup Data */}
                <div className="bg-[#0F172A]/50 p-4 lg:p-5 rounded-xl border border-white/5 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-xl shrink-0">
                      <Shield size={24} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white mb-1">Security & Data</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        Your data is locally secured and fully encrypted on your device. Take regular backups to prevent record loss. Audit trails are active for all modifications.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 w-full">
                    <input
                      type="file"
                      ref={backupInputRef}
                      onChange={handleImportData}
                      accept=".bak"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => backupInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-[#1E293B] hover:bg-slate-700 border border-white/10 text-white rounded-xl text-sm font-bold transition-colors"
                      title="Restore from Backup"
                    >
                      <Upload size={18} className="text-indigo-400" />
                      <span>Restore</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportData}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-white rounded-xl text-sm font-bold transition-colors"
                      title="Download Secure Backup"
                    >
                      <Download size={18} className="text-indigo-400" />
                      <span>Backup Data</span>
                    </button>
                  </div>
                </div>
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

              {/* Compact Danger Zone */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative group rounded-2xl border border-rose-500/10 transition-all duration-300 ${confirmModal.isOpen ? 'z-[100]' : 'z-0'}`}
              >
                <div className="absolute inset-0 bg-slate-500/5 rounded-2xl" />

                <div className="relative p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg">
                      <AlertTriangle size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider">Danger Zone</h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setConfirmModal({ isOpen: true, type: 'clear' })}
                      className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center gap-3 hover:bg-white/10 transition-all text-left"
                    >
                      <div className="p-1.5 bg-rose-500/10 text-rose-400 rounded-md">
                        <Trash2 size={14} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Clear Ledger</div>
                        <div className="text-[10px] text-slate-500">Only transactions</div>
                      </div>
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setConfirmModal({ isOpen: true, type: 'reset' })}
                      className="p-3 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 rounded-xl flex items-center gap-3 transition-all text-left"
                    >
                      <div className="p-1.5 bg-rose-600 text-white rounded-md shadow-sm">
                        <Trash2 size={14} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Full Reset</div>
                        <div className="text-[10px] text-rose-300/60">Wipe all data</div>
                      </div>
                    </motion.button>
                  </div>
                </div>

                {/* Premium Floating Local Modal - Anchored Directly to Danger Zone */}
                <AnimatePresence>
                  {confirmModal.isOpen && (
                    <div className="absolute inset-0 z-[99999] flex items-center justify-center">
                      {/* High-Contrast Local Backdrop */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-950/70 backdrop-blur-md rounded-2xl ring-2 ring-rose-500/30"
                      />

                      <motion.div
                        initial={{ opacity: 0, scale: 0.5, y: 20 }}
                        animate={{
                          opacity: 1,
                          scale: 1,
                          y: 0,
                          transition: { type: "spring", damping: 12, stiffness: 400 }
                        }}
                        exit={{ opacity: 0, scale: 0.7, y: 10 }}
                        className="relative bg-[#0F172A] border-2 border-rose-500/40 w-[95%] max-w-[280px] p-6 rounded-[2.5rem] shadow-[0_0_80px_rgba(244,63,94,0.4),0_20px_40px_rgba(0,0,0,0.9)] overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 via-transparent to-rose-500/5" />
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-rose-400 to-transparent animate-[pulse_2s_infinite]" />

                        <div className="relative z-10 flex flex-col items-center text-center space-y-5">
                          <div className="relative group/icon">
                            <div className="absolute inset-0 bg-rose-500/50 blur-3xl rounded-full animate-pulse" />
                            <div className="relative p-5 bg-rose-500/20 text-rose-500 border-2 border-rose-500/30 rounded-2xl transform group-hover/icon:scale-110 transition-transform">
                              <AlertTriangle size={32} />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <h3 className="text-lg font-black text-white uppercase italic tracking-[0.2em] leading-tight">
                              {confirmModal.type === 'clear' ? 'Wipe Data?' : 'Final Reset?'}
                            </h3>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] opacity-80">
                              System Override
                            </p>
                          </div>

                          <div className="flex flex-col w-full gap-2 pt-1">
                            <motion.button
                              whileHover={{ scale: 1.05, backgroundColor: "#F43F5E" }}
                              whileTap={{ scale: 0.95 }}
                              onClick={async () => {
                                if (confirmModal.type === 'clear') {
                                  await db.transactions.clear();
                                } else {
                                  await db.delete();
                                }
                                setConfirmModal({ ...confirmModal, isOpen: false });
                              }}
                              className="w-full py-3.5 bg-rose-600 text-white font-black rounded-xl transition-all shadow-xl shadow-rose-600/40 uppercase tracking-[0.2em] text-[11px] border border-white/10"
                            >
                              Execute
                            </motion.button>
                            <motion.button
                              whileHover={{ backgroundColor: "rgba(255,255,255,0.08)" }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                              className="w-full py-3 bg-white/5 text-slate-400 font-black rounded-xl transition-all text-[10px] uppercase tracking-widest border border-white/5"
                            >
                              Cancel
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
