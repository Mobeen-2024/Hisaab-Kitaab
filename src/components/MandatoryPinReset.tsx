import React, { useState, useEffect } from 'react';
import { Shield, Key, AlertTriangle, CheckCircle } from 'lucide-react';
import { db } from '../db';
import { AppUserService } from '../services/AppUserService';

export default function MandatoryPinReset({ onComplete }: { onComplete: () => void }) {
  const [owner, setOwner] = useState<any>(null);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Find the owner account
    const fetchOwner = async () => {
      const users = await db.appUsers.toArray();
      const ownerUser = users.find(u => u.role === 'owner');
      setOwner(ownerUser || null);
    };
    fetchOwner();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!owner) {
      // If no owner exists, just skip this screen
      onComplete();
      return;
    }

    if (newPin.length < 4) {
      setError("PIN must be at least 4 digits.");
      return;
    }
    if (newPin !== confirmPin) {
      setError("PINs do not match.");
      return;
    }

    try {
      await AppUserService.update(owner.id, { passcode: newPin });
      setSuccess(true);
      
      // Let the user see the success state briefly before moving on
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (err: any) {
      setError("Failed to update PIN: " + err.message);
    }
  };

  if (!owner) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
        <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-2xl p-6 space-y-6 shadow-2xl">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-500/20">
            <Shield size={32} />
          </div>
          <h2 className="text-2xl font-black text-white">Security Update</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Your data was successfully restored. For security reasons, the backup file did not contain your PINs. 
          </p>
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-start gap-2 text-left">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <p>You must set a new PIN for the <strong>Owner</strong> account ({owner.name}) to regain access. Employee PINs must be reset manually from Settings later.</p>
          </div>
        </div>

        {success ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400">
            <CheckCircle size={20} className="shrink-0" />
            <span className="text-sm font-bold">Owner PIN saved successfully!</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400 font-semibold text-center">
                {error}
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">New Owner PIN</label>
              <div className="relative flex items-center">
                <Key size={16} className="absolute left-3.5 text-slate-500" />
                <input
                  type="password"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={8}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="Enter 4-8 digit PIN"
                  className="w-full pl-10 pr-4 py-3 bg-[#1E293B] border border-white/10 text-white rounded-xl text-sm focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 focus:outline-none transition-all placeholder:text-slate-600"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Confirm PIN</label>
              <div className="relative flex items-center">
                <Key size={16} className="absolute left-3.5 text-slate-500" />
                <input
                  type="password"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={8}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="Re-enter new PIN"
                  className="w-full pl-10 pr-4 py-3 bg-[#1E293B] border border-white/10 text-white rounded-xl text-sm focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 focus:outline-none transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 mt-4 px-4 py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold shadow-md transition-colors"
            >
              <Shield size={16} />
              <span>Secure & Continue</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
