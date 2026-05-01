import React from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { Search } from 'lucide-react';

interface TopHeaderProps {
  onSearchOpen: () => void;
  onNotificationsOpen: () => void;
  onMessagesOpen: () => void;
  onProfileOpen: () => void;
  hasAlerts: boolean;
}

export default function TopHeader({ 
  onSearchOpen, 
  onNotificationsOpen, 
  onMessagesOpen, 
  onProfileOpen,
  hasAlerts
}: TopHeaderProps) {
  const { ownerName, ownerAvatar, rtl } = useSettings();

  return (
    <header className="h-[calc(5rem+var(--safe-top))] pt-[var(--safe-top)] bg-[#0F172A]/80 backdrop-blur-2xl border-b border-white/10 flex items-center justify-between px-4 md:px-8 shrink-0 z-20">
      <div className="flex items-center gap-4 flex-1">
        {/* Mobile Title */}
        <div className={`flex md:hidden items-center gap-3 transition-opacity duration-300`}>
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
            <span className="font-black text-white text-sm">HK</span>
          </div>
          <div className="shrink-0 flex flex-col justify-center">
            <h1 className="text-lg font-black tracking-tighter text-white leading-none">Hisaab-Kitab</h1>
            <span className="text-[9px] text-blue-400 font-bold uppercase tracking-wider leading-none mt-0.5">حساب کتاب</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="hidden md:flex relative max-w-md w-full items-center">
          <svg className="w-5 h-5 absolute left-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input
            type="text"
            onClick={onSearchOpen}
            readOnly
            placeholder="Search transactions, customers..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-12 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white/10 transition-all placeholder:text-slate-500 cursor-pointer"
          />
          <div className="absolute right-3 flex items-center gap-1 opacity-50">
            <kbd className="font-sans text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-white">⌘</kbd>
            <kbd className="font-sans text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-white">K</kbd>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-5">
        {/* Mobile Search Button */}
        <button
           onClick={onSearchOpen}
           title="Search"
           className="md:hidden p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/5 relative cursor-pointer"
        >
          <Search size={20} />
        </button>

        {/* Messages */}
        <button
           onClick={onMessagesOpen}
           title="Messages"
           className="hidden sm:flex p-2 md:p-2.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/5 relative cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
        </button>
        {/* Notifications */}
        <button
           onClick={onNotificationsOpen}
           title="Notifications"
           className="flex p-2 md:p-2.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/5 relative cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
          {hasAlerts && <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full"></span>}
        </button>

        {/* Profile */}
        <div
          className="flex items-center gap-3 pl-2 sm:pl-4 border-l border-white/10 cursor-pointer group"
          onClick={onProfileOpen}
        >
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">{ownerName}</span>
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">Owner</span>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden shrink-0 flex items-center justify-center bg-gradient-to-tr from-pink-500 to-amber-500 relative">
            {ownerAvatar ? (
              <img src={ownerAvatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-white">{ownerName.charAt(0).toUpperCase()}</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
