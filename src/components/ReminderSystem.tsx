import React, { useEffect, useState } from 'react';
import { AppSettings } from '../db';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X } from 'lucide-react';

interface ReminderSystemProps {
  settingsObj: AppSettings | undefined;
}

export default function ReminderSystem({ settingsObj }: ReminderSystemProps) {
  const [showInAppReminder, setShowInAppReminder] = useState(false);

  useEffect(() => {
    if (!settingsObj?.reminderEnabled || !settingsObj.reminderTime) return;

    const checkReminder = () => {
      const now = new Date();
      const currentHours = now.getHours().toString().padStart(2, '0');
      const currentMinutes = now.getMinutes().toString().padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      
      const todayStr = now.toISOString().split('T')[0];
      const lastReminderDate = localStorage.getItem('lastReminderDate');

      if (currentTimeStr >= settingsObj.reminderTime! && lastReminderDate !== todayStr) {
        // Time to remind!
        localStorage.setItem('lastReminderDate', todayStr);
        
        // Show in-app reminder
        setShowInAppReminder(true);

        // Also try system notification if permitted
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Hisaab-Kitab', {
            body: "Did you record today's spending?",
            icon: '/favicon.ico'
          });
        }
      }
    };

    // Check right away and then every minute
    checkReminder();
    const interval = setInterval(checkReminder, 60000);

    return () => clearInterval(interval);
  }, [settingsObj]);

  return (
    <AnimatePresence>
      {showInAppReminder && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[150] w-[90%] max-w-sm"
        >
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-[0_10px_40px_-10px_rgba(59,130,246,0.6)] p-1">
            <div className="bg-[#0F172A]/90 backdrop-blur-xl rounded-xl p-4 flex gap-4 items-start relative border border-white/10">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 border border-blue-500/30">
                <Bell className="text-blue-400" size={20} />
              </div>
              <div className="flex-1 pt-1">
                <h4 className="text-white font-bold text-sm mb-1">Daily Reminder</h4>
                <p className="text-slate-300 text-xs">Did you record today's spending?</p>
              </div>
              <button 
                onClick={() => setShowInAppReminder(false)}
                className="text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1.5 rounded-lg shrink-0 mt-0.5"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
