import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Bell, CheckCircle, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export default function ToastItemComponent({
  toast,
  onClose,
}: {
  toast: ToastItem;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const role = toast.type === 'error' ? 'alert' : 'status';
  const ariaLive = toast.type === 'error' ? 'assertive' : 'polite';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className="w-full pointer-events-auto"
      role={role}
      aria-live={ariaLive}
    >
      <div className="bg-[#1E293B]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-3">
        <div className={`p-2 rounded-xl shrink-0 ${
          toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
          toast.type === 'error' ? 'bg-rose-500/20 text-rose-400' :
          'bg-blue-500/20 text-blue-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> :
           toast.type === 'error' ? <AlertCircle size={18} /> :
           <Bell size={18} />}
        </div>
        <p className="text-sm font-medium text-white flex-1">{toast.message}</p>
        <button onClick={onClose} className="p-1 text-slate-500 hover:text-white transition-colors" aria-label="Close notification">
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
}
