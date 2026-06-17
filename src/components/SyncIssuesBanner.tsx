import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useToast } from '../contexts/ToastContext';
import { AlertCircle, RotateCw, ShieldAlert, X } from 'lucide-react';

export default function SyncIssuesBanner() {
  const { showToast } = useToast();
  const [isDismissed, setIsDismissed] = useState(false);

  // Query orphaned count reliably across platforms
  const orphanedCount = useLiveQuery(
    async () => {
      try {
        if (!db.isOpen()) return 0;
        const allItems = await db.syncQueue.toArray();
        return allItems.filter(item => item.orphaned === true || (item.orphaned as any) === 1).length;
      } catch (err: any) {
        console.warn("Failed to query orphanedCount in SyncIssuesBanner:", err);
        return 0;
      }
    }
  ) ?? 0;

  // Listen for conflict events to display toast
  useEffect(() => {
    const handleConflict = () => {
      showToast('Newer cloud version applied.', 'info');
    };
    window.addEventListener('hk:sync-conflict', handleConflict);
    return () => {
      window.removeEventListener('hk:sync-conflict', handleConflict);
    };
  }, [showToast]);

  if (orphanedCount === 0 || isDismissed) {
    return null;
  }

  const handleRetry = async () => {
    try {
      // Find both boolean true and numeric 1 orphaned items using memory filter
      const allItems = await db.syncQueue.toArray();
      const allOrphaned = allItems.filter(item => item.orphaned === true || (item.orphaned as any) === 1);
      
      await db.transaction('rw', db.syncQueue, async () => {
        for (const item of allOrphaned) {
          if (item.id !== undefined) {
            await db.syncQueue.update(item.id, {
              orphaned: false,
              retryCount: 0
            });
          }
        }
      });

      const { FirebaseSyncService } = await import('../services/FirebaseSyncService');
      FirebaseSyncService?.triggerQueueProcessing?.();
      showToast('Retrying sync...', 'info');
    } catch (e: any) {
      showToast('Failed to retry sync: ' + e.message, 'error');
    }
  };

  const handleKeepOffline = async () => {
    try {
      const allItems = await db.syncQueue.toArray();
      const allOrphaned = allItems.filter(item => item.orphaned === true || (item.orphaned as any) === 1);
      const ids = allOrphaned.map(i => i.id).filter((id): id is number => id !== undefined);

      if (ids.length > 0) {
        await db.syncQueue.bulkDelete(ids);
      }
      showToast('Orphaned items kept offline.', 'info');
    } catch (e: any) {
      showToast('Failed to discard sync items: ' + e.message, 'error');
    }
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[80] w-[92%] max-w-lg bg-[#0F172A] border border-rose-500/30 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-2 duration-300 backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-rose-500/10 rounded-xl text-rose-400 shrink-0">
          <ShieldAlert size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-white">Sync Issues Detected</h4>
          <p className="text-xs text-slate-400 mt-1">
            {orphanedCount} item{orphanedCount > 1 ? 's' : ''} failed to upload after multiple attempts.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={handleRetry}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <RotateCw size={12} className="animate-spin-slow" />
              Retry Now
            </button>
            <button
              onClick={handleKeepOffline}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-xs font-bold transition-colors"
            >
              Keep Offline
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="px-3 py-1.5 bg-transparent hover:bg-white/5 text-slate-400 hover:text-white rounded-lg text-xs font-bold transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="text-slate-500 hover:text-slate-300 transition-colors p-1"
          aria-label="Close Banner"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
