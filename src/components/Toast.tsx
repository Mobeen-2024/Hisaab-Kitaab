import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, CheckCircle, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export default function Toast({ 
  message, 
  type = 'info', 
  isVisible, 
  onClose 
}: { 
  message: string; 
  type?: ToastType; 
  isVisible: boolean; 
  onClose: () => void;
}) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm"
        >
          <div className="bg-[#1E293B]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-3">
            <div className={`p-2 rounded-xl shrink-0 ${
              type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
              type === 'error' ? 'bg-rose-500/20 text-rose-400' :
              'bg-blue-500/20 text-blue-400'
            }`}>
              {type === 'success' ? <CheckCircle size={18} /> :
               type === 'error' ? <AlertCircle size={18} /> :
               <Bell size={18} />}
            </div>
            <p className="text-sm font-medium text-white flex-1">{message}</p>
            <button onClick={onClose} className="p-1 text-slate-500 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
