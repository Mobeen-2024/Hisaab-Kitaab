import React from 'react';
import { Loader2, Sparkles, FileText } from 'lucide-react';

interface AIInputProps {
  pastedText: string;
  setPastedText: (text: string) => void;
  isLoading: boolean;
  handleAIParsing: () => void;
  handleLocalParsing: () => void;
}

export default function AIInput({ pastedText, setPastedText, isLoading, handleAIParsing, handleLocalParsing }: AIInputProps) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl">
        <p className="text-xs text-indigo-300 font-medium leading-relaxed">
          Copy all text from your PDF statement or SMS and paste it below. Gemini AI will automatically extract dates, amounts, and descriptions.
        </p>
      </div>
      <textarea
        value={pastedText}
        onChange={(e) => setPastedText(e.target.value)}
        placeholder="Paste statement text here..."
        className="w-full h-40 bg-slate-950/50 border border-white/10 rounded-2xl p-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
      />
      <div className="flex flex-col gap-3">
        <button
          onClick={handleAIParsing}
          disabled={isLoading || !pastedText.trim()}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
        >
          {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
          Start AI Extraction
        </button>
        
        {!isLoading && pastedText.trim() && (
          <button
            onClick={handleLocalParsing}
            className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl flex items-center justify-center gap-2 border border-white/10 transition-all"
          >
            <FileText size={18} />
            Try Local Extraction (No AI Quota)
          </button>
        )}
      </div>
    </div>
  );
}
