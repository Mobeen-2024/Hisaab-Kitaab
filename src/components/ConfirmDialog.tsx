import React from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = true
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative bg-[#1E293B] border border-white/10 p-8 rounded-3xl w-full max-w-sm shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center text-center overflow-hidden"
          >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl" />
            
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors p-2"
            >
              <X size={20} />
            </button>
            
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg ${isDestructive ? 'bg-rose-500/20 text-rose-400 shadow-rose-500/10' : 'bg-blue-500/20 text-blue-400 shadow-blue-500/10'}`}>
              <AlertTriangle size={32} />
            </div>
            
            <h3 className="text-2xl font-black text-white mb-2 tracking-tight">{title}</h3>
            <p className="text-slate-400 font-medium mb-8">{message}</p>
            
            <div className="flex gap-3 w-full relative z-10">
              <button
                onClick={onClose}
                className="flex-1 py-3.5 rounded-2xl text-slate-300 bg-white/5 hover:bg-white/10 font-bold transition-all active:scale-95 border border-white/10"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`flex-1 py-3.5 rounded-2xl font-black transition-all active:scale-95 shadow-lg ${
                  isDestructive 
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
