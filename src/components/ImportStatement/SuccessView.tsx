import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';

interface SuccessViewProps {
  importedCount: number;
  failedCount?: number;
  failedRows?: { index: number; reason: string }[];
  skippedDuplicateCount?: number;
  onClose?: () => void;
}

export default function SuccessView({ 
  importedCount, 
  failedCount = 0, 
  failedRows = [], 
  skippedDuplicateCount = 0, 
  onClose 
}: SuccessViewProps) {

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
          Successfully imported <span className="font-bold text-emerald-400">{importedCount}</span> new transactions.
        </p>
        {skippedDuplicateCount > 0 && (
          <p className="text-sm text-slate-500 mt-1">
            Skipped {skippedDuplicateCount} duplicates.
          </p>
        )}
      </div>

      {failedCount > 0 && (
        <div className="w-full bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 mt-4 text-left">
          <div className="flex items-center gap-2 text-rose-400 font-bold mb-2">
            <AlertTriangle size={18} />
            <span>{failedCount} rows failed to import:</span>
          </div>
          <ul className="text-xs text-rose-300 space-y-1 max-h-32 overflow-y-auto pr-2 list-disc list-inside">
            {failedRows.slice(0, 5).map((err, i) => (
              <li key={i}>Row {err.index + 1}: {err.reason}</li>
            ))}
            {failedRows.length > 5 && (
              <li className="text-rose-400/70 italic list-none mt-2">...and {failedRows.length - 5} more</li>
            )}
          </ul>
        </div>
      )}

      {onClose && (
        <div className="w-full mt-6">
          <Button 
            variant="blue" 
            onClick={onClose}
            className="w-full"
          >
            Done
          </Button>
        </div>
      )}
    </div>
  );
}
