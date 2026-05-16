import React, { useState, useRef } from 'react';
import { Mic } from 'lucide-react';
import { Lang, isRTL } from '../../lib/i18n';

interface NoteInputProps {
  value: string;
  onChange: (val: string) => void;
  lang: Lang;
}

export default function NoteInput({ value, onChange, lang }: NoteInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const rtl = isRTL(lang);

  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      if (isRecording) return;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = lang === "ur" ? "ur-PK" : "en-US";

      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onChange(value + (value ? " " : "") + transcript);
      };
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = () => setIsRecording(false);
      recognition.start();
    } else {
      alert("Voice input is not supported in your browser.");
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full ${rtl ? 'pr-4 pl-12' : 'pl-4 pr-12'} py-3 bg-[#0F172A] border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none placeholder:text-slate-500`}
        placeholder={lang === 'ur' ? "اختیاری نوٹ..." : "Optional Note..."}
      />
      <button
        type="button"
        onClick={startRecording}
        className={`absolute ${rtl ? 'left-2' : 'right-2'} top-1/2 -translate-y-1/2 p-2 transition-colors ${
          isRecording ? "text-rose-500 animate-pulse" : "text-slate-400 hover:text-blue-400"
        }`}
        title={isRecording ? "Listening..." : "Voice Input"}
      >
        <Mic size={18} />
      </button>
    </div>
  );
}
