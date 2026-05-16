import React from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useUI } from '../contexts/UIContext';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import BottomNav from '../components/BottomNav';
import QuickEntryModal from '../components/QuickEntryModal';
import AddCustomerModal from '../components/AddCustomerModal';
import ProfileModal from '../components/ProfileModal';
import NotificationsModal from '../components/NotificationsModal';
import MessagesModal from '../components/MessagesModal';
import GlobalSearchModal from '../components/GlobalSearchModal';
import ImportStatementModal from '../components/ImportStatementModal';
import ReminderSystem from '../components/ReminderSystem';
import { useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Plus } from 'lucide-react';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { rtl, lang, currency, activeContext } = useSettings();
  const {
    isQuickEntryOpen, setIsQuickEntryOpen,
    isAddCustomerModalOpen, setIsAddCustomerModalOpen,
    isProfileModalOpen, setIsProfileModalOpen,
    isNotificationsOpen, setIsNotificationsOpen,
    isMessagesOpen, setIsMessagesOpen,
    isSearchOpen, setIsSearchOpen,
    isImportModalOpen, setIsImportModalOpen
  } = useUI();
  const location = useLocation();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsSearchOpen]);

  // P2-4: Close all modals on navigation
  React.useEffect(() => {
    setIsQuickEntryOpen(false);
    setIsAddCustomerModalOpen(false);
    setIsProfileModalOpen(false);
    setIsNotificationsOpen(false);
    setIsMessagesOpen(false);
    setIsSearchOpen(false);
    setIsImportModalOpen(false);
  }, [location.pathname, setIsQuickEntryOpen, setIsAddCustomerModalOpen, setIsProfileModalOpen, setIsNotificationsOpen, setIsMessagesOpen, setIsSearchOpen, setIsImportModalOpen]);

  // Reactive alerts for inventory
  const inventory = useLiveQuery(() => db.inventory.where('context').equals(activeContext).toArray(), [activeContext]) || [];
  const hasAlerts = inventory.some(item => item.quantity <= item.minQuantity);
  const isDashboardOrSimilar = ['/', '/smart', '/intelligence', '/reports', '/planner', '/inventory'].includes(location.pathname);

  return (
    <div
      className={`h-screen w-full flex overflow-hidden bg-[#020617] text-slate-100 font-sans ${rtl ? 'ur' : ''} relative`}
      dir={rtl ? 'rtl' : 'ltr'}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* Background Glows */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none">
        {rtl ? (
          <>
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_80%_80%_at_20%_20%,rgba(37,99,235,0.08)_0%,transparent_60%)]" />
            <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_60%_60%_at_80%_80%,rgba(99,102,241,0.08)_0%,transparent_60%)]" />
          </>
        ) : (
          <>
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[120px] animate-float-1 mix-blend-screen"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-indigo-600/15 rounded-full blur-[140px] animate-float-2 mix-blend-screen"></div>
            <div className="absolute top-[20%] right-[-5%] w-[45%] h-[45%] bg-purple-600/10 rounded-full blur-[110px] animate-liquid mix-blend-screen"></div>
            <div className="absolute bottom-[10%] left-[10%] w-[50%] h-[50%] bg-blue-400/10 rounded-full blur-[130px] animate-float-1 animation-delay-2000 mix-blend-screen"></div>
          </>
        )}
      </div>

      <Sidebar />

      <div className={`flex-1 flex flex-col h-screen overflow-hidden relative bg-transparent min-w-0 ${rtl ? 'order-1' : 'order-2'}`}>
        <TopHeader 
          onSearchOpen={() => setIsSearchOpen(true)}
          onNotificationsOpen={() => setIsNotificationsOpen(true)}
          onMessagesOpen={() => setIsMessagesOpen(true)}
          onProfileOpen={() => setIsProfileModalOpen(true)}
          hasAlerts={hasAlerts}
        />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-4 md:p-8 relative custom-scrollbar bg-transparent min-w-0">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 md:space-y-8 pb-[calc(6rem+var(--safe-bottom))] md:pb-8 bg-transparent">
            {children}
          </div>
        </main>
      </div>

      <BottomNav />

      {/* FAB */}
      <div 
        className={`fixed left-1/2 -translate-x-1/2 md:translate-x-0 z-50 ${rtl ? 'md:right-auto md:left-8' : 'md:left-auto md:right-8'}`}
        style={{ bottom: 'calc(1.5rem + var(--safe-bottom))' }}
      >
        <button
          onClick={() => isDashboardOrSimilar ? setIsQuickEntryOpen(true) : setIsAddCustomerModalOpen(true)}
          className={`${isDashboardOrSimilar ? 'bg-blue-600' : 'bg-emerald-600'} text-white h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer`}
        >
          <Plus size={28} />
        </button>
      </div>

      {/* Modals */}
      <QuickEntryModal isOpen={isQuickEntryOpen} onClose={() => setIsQuickEntryOpen(false)} lang={lang} activeContext={activeContext} />
      <AddCustomerModal isOpen={isAddCustomerModalOpen} onClose={() => setIsAddCustomerModalOpen(false)} lang={lang} />
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} lang={lang} />
      <NotificationsModal isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} lang={lang} currency={currency} />
      <MessagesModal isOpen={isMessagesOpen} onClose={() => setIsMessagesOpen(false)} lang={lang} currency={currency} />
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} lang={lang} currency={currency} activeContext={activeContext} />
      <ImportStatementModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
      
      {/* Systems */}
      <ReminderSystem settingsObj={{ language: lang, currency }} />
    </div>
  );
}
