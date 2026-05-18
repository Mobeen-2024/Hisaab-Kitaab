import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { ToastProvider } from './contexts/ToastContext';
import { CloudAuthProvider } from './contexts/CloudAuthContext';
import MainLayout from './layouts/MainLayout';
import SplashScreen from './components/SplashScreen';
import ErrorBoundary from './components/ErrorBoundary';
import PageLoader from './components/common/PageLoader';

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

function AppRoutes() {
  const { isLoading } = useSettings();
  const location = useLocation();

  if (isLoading) return <PageLoader />;

  return (
    <MainLayout>
      <ErrorBoundary locationKey={location.key}>
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

  return (
    <SettingsProvider>
      <CloudAuthProvider>
        <ToastProvider>
          <BrowserRouter>
            {showSplash ? (
              <SplashScreen onComplete={() => setShowSplash(false)} />
            ) : (
              <AppRoutes />
            )}
          </BrowserRouter>
        </ToastProvider>
      </CloudAuthProvider>
    </SettingsProvider>
  );
}
