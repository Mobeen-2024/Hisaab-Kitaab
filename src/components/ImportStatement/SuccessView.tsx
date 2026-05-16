import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';

interface SuccessViewProps {
  importedCount: number;
}

export default function SuccessView({ importedCount }: SuccessViewProps) {
  return (
    <div className="py-12 flex flex-col items-center text-center space-y-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400"
      >
        <CheckCircle2 size={48} />
      </motion.div>
      <div>
        <h2 className="text-2xl font-bold text-white">Import Successful!</h2>
        <p className="text-slate-400 mt-2">
          Successfully imported {importedCount} new transactions into your ledger.
        </p>
      </div>
    </div>
  );
}
