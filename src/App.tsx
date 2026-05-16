import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { ToastProvider } from './contexts/ToastContext';
import { UIProvider } from './contexts/UIContext';
import MainLayout from './layouts/MainLayout';
import SplashScreen from './components/SplashScreen';
import ErrorBoundary from './components/ErrorBoundary';

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

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-full w-full py-20">
    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

function AppRoutes() {
  const { isLoading } = useSettings();

  if (isLoading) return <PageLoader />;

  return (
    <MainLayout>
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/planner" element={<Planner />} />
            <Route path="/smart" element={<SmartAssistant />} />
            <Route path="/intelligence" element={<BusinessHealth />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/menu" element={<MobileMenu />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </MainLayout>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = React.useState(true);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <SettingsProvider>
      <UIProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </UIProvider>
    </SettingsProvider>
  );
}
