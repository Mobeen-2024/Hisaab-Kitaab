import React from 'react';
import { Smartphone, Banknote, FileStack, Sparkles } from 'lucide-react';

export type ImportSource = 'easypaisa' | 'jazzcash' | 'bank' | 'pdf' | 'ai';

interface SourceSelectorProps {
  source: ImportSource;
  setSource: (source: ImportSource) => void;
}

export default function SourceSelector({ source, setSource }: SourceSelectorProps) {
  const sources = [
    { id: 'easypaisa', label: 'Easypaisa', icon: Smartphone, color: 'emerald' },
    { id: 'jazzcash', label: 'JazzCash', icon: Smartphone, color: 'orange' },
    { id: 'bank', label: 'Bank (CSV)', icon: Banknote, color: 'blue' },
    { id: 'pdf', label: 'PDF (Offline)', icon: FileStack, color: 'purple' },
    { id: 'ai', label: 'AI Scan', icon: Sparkles, color: 'indigo' },
  ] as const;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
      {sources.map((s) => {
        const Icon = s.icon;
        const isActive = source === s.id;
        const colorClass = 
          s.color === 'emerald' ? (isActive ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-400') :
          s.color === 'orange' ? (isActive ? 'bg-orange-500/10 border-orange-500 text-orange-400' : 'bg-white/5 border-white/10 text-slate-400') :
          s.color === 'blue' ? (isActive ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-white/5 border-white/10 text-slate-400') :
          s.color === 'purple' ? (isActive ? 'bg-purple-500/10 border-purple-500 text-purple-400' : 'bg-white/5 border-white/10 text-slate-400') :
          (isActive ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' : 'bg-white/5 border-white/10 text-slate-400');

        return (
          <button
            key={s.id}
            onClick={() => setSource(s.id as ImportSource)}
            className={`p-4 rounded-2xl border flex flex-col items-center gap-3 transition-all ${colorClass}`}
          >
            <Icon size={24} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-center">{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}
