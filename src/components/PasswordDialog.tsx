import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/Button';

interface PasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (password: string) => void;
  title: string;
  message: string;
  submitText?: string;
}

export default function PasswordDialog({
  isOpen,
  onClose,
  onSubmit,
  title,
  message,
  submitText = 'Submit'
}: PasswordDialogProps) {
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(password);
    setPassword('');
  };

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
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
            
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors p-2"
            >
              <X size={20} />
            </button>
            
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg bg-blue-500/20 text-blue-400 shadow-blue-500/10">
              <Lock size={32} />
            </div>
            
            <h3 className="text-2xl font-black text-white mb-2 tracking-tight">{title}</h3>
            <p className="text-slate-400 font-medium mb-6">{message}</p>
            
            <form onSubmit={handleSubmit} className="w-full relative z-10 flex flex-col gap-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              
              <div className="flex gap-3 w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  size="lg"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="blue"
                  className="flex-1"
                  size="lg"
                  disabled={!password.trim()}
                >
                  {submitText}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
