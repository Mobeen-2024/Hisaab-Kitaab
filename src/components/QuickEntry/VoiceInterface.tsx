import React from 'react';
import { Mic, Sparkles, AlertCircle } from 'lucide-react';
import { Lang } from '../../lib/i18n';

interface VoiceInterfaceProps {
  isRecording: boolean;
  isParsingVoice: boolean;
  transcript: string;
  error: string | null;
  onStartRecording: () => void;
  onStopRecording: () => void;
  lang: Lang;
}

export default function VoiceInterface({
  isRecording,
  isParsingVoice,
  transcript,
  error,
  onStartRecording,
  onStopRecording,
  lang
}: VoiceInterfaceProps) {
  if (isParsingVoice) {
    return (
      <div className="px-6 pb-8 pt-4 flex flex-col items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-300">
          <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center relative">
            <Sparkles size={32} className="text-indigo-400 animate-pulse" />
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500/50 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-white font-medium">Extracting data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 pb-8 pt-4 flex flex-col items-center justify-center min-h-[300px]">
      <div className="flex flex-col items-center gap-6 w-full text-center">
        <button
          type="button"
          onClick={isRecording ? onStopRecording : onStartRecording}
          className={`w-28 h-28 rounded-full flex items-center justify-center shadow-lg transition-all ${
            isRecording
              ? "bg-rose-500 text-white shadow-rose-500/30 animate-pulse scale-110"
              : "bg-indigo-600 text-white shadow-indigo-600/30 hover:bg-indigo-500 hover:scale-105"
          }`}
        >
          <Mic size={48} />
        </button>
        <div>
          <h3 className="text-white font-bold text-lg mb-1">
            {isRecording ? "Listening..." : "Tap Mic to Speak"}
          </h3>
          <p className="text-slate-400 text-sm max-w-[250px] mx-auto leading-relaxed">
            {lang === 'ur' ? (
              <>
                جیسے کہ کہیں
                <br />
                <span className="italic text-slate-300">"500 روپے پیٹرول کے لیے"</span>
                <br />
                یا <span className="italic text-slate-300">"10,000 تنخواہ ملی"</span>
              </>
            ) : (
              <>
                Say something like
                <br />
                <span className="italic text-slate-300">"500 rupees for petrol"</span>
                <br />
                or <span className="italic text-slate-300">"received 10,000 salary"</span>
              </>
            )}
          </p>
        </div>
        {transcript && (
          <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-xl max-w-full">
            <p className="text-white text-sm italic">"{transcript}"</p>
          </div>
        )}
        {error && (
          <div className="mt-2 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm flex items-center gap-2 max-w-full text-left">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
