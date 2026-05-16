import React from 'react';
import { Lang, isRTL } from '../../lib/i18n';

type TransactionType = "expense" | "income" | "udhaar_give" | "udhaar_take";

interface TypeSelectorProps {
  type: TransactionType;
  setType: (type: TransactionType) => void;
  lang: Lang;
}

export default function TypeSelector({ type, setType, lang }: TypeSelectorProps) {
  const rtl = isRTL(lang);
  
  const types = [
    { id: 'expense', label: lang === 'ur' ? 'خرچہ' : 'Out', activeClass: 'bg-rose-500 text-white shadow-lg shadow-rose-500/25' },
    { id: 'income', label: lang === 'ur' ? 'آمدنی' : 'In', activeClass: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' },
    { id: 'udhaar_give', label: lang === 'ur' ? 'دیا' : 'Gave', activeClass: 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' },
    { id: 'udhaar_take', label: lang === 'ur' ? 'لیا' : 'Got', activeClass: 'bg-orange-500 text-white shadow-lg shadow-orange-500/25' }
  ] as const;

  return (
    <div className={`grid grid-cols-4 gap-2 ${rtl ? 'flex-row-reverse' : ''}`}>
      {types.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setType(t.id)}
          className={`py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
            type === t.id ? t.activeClass : "bg-white/5 text-slate-400 hover:bg-white/10"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
