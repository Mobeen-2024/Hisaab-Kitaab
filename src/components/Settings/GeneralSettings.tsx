import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

interface GeneralSettingsProps {
  reminderEnabled: boolean;
  setReminderEnabled: (enabled: boolean) => void;
  reminderTime: string;
  setReminderTime: (time: string) => void;
}

export default function GeneralSettings({ reminderEnabled, setReminderEnabled, reminderTime, setReminderTime }: GeneralSettingsProps) {
  return (
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
  );
}
