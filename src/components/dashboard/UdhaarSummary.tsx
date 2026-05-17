import React from 'react';
import { HandCoins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../contexts/SettingsContext';
import { useUdhaarEntries } from '../../hooks/useData';
import { formatCurrency as formatSharedCurrency } from '../../lib/currency';

export function UdhaarSummary() {
  const { lang, currency } = useSettings();
  const navigate = useNavigate();
  const isUrdu = lang === 'ur';

  const udhaarEntries = useUdhaarEntries();
  const udhaarToReceive = udhaarEntries.filter(u => u.type === 'give' && !u.isCompleted).reduce((sum, u) => sum + u.amount, 0);
  const udhaarToGive = udhaarEntries.filter(u => u.type === 'receive' && !u.isCompleted).reduce((sum, u) => sum + u.amount, 0);

  const formatCompactCurrency = (valInPKR: number) => {
    return formatSharedCurrency(valInPKR, currency, lang, true);
  };

  return (
    <div className="grid grid-cols-2 gap-6 relative z-10">
      <button 
        onClick={() => navigate('/customers')}
        className="bg-gradient-to-br from-emerald-900/30 to-slate-900/60 border border-emerald-500/20 hover:border-emerald-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all p-5 rounded-3xl flex items-center gap-4 text-left outline-none cursor-pointer"
      >
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
          <HandCoins size={24} />
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isUrdu ? 'وصول کرنا ہے' : 'To Receive'}</p>
          <p className="text-xl font-black text-emerald-400 tabular-nums">{formatCompactCurrency(udhaarToReceive)}</p>
        </div>
      </button>
      <button 
        onClick={() => navigate('/customers')}
        className="bg-gradient-to-br from-rose-900/30 to-slate-900/60 border border-rose-500/20 hover:border-rose-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all p-5 rounded-3xl flex items-center gap-4 text-left outline-none cursor-pointer"
      >
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
          <HandCoins size={24} className="rotate-180" />
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isUrdu ? 'ادا کرنا ہے' : 'To Pay'}</p>
          <p className="text-xl font-black text-rose-400 tabular-nums">{formatCompactCurrency(udhaarToGive)}</p>
        </div>
      </button>
    </div>
  );
}
