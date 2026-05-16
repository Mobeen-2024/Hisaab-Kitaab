import React from 'react';
import { Lang, isRTL } from '../../lib/i18n';

interface AmountInputProps {
  amount: string;
  setAmount: (val: string) => void;
  frequentAmounts: number[];
  currency: string;
  setCurrency: (val: string) => void;
  exchangeRate: string;
  setExchangeRate: (val: string) => void;
  lang: Lang;
}

export default function AmountInput({
  amount,
  setAmount,
  frequentAmounts,
  currency,
  setCurrency,
  exchangeRate,
  setExchangeRate,
  lang
}: AmountInputProps) {
  const rtl = isRTL(lang);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 relative">
        <input
          type="number"
          min="0"
          step="any"
          required
          autoFocus
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-transparent text-center text-5xl font-black text-white focus:outline-none placeholder:text-white/20 py-4"
          placeholder="0"
        />

        {frequentAmounts.length > 0 && (
          <div className="flex gap-2 justify-center pb-2">
            {frequentAmounts.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setAmount(amt.toString())}
                className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-medium text-slate-300 transition-colors"
              >
                {amt}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={`flex bg-white/5 border border-white/10 rounded-xl p-1 gap-2 items-center ${rtl ? 'flex-row-reverse' : ''}`}>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="bg-transparent text-white font-medium px-3 py-2 outline-none appearance-none cursor-pointer"
        >
          <option value="PKR" className="text-slate-900">PKR (₨)</option>
          <option value="USD" className="text-slate-900">USD ($)</option>
          <option value="EUR" className="text-slate-900">EUR (€)</option>
          <option value="GBP" className="text-slate-900">GBP (£)</option>
          <option value="INR" className="text-slate-900">INR (₹)</option>
          <option value="AUD" className="text-slate-900">AUD ($)</option>
          <option value="CAD" className="text-slate-900">CAD ($)</option>
          <option value="SGD" className="text-slate-900">SGD ($)</option>
          <option value="AED" className="text-slate-900">AED (د.إ)</option>
          <option value="SAR" className="text-slate-900">SAR (ر.س)</option>
        </select>
        <div className="h-6 w-px bg-white/20"></div>

        {currency !== "PKR" ? (
          <div className="flex items-center gap-2 flex-1 px-2">
            <span className="text-xs text-slate-400 whitespace-nowrap">Rate:</span>
            <input
              type="number"
              step="any"
              min="0.0001"
              required
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              className="w-full bg-transparent text-white font-medium text-sm focus:outline-none placeholder:text-slate-500"
              placeholder={`1 ${currency} to PKR`}
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 px-2 text-slate-500 text-xs font-medium">
            {lang === 'ur' ? 'ڈیفالٹ بنیادی کرنسی' : 'Default Base Currency'}
          </div>
        )}
      </div>
    </div>
  );
}
