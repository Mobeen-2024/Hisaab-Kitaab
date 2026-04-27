import React from 'react';
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative bg-slate-900 border border-slate-700/50 p-6 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col items-center text-center"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isDestructive ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'}`}>
              <AlertTriangle size={24} />
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
            <p className="text-sm text-slate-300 mb-6">{message}</p>
            
            <div className="flex gap-3 w-full">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-slate-300 bg-slate-800 hover:bg-slate-700 font-medium transition-colors"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`flex-1 py-2.5 rounded-xl font-medium transition-colors ${
                  isDestructive 
                    ? 'bg-rose-600 hover:bg-rose-500 text-white' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
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
}
