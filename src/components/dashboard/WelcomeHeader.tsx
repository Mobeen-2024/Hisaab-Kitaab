import React from 'react';
import { format } from 'date-fns';
import { Sparkles } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { useAppSettings } from '../../hooks/useData';

export function WelcomeHeader() {
  const { lang, rtl, activeContext } = useSettings();
  const settingsObj = useAppSettings();
  const isUrdu = lang === 'ur';

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_30%_50%,rgba(59,130,246,0.08)_0%,transparent_70%)] pointer-events-none" />
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-1.5 h-6 bg-gradient-to-b from-blue-400 to-indigo-600 rounded-full shadow-[0_0_12px_rgba(99,102,241,0.8)]`} />
          <p className={`text-[10px] font-black uppercase text-slate-500 ${isUrdu ? '' : 'tracking-[0.3em]'}`}>
            {isUrdu ? 'خوش آمدید' : 'Welcome back'}
          </p>
        </div>
        <h2 className={`text-4xl md:text-5xl font-black tracking-tighter flex items-center gap-3 relative ${rtl ? 'flex-row-reverse' : ''}`}>
          <span className="text-white">{isUrdu ? '' : 'Hello, '}</span>
          <span className="relative">
            <span className="bg-gradient-to-r from-blue-300 via-indigo-200 to-purple-300 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(99,102,241,0.6)]">
              {settingsObj?.ownerName || 'Arsalan'}
            </span>
            <span className={`absolute -bottom-1 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500/0 via-indigo-400/80 to-purple-500/0 rounded-full ${isUrdu ? '' : 'blur-[1px]'}`} />
          </span>
          <Sparkles size={26} className={`text-indigo-400 drop-shadow-[0_0_16px_rgba(99,102,241,0.9)] ${isUrdu ? '' : 'animate-pulse'}`} />
        </h2>
        <p className={`text-slate-500 font-bold uppercase text-[10px] mt-3 opacity-70 ${isUrdu ? '' : 'tracking-[0.2em]'}`}>
          {isUrdu ? 'آپ کے کاروبار کی ذہین بصیرت' : `Intelligent insights · ${activeContext} context`}
        </p>
      </div>
      <div className="relative">
        <div className="absolute inset-0 bg-blue-500/10 rounded-[1.5rem] blur-xl" />
        <div className="relative bg-white/[0.04] border border-white/10 hover:border-blue-500/30 px-6 py-3 rounded-[1.25rem] flex items-center gap-3 shadow-xl transition-colors duration-500">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(96,165,250,1)]"></div>
          <div>
            <p className={`text-[9px] font-black text-slate-600 uppercase mb-0.5 ${isUrdu ? '' : 'tracking-[0.2em]'}`}>{isUrdu ? 'آج کی تاریخ' : 'Today'}</p>
            <span className={`text-[11px] font-black text-slate-300 uppercase ${isUrdu ? '' : 'tracking-[0.15em]'}`}>{format(new Date(), 'EEEE, MMM do')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
