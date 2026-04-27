import React, { useState, useRef, useEffect } from 'react';
import { db } from '../db';
import { Lang, t } from '../lib/i18n';
import { X, Camera, Save, Download, Upload, Shield, Users, Settings } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import DatePicker from './DatePicker';
import ManageUsers from './ManageUsers';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Lang;
}

export default function ProfileModal({ isOpen, onClose, lang }: ProfileModalProps) {
  const settingsObj = useLiveQuery(() => db.settings.get(1));
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [avatar, setAvatar] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('20:00');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settingsObj) {
      setName(settingsObj.ownerName || '');
      setEmail(settingsObj.ownerEmail || '');
      setDob(settingsObj.ownerDob || '');
      setAvatar(settingsObj.ownerAvatar || '');
      setReminderEnabled(settingsObj.reminderEnabled || false);
      setReminderTime(settingsObj.reminderTime || '20:00');
    }
  }, [settingsObj, isOpen]);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (settingsObj && settingsObj.id) {
      await db.settings.update(settingsObj.id, {
        ownerName: name,
        ownerEmail: email,
        ownerDob: dob,
        ownerAvatar: avatar,
        reminderEnabled,
        reminderTime
      });
      onClose();
    }
  };

  const handleExportData = async () => {
    try {
      const data = await db.exportData();
      const blob = new Blob([data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HisaabKitab_Backup_${new Date().toISOString().split('T')[0]}.bak`;
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
        } catch(err) {
          alert("Backup file is corrupt or invalid.");
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="bg-[#0F172A] border border-white/10 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 hide-scrollbar"
      >
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Owner Profile</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-xl"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="flex justify-center">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full border-4 border-white/10 overflow-hidden bg-gradient-to-tr from-pink-500/20 to-amber-500/20 flex items-center justify-center shrink-0">
                {avatar ? (
                  <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-white/50">{name ? name.charAt(0).toUpperCase() : 'O'}</span>
                )}
              </div>
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Camera size={24} className="text-white" />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Arsalan Khan"
                className="w-full bg-[#1E293B] border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@example.com"
                className="w-full bg-[#1E293B] border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1 z-40">Date of Birth</label>
              <DatePicker
                value={dob}
                onChange={(newDate) => setDob(newDate)}
                className="w-full bg-[#1E293B] border border-white/10 text-white rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
              />
            </div>
          </div>
          
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-colors"
            >
              <Save size={16} />
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
