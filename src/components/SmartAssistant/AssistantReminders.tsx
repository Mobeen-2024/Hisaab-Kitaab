import React from 'react';
import { Activity } from 'lucide-react';

interface AssistantRemindersProps {
  activeContext: string;
  lowStockItemsCount: number;
}

export default function AssistantReminders({ activeContext, lowStockItemsCount }: AssistantRemindersProps) {
  return (
    <div className="bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem]">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Activity className="text-emerald-400" size={20} />
        Smart Reminders & Autopilot
      </h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl">
          <div>
            <h4 className="font-bold text-white text-sm">Low Balance Warning</h4>
            <p className="text-xs text-slate-400 mt-1">AI predicts cash shortage based on your spending pattern.</p>
          </div>
          <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg uppercase tracking-widest">Active</div>
        </div>
        {activeContext === 'business' && (
          <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl">
            <div>
              <h4 className="font-bold text-white text-sm">Inventory Alerts</h4>
              <p className="text-xs text-slate-400 mt-1">
                {lowStockItemsCount > 0
                  ? `${lowStockItemsCount} item(s) are below minimum stock.`
                  : 'All items are sufficiently stocked.'}
              </p>
            </div>
            <div className={`px-3 py-1 text-xs font-bold rounded-lg uppercase tracking-widest ${lowStockItemsCount > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {lowStockItemsCount > 0 ? 'Alert' : 'OK'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
