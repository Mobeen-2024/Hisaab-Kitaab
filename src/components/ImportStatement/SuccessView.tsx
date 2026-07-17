import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '../ui/Button';

interface SuccessViewProps {
  savedIds: number[];
  errors: { index: number; reason: string }[];
  duplicatesSkipped: number;
  onUndo: () => void;
  onClose: () => void;
}

export default function SuccessView({ savedIds, errors, duplicatesSkipped, onUndo, onClose }: SuccessViewProps) {
  const [isUndoing, setIsUndoing] = useState(false);

  const handleUndo = async () => {
    setIsUndoing(true);
    await onUndo();
    setIsUndoing(false);
  };

  return (
    <div className="py-8 flex flex-col items-center space-y-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400"
      >
        <CheckCircle2 size={40} />
      </motion.div>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Import Complete</h2>
        <p className="text-slate-400 mt-2">
          Successfully imported <span className="font-bold text-emerald-400">{savedIds.length}</span> new transactions.
        </p>
        {duplicatesSkipped > 0 && (
          <p className="text-sm text-slate-500 mt-1">
            Skipped {duplicatesSkipped} duplicates.
          </p>
        )}
      </div>

      {errors.length > 0 && (
        <div className="w-full bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 mt-4 text-left">
          <div className="flex items-center gap-2 text-rose-400 font-bold mb-2">
            <AlertTriangle size={18} />
            <span>{errors.length} rows failed to import:</span>
          </div>
          <ul className="text-xs text-rose-300 space-y-1 max-h-32 overflow-y-auto pr-2 list-disc list-inside">
            {errors.slice(0, 5).map((err, i) => (
              <li key={i}>Row {err.index + 1}: {err.reason}</li>
            ))}
            {errors.length > 5 && (
              <li className="text-rose-400/70 italic list-none mt-2">...and {errors.length - 5} more</li>
            )}
          </ul>
        </div>
      )}

      <div className="flex gap-4 w-full mt-6">
        <Button 
          variant="secondary" 
          onClick={handleUndo} 
          disabled={isUndoing || savedIds.length === 0}
          className="flex-1 flex items-center justify-center gap-2"
        >
          {isUndoing ? <RefreshCcw className="animate-spin" size={16} /> : <RefreshCcw size={16} />}
          Undo Import
        </Button>
        <Button 
          variant="blue" 
          onClick={onClose}
          className="flex-[2]"
        >
          Done
        </Button>
      </div>
    </div>
  );
}
