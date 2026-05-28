import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, Camera, Loader2, AlertCircle, Sparkles, 
  FileText, FileSpreadsheet, Image as ImageIcon, CheckCircle, Copy, ArrowRight, ArrowLeft 
} from 'lucide-react';
import { DocumentProcessingAgent, DocumentExtractionResult, ConfirmedExtractionResult } from '../../services/DocumentProcessingAgent';
import { ParsedTransaction } from '../../utils/statementParsers';
import EditableExtractionForm from './EditableExtractionForm';

interface DocumentAgentPanelProps {
  onImportTransactions: (transactions: ParsedTransaction[], platform: string) => void;
  isLoadingGlobal: boolean;
  setIsLoadingGlobal: (loading: boolean) => void;
}

type StepState = 'idle' | 'loading' | 'review' | 'confirming' | 'success';

export default function DocumentAgentPanel({
  onImportTransactions,
  isLoadingGlobal,
  setIsLoadingGlobal
}: DocumentAgentPanelProps) {
  const [step, setStep] = useState<StepState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [extractedResult, setExtractedResult] = useState<DocumentExtractionResult | null>(null);
  const [canConfirm, setCanConfirm] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const confirmTriggerRef = useRef<(() => void) | null>(null); // allows us to invoke submit from sticky bar

  // Handles drag/drop & file selection
  const processFile = async (file: File) => {
    setStep('loading');
    setIsLoadingGlobal(true);
    setError(null);
    setExtractedResult(null);

    try {
      const result = await DocumentProcessingAgent.fromFile(file);
      if (!result || (!result.receipt && !result.table)) {
        throw new Error("The agent could not extract any structured receipt or table data from this file.");
      }
      setExtractedResult(result);
      setStep('review');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while parsing the document with Gemini Flash.");
      setStep('idle');
    } finally {
      setIsLoadingGlobal(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleCopyJson = async () => {
    if (!extractedResult) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(extractedResult, null, 2));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy JSON:", err);
    }
  };

  // Called when the user clicks "Confirm & Import" and form validates successfully
  const handleConfirmed = async (confirmed: ConfirmedExtractionResult) => {
    setStep('confirming');
    setIsLoadingGlobal(true);
    try {
      // Convert confirmed structured data to app's ParsedTransaction rows
      const platform = confirmed.documentType === 'receipt' ? 'receipt_scanner' : 'table_extraction';
      const transactions = DocumentProcessingAgent.toTransactions(confirmed, platform);
      
      if (transactions.length === 0) {
        throw new Error("No transactions were generated from the confirmed fields.");
      }

      onImportTransactions(transactions, platform);
      setStep('success');
    } catch (err: any) {
      setError(err.message || "Failed to map confirmed fields to transactions.");
      setStep('review');
    } finally {
      setIsLoadingGlobal(false);
    }
  };

  const handleReset = () => {
    setStep('idle');
    setError(null);
    setExtractedResult(null);
    setCanConfirm(false);
  };

  return (
    <div className="space-y-6">
      {/* Visual Header Stepper / Breadcrumbs */}
      <div className="flex items-center justify-center gap-2 pb-2">
        <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${
          step === 'idle' || step === 'loading' ? 'text-blue-400' : 'text-slate-500'
        }`}>
          <span>1. Upload</span>
        </div>
        <div className="w-8 h-px bg-white/10" />
        <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${
          step === 'review' ? 'text-blue-400' : 'text-slate-500'
        }`}>
          <span>2. Review & Edit</span>
        </div>
        <div className="w-8 h-px bg-white/10" />
        <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${
          step === 'confirming' || step === 'success' ? 'text-blue-400' : 'text-slate-500'
        }`}>
          <span>3. Confirm</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Drag and Drop Zone */}
            <div className="bg-slate-950/40 border border-white/10 rounded-3xl p-6 relative overflow-hidden transition-all duration-300 hover:border-blue-500/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-blue-400 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Document Scan Agent</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">PDF, CSV, Images</span>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-4 transition-all cursor-pointer text-center relative ${
                  isDragging 
                    ? 'border-blue-500 bg-blue-500/10 scale-[0.99]' 
                    : 'border-white/10 hover:border-blue-500/40 hover:bg-blue-500/5'
                }`}
              >
                <div className="flex gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 shadow-inner">
                    <Upload size={22} />
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shadow-inner">
                    <Camera size={22} />
                  </div>
                </div>

                <div>
                  <p className="text-white font-medium text-sm">Drop document file or receipt photo here</p>
                  <p className="text-slate-500 text-xs mt-1">Tap to browse or snap with camera</p>
                </div>

                <div className="flex gap-4 text-slate-500 text-xs font-semibold mt-1">
                  <span className="flex items-center gap-1.5"><FileText size={13} /> PDF</span>
                  <span className="flex items-center gap-1.5"><FileSpreadsheet size={13} /> CSV</span>
                  <span className="flex items-center gap-1.5"><ImageIcon size={13} /> JPG/PNG</span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf,.csv,image/*"
                  className="hidden"
                />
              </div>
            </div>
          </motion.div>
        )}

        {step === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16 gap-4 text-center"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-blue-400">
                <Sparkles size={20} className="animate-pulse" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-white font-bold text-base">Gemini is Scanning Document...</h3>
              <p className="text-xs text-slate-400 animate-pulse max-w-sm">
                Extracting itemized fields, vendor details, and amounts with precision intelligence layer
              </p>
            </div>
          </motion.div>
        )}

        {step === 'review' && extractedResult && (
          <motion.div
            key="review"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Inline Review Form */}
            <EditableExtractionForm
              result={extractedResult}
              onConfirm={handleConfirmed}
              onReset={handleReset}
              setCanConfirm={setCanConfirm}
              confirmTriggerRef={confirmTriggerRef}
            />

            {/* Sticky Action Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={handleReset}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Start Over</span>
              </button>

              <div className="flex w-full sm:w-auto gap-3">
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-white/5"
                >
                  <Copy size={14} />
                  <span>{copySuccess ? 'Copied!' : 'Copy JSON'}</span>
                </button>

                <button
                  type="button"
                  disabled={!canConfirm}
                  onClick={() => confirmTriggerRef.current?.()}
                  className={`flex-[2] sm:flex-none px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    canConfirm 
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25' 
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                  }`}
                >
                  <span>Confirm & Import</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'confirming' && (
          <motion.div
            key="confirming"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 gap-4 text-center"
          >
            <Loader2 size={36} className="animate-spin text-blue-500" />
            <div className="space-y-1">
              <h3 className="text-white font-semibold">Mapping confirmed details...</h3>
              <p className="text-xs text-slate-400">Reconciling line items to individual transactions</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error alert wrapper */}
      {error && step !== 'review' && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 animate-in fade-in duration-300">
          <AlertCircle size={18} className="shrink-0" />
          <p className="text-xs font-medium">{error}</p>
        </div>
      )}
    </div>
  );
}
