import React, { useState, useRef, useEffect } from 'react';
// Removed motion imports to fix rendering issues
import { ChevronDown, DollarSign } from 'lucide-react';
import { mockExchangeRates } from '../lib/currency';

interface CurrencySelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const currencies = [
  { code: 'PKR', symbol: '₨', label: 'Pakistani Rupee' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
  { code: 'AUD', symbol: '$', label: 'Australian Dollar' },
  { code: 'CAD', symbol: '$', label: 'Canadian Dollar' },
  { code: 'SGD', symbol: '$', label: 'Singapore Dollar' },
  { code: 'AED', symbol: 'د.إ', label: 'UAE Dirham' },
  { code: 'SAR', symbol: 'ر.س', label: 'Saudi Riyal' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', label: 'Chinese Yuan' },
  { code: 'BRL', symbol: 'R$', label: 'Brazilian Real' },
  { code: 'ZAR', symbol: 'R', label: 'South African Rand' },
  { code: 'TRY', symbol: '₺', label: 'Turkish Lira' },
  { code: 'BDT', symbol: '৳', label: 'Bangladeshi Taka' },
  { code: 'NGN', symbol: '₦', label: 'Nigerian Naira' },
  { code: 'IDR', symbol: 'Rp', label: 'Indonesian Rupiah' },
  { code: 'MYR', symbol: 'RM', label: 'Malaysian Ringgit' },
  { code: 'PHP', symbol: '₱', label: 'Philippine Peso' },
];

export default function CurrencySelector({ value, onChange, className = '' }: CurrencySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredCurrency, setHoveredCurrency] = useState<string | null>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedCurrency = currencies.find(c => c.code === value) || currencies[0];

  const getExchangeRateText = (currencyCode: string) => {
    if (currencyCode === 'PKR') return 'Base Currency (1:1)';
    const rate = mockExchangeRates[currencyCode];
    if (!rate) return 'Rate unavailable';
    // 1 PKR = x CUR
    // So 1 CUR = 1 / x PKR
    const pkrValue = 1 / rate;
    return `1 ${currencyCode} = ${pkrValue.toFixed(2)} PKR`;
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-sm font-medium text-white hover:bg-white/10 hover:border-white/20 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 group"
      >
        <span className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30 text-[10px] font-bold">
            {selectedCurrency.symbol}
          </span>
          {selectedCurrency.code}
        </span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 group-hover:text-white ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute z-[999] bottom-full mb-3 right-0 md:left-0 w-[240px] bg-[#0F172A] border border-white/20 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
        >
          <div className="max-h-[320px] overflow-y-auto custom-scrollbar p-1">
            {currencies.map((currency) => (
              <div
                key={currency.code}
                className="relative group/item"
                onMouseEnter={() => setHoveredCurrency(currency.code)}
                onMouseLeave={() => setHoveredCurrency(null)}
              >
                <button
                  type="button"
                  onClick={() => {
                    onChange(currency.code);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors
                    ${value === currency.code 
                      ? 'bg-blue-600 text-white font-bold' 
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'}
                  `}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border text-xs font-bold ${
                    value === currency.code
                      ? 'bg-white text-blue-600 border-white'
                      : 'bg-white/5 border-white/10 text-slate-400'
                  }`}>
                    {currency.symbol}
                  </span>
                  <div className="flex flex-col">
                    <span>{currency.code}</span>
                    <span className={`text-[10px] ${value === currency.code ? 'text-blue-100' : 'text-slate-500'} line-clamp-1`}>{currency.label}</span>
                  </div>
                </button>

                {/* Tooltip for Exchange Rate (Desktop) */}
                {hoveredCurrency === currency.code && (
                  <div className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 hidden md:flex z-[120]">
                    <div className="bg-[#1E293B]/95 backdrop-blur-xl border border-blue-500/30 text-blue-200 text-xs py-2 px-3 rounded-xl shadow-2xl shadow-blue-900/20 whitespace-nowrap flex items-center gap-2 before:content-[''] before:absolute before:-left-1.5 before:top-1/2 before:-translate-y-1/2 before:w-3 before:h-3 before:bg-[#1E293B] before:border-l before:border-b before:border-blue-500/30 before:rotate-45">
                      <DollarSign size={12} className="text-blue-400" />
                      <span className="font-medium tracking-wide">{getExchangeRateText(currency.code)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
