import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, 
  Upload, 
  Shield, 
  AlertTriangle, 
  Trash2, 
  Cloud, 
  RefreshCw, 
  User, 
  Lock, 
  CheckCircle, 
  LogOut 
} from 'lucide-react';
import { SettingsService } from '../../services/SettingsService';
import { TransactionService } from '../../services/TransactionService';
import { FirebaseSyncService } from '../../services/FirebaseSyncService';
import { db } from '../../db';

interface DataManagementProps {
  setImportModalOpen: (open: boolean) => void;
  confirmModal: { isOpen: boolean, type: 'clear' | 'reset' };
  setConfirmModal: (modal: { isOpen: boolean, type: 'clear' | 'reset' }) => void;
}

export default function DataManagement({ setImportModalOpen, confirmModal, setConfirmModal }: DataManagementProps) {
  const backupInputRef = useRef<HTMLInputElement>(null);

  // Sync state
  const [isSyncEnabled, setIsSyncEnabled] = useState(FirebaseSyncService.isEnabled());
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(localStorage.getItem('firebase_sync_email'));
  
  // Form state
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Sync now action state
  const [isSyncingNow, setIsSyncingNow] = useState(false);

  // Restore Sync interaction states
  const [pendingImportData, setPendingImportData] = useState<string | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Refresh status periodically or on state change
  useEffect(() => {
    setIsSyncEnabled(FirebaseSyncService.isEnabled());
    setCurrentUserEmail(localStorage.getItem('firebase_sync_email'));
  }, []);

  const handleExportData = async () => {
    try {
      const data = await SettingsService.exportData();
      const blob = new Blob([data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HisaibKitaib_Backup_${new Date().toISOString().split('T')[0]}.bak`;
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
        if (FirebaseSyncService.isEnabled()) {
          setPendingImportData(str);
          setShowRestoreModal(true);
        } else {
          try {
            const success = await SettingsService.importData(str);
            if (success) {
              await db.syncQueue.clear();
              alert("Data restored successfully!");
              window.location.reload();
            } else {
              alert("Backup file is corrupt or invalid.");
            }
          } catch (err) {
            alert("Backup file is corrupt or invalid.");
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const executeRestore = async (choice: 'local' | 'cloud') => {
    if (!pendingImportData) return;
    setIsRestoring(true);
    try {
      if (choice === 'local') {
        // Disable Sync and logout
        await FirebaseSyncService.logout();
        const success = await SettingsService.importData(pendingImportData);
        if (success) {
          await db.syncQueue.clear();
          alert("Data restored successfully! Cloud sync has been disabled.");
          window.location.reload();
        } else {
          alert("Backup file is corrupt or invalid.");
        }
      } else {
        if (!navigator.onLine) {
          alert("You are offline. Re-upload to Cloud requires an active internet connection.");
          setIsRestoring(false);
          return;
        }

        // Clean Cloud Re-upload
        const user = FirebaseSyncService.getCurrentUser();
        if (!user) {
          alert("No active user session to upload to cloud.");
          setIsRestoring(false);
          return;
        }

        // Pause sync listener
        FirebaseSyncService.stopSync();

        const success = await SettingsService.importData(pendingImportData);
        if (success) {
          await db.syncQueue.clear();
          // Clear cloud collections completely
          await FirebaseSyncService.clearCloudData(user.uid);
          // Upload local data to clean cloud state
          await FirebaseSyncService.uploadAllLocalData(user.uid);
          // Restart sync listener
          FirebaseSyncService.startSync(user.uid);

          alert("Data restored successfully and uploaded to Cloud!");
          window.location.reload();
        } else {
          alert("Backup file is corrupt or invalid.");
        }
      }
    } catch (e: any) {
      alert("Restore failed: " + e.message);
    } finally {
      setIsRestoring(false);
      setShowRestoreModal(false);
      setPendingImportData(null);
    }
  };

  // Handle Firebase Sign In
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }
    
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);
    
    try {
      await FirebaseSyncService.login(email, password);
      setIsSyncEnabled(true);
      setCurrentUserEmail(email);
      setSuccessMessage("Cloud Sync activated successfully!");
      setEmail('');
      setPassword('');
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Firebase Account Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }
    
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);
    
    try {
      await FirebaseSyncService.register(email, password);
      setIsSyncEnabled(true);
      setCurrentUserEmail(email);
      setSuccessMessage("Shop Account registered and Cloud Sync activated!");
      setEmail('');
      setPassword('');
    } catch (err: any) {
      setErrorMessage(err.message || "Registration failed. Try a different email.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Trigger immediate upload sync
  const handleSyncNow = async () => {
    const user = FirebaseSyncService.getCurrentUser();
    if (!user) return;

    setIsSyncingNow(true);
    setSuccessMessage('');
    setErrorMessage('');
    
    try {
      await FirebaseSyncService.uploadAllLocalData(user.uid);
      setSuccessMessage("All local data synchronized to Cloud successfully!");
    } catch (err: any) {
      setErrorMessage("Data synchronization encountered an issue: " + err.message);
    } finally {
      setIsSyncingNow(false);
    }
  };

  // Disable sync and log out
  const handleLogout = async () => {
    try {
      await FirebaseSyncService.logout();
      setIsSyncEnabled(false);
      setCurrentUserEmail(null);
      setSuccessMessage("Cloud Sync disabled. Your data remains safe locally on this device.");
    } catch (err: any) {
      setErrorMessage("Logout encountered an issue.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Security & Data Section */}
      <div className="bg-[#0F172A]/50 p-4 lg:p-5 rounded-xl border border-white/5 space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-2.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-xl shrink-0">
            <Shield size={24} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Security & Data</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Your data is locally secured and fully encrypted on your device. Take regular backups to prevent record loss.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <input type="file" ref={backupInputRef} onChange={handleImportData} accept=".bak" className="hidden" />
          <button
            onClick={() => backupInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-[#1E293B] hover:bg-slate-700 border border-white/10 text-white rounded-xl text-sm font-bold transition-colors"
          >
            <Upload size={18} className="text-indigo-400" />
            <span>Restore</span>
          </button>
          <button
            onClick={handleExportData}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-white rounded-xl text-sm font-bold transition-colors"
          >
            <Download size={18} className="text-indigo-400" />
            <span>Backup Data</span>
          </button>
        </div>
      </div>

      {/* Cloud Sync & Multi-Device Support Section */}
      <div className="bg-[#0F172A]/50 p-4 lg:p-5 rounded-xl border border-white/5 space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-2.5 bg-sky-500/20 text-sky-400 border border-sky-500/20 rounded-xl shrink-0">
            <Cloud size={24} />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-sm font-bold text-white">Cloud Sync & Multi-Device</h3>
              {isSyncEnabled ? (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  Offline Only
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Authenticate your shop to enable real-time cloud backup and allow staff members to use the digital ledger simultaneously.
            </p>
          </div>
        </div>

        {/* Message Banner Feed */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold leading-relaxed">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold leading-relaxed flex items-center gap-2">
            <CheckCircle size={14} className="shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {isSyncEnabled && currentUserEmail ? (
          /* CONNECTED STATE VIEW */
          <div className="space-y-4 pt-2">
            <div className="p-4 bg-slate-900/60 border border-white/5 rounded-xl space-y-2">
              <div className="text-xs text-slate-400">Shop Connected Account:</div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                {currentUserEmail}
              </div>
              <div className="text-[11px] text-slate-500 leading-relaxed mt-1">
                Your data is automatically synced locally and uploaded in the background. Changes on other coupled devices will update this screen instantly.
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleSyncNow}
                disabled={isSyncingNow}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-sky-600/20 hover:bg-sky-600/30 disabled:opacity-50 border border-sky-500/30 text-sky-300 rounded-xl text-sm font-bold transition-all"
              >
                <RefreshCw size={16} className={`text-sky-400 ${isSyncingNow ? 'animate-spin' : ''}`} />
                <span>{isSyncingNow ? 'Syncing...' : 'Sync Cloud Now'}</span>
              </button>
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#1E293B] hover:bg-slate-700 border border-white/10 text-slate-300 rounded-xl text-sm font-bold transition-all"
              >
                <LogOut size={16} className="text-slate-400" />
                <span>Disable & Disconnect</span>
              </button>
            </div>
          </div>
        ) : (
          /* AUTHENTICATION FORM VIEW */
          <div className="pt-2 space-y-4">
            {/* Tabs for switching authentication */}
            <div className="flex border-b border-white/5">
              <button
                onClick={() => { setActiveTab('login'); setErrorMessage(''); setSuccessMessage(''); }}
                className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'login' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-400 hover:text-white'}`}
              >
                Sign In Shop
              </button>
              <button
                onClick={() => { setActiveTab('register'); setErrorMessage(''); setSuccessMessage(''); }}
                className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'register' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-400 hover:text-white'}`}
              >
                Register Shop
              </button>
            </div>

            <form onSubmit={activeTab === 'login' ? handleLogin : handleRegister} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Shop Email Address</label>
                <div className="relative flex items-center">
                  <User size={16} className="absolute left-3.5 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. shopowner@hisaibkitaib.com"
                    className="w-full pl-10 pr-4 py-3 bg-[#1E293B]/70 border border-white/10 text-white rounded-xl text-sm focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 focus:outline-none transition-all placeholder:text-slate-600"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Shop Access Password</label>
                <div className="relative flex items-center">
                  <Lock size={16} className="absolute left-3.5 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter security password (6+ chars)"
                    className="w-full pl-10 pr-4 py-3 bg-[#1E293B]/70 border border-white/10 text-white rounded-xl text-sm focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 focus:outline-none transition-all placeholder:text-slate-600"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 mt-2 px-4 py-3.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md shadow-sky-500/10 transition-colors cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin text-white" />
                    <span>Processing Setup...</span>
                  </>
                ) : (
                  <>
                    <Cloud size={16} className="text-white" />
                    <span>{activeTab === 'login' ? 'Enable & Connect Shop' : 'Register & Enable Cloud'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-rose-500/5 p-4 lg:p-5 rounded-xl border border-rose-500/10 space-y-4 relative">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg">
            <AlertTriangle size={18} />
          </div>
          <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider">Danger Zone</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
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
          </button>

          <button
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
          </button>
        </div>

        <AnimatePresence>
          {confirmModal.isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md rounded-xl"
            >
              <div className="text-center space-y-4">
                <div className="p-4 bg-rose-500/20 text-rose-500 rounded-full w-fit mx-auto">
                  <AlertTriangle size={32} />
                </div>
                <div>
                  <h4 className="text-white font-bold">Are you absolutely sure?</h4>
                  <p className="text-xs text-slate-400 mt-1">This action cannot be undone.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (confirmModal.type === 'clear') {
                        await TransactionService.clearAll();
                        setConfirmModal({ ...confirmModal, isOpen: false });
                      } else {
                        // If Cloud Sync is active, disable it as well during full reset
                        if (FirebaseSyncService.isEnabled()) {
                          await FirebaseSyncService.logout();
                          setIsSyncEnabled(false);
                          setCurrentUserEmail(null);
                        }
                        await SettingsService.factoryReset();
                        window.location.reload();
                      }
                    }}
                    className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg"
                  >
                    Yes, Execute
                  </button>
                  <button
                    onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                    className="px-4 py-2 bg-white/10 text-white text-xs font-bold rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showRestoreModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md rounded-xl text-center"
            >
              <div className="space-y-4 max-w-sm mx-auto p-2">
                <div className="p-3 bg-amber-500/20 text-amber-500 rounded-full w-fit mx-auto animate-pulse">
                  <Cloud size={28} />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">Cloud Sync Conflict Warning</h4>
                  <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                    Firebase Cloud Sync is active. Restoring this backup will replace your current local data.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                    To prevent cloud data from merging back or overwriting your restored data, choose a safe path:
                  </p>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    disabled={isRestoring}
                    onClick={() => executeRestore('cloud')}
                    className="w-full px-3 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    {isRestoring ? 'Syncing...' : 'Overwrite Cloud & Sync (Re-upload)'}
                  </button>
                  <button
                    disabled={isRestoring}
                    onClick={() => executeRestore('local')}
                    className="w-full px-3 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    Keep Local Only (Disable Sync)
                  </button>
                  <button
                    disabled={isRestoring}
                    onClick={() => {
                      setShowRestoreModal(false);
                      setPendingImportData(null);
                    }}
                    className="w-full px-3 py-2 bg-white/10 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
