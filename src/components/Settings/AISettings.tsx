import React from 'react';
import { Sparkles } from 'lucide-react';
import { SettingsService } from '../../services/SettingsService';

interface AISettingsProps {
  tempApiKey: string;
  setTempApiKey: (key: string) => void;
  isKeySaved: boolean;
  setIsKeySaved: (saved: boolean) => void;
  settingsObj: any;
}

export default function AISettings({ tempApiKey, setTempApiKey, isKeySaved, setIsKeySaved, settingsObj }: AISettingsProps) {
  return (
    <div className="bg-[#0F172A]/50 p-4 lg:p-5 rounded-xl border border-indigo-500/10 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
          <Sparkles size={18} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white mb-1">AI Features (Gemini)</h3>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Experimental</p>
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-xs font-medium text-slate-400">Gemini API Key</label>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={tempApiKey}
              onChange={(e) => {
                const clean = e.target.value.replace(/[^\x20-\x7E]/g, '').trim();
                setTempApiKey(clean);
                setIsKeySaved(false);
              }}
              className="flex-1 bg-[#1E293B] border border-white/10 text-white rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-indigo-500/50 outline-none placeholder:text-slate-600"
              placeholder="AIzaSy..."
            />
            <button
              onClick={async () => {
                try {
                  const cleanKey = tempApiKey.replace(/[^\x20-\x7E]/g, '').trim();
                  if (!cleanKey.startsWith('AIza')) {
                    alert('This does not look like a valid Google API key. It should start with "AIza".');
                    return;
                  }
                  if (settingsObj?.id) {
                    await SettingsService.update(settingsObj.id, { geminiApiKey: cleanKey });
                  } else {
                    await SettingsService.update(1, { geminiApiKey: cleanKey });
                  }
                  setTempApiKey(cleanKey);
                  setIsKeySaved(true);
                  setTimeout(() => setIsKeySaved(false), 3000);
                } catch (e) {
                  console.error('Failed to save API key:', e);
                  alert('Failed to save API key. Please try again.');
                }
              }}
              className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors whitespace-nowrap"
            >
              {isKeySaved ? '✓ Saved!' : 'Save Key'}
            </button>
          </div>
          {settingsObj?.geminiApiKey && (
            <p className="text-[11px] text-emerald-400 font-mono">
              Active key: {settingsObj.geminiApiKey.slice(0, 8)}...{settingsObj.geminiApiKey.slice(-4)}
              <span className="text-slate-500 ml-2">(length: {settingsObj.geminiApiKey.length})</span>
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            <p className="text-[10px] text-slate-500 flex-1">
              Get a free key from <a href="https://ai.google.dev/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">Google AI Studio → Get API Key</a>. Key must start with "AIza".
            </p>
            {settingsObj?.geminiApiKey && (
              <button
                onClick={async () => {
                  if (confirm('Clear saved API key and use default from .env?')) {
                    await SettingsService.update(settingsObj.id!, { geminiApiKey: undefined });
                    setTempApiKey('');
                    alert('Settings reset! Refreshing...');
                    window.location.reload();
                  }
                }}
                className="text-[10px] text-rose-400 hover:text-rose-300 transition-colors"
              >
                Reset to Default
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
