import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { t } from '../lib/i18n';
import { Settings as SettingsIcon, Users, FileText, PieChart, Sparkles, Package, Activity, MessageSquare, Bell } from 'lucide-react';
import CurrencySelector from './CurrencySelector';
import LanguageSelector from './LanguageSelector';
import { useUI } from '../contexts/UIContext';

export default function MobileMenu() {
  const { lang, currency, activeContext, updateSetting } = useSettings();
  const { setIsMessagesOpen, setIsNotificationsOpen } = useUI();
  
  const activeUserRole = 'owner';
  const canViewReports = activeUserRole === 'owner' || activeUserRole === 'spouse';
  const canViewPlanner = activeUserRole === 'owner' || activeUserRole === 'spouse';
  const canViewSmart = activeUserRole === 'owner' || activeUserRole === 'spouse';

  const navItems = [
    ...(canViewReports ? [{ to: '/reports', icon: <FileText size={20} className="shrink-0" />, label: t(lang, 'reports') || 'Reports' }] : []),
    ...(canViewPlanner ? [{ to: '/planner', icon: <PieChart size={20} className="shrink-0" />, label: 'Planner & Goals' }] : []),
    ...(canViewSmart ? [{ to: '/smart', icon: <Sparkles size={20} className="shrink-0" />, label: 'AI Assistant' }] : []),
    ...(activeContext === 'business' ? [
      { to: '/intelligence', icon: <Activity size={20} className="shrink-0" />, label: 'Intelligence' },
      { to: '/inventory', icon: <Package size={20} className="shrink-0" />, label: 'Inventory' }
    ] : [])
  ];

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 shadow-xl">
        <h2 className="text-xl font-bold tracking-tight text-white mb-6">Menu</h2>
        
        {/* Context Switcher */}
        <div className="mb-6">
          <div className="flex bg-white/5 rounded-xl p-1 border border-white/10 gap-2">
            <button 
              onClick={() => updateSetting('activeContext', 'business')} 
              className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${activeContext === 'business' ? 'bg-amber-500/20 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'text-slate-400 hover:text-white'}`}
            >
              Business
            </button>
            <button 
              onClick={() => updateSetting('activeContext', 'personal')} 
              className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${activeContext === 'personal' ? 'bg-blue-500/20 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]' : 'text-slate-400 hover:text-white'}`}
            >
              Personal
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20' : 'text-slate-300 hover:text-white hover:bg-white/10 border border-transparent'}`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
          
          <button
            onClick={() => setIsMessagesOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 border border-transparent transition-all duration-200 text-left"
          >
            <MessageSquare size={20} className="shrink-0" />
            <span>Messages</span>
          </button>
          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 border border-transparent transition-all duration-200 text-left"
          >
            <Bell size={20} className="shrink-0" />
            <span>Notifications</span>
          </button>
          
          <NavLink
            to="/settings"
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 mt-4 ${isActive ? 'bg-slate-800 text-white border border-white/20' : 'text-slate-300 hover:text-white hover:bg-white/10 border border-transparent'}`
            }
          >
            <SettingsIcon size={20} className="shrink-0" />
            <span>Settings</span>
          </NavLink>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 shadow-xl">
        <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-widest">Preferences</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">{t(lang, 'currency')}</label>
            <CurrencySelector
              value={currency}
              onChange={(newCurrency) => updateSetting('currency', newCurrency)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">{t(lang, 'language')}</label>
            <LanguageSelector
              value={lang}
              onChange={(newLang) => updateSetting('language', newLang)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
