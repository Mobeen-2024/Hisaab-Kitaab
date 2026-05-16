import React, { useState, useRef, useEffect } from 'react';
import { db } from '../db';
import { Lang, t, isRTL } from '../lib/i18n';
import { X, Camera, Save, Download, Upload, Shield, Users, Settings, ChevronRight, Phone } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import DatePicker from './DatePicker';
import ManageUsers from './ManageUsers';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Lang;
}

export default function ProfileModal({ isOpen, onClose, lang }: ProfileModalProps) {
  const settingsObj = useLiveQuery(() => db.settings.toCollection().first());
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+92');
  const [avatar, setAvatar] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('20:00');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const countries = [
    { name: 'Pakistan', code: '+92', flag: '🇵🇰' },
    { name: 'India', code: '+91', flag: '🇮🇳' },
    { name: 'UAE', code: '+971', flag: '🇦🇪' },
    { name: 'Saudi Arabia', code: '+966', flag: '🇸🇦' },
    { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
    { name: 'USA', code: '+1', flag: '🇺🇸' },
    { name: 'Canada', code: '+1', flag: '🇨🇦' },
    { name: 'Australia', code: '+61', flag: '🇦🇺' },
  ];

  useEffect(() => {
    if (settingsObj) {
      setName(settingsObj.ownerName || '');
      setEmail(settingsObj.ownerEmail || '');
      setDob(settingsObj.ownerDob || '');
      setPhone(settingsObj.ownerPhone || '');
      setCountryCode(settingsObj.ownerCountryCode || '+92');
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
        ownerPhone: phone,
        ownerCountryCode: countryCode,
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

  const rtl = isRTL(lang);
  const isUrdu = lang === 'ur';

  return (
    <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${rtl ? 'text-right' : 'text-left'}`}>
      <div 
        className="bg-[#0F172A] border border-white/10 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 hide-scrollbar"
        dir={rtl ? 'rtl' : 'ltr'}
      >
        <div className={`flex justify-between items-center p-6 border-b border-white/10 ${rtl ? 'flex-row-reverse' : ''}`}>
          <h2 className="text-xl font-bold text-white">{t(lang, 'ownerProfile')}</h2>
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
              <label className="block text-sm font-medium text-slate-400 mb-1">{t(lang, 'name')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isUrdu ? 'مثال: ارسلان خان' : "e.g. Arsalan Khan"}
                className="w-full bg-[#1E293B] border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">{t(lang, 'email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@example.com"
                className="w-full bg-[#1E293B] border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none placeholder:text-slate-500"
                dir="ltr"
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2 ml-1">
                  {t(lang, 'secureContactLine')}
                </label>
                <div className={`group relative flex items-center bg-white/[0.03] border border-white/5 rounded-[1.25rem] hover:bg-white/[0.05] hover:border-indigo-500/30 transition-all duration-500 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/50 shadow-2xl overflow-hidden backdrop-blur-md ${rtl ? 'flex-row-reverse' : ''}`}>
                  {/* Icon Prefix */}
                  <div className={`${rtl ? 'pr-4 pl-1' : 'pl-4 pr-1'} text-slate-500 group-focus-within:text-indigo-400 transition-colors`}>
                    <Phone size={14} />
                  </div>
                  
                  {/* Country Selector */}
                  <div className={`relative shrink-0 flex items-center h-full ${rtl ? 'flex-row-reverse' : ''}`}>
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className={`appearance-none bg-transparent text-white ${rtl ? 'pr-2 pl-8' : 'pl-2 pr-8'} py-3.5 text-xs outline-none cursor-pointer font-black tracking-tighter`}
                      dir="ltr"
                    >
                      {countries.map(c => (
                        <option key={c.code} value={c.code} className="bg-[#0F172A] text-white">
                          {c.flag} {c.code}
                        </option>
                      ))}
                    </select>
                    <div className={`absolute ${rtl ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 pointer-events-none text-slate-600 group-hover:text-indigo-400 transition-all duration-300`}>
                      <ChevronRight size={10} className={`${rtl ? 'rotate-[270deg]' : 'rotate-90'}`} />
                    </div>
                    <div className="h-6 w-[1px] bg-white/10 mx-1"></div>
                  </div>

                  {/* Smart Input */}
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      const formatted = val.length > 3 ? `${val.slice(0, 3)} ${val.slice(3, 10)}` : val;
                      setPhone(formatted);
                    }}
                    placeholder="300 1234567"
                    className={`flex-1 bg-transparent text-white px-4 py-3.5 text-sm outline-none placeholder:text-slate-600 font-bold tracking-widest tabular-nums ${rtl ? 'text-right' : ''}`}
                    dir="ltr"
                  />

                  {/* Pulsing Status */}
                  <div className={rtl ? 'pl-4' : 'pr-4'}>
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981] animate-pulse"></div>
                  </div>
                </div>
              </div>
              
              <div className="col-span-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">
                  {t(lang, 'identityDob')}
                </label>
                <div className="relative bg-white/[0.03] border border-white/5 rounded-[1.25rem] overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/50 transition-all duration-500 backdrop-blur-md">
                  <DatePicker
                    value={dob}
                    onChange={(newDate) => setDob(newDate)}
                    className={`w-full bg-transparent border-none text-white text-xs py-3.5 font-bold ${rtl ? 'pr-10' : 'pl-10'}`}
                  />
                  <div className={`absolute ${rtl ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none`}>
                    <Users size={14} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className={`flex gap-3 pt-2 ${rtl ? 'flex-row-reverse' : ''}`}>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-colors"
            >
              {t(lang, 'cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-colors"
            >
              <Save size={16} />
              {t(lang, 'save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
