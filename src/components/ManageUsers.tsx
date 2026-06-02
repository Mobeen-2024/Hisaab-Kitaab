import React, { useState } from 'react';
import { AppUser } from '../db';
import { AppUserService } from '../services/AppUserService';
import { SettingsService } from '../services/SettingsService';
import { Shield, UserPlus, Users, X, Key, Trash2 } from 'lucide-react';
import { useAppUsers, useAppSettings } from '../hooks/useData';

interface ManageUsersProps {
  onClose: () => void;
  activeContext: 'personal' | 'business';
}

export default function ManageUsers({ onClose, activeContext }: ManageUsersProps) {
  const users = useAppUsers();
  const settingsObj = useAppSettings();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<'owner' | 'spouse' | 'cashier' | 'employee'>('employee');
  const [contextAccess, setContextAccess] = useState<'personal' | 'business' | 'both'>('business');
  const [passcode, setPasscode] = useState('');
  const [switchingUserId, setSwitchingUserId] = useState<number | null>(null);
  const [switchPin, setSwitchPin] = useState('');

  const activeUser = users.find(u => u.id === settingsObj?.activeUserId);
  const isOwner = activeUser?.role === 'owner' || users.length === 0;

  const handleRoleChange = (newRole: 'owner' | 'spouse' | 'cashier' | 'employee') => {
    setRole(newRole);
    if (newRole === 'cashier') {
      setContextAccess('business');
    } else if (newRole === 'employee') {
      setContextAccess('business');
    } else {
      setContextAccess('both');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !passcode) return;

    await AppUserService.add({
      name,
      role,
      passcode,
      contextAccess: role === 'cashier' || role === 'employee' ? 'business' : contextAccess
    });
    setShowAdd(false);
    setName('');
    setPasscode('');
  };

  const handleSwitchUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (switchingUserId === null || !switchPin) return;

    const success = await AppUserService.verifyAndMigrate(switchingUserId, switchPin);
    if (success) {
      if (settingsObj?.id) {
        // Find user to check context access
        const targetUser = users.find(u => u.id === switchingUserId);
        let newContext = settingsObj.activeContext;
        if (targetUser) {
          if (targetUser.contextAccess === 'personal' && settingsObj.activeContext !== 'personal') {
            newContext = 'personal';
          } else if (targetUser.contextAccess === 'business' && settingsObj.activeContext !== 'business') {
            newContext = 'business';
          }
        }
        await SettingsService.update(settingsObj.id, { 
          activeUserId: switchingUserId,
          activeContext: newContext
        });
        window.location.reload();
      }
    } else {
      alert("Incorrect passcode!");
    }
    setSwitchingUserId(null);
    setSwitchPin('');
  };

  const handleDeleteUser = async (id: number) => {
    if (confirm("Are you sure you want to delete this user?")) {
      await AppUserService.delete(id);
    }
  };

  // Seed owner if users list is empty
  const handleSeedOwner = async () => {
    const defaultOwnerName = settingsObj?.ownerName || 'Owner';
    const newOwnerId = await AppUserService.add({
      name: defaultOwnerName,
      role: 'owner',
      passcode: '0000',
      contextAccess: 'both'
    });
    if (settingsObj?.id) {
      await SettingsService.update(settingsObj.id, { activeUserId: newOwnerId });
    }
  };

  return (
    <div className="space-y-4">
      {users.length === 0 ? (
        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl text-center">
          <Shield size={24} className="text-blue-400 mx-auto mb-2" />
          <h3 className="text-white font-bold mb-1">Initialize User System</h3>
          <p className="text-xs text-slate-300 mb-3">Setup the owner account to enable multi-user access (spouse, cashier, employee).</p>
          <button onClick={handleSeedOwner} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-colors">
            Setup Owner (Default PIN: 0000)
          </button>
        </div>
      ) : (
        <>
          {switchingUserId !== null && (
            <form onSubmit={handleSwitchUserSubmit} className="bg-slate-900 border border-indigo-500/30 p-4 rounded-xl space-y-3">
              <h4 className="text-sm font-bold text-white">Enter Passcode for {users.find(u => u.id === switchingUserId)?.name}</h4>
              <input 
                autoFocus 
                type="password" 
                pattern="[0-9]*" 
                inputMode="numeric"
                maxLength={8}
                value={switchPin} 
                onChange={e => setSwitchPin(e.target.value)} 
                placeholder="Enter PIN" 
                className="w-full bg-[#1E293B] border border-white/10 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50" 
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setSwitchingUserId(null)} className="flex-1 py-1.5 bg-white/5 text-white rounded-lg text-xs font-bold transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-500 transition-colors">Verify</button>
              </div>
            </form>
          )}

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex flex-col items-center justify-center border border-indigo-500/30 text-indigo-300 font-bold uppercase">
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-white text-sm font-bold">{u.name} {u.id === settingsObj?.activeUserId ? '(Active)' : ''}</h4>
                    <p className="text-xs text-slate-400 capitalize">{u.role} ({u.contextAccess} access)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {u.id !== settingsObj?.activeUserId && (
                    <button 
                      onClick={() => setSwitchingUserId(u.id!)}
                      className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                    >
                      Switch
                    </button>
                  )}
                  {isOwner && u.role !== 'owner' && (
                    <button 
                      onClick={() => handleDeleteUser(u.id!)}
                      className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {isOwner && (
            showAdd ? (
              <form onSubmit={handleAddUser} className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Name</label>
                  <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#1E293B] border border-white/10 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Role</label>
                  <select value={role} onChange={e => handleRoleChange(e.target.value as any)} className="w-full bg-[#1E293B] border border-white/10 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50">
                    {activeContext === 'personal' ? (
                      <option value="spouse">Spouse (Shared Budget)</option>
                    ) : (
                      <>
                        <option value="employee">Employee (View Only)</option>
                        <option value="cashier">Cashier (Add Entries Only)</option>
                        <option value="spouse">Partner/Spouse (Full Access)</option>
                      </>
                    )}
                  </select>
                </div>
                {role !== 'cashier' && role !== 'employee' && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Context Access</label>
                    <select value={contextAccess} onChange={e => setContextAccess(e.target.value as any)} className="w-full bg-[#1E293B] border border-white/10 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50">
                      <option value="both">Both (Personal & Business)</option>
                      <option value="business">Business Only</option>
                      <option value="personal">Personal Only</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Passcode (PIN)</label>
                  <input required type="password" pattern="[0-9]*" inputMode="numeric" value={passcode} onChange={e => setPasscode(e.target.value)} className="w-full bg-[#1E293B] border border-white/10 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2 bg-white/5 text-white rounded-lg text-xs font-bold hover:bg-white/10 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20">Add User</button>
                </div>
              </form>
            ) : (
              <button onClick={() => setShowAdd(true)} className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-white/20 text-slate-300 rounded-xl hover:bg-white/5 transition-colors text-sm font-bold">
                <UserPlus size={16} /> Add {activeContext === 'personal' ? 'Family Member' : 'Staff / Partner'}
              </button>
            )
          )}
        </>
      )}
    </div>
  );
}
