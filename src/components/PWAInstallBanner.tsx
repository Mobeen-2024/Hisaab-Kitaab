import React, { useState, useEffect } from 'react';
import { usePWAInstallPrompt } from '../hooks/usePWA';
import { Sparkles, Download, X } from 'lucide-react';
import { Lang } from '../lib/i18n';
import { Button } from './ui/Button';

export default function PWAInstallBanner({ lang }: { lang: Lang }) {
  const { isInstallable, promptInstall } = usePWAInstallPrompt();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem('pwa-prompt-dismissed') === 'true';
    if (isInstallable && !isDismissed) {
      // Delay showing for 2 seconds to make entry smooth
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable]);

  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const isUr = lang === 'ur';

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-md animate-in slide-in-from-bottom-12 duration-500">
      <div className="relative overflow-hidden bg-slate-900/90 backdrop-blur-xl border border-blue-500/20 rounded-3xl p-5 shadow-2xl flex flex-col gap-4">
        {/* Glow accent */}
        <div className="absolute -top-12 -left-12 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className={`flex items-start gap-3 ${isUr ? 'flex-row-reverse text-right' : ''}`}>
          <div className="p-2.5 bg-blue-500/10 rounded-2xl shrink-0 text-blue-400">
            <Sparkles size={20} className="animate-pulse" />
          </div>
          <div className="flex-1 space-y-1">
            <h4 className="text-white font-bold text-sm">
              {isUr ? 'ہوم اسکرین پر شامل کریں' : 'Install Hisaib Kitaib'}
            </h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              {isUr 
                ? 'تیز رفتار آف لائن رسائی کے لیے حساب کتاب ایپ کو ہوم اسکرین پر انسٹال کریں۔' 
                : 'Add to your home screen for instant, offline credit ledger management.'}
            </p>
          </div>
          <button 
            onClick={handleDismiss} 
            className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
            aria-label="Dismiss prompt"
          >
            <X size={16} />
          </button>
        </div>

        <div className={`flex gap-3 w-full ${isUr ? 'flex-row-reverse' : ''}`}>
          <Button 
            onClick={handleInstall} 
            variant="blue" 
            size="sm" 
            className="flex-1 py-3 text-xs"
            leftIcon={<Download size={14} />}
          >
            {isUr ? 'ابھی انسٹال کریں' : 'Install App'}
          </Button>
          <Button 
            onClick={handleDismiss} 
            variant="ghost" 
            size="sm" 
            className="flex-1 text-slate-400 hover:text-white hover:bg-white/5 text-xs py-3"
          >
            {isUr ? 'پھر کبھی' : 'Later'}
          </Button>
        </div>
      </div>
    </div>
  );
}
