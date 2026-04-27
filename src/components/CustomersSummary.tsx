import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Lang, t } from '../lib/i18n';

export default function CustomersSummary({ lang }: { lang: Lang }) {
  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  
  // Get top 4 customers with debt (Udhaar)
  const activeUdhaarCustomers = customers
    .filter(c => c.balance < 0)
    .sort((a, b) => a.balance - b.balance)
    .slice(0, 4);

  if (activeUdhaarCustomers.length === 0) {
    return (
      <div className="text-center text-slate-500 py-6 text-sm">
        No active udhaar right now.
      </div>
    );
  }

  return (
    <>
      {activeUdhaarCustomers.map(c => (
        <div key={c.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 to-orange-500 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-md">
              {c.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white leading-tight">{c.name}</span>
              <span className="text-[10px] text-slate-400">{c.phone || 'No phone'}</span>
            </div>
          </div>
          <div className="bg-rose-500/10 text-rose-400 px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap border border-rose-500/20">
            {c.balance < 0 ? 'Owes ' : ''}
            {Math.abs(c.balance).toLocaleString()}
          </div>
        </div>
      ))}
    </>
  );
}
