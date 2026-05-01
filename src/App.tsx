import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { ToastProvider } from './contexts/ToastContext';
import MainLayout from './layouts/MainLayout';
import SplashScreen from './components/SplashScreen';

// Lazy loaded components (DashboardWrapper includes original layout)
const DashboardPage = lazy(() => import('./components/DashboardWrapper.tsx'));
const Customers = lazy(() => import('./components/Customers'));
const Reports = lazy(() => import('./components/Reports'));
const Planner = lazy(() => import('./components/Planner'));
const SmartAssistant = lazy(() => import('./components/SmartAssistant'));
const BusinessHealth = lazy(() => import('./components/BusinessHealth'));
const Inventory = lazy(() => import('./components/Inventory'));
const Settings = lazy(() => import('./components/Settings'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-full w-full">
    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

function AppRoutes() {
  const { lang, currency, activeContext, isLoading } = useSettings();

  if (isLoading) return <SplashScreen onComplete={() => {}} />;

  return (
    <MainLayout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<DashboardPage lang={lang} currency={currency} activeContext={activeContext} />} />
          <Route path="/customers" element={<Customers lang={lang} currency={currency} activeContext={activeContext} onAddCustomer={() => {}} />} />
          <Route path="/reports" element={<Reports lang={lang} currency={currency} activeContext={activeContext} onOpenImport={() => {}} />} />
          <Route path="/planner" element={<Planner lang={lang} currency={currency} activeContext={activeContext} />} />
          <Route path="/smart" element={<SmartAssistant lang={lang} currency={currency} activeContext={activeContext} />} />
          <Route path="/intelligence" element={<BusinessHealth lang={lang} currency={currency} activeContext={activeContext} />} />
          <Route path="/inventory" element={<Inventory lang={lang} currency={currency} activeContext={activeContext} />} />
          <Route path="/settings" element={<Settings lang={lang} currency={currency} onOpenImport={() => {}} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
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
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </SettingsProvider>
  );
}
