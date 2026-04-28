import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { Lang, t, isRTL } from './lib/i18n';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import QuickEntryModal from './components/QuickEntryModal';
import Analytics from './components/Analytics';
import Customers from './components/Customers';
import AddCustomerModal from './components/AddCustomerModal';
import CustomersSummary from './components/CustomersSummary';
import Reports from './components/Reports';
import Planner from './components/Planner';
import SmartAssistant from './components/SmartAssistant';
import SplashScreen from './components/SplashScreen';
import Inventory from './components/Inventory';
import BusinessHealth from './components/BusinessHealth';
import ProfileModal from './components/ProfileModal';
import GlobalSearchModal from './components/GlobalSearchModal';
import CurrencySelector from './components/CurrencySelector';
import LanguageSelector from './components/LanguageSelector';
import ReminderSystem from './components/ReminderSystem';
import SettingsComponent from './components/Settings';
import TransactionCalendar from './components/TransactionCalendar';
import NotificationsModal from './components/NotificationsModal';
import MessagesModal from './components/MessagesModal';
import { Plus, Settings, WalletCards, Users, FileText, PieChart, Sparkles, Package, Activity, Calendar } from 'lucide-react';
import Toast, { ToastType } from './components/Toast';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'menu' | 'customers' | 'reports' | 'planner' | 'smart' | 'inventory' | 'settings' | 'intelligence' | 'calendar'>('dashboard');
  
  // Toast State
  const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: ToastType }>({
    isVisible: false,
    message: '',
    type: 'info'
  });

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ isVisible: true, message, type });
  };
  
  const settingsObj = useLiveQuery(() => db.settings.get(1));
  const lang = (settingsObj?.language || 'en') as Lang;
  const rtl = isRTL(lang);
  const currency = settingsObj?.currency || 'PKR';

  const ownerName = settingsObj?.ownerName || 'Arsalan Khan';
  const ownerAvatar = settingsObj?.ownerAvatar || null;

  const activeContext = settingsObj?.activeContext || 'business';

  const users = useLiveQuery(() => db.appUsers.toArray()) || [];
  const activeUser = users.find(u => u.id === settingsObj?.activeUserId);
  const activeRole = activeUser?.role || 'owner'; // Default to owner if no users configured yet

  const canViewReports = activeRole === 'owner' || activeRole === 'spouse';
  const canViewPlanner = activeRole === 'owner' || activeRole === 'spouse';
  const canViewSmart = activeRole === 'owner' || activeRole === 'spouse';

  const inventoryItems = useLiveQuery(() => db.inventory.toArray()) || [];
  const allCustomers = useLiveQuery(() => db.customers.toArray()) || [];
  const hasAlerts = inventoryItems.some(i => i.quantity <= i.minQuantity) || allCustomers.some(c => c.balance > 0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const updateSetting = async (key: string, value: string) => {
    if (settingsObj?.id) {
      await db.settings.update(settingsObj.id, { [key]: value });
    }
  };

  const renderMenuContent = (isMobile: boolean = false) => (
    <div className={`flex flex-col gap-2 ${isMobile ? 'pb-10 pt-4' : 'flex-1 overflow-y-auto pt-6 pb-24 md:pb-6 custom-scrollbar'}`}>
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
        {!isMobile && (
          <>
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`w-full flex items-center justify-start gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${currentTab === 'dashboard' ? 'bg-blue-600/20 text-blue-400 shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              title="Dashboard"
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
              <span className="block md:hidden lg:block whitespace-nowrap">{t(lang, 'dashboard') || 'Dashboard'}</span>
            </button>
            <button
              onClick={() => setCurrentTab('customers')}
              className={`w-full flex items-center justify-start gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${currentTab === 'customers' ? 'bg-emerald-500/20 text-emerald-400 shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              title="Contacts (Khata)"
            >
              <Users size={20} className="shrink-0" />
              <span className="block md:hidden lg:block whitespace-nowrap">{t(lang, 'customers') || 'Contacts (Khata)'}</span>
            </button>
            <button
              onClick={() => setCurrentTab('calendar')}
              className={`w-full flex items-center justify-start gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${currentTab === 'calendar' ? 'bg-blue-500/20 text-blue-400 shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              title="Calendar"
            >
              <Calendar size={20} className="shrink-0" />
              <span className="block md:hidden lg:block whitespace-nowrap">Calendar</span>
            </button>
            {canViewReports && (
              <button
                onClick={() => setCurrentTab('reports')}
                className={`w-full flex items-center justify-start gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${currentTab === 'reports' ? 'bg-indigo-500/20 text-indigo-400 shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                title="Reports"
              >
                <FileText size={20} className="shrink-0" />
                <span className="block md:hidden lg:block whitespace-nowrap">{t(lang, 'reports') || 'Reports'}</span>
              </button>
            )}
          </>
        )}
        {canViewPlanner && (
          <button
            onClick={() => setCurrentTab('planner')}
            className={`w-full flex items-center justify-start gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${currentTab === 'planner' ? 'bg-purple-500/20 text-purple-400 shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            title="Planner & Goals"
          >
            <PieChart size={20} className="shrink-0" />
            <span className="block md:hidden lg:block whitespace-nowrap">Planner & Goals</span>
          </button>
        )}
        {canViewSmart && (
          <button
            onClick={() => setCurrentTab('smart')}
            className={`w-full flex items-center justify-start gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${currentTab === 'smart' ? 'bg-indigo-500/20 text-indigo-400 shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            title="AI Assistant"
          >
            <Sparkles size={20} className="shrink-0" />
            <span className="block md:hidden lg:block whitespace-nowrap">AI Assistant</span>
          </button>
        )}
        
        {activeContext === 'business' && (
          <>
            <button
              onClick={() => setCurrentTab('intelligence')}
              className={`w-full flex items-center justify-start gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${currentTab === 'intelligence' ? 'bg-blue-500/20 text-blue-400 shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              title="Intelligence"
            >
              <Activity size={20} className="shrink-0" />
              <span className="block md:hidden lg:block whitespace-nowrap">Intelligence</span>
            </button>
            <button
              onClick={() => setCurrentTab('inventory')}
              className={`w-full flex items-center justify-start gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${currentTab === 'inventory' ? 'bg-orange-500/20 text-orange-400 shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              title="Inventory"
            >
              <Package size={20} className="shrink-0" />
              <span className="block md:hidden lg:block whitespace-nowrap">Inventory</span>
            </button>
          </>
        )}
      </div>

      <div className="block shrink-0 mt-auto px-2 pb-4">
        {/* Settings button at bottom of navbar */}
        <button
          onClick={() => setCurrentTab('settings')}
          className={`w-full flex items-center justify-start gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${currentTab === 'settings' ? 'bg-slate-800 text-white shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          title="Settings"
        >
          <Settings size={20} className="shrink-0" />
          <span className="block md:hidden lg:block whitespace-nowrap">App Settings</span>
        </button>
      </div>

      <div className="block md:hidden lg:block shrink-0 border-t border-white/10 mt-4 pt-4">
        <div className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest px-6">Preferences</div>
        
        <div className="px-4 space-y-4 mt-2 mb-8">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">{t(lang, 'currency')}</label>
            <div className="relative z-[50]">
              <CurrencySelector
                value={currency}
                onChange={(newCurrency) => updateSetting('currency', newCurrency)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">{t(lang, 'language')}</label>
            <div className="relative z-[60]">
              <LanguageSelector
                value={lang}
                onChange={(newLang) => updateSetting('language', newLang)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <div 
        className={`h-screen w-full flex overflow-hidden bg-[#020617] text-slate-100 font-sans ${rtl ? 'ur' : ''} relative`} 
        dir={rtl ? 'rtl' : 'ltr'}
      >
        {/* Modern Liquid Glow Background */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none bg-[#020617]">
          {rtl ? (
            /* Lightweight static background for RTL/Urdu mode to prevent scroll lag */
            <>
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_80%_80%_at_20%_20%,rgba(37,99,235,0.08)_0%,transparent_60%)]" />
              <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_60%_60%_at_80%_80%,rgba(99,102,241,0.08)_0%,transparent_60%)]" />
            </>
          ) : (
            /* Full animated background for LTR mode */
            <>
              <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[120px] animate-float-1 mix-blend-screen"></div>
              <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-indigo-600/15 rounded-full blur-[140px] animate-float-2 mix-blend-screen"></div>
              <div className="absolute top-[20%] right-[-5%] w-[45%] h-[45%] bg-purple-600/10 rounded-full blur-[110px] animate-liquid mix-blend-screen"></div>
              <div className="absolute bottom-[10%] left-[10%] w-[50%] h-[50%] bg-blue-400/10 rounded-full blur-[130px] animate-float-1 animation-delay-2000 mix-blend-screen"></div>
              <div className="absolute top-[40%] left-[30%] w-[35%] h-[35%] bg-indigo-400/5 rounded-full blur-[90px] animate-float-2 animation-delay-4000 mix-blend-screen"></div>
            </>
          )}
          {/* Center Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-indigo-500/[0.02] rounded-full blur-[150px]"></div>
          {/* Technical Overlays */}
          <div className="absolute inset-0 bg-noise opacity-[0.03]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#020617_100%)] opacity-40"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#020617]"></div>
        </div>
      {/* Sidebar - Rail on tablet, full on desktop */}
      <nav className="hidden md:flex flex-col z-50 w-20 lg:w-64 border-r border-white/10 bg-white/10 backdrop-blur-3xl shrink-0 transition-all duration-300 overflow-x-hidden shadow-[4px_0_24px_rgba(0,0,0,0.3)]">
        <div className="h-24 flex items-center justify-center lg:justify-start px-0 lg:px-6 gap-3 border-b border-white/5 shrink-0 bg-gradient-to-b from-white/5 to-transparent">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-700 rounded-2xl flex items-center justify-center shadow-[0_8px_20px_rgba(37,99,235,0.4)] transform rotate-3 hover:rotate-0 transition-transform duration-500 shrink-0">
            <span className="font-black text-white text-xl">HK</span>
          </div>
          <div className="hidden lg:block shrink-0">
            <h1 className="text-xl font-black tracking-tighter text-white leading-none">Hisaab-Kitab</h1>
            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1 block">حساب کتاب</span>
          </div>
        </div>

        {renderMenuContent(false)}
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Header */}
        <header className="h-20 bg-[#0F172A]/80 backdrop-blur-2xl border-b border-white/10 flex items-center justify-between px-4 md:px-8 shrink-0 z-20">
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
                onClick={() => setIsSearchOpen(true)}
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

          <div className="flex items-center gap-3 md:gap-5">
            {/* Notifications & Messages */}
            <button
               onClick={() => setIsMessagesOpen(true)}
               title="Messages"
               className="hidden sm:flex p-2.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/5 relative cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
            </button>
            <button
               onClick={() => setIsNotificationsOpen(true)}
               title="Notifications"
               className="hidden sm:flex p-2.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/5 relative cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
              {hasAlerts && <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full"></span>}
            </button>

            {/* Profile */}
            <div 
              className="flex items-center gap-3 pl-2 sm:pl-4 border-l border-white/10 cursor-pointer group"
              onClick={() => setIsProfileModalOpen(true)}
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

        {/* Scalable Main Content Wrapper */}
        <main className={`flex-1 overflow-y-auto p-4 md:p-8 relative custom-scrollbar ${rtl ? 'smooth-scroll-surface' : ''}`}>
          <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-24 md:pb-8">
            {currentTab === 'menu' && (
              <div className="md:hidden">
                <h2 className="text-2xl font-bold text-white mb-6">Menu</h2>
                <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden backdrop-blur-xl">
                  {renderMenuContent(true)}
                </div>
              </div>
            )}
            
            {currentTab === 'dashboard' ? (
              <>
                <Dashboard lang={lang} currency={currency} activeContext={activeContext} />
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-7 space-y-8">
                    <TransactionList lang={lang} currency={currency} activeContext={activeContext} />
                  </div>
                  <div className="lg:col-span-5 space-y-8">
                    <Analytics lang={lang} currency={currency} activeContext={activeContext} />
                    
                    {/* Active Customers (Udhaar) Mini Card */}
                    <div className="bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] relative overflow-hidden group hover:border-blue-500/30 transition-colors duration-500">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-500"></div>
                      <div className="flex justify-between items-center mb-6 relative">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Active Udhaar</h3>
                        <button onClick={() => setCurrentTab('customers')} className="text-[10px] uppercase font-bold text-blue-400 hover:text-white transition-colors bg-blue-500/10 px-2 py-1 rounded-md">View All</button>
                      </div>
                      
                      <div className="space-y-4 relative">
                        <CustomersSummary lang={lang} />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : currentTab === 'customers' ? (
              <Customers lang={lang} currency={currency} onAddCustomer={() => setIsAddCustomerModalOpen(true)} activeContext={activeContext} />
            ) : currentTab === 'reports' ? (
              <Reports lang={lang} currency={currency} activeContext={activeContext} />
            ) : currentTab === 'planner' ? (
              <Planner lang={lang} currency={currency} activeContext={activeContext} />
            ) : currentTab === 'smart' ? (
              <SmartAssistant lang={lang} currency={currency} activeContext={activeContext} />
            ) : currentTab === 'intelligence' ? (
              <BusinessHealth lang={lang} currency={currency} activeContext={activeContext} />
            ) : currentTab === 'inventory' ? (
              <Inventory lang={lang} currency={currency} activeContext={activeContext} />
            ) : currentTab === 'calendar' ? (
              <TransactionCalendar lang={lang} currency={currency} activeContext={activeContext} />
            ) : currentTab === 'settings' ? (
              <SettingsComponent lang={lang} currency={currency} />
            ) : null}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0F172A]/90 backdrop-blur-2xl border-t border-white/10 flex items-center justify-between px-2 pb-safe z-40">
        <button 
          onClick={() => setCurrentTab('dashboard')} 
          className={`flex-1 flex flex-col items-center justify-center gap-1 ${currentTab === 'dashboard' ? 'text-blue-400' : 'text-slate-500 hover:text-white'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
          <span className="text-[10px] font-medium">Home</span>
        </button>
        <button 
          onClick={() => setCurrentTab('reports')} 
          className={`flex-1 flex flex-col items-center justify-center gap-1 ${currentTab === 'reports' ? 'text-indigo-400' : 'text-slate-500 hover:text-white'}`}
        >
          <FileText size={20} />
          <span className="text-[10px] font-medium">Reports</span>
        </button>
        <button 
          onClick={() => setCurrentTab('calendar')} 
          className={`flex-1 flex flex-col items-center justify-center gap-1 ${currentTab === 'calendar' ? 'text-blue-400' : 'text-slate-500 hover:text-white'}`}
        >
          <Calendar size={20} />
          <span className="text-[10px] font-medium">Calendar</span>
        </button>
        
        {/* FAB Spacer */}
        <div className="w-16 h-full pointer-events-none"></div>

        {/* Bottom Tab Bar (Mobile) */}
        <button 
          onClick={() => setCurrentTab('menu')} 
          className={`flex-1 flex flex-col items-center justify-center gap-1 ${currentTab === 'menu' ? 'text-blue-400' : 'text-slate-500 hover:text-white'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          <span className="text-[10px] font-medium">Menu</span>
        </button>
        <button 
          onClick={() => setCurrentTab('customers')} 
          className={`flex-1 flex flex-col items-center justify-center gap-1 ${currentTab === 'customers' ? 'text-emerald-400' : 'text-slate-500 hover:text-white'}`}
        >
          <Users size={20} />
          <span className="text-[10px] font-medium">Khata</span>
        </button>
      </div>

      {/* FAB - Centralized on Mobile, Bottom Right on Desktop (Bottom Left for RTL) */}
      <div className={`fixed bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 md:translate-x-0 z-50 ${rtl ? 'md:right-auto md:left-8' : 'md:left-auto md:right-8'}`}>
        {currentTab === 'dashboard' || currentTab === 'smart' || currentTab === 'intelligence' || currentTab === 'reports' || currentTab === 'planner' || currentTab === 'inventory' ? (
          <button
            onClick={() => setIsQuickEntryOpen(true)}
            className="bg-blue-600 text-white h-14 w-14 rounded-full shadow-[0_8px_30px_rgba(37,99,235,0.4)] flex items-center justify-center hover:bg-blue-500 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Plus size={28} />
          </button>
        ) : (
          <button
            onClick={() => setIsAddCustomerModalOpen(true)}
            className="bg-emerald-600 text-white h-14 w-14 rounded-full shadow-[0_8px_30px_rgba(16,185,129,0.4)] flex items-center justify-center hover:bg-emerald-500 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Plus size={28} />
          </button>
        )}
      </div>

      {/* Quick Entry Modal */}
      <QuickEntryModal 
        isOpen={isQuickEntryOpen} 
        onClose={() => setIsQuickEntryOpen(false)} 
        lang={lang}
        activeContext={activeContext}
      />

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={isAddCustomerModalOpen}
        onClose={() => setIsAddCustomerModalOpen(false)}
        lang={lang}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        lang={lang}
      />
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        lang={lang}
        currency={currency}
      />
      <MessagesModal
        isOpen={isMessagesOpen}
        onClose={() => setIsMessagesOpen(false)}
        lang={lang}
        currency={currency}
      />
      <ReminderSystem settingsObj={settingsObj} />
      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        lang={lang}
        currency={currency}
        activeContext={activeContext || 'personal'}
      />
      
      <Toast 
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />
    </div>
    </>
  );
}
