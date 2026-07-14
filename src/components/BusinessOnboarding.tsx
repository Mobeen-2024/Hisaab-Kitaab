import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { Store, ShoppingBag, Utensils, Zap, Wrench, Package, Briefcase, User, Check } from 'lucide-react';
import { Button } from './ui/Button';

const BUSINESS_MODES = [
  { id: 'general', label: 'General / Basic', icon: Store, modules: [] },
  { id: 'retail', label: 'Retail Shop', icon: ShoppingBag, modules: ['inventory', 'pos', 'invoice'] },
  { id: 'grocery', label: 'Grocery / Kiryana', icon: Package, modules: ['inventory', 'udhaar', 'khata'] },
  { id: 'restaurant', label: 'Restaurant / Cafe', icon: Utensils, modules: ['table_management', 'kot', 'pos'] },
  { id: 'repair', label: 'Repair Shop', icon: Wrench, modules: ['job_card', 'inventory', 'pos'] },
  { id: 'solar', label: 'Solar Business', icon: Zap, modules: ['warranty', 'project_tracking', 'invoice'] },
  { id: 'wholesale', label: 'Wholesale / B2B', icon: Briefcase, modules: ['inventory', 'invoice', 'bulk_pricing'] },
  { id: 'personal', label: 'Personal Finance', icon: User, modules: [] }
];

export default function BusinessOnboarding({ onComplete }: { onComplete: () => void }) {
  const { updateSetting } = useSettings();
  const [selectedMode, setSelectedMode] = useState<string>('general');
  const [isLoading, setIsLoading] = useState(false);

  const handleComplete = async () => {
    setIsLoading(true);
    const modeObj = BUSINESS_MODES.find(m => m.id === selectedMode);
    try {
      if (modeObj) {
        await updateSetting('businessMode', selectedMode as any);
        await updateSetting('activeModules', modeObj.modules);
      }
      
      if (selectedMode === 'personal') {
        await updateSetting('activeContext', 'personal');
      } else {
        await updateSetting('activeContext', 'business');
      }
      
      await updateSetting('isOnboarded', true);
      onComplete();
    } catch (err) {
      console.error(err);
      alert('Failed to save settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 p-4">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
        
        <div className="p-6 md:p-8 shrink-0 border-b border-white/5 text-center">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-400 to-blue-700 rounded-2xl flex items-center justify-center shadow-[0_8px_20px_rgba(37,99,235,0.4)] mb-4">
            <span className="font-black text-white text-2xl">HK</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight mb-2">Welcome to Hisaib Kitaib</h2>
          <p className="text-slate-400 max-w-md mx-auto text-sm">
            Select your business type to personalize your experience. We will enable the right tools and modules for you.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {BUSINESS_MODES.map((mode) => {
              const Icon = mode.icon;
              const isSelected = selectedMode === mode.id;
              
              return (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  className={`relative flex flex-col items-center text-center p-6 rounded-2xl border-2 transition-all duration-200 ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-500/10' 
                      : 'border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center">
                      <Check size={14} />
                    </div>
                  )}
                  
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-colors ${
                    isSelected ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-800 text-slate-400'
                  }`}>
                    <Icon size={24} />
                  </div>
                  
                  <h3 className={`font-bold mb-2 ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                    {mode.label}
                  </h3>
                  
                  {mode.modules.length > 0 ? (
                    <div className="flex flex-wrap gap-1 justify-center mt-auto">
                      {mode.modules.map(mod => (
                        <span key={mod} className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-medium">
                          {mod.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-auto text-[10px] text-slate-500 font-medium">
                      Core Features Only
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6 shrink-0 border-t border-white/5 bg-slate-900 flex justify-end">
          <Button 
            onClick={handleComplete} 
            disabled={isLoading}
            className="w-full md:w-auto px-8"
          >
            {isLoading ? 'Setting up...' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}
