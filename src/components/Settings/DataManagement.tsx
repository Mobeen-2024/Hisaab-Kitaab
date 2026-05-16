import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Upload, Shield, AlertTriangle, Trash2 } from 'lucide-react';
import { db } from '../../db';

interface DataManagementProps {
  setImportModalOpen: (open: boolean) => void;
  confirmModal: { isOpen: boolean, type: 'clear' | 'reset' };
  setConfirmModal: (modal: { isOpen: boolean, type: 'clear' | 'reset' }) => void;
}

export default function DataManagement({ setImportModalOpen, confirmModal, setConfirmModal }: DataManagementProps) {
  const backupInputRef = useRef<HTMLInputElement>(null);

  const handleExportData = async () => {
    try {
      const data = await db.exportData();
      const blob = new Blob([data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Hisaab-Kitaab_Backup_${new Date().toISOString().split('T')[0]}.bak`;
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
                      if (confirmModal.type === 'clear') await db.transactions.clear();
                      else await db.delete();
                      setConfirmModal({ ...confirmModal, isOpen: false });
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
      </div>
    </div>
  );
}
