import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { useCloudAuth } from '../contexts/CloudAuthContext';
import { t } from '../lib/i18n';
import { Settings as SettingsIcon, Users, FileText, PieChart, Sparkles, Package, Activity, MessageSquare, Bell, ChevronRight, LayoutDashboard, Cloud, ShoppingCart, Wrench, Shield, Store } from 'lucide-react';
import CurrencySelector from './CurrencySelector';
import LanguageSelector from './LanguageSelector';
import { useUIStore } from '../lib/store';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import BusinessOnboarding from './BusinessOnboarding';

export default function MobileMenu() {
  const orphanedCount = useLiveQuery(
    async () => {
      try {
        if (!db.isOpen()) return 0;
        const allItems = await db.syncQueue.toArray();
        return allItems.filter(item => item.orphaned === true || (item.orphaned as any) === 1).length;
      } catch (err: any) {
        console.warn("Failed to query orphanedCount in MobileMenu:", err);
        return 0;
      }
    }
  ) ?? 0;

  const { 
    lang, 
    currency, 
    activeContext,
    businessMode,
    updateSetting,
    canViewReports,
    canViewPlanner,
    canViewSmart,
    canAccessPersonal,
    canAccessBusiness,
    hasModule
  } = useSettings();
  const { user, isAuthenticated, isSyncEnabled } = useCloudAuth();
  const { setMessagesOpen, setNotificationsOpen } = useUIStore();
  const [showModeSwitcher, setShowModeSwitcher] = React.useState(false);
  
  const menuGroups = [
    {
      title: 'Core Navigation',
      items: [
        { to: '/', icon: <LayoutDashboard size={20} />, label: t(lang, 'dashboard') || 'Dashboard', color: 'text-blue-400', bg: 'bg-blue-400/10' },
        { to: '/customers', icon: <Users size={20} />, label: t(lang, 'customers') || 'Contacts (Khata)', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
        { 
          onClick: () => setMessagesOpen(true), 
          icon: <MessageSquare size={20} />, 
          label: 'Messages', 
          color: 'text-indigo-400', 
          bg: 'bg-indigo-400/10',
          isAction: true 
        },
        { 
          onClick: () => setNotificationsOpen(true), 
          icon: <Bell size={20} />, 
          label: 'Notifications', 
          color: 'text-rose-400', 
          bg: 'bg-rose-400/10',
          isAction: true 
        },
        ...(canViewReports ? [{ to: '/reports', icon: <FileText size={20} />, label: t(lang, 'reports') || 'Reports', color: 'text-slate-400', bg: 'bg-slate-400/10' }] : []),
      ]
    },
    {
      title: 'Business Tools',
      items: [
        ...(activeContext === 'business' && canAccessBusiness ? [
          { to: '/intelligence', icon: <Activity size={20} />, label: 'Business Brain', color: 'text-rose-400', bg: 'bg-rose-400/10' },
          { to: '/inventory', icon: <Package size={20} />, label: 'Inventory Management', color: 'text-amber-400', bg: 'bg-amber-400/10' },
          ...(hasModule('pos') ? [{ to: '/pos', icon: <ShoppingCart size={20} />, label: 'Point of Sale (POS)', color: 'text-emerald-400', bg: 'bg-emerald-400/10' }] : []),
          ...(hasModule('job_card') ? [{ to: '/repairs', icon: <Wrench size={20} />, label: 'Repair Jobs', color: 'text-blue-400', bg: 'bg-blue-400/10' }] : []),
          ...(hasModule('warranty') ? [{ to: '/warranties', icon: <Shield size={20} />, label: 'Warranties', color: 'text-indigo-400', bg: 'bg-indigo-400/10' }] : [])
        ] : []),
        ...(canViewPlanner ? [{ to: '/planner', icon: <PieChart size={20} />, label: 'Planner & Goals', color: 'text-purple-400', bg: 'bg-purple-400/10' }] : []),
        ...(canViewSmart ? [{ to: '/smart', icon: <Sparkles size={20} />, label: 'AI Assistant', color: 'text-cyan-400', bg: 'bg-cyan-400/10' }] : []),
      ]
    }
  ];

  return (
    <div className="space-y-6 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex items-center justify-between mb-8 relative">
          <h2 className="text-2xl font-black tracking-tight text-white">App Menu</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setMessagesOpen(true)}
              className="p-2.5 bg-white/5 rounded-xl text-slate-300 hover:text-white transition-colors border border-white/10"
            >
              <MessageSquare size={18} />
            </button>
            <button
              onClick={() => setNotificationsOpen(true)}
              className="p-2.5 bg-white/5 rounded-xl text-slate-300 hover:text-white transition-colors border border-white/10"
            >
              <Bell size={18} />
            </button>
          </div>
        </div>
        
        {/* Context Switcher */}
        <div className="mb-8 relative">
          <div className="flex bg-[#0F172A]/50 rounded-2xl p-1.5 border border-white/10 gap-2">
            {canAccessBusiness && (
              <button 
                onClick={async () => {
                  try {
                    await updateSetting('activeContext', 'business');
                  } catch (err: any) {
                    alert(err.message || 'Failed to switch context');
                  }
                }} 
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeContext === 'business' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-500/10' : 'text-slate-400 hover:text-white'}`}
              >
                <Activity size={16} />
                Business
              </button>
            )}
            {canAccessPersonal && (
              <button 
                onClick={async () => {
                  try {
                    await updateSetting('activeContext', 'personal');
                  } catch (err: any) {
                    alert(err.message || 'Failed to switch context');
                  }
                }} 
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeContext === 'personal' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10' : 'text-slate-400 hover:text-white'}`}
              >
                <Users size={16} />
                Personal
              </button>
            )}
          </div>
        </div>

        {/* Business Mode Indicator (Mobile) */}
        {activeContext === 'business' && (
           <div className="mb-8 relative">
             <button 
               onClick={() => setShowModeSwitcher(true)}
               className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#0F172A]/50 border border-white/10 hover:bg-white/5 transition-colors group"
             >
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                   <Store size={24} />
                 </div>
                 <div className="text-left">
                   <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Business Type</div>
                   <div className="text-base font-black text-white capitalize leading-none">{businessMode.replace('_', ' ')}</div>
                 </div>
               </div>
               <div className="text-xs font-bold text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20">
                 Change
               </div>
             </button>
           </div>
        )}

        <div className="space-y-8 relative">
          {menuGroups.map((group, idx) => group.items.length > 0 && (
            <div key={idx} className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">{group.title}</h3>
              <div className="grid grid-cols-1 gap-2">
                {group.items.map((item, i) => {
                  const content = (
                    <>
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform duration-300`}>
                          {item.icon}
                        </div>
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                    </>
                  );

                  const baseClass = `w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-sm font-bold transition-all duration-300 group border border-transparent`;

                  if (item.isAction && item.onClick) {
                    return (
                      <button
                        key={i}
                        onClick={item.onClick}
                        className={`${baseClass} text-slate-300 hover:text-white hover:bg-white/10`}
                      >
                        {content}
                      </button>
                    );
                  }

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to!}
                      className={({ isActive }) => 
                        `${baseClass} ${isActive ? 'bg-blue-600/20 text-white border-blue-500/30 shadow-lg shadow-blue-500/5' : 'text-slate-300 hover:text-white hover:bg-white/10'}`
                      }
                    >
                      {content}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
          
          <div className="pt-4 border-t border-white/5 space-y-2">
            {/* Cloud Sync Status Indicator */}
            <NavLink
              to="/settings"
              className="flex items-center justify-between px-4 py-2.5 rounded-2xl text-sm font-bold transition-all duration-300 group hover:bg-white/10 border border-transparent"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center relative ${isAuthenticated && isSyncEnabled ? 'bg-sky-400/10 text-sky-400 animate-pulse' : 'bg-slate-500/10 text-slate-500'}`}>
                  <Cloud size={20} className={orphanedCount > 0 ? 'text-rose-400' : ''} />
                  {isAuthenticated && isSyncEnabled && (
                    <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-slate-950 ${orphanedCount > 0 ? 'bg-rose-500' : 'bg-emerald-400'}`} />
                  )}
                </div>
                <div>
                  <div className="text-left font-bold text-white text-sm leading-tight">
                    {orphanedCount > 0 ? 'Sync Warning' : (isAuthenticated && isSyncEnabled ? 'Cloud Synced' : 'Offline Mode')}
                  </div>
                  <div className="text-left text-[11px] font-medium text-slate-400 truncate max-w-[180px] mt-0.5">
                    {orphanedCount > 0 ? `${orphanedCount} sync issues` : (isAuthenticated && isSyncEnabled ? user?.email : 'Connect Cloud Sync')}
                  </div>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
            </NavLink>

            <NavLink
              to="/settings"
              className={({ isActive }) => 
                `flex items-center justify-between px-4 py-2.5 rounded-2xl text-sm font-bold transition-all duration-300 group ${isActive ? 'bg-slate-800 text-white border border-white/20' : 'text-slate-300 hover:text-white hover:bg-white/10 border border-transparent'}`
              }
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center text-slate-400 group-hover:rotate-45 transition-transform duration-500">
                  <SettingsIcon size={20} />
                </div>
                <span>App Settings</span>
              </div>
              <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
            </NavLink>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-indigo-600/20 to-blue-600/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 shadow-xl relative">
        <h3 className="text-[10px] font-black text-slate-400 mb-6 uppercase tracking-[0.2em] px-2">Display Preferences</h3>
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-400 px-2 flex items-center gap-2">
              <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
              Preferred Currency
            </label>
            <CurrencySelector
              value={currency}
              onChange={(newCurrency) => updateSetting('currency', newCurrency)}
            />
          </div>
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-400 px-2 flex items-center gap-2">
              <span className="w-1 h-1 bg-indigo-500 rounded-full"></span>
              Interface Language
            </label>
            <LanguageSelector
              value={lang}
              onChange={(newLang) => updateSetting('language', newLang)}
            />
          </div>
        </div>
      </div>

      <div className="text-center px-6">
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em]">Hisaib Kitaib v2.0</p>
        <p className="text-[9px] text-slate-700 mt-1 uppercase tracking-widest font-medium">Professional Financial Operating System</p>
      </div>

      {showModeSwitcher && <BusinessOnboarding onComplete={() => setShowModeSwitcher(false)} />}
    </div>
  );
}
