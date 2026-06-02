import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { ToastProvider } from './contexts/ToastContext';
import { CloudAuthProvider } from './contexts/CloudAuthContext';
import DatabaseErrorScreen from './components/common/DatabaseErrorScreen';
import MainLayout from './layouts/MainLayout';
import SplashScreen from './components/SplashScreen';
import ErrorBoundary from './components/ErrorBoundary';
import PageLoader from './components/common/PageLoader';
import { useOnlineStatus } from './hooks/usePWA';
import PWAInstallBanner from './components/PWAInstallBanner';

// Lazy loaded components
const DashboardPage = lazy(() => import('./components/DashboardWrapper'));
const Customers = lazy(() => import('./components/Customers'));
const Reports = lazy(() => import('./components/Reports'));
const Planner = lazy(() => import('./components/Planner'));
const SmartAssistant = lazy(() => import('./components/SmartAssistant'));
const BusinessHealth = lazy(() => import('./components/BusinessHealth'));
const Inventory = lazy(() => import('./components/Inventory'));
const Settings = lazy(() => import('./components/Settings'));
const MobileMenu = lazy(() => import('./components/MobileMenu'));

import { VoiceAssistantProvider } from './contexts/VoiceAssistantContext';
import { VoiceWidget } from './components/VoiceAssistant/VoiceWidget';
import AccessDenied from './components/common/AccessDenied';

function RequireAccess({ 
  allowed, 
  children 
}: { 
  allowed: boolean; 
  children: React.ReactNode;
}) {
  if (!allowed) {
    return <AccessDenied />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { 
    lang, 
    isLoading, 
    dbError, 
    resetDatabase,
    canViewReports,
    canViewPlanner,
    canViewSmart,
    canAccessBusiness
  } = useSettings();
  const location = useLocation();
  const isOnline = useOnlineStatus();

  if (dbError) {
    return <DatabaseErrorScreen error={dbError} onReset={resetDatabase} />;
  }

  if (isLoading) return <PageLoader />;

  return (
    <>
      {/* Offline Status Alert */}
      {!isOnline && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 duration-300 pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-amber-500/20 text-amber-400 px-4 py-2 rounded-full text-xs font-bold shadow-2xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>{lang === 'ur' ? 'آف لائن وضع (بغیر انٹرنیٹ)' : 'Offline Mode (No Internet)'}</span>
          </div>
        </div>
      )}

      <MainLayout>
        <ErrorBoundary locationKey={location.key}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/reports" element={<RequireAccess allowed={canViewReports}><Reports /></RequireAccess>} />
              <Route path="/planner" element={<RequireAccess allowed={canViewPlanner}><Planner /></RequireAccess>} />
              <Route path="/smart" element={<RequireAccess allowed={canViewSmart}><SmartAssistant /></RequireAccess>} />
              <Route path="/intelligence" element={<RequireAccess allowed={canAccessBusiness}><BusinessHealth /></RequireAccess>} />
              <Route path="/inventory" element={<RequireAccess allowed={canAccessBusiness}><Inventory /></RequireAccess>} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/menu" element={<MobileMenu />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>

        {/* PWA Custom Install Promo */}
        <PWAInstallBanner lang={lang} />
      </MainLayout>

      {/* Floating Voice Assistant FAB */}
      <VoiceWidget />
    </>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = React.useState(true);

  return (
    <SettingsProvider>
      <CloudAuthProvider>
        <ToastProvider>
          <VoiceAssistantProvider>
            <BrowserRouter>
              {showSplash ? (
                <SplashScreen onComplete={() => setShowSplash(false)} />
              ) : (
                <AppRoutes />
              )}
            </BrowserRouter>
          </VoiceAssistantProvider>
        </ToastProvider>
      </CloudAuthProvider>
    </SettingsProvider>
  );
}
