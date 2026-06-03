import React from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { Search, Mail, Bell } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

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
  const { ownerName, ownerAvatar } = useSettings();

  return (
    <header className="h-[calc(4rem+var(--safe-top))] md:h-[calc(5rem+var(--safe-top))] pt-[var(--safe-top)] bg-[#0F172A]/80 backdrop-blur-2xl border-b border-white/10 flex items-center justify-between px-4 md:px-8 shrink-0 z-20 overflow-hidden">
      <div className="flex items-center gap-4 flex-1">
        {/* Mobile Title */}
        <div className="flex md:hidden items-center gap-3 transition-opacity duration-300">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
            <span className="font-black text-white text-sm">HK</span>
          </div>
          <div className="shrink-0 flex flex-col justify-center">
            <h1 className="text-lg font-black tracking-tighter text-white leading-none">Hisaib Kitaib</h1>
            <span className="text-[9px] text-blue-400 font-bold uppercase tracking-wider leading-none mt-0.5">حساب کتاب</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="hidden md:flex relative max-w-md w-full items-center">
          <Input
            type="text"
            onClick={onSearchOpen}
            readOnly
            placeholder="Search transactions, customers..."
            leftIcon={<Search size={18} />}
            className="cursor-pointer bg-white/5 py-2.5 rounded-xl border border-white/10 text-sm hover:bg-white/10"
            focusColor="blue"
            rightIcon={
              <div className="flex items-center gap-1 opacity-50 select-none">
                <kbd className="font-sans text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-white">⌘</kbd>
                <kbd className="font-sans text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-white">K</kbd>
              </div>
            }
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-5">
        {/* Mobile Search Button */}
        <Button
          variant="secondary"
          size="icon"
          onClick={onSearchOpen}
          className="md:hidden"
          title="Search"
        >
          <Search size={20} />
        </Button>

        {/* Messages */}
        <Button
          variant="secondary"
          size="icon"
          onClick={onMessagesOpen}
          title="Messages"
        >
          <Mail size={20} />
        </Button>

        {/* Notifications */}
        <Button
          variant="secondary"
          size="icon"
          onClick={onNotificationsOpen}
          title="Notifications"
          className="relative"
        >
          <Bell size={20} />
          {hasAlerts && <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full"></span>}
        </Button>

        {/* Profile */}
        <button
          className="flex items-center gap-3 pl-2 sm:pl-4 border-l border-white/10 cursor-pointer group text-left outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg"
          onClick={onProfileOpen}
          aria-label="Profile settings"
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
        </button>
      </div>
    </header>
  );
}
