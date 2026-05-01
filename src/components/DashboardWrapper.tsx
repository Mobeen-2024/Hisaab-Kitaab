import React from 'react';
import Dashboard from './Dashboard';
import TransactionList from './TransactionList';
import Analytics from './Analytics';
import CustomersSummary from './CustomersSummary';
import { useSettings } from '../contexts/SettingsContext';

export default function DashboardWrapper() {
  const { lang, currency, activeContext } = useSettings();
  
  return (
    <>
      <Dashboard lang={lang} currency={currency} activeContext={activeContext} />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
        <div className="lg:col-span-7 space-y-8">
          <TransactionList lang={lang} currency={currency} activeContext={activeContext} />
        </div>
        <div className="lg:col-span-5 space-y-8">
          <Analytics lang={lang} currency={currency} activeContext={activeContext} />
          
          <div className="bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] relative overflow-hidden group hover:border-blue-500/30 transition-colors duration-500">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-500"></div>
            <div className="flex justify-between items-center mb-6 relative">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Active Udhaar</h3>
            </div>

            <div className="space-y-4 relative">
              <CustomersSummary lang={lang} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
