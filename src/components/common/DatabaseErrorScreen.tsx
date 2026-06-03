import React from 'react';
import { AlertTriangle, RotateCcw, RefreshCw } from 'lucide-react';

interface DatabaseErrorScreenProps {
  error: Error;
  onReset: () => void;
}

export default function DatabaseErrorScreen({ error, onReset }: DatabaseErrorScreenProps) {
  const [resetting, setResetting] = React.useState(false);

  const handleReset = async () => {
    setResetting(true);
    try {
      await onReset();
    } catch (err) {
      console.error(err);
      window.location.reload();
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-slate-950 p-6 text-white overflow-hidden relative">
      {/* Background gradients */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl relative text-center">
        <div className="w-16 h-16 bg-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-500/30 text-rose-400">
          <AlertTriangle size={32} />
        </div>

        <h1 className="text-2xl font-black tracking-tight text-white mb-2">
          Database Upgrade Error
        </h1>
        <p className="text-sm font-bold text-rose-400 uppercase tracking-wider mb-6">
          ڈیٹا بیس لوڈ کرنے میں مسئلہ ہوا ہے
        </p>

        <div className="text-slate-300 text-sm leading-relaxed space-y-3 mb-8">
          <p>
            Hisaib Kitaib had trouble upgrading your local database schema. This usually happens after a system update when older local data conflicts with new database rules.
          </p>
          <p className="text-[12px] text-slate-400 italic font-mono bg-black/30 p-3 rounded-xl border border-white/5 truncate">
            Error: {error.message || 'Unknown Dexie upgrade error'}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleReset}
            disabled={resetting}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-600 hover:to-amber-700 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-lg hover:shadow-rose-500/20 active:scale-[0.98] disabled:opacity-50"
          >
            {resetting ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Resetting Database...
              </>
            ) : (
              <>
                <RotateCcw size={18} />
                Reset Database & Recover
              </>
            )}
          </button>

          <button
            onClick={() => window.location.reload()}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-bold py-3 px-6 rounded-2xl transition-all"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}
