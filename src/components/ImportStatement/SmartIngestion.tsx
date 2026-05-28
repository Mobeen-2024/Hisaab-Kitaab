import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, Camera, Plus, Minus, Loader2, AlertCircle, Sparkles, 
  ChevronDown, ChevronUp, FileText, FileSpreadsheet, Image as ImageIcon, CheckCircle 
} from 'lucide-react';
import { AIService } from '../../services/AIService';
import { parseCSVFile } from '../../utils/csvParser';
import { extractTextFromPDF, ParsedTransaction, generateDeterministicId } from '../../utils/statementParsers';
import DatePicker from '../DatePicker';

interface SmartIngestionProps {
  onResult: (transactions: ParsedTransaction[], platform: string) => void;
  onManualEntry: (transaction: ParsedTransaction) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export default function SmartIngestion({ onResult, onManualEntry, isLoading, setIsLoading }: SmartIngestionProps) {
  const [error, setError] = useState<string | null>(null);
  const [successPlatform, setSuccessPlatform] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Form States
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [manualAmount, setManualAmount] = useState('');
  const [manualType, setManualType] = useState<'income' | 'expense'>('expense');
  const [manualDesc, setManualDesc] = useState('');

  const processFile = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setSuccessPlatform(null);

    try {
      let analysisResult;

      if (file.type === 'application/pdf') {
        const extractedText = await extractTextFromPDF(file);
        if (!extractedText.trim()) {
          throw new Error("Could not extract any text from this PDF.");
        }
        
        try {
          analysisResult = await AIService.analyzeDocument({ type: 'text', content: extractedText });
        } catch (geminiError: any) {
          console.warn("Gemini parsing failed, falling back to local statement parser:", geminiError);
          // Fallback to offline regex statement parsing
          const fallbackTxns = await runOfflineTextParser(extractedText);
          onResult(fallbackTxns, 'pdf_fallback');
          setSuccessPlatform('Local PDF Extractor (Offline)');
          return;
        }
      } 
      else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        const rawRows = await parseCSVFile(file);
        const serializedText = rawRows.map(row => row.join(', ')).join('\n');
        
        try {
          analysisResult = await AIService.analyzeDocument({ type: 'text', content: serializedText });
        } catch (geminiError) {
          console.warn("Gemini parsing failed, falling back to local CSV parser");
          // Fallback to local offline CSV parser
          const fallbackTxns = runOfflineCSVParser(serializedText, file.name.toLowerCase());
          onResult(fallbackTxns, file.name.toLowerCase().includes('jazz') ? 'jazzcash' : 'easypaisa');
          setSuccessPlatform('Local CSV Parser (Offline)');
          return;
        }
      } 
      else if (file.type.startsWith('image/')) {
        const base64 = await fileToBase64(file);
        
        try {
          analysisResult = await AIService.analyzeDocument({ 
            type: 'image', 
            base64, 
            mimeType: file.type 
          });
        } catch (geminiError: any) {
          throw new Error(`Gemini Vision analysis is required for images: ${geminiError.message || geminiError}`);
        }
      } 
      else {
        throw new Error("Unsupported file type. Please upload a PDF, CSV, or Image (JPG/PNG).");
      }

      if (!analysisResult || !analysisResult.transactions || analysisResult.transactions.length === 0) {
        throw new Error("No transactions could be identified in the uploaded document.");
      }

      setSuccessPlatform(`${analysisResult.platform.toUpperCase()} (${analysisResult.type.replace('_', ' ')})`);
      onResult(analysisResult.transactions, analysisResult.platform);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while parsing the document.");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper: Convert File to Base64 (needed for Gemini Vision)
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Fallback: Parse statements using local regex offline helper
  const runOfflineTextParser = async (text: string): Promise<ParsedTransaction[]> => {
    const lines = text.split('\n');
    const results: ParsedTransaction[] = [];
    const dateRegex = /(\d{1,4}[-/.\s](?:[A-Za-z]{3}|\d{1,2})[-/.\s]\d{2,4})/;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.length < 5) return;

      const dateMatch = trimmed.match(dateRegex);
      if (dateMatch) {
        const amountMatch = trimmed.match(/([\d,]+\.\d{2})/);
        const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;
        if (amount > 0) {
          const type = trimmed.toLowerCase().includes('cr') || trimmed.toLowerCase().includes('deposit') ? 'income' : 'expense';
          const description = trimmed.replace(dateMatch[0], '').replace(amountMatch ? amountMatch[0] : '', '').trim();
          results.push({
            date: dateMatch[0],
            amount,
            type,
            description: description || 'Offline Transaction',
            referenceId: generateDeterministicId(dateMatch[0], amount, description)
          });
        }
      }
    });

    if (results.length === 0) {
      throw new Error("Offline PDF parsing failed. No patterns matched.");
    }
    return results;
  };

  // Fallback: Parse CSV using local row parser offline helper
  const runOfflineCSVParser = (csvText: string, filename: string): ParsedTransaction[] => {
    const lines = csvText.split('\n').map(line => line.split(','));
    const results: ParsedTransaction[] = [];
    const isJazz = filename.includes('jazz');

    lines.slice(1).forEach((row, idx) => {
      if (row.length < 3) return;
      try {
        const date = row[0]?.trim() || new Date().toISOString().split('T')[0];
        const rawAmount = row[isJazz ? 3 : 4] || '0';
        const amount = Math.abs(parseFloat(rawAmount.replace(/[^0-9.-]+/g, ""))) || 0;
        const description = row[2]?.trim() || 'CSV Transaction';
        if (amount > 0) {
          results.push({
            date,
            amount,
            type: parseFloat(rawAmount) >= 0 ? 'income' : 'expense',
            description: `${isJazz ? 'JazzCash' : 'Easypaisa'}: ${description}`,
            referenceId: row[1]?.trim() || `csv-${idx}`
          });
        }
      } catch (e) {}
    });

    if (results.length === 0) {
      throw new Error("Offline CSV parsing failed.");
    }
    return results;
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

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(manualAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid positive amount.");
      return;
    }
    if (!manualDesc.trim()) {
      setError("Please enter a description.");
      return;
    }

    const manualTxn: ParsedTransaction = {
      date: manualDate,
      amount: amountNum,
      type: manualType,
      description: manualDesc,
      referenceId: generateDeterministicId(manualDate, amountNum, manualDesc)
    };

    onManualEntry(manualTxn);
    // Reset manual form
    setManualAmount('');
    setManualDesc('');
  };

  return (
    <div className="space-y-6">
      {/* Premium responsive 2-column card layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Column 1: Smart Scanner Upload Zone */}
        <div className="md:col-span-7 bg-slate-950/40 border border-white/10 rounded-3xl p-6 relative overflow-hidden transition-all duration-300 hover:border-blue-500/20">
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-blue-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Smart Scanner</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">PDF, CSV, JPG, PNG</span>
          </div>

          <div
            onClick={() => !isLoading && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); if (!isLoading) setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-4 transition-all cursor-pointer text-center relative ${
              isDragging 
                ? 'border-blue-500 bg-blue-500/10 scale-[0.99]' 
                : 'border-white/10 hover:border-blue-500/40 hover:bg-blue-500/5'
            } ${isLoading ? 'pointer-events-none opacity-50' : ''}`}
          >
            {/* Animated Loading Overlay / Skeleton */}
            {isLoading && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3 z-10">
                <Loader2 size={36} className="animate-spin text-blue-500" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">Analyzing Statement...</p>
                  <p className="text-xs text-slate-400 animate-pulse">Gemini intelligence model processing stream</p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Upload size={22} />
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <Camera size={22} />
              </div>
            </div>

            <div>
              <p className="text-white font-medium text-sm">Drop statement file or receipt image here</p>
              <p className="text-slate-500 text-xs mt-1">Tap to browse files or take a photo</p>
            </div>

            <div className="flex gap-3 text-slate-500 text-xs font-semibold mt-1">
              <span className="flex items-center gap-1"><FileText size={12} /> PDF</span>
              <span className="flex items-center gap-1"><FileSpreadsheet size={12} /> CSV</span>
              <span className="flex items-center gap-1"><ImageIcon size={12} /> Images</span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.csv,image/*"
              className="hidden"
            />
          </div>

          {successPlatform && (
            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-2.5 text-emerald-400 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <CheckCircle size={18} />
              <span className="text-xs font-bold font-mono tracking-wide">Detected & Parsed: {successPlatform}</span>
            </div>
          )}
        </div>

        {/* Column 2: Collapsible Manual Entry accordion */}
        <div className="md:col-span-5 bg-slate-950/40 border border-white/10 rounded-3xl p-6 transition-all duration-300 hover:border-slate-800">
          <button
            onClick={() => setIsManualOpen(!isManualOpen)}
            className="w-full flex items-center justify-between font-bold text-sm text-slate-300 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2">
              <Plus size={16} className="text-slate-400" />
              <span>Or enter manually</span>
            </div>
            {isManualOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          <AnimatePresence initial={false}>
            {isManualOpen && (
              <motion.form
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                onSubmit={handleManualSubmit}
                className="overflow-hidden mt-5 space-y-4"
              >
                <div className="h-px bg-white/5" />

                {/* Amount field */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Amount (PKR)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 5000"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                {/* Type toggle */}
                <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1.5 rounded-2xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => setManualType('expense')}
                    className={`py-2 text-xs font-bold rounded-xl transition-all ${
                      manualType === 'expense'
                        ? 'bg-rose-500/15 border border-rose-500/20 text-rose-400 shadow-lg shadow-rose-500/5'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualType('income')}
                    className={`py-2 text-xs font-bold rounded-xl transition-all ${
                      manualType === 'income'
                        ? 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/5'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Income
                  </button>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Description</label>
                  <input
                    type="text"
                    placeholder="What was this for?"
                    value={manualDesc}
                    onChange={(e) => setManualDesc(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                {/* Date Selection */}
                <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-3">
                  <span className="text-xs font-bold text-slate-400">Transaction Date</span>
                  <DatePicker value={manualDate} onChange={setManualDate} />
                </div>

                {/* Add Transaction Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold tracking-wide transition-all shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Entry</span>
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <AlertCircle size={18} className="shrink-0" />
          <p className="text-xs font-medium">{error}</p>
        </div>
      )}
    </div>
  );
}
