import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { t } from '../lib/i18n';
import { Settings as SettingsIcon, Users, FileText, PieChart, Sparkles, Package, Activity, LayoutGrid } from 'lucide-react';
import CurrencySelector from './CurrencySelector';
import LanguageSelector from './LanguageSelector';

export default function Sidebar() {
  const { lang, currency, activeContext, updateSetting, activeRole } = useSettings();

  const canViewReports = activeRole === 'owner' || activeRole === 'spouse';
  const canViewPlanner = activeRole === 'owner' || activeRole === 'spouse';
  const canViewSmart = activeRole === 'owner' || activeRole === 'spouse';

  const navItems = [
    { to: '/', icon: <LayoutGrid size={20} className="shrink-0" />, label: t(lang, 'dashboard') || 'Dashboard' },
    { to: '/customers', icon: <Users size={20} className="shrink-0" />, label: t(lang, 'customers') || 'Contacts (Khata)' },
    ...(canViewReports ? [{ to: '/reports', icon: <FileText size={20} className="shrink-0" />, label: t(lang, 'reports') || 'Reports' }] : []),
    ...(canViewPlanner ? [{ to: '/planner', icon: <PieChart size={20} className="shrink-0" />, label: 'Planner & Goals' }] : []),
    ...(canViewSmart ? [{ to: '/smart', icon: <Sparkles size={20} className="shrink-0" />, label: 'AI Assistant' }] : []),
    ...(activeContext === 'business' ? [
      { to: '/intelligence', icon: <Activity size={20} className="shrink-0" />, label: 'Intelligence' },
      { to: '/inventory', icon: <Package size={20} className="shrink-0" />, label: 'Inventory' }
    ] : [])
  ];

  return (
    <nav className="hidden md:flex flex-col z-50 w-20 lg:w-64 border-r border-white/10 bg-white/10 backdrop-blur-3xl shrink-0 transition-all duration-300 overflow-visible shadow-[4px_0_24px_rgba(0,0,0,0.3)]">
      <div className="h-24 flex items-center justify-center lg:justify-start px-0 lg:px-6 gap-3 border-b border-white/5 shrink-0 bg-gradient-to-b from-white/5 to-transparent">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-700 rounded-2xl flex items-center justify-center shadow-[0_8px_20px_rgba(37,99,235,0.4)] transform rotate-3 hover:rotate-0 transition-transform duration-500 shrink-0">
          <span className="font-black text-white text-xl">HK</span>
        </div>
        <div className="hidden lg:block shrink-0">
          <h1 className="text-xl font-black tracking-tighter text-white leading-none">Hisaab-Kitab</h1>
          <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1 block">حساب کتاب</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 flex-1 overflow-y-auto pt-6 pb-24 md:pb-6 custom-scrollbar">
        {/* Context Switcher */}
        <div className="mb-6 px-4 lg:px-4 shrink-0">
          <div className="flex flex-row md:flex-col lg:flex-row bg-white/5 rounded-xl p-1 border border-white/10 gap-1 md:gap-2 lg:gap-0">
            <button 
              onClick={() => updateSetting('activeContext', 'business')} 
              className={`flex-1 overflow-hidden py-1.5 md:py-3 lg:py-1.5 rounded-lg text-xs font-bold transition-all ${activeContext === 'business' ? 'bg-amber-500/20 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'text-slate-400 hover:text-white'}`}
              title="Business"
            >
              <span className="block md:hidden lg:inline">Business</span>
              <span className="hidden md:inline lg:hidden">B</span>
            </button>
            <button 
              onClick={() => updateSetting('activeContext', 'personal')} 
              className={`flex-1 overflow-hidden py-1.5 md:py-3 lg:py-1.5 rounded-lg text-xs font-bold transition-all ${activeContext === 'personal' ? 'bg-blue-500/20 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]' : 'text-slate-400 hover:text-white'}`}
              title="Personal"
            >
              <span className="block md:hidden lg:inline">Personal</span>
              <span className="hidden md:inline lg:hidden">P</span>
            </button>
          </div>
        </div>

        <div className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest px-6 block md:hidden lg:block shrink-0">Menu</div>
        
        <div className="px-4 space-y-1 shrink-0">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 
                `w-full flex items-center justify-start gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive ? 'bg-blue-600/20 text-blue-400 shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'}`
              }
              title={item.label}
            >
              {item.icon}
              <span className="block md:hidden lg:block whitespace-nowrap">{item.label}</span>
            </NavLink>
          ))}
        </div>

      </div>

      <div className="block shrink-0 px-2 pb-2 mt-auto border-t border-white/5 bg-black/20 backdrop-blur-md">
        <NavLink
          to="/settings"
          className={({ isActive }) => 
            `w-full flex items-center justify-start gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive ? 'bg-slate-800 text-white shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'}`
          }
          title="Settings"
        >
          <SettingsIcon size={20} className="shrink-0" />
          <span className="block md:hidden lg:block whitespace-nowrap">App Settings</span>
        </NavLink>

        <div className="block md:hidden lg:block shrink-0 mt-2 pt-2 border-t border-white/5">
          <div className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-[0.2em] px-4">Preferences</div>
          
          <div className="px-2 space-y-3 mb-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 px-2">{t(lang, 'currency')}</label>
              <div className="relative z-[100]">
                <CurrencySelector
                  value={currency}
                  onChange={(newCurrency) => updateSetting('currency', newCurrency)}
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 px-2">{t(lang, 'language')}</label>
              <div className="relative z-[110]">
                <LanguageSelector
                  value={lang}
                  onChange={(newLang) => updateSetting('language', newLang)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
