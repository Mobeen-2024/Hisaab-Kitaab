import React from 'react';
import { WelcomeHeader } from './dashboard/WelcomeHeader';
import { InventoryAlert } from './dashboard/InventoryAlert';
import { QuickStats } from './dashboard/QuickStats';
import { UdhaarSummary } from './dashboard/UdhaarSummary';
import { DashboardCalendar } from './dashboard/DashboardCalendar';
import { FinancialOverview } from './dashboard/FinancialOverview';
import TransactionList from './TransactionList';
import { useSettings } from '../contexts/SettingsContext';

export default function Dashboard() {
  const { lang, rtl } = useSettings();

  return (
    <div className={`space-y-4 sm:space-y-6 md:space-y-8 lg:space-y-10 scroll-section ${rtl ? 'text-right' : ''} max-w-full bg-transparent`}>
      {/* Welcome Header */}
      <WelcomeHeader />

      {/* Critical Alerts Bar */}
      <InventoryAlert />

      {/* Main Stats Cards */}
      <QuickStats />
      
      {/* Udhaar & Debt Summary Mini-Cards */}
      <UdhaarSummary />

      {/* Calendar & Recent Records - Responsive Row */}
      <div className="grid grid-cols-1 md:grid-cols-5 lg:grid-cols-3 gap-6 relative z-10">
        <div className="md:col-span-3 lg:col-span-1">
          <DashboardCalendar />
        </div>
        <div className="md:col-span-2 lg:col-span-2 flex flex-col h-full">
          <div className="flex-1 bg-[#0F172A]/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 pb-2 flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400 font-bold">
                TX
              </div>
              <div>
                <h3 className="text-sm font-black text-white tracking-tight uppercase">
                  {lang === 'ur' ? 'حالیہ ریکارڈز' : 'Recent Records'}
                </h3>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[380px]">
              <TransactionList hideTitle compact />
            </div>
          </div>
        </div>
      </div>
      
      {/* Financial Overview Row - Cash Flow, Goals, Budget */}
      <FinancialOverview />
    </div>
  );
}
