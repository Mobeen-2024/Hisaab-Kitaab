import React, { useState, useRef, useEffect } from 'react';
// Removed motion imports to fix rendering issues
import { ChevronDown, Globe } from 'lucide-react';

interface LanguageSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const languages = [
  { code: 'en', label: 'English (EN)' },
  { code: 'ur', label: 'اردو (UR)' },
  { code: 'ru', label: 'Roman Urdu (RU)' },
  { code: 'hi', label: 'हिंदी (HI)' },
  { code: 'es', label: 'Español (ES)' },
  { code: 'fr', label: 'Français (FR)' },
  { code: 'ar', label: 'العربية (AR)' },
  { code: 'zh', label: '中文 (ZH)' },
  { code: 'pt', label: 'Português (PT)' },
  { code: 'bn', label: 'বাংলা (BN)' },
];

export default function LanguageSelector({ value, onChange, className = '' }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const selectedLanguage = languages.find(l => l.code === value) || languages[0];

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-sm font-medium text-white hover:bg-white/10 hover:border-white/20 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 group"
      >
        <span className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
            <Globe size={12} />
          </span>
          {selectedLanguage.label}
        </span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 group-hover:text-white ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute z-[999] bottom-full mb-3 right-0 md:left-0 w-full min-w-[200px] bg-[#0F172A] border border-white/20 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
        >
          <div className="max-h-[320px] overflow-y-auto custom-scrollbar p-1">
            {languages.map((language) => (
              <button
                key={language.code}
                type="button"
                onClick={() => {
                  onChange(language.code);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center px-4 py-2.5 rounded-lg text-sm text-left transition-colors
                  ${value === language.code 
                    ? 'bg-blue-600 text-white font-bold' 
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'}
                `}
              >
                {language.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
