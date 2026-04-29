import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, FileText, Smartphone, Banknote, CheckCircle2, AlertCircle, Loader2, Sparkles, FileStack } from 'lucide-react';
import { db, Transaction, Category } from '../db';
import { GoogleGenAI } from '@google/genai';
import { useLiveQuery } from 'dexie-react-hooks';
import { parseJazzCashCSV, parseEasypaisaCSV, parseGenericCSV, ParsedTransaction } from '../utils/statementParsers';

interface ImportStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportStatementModal({ isOpen, onClose }: ImportStatementModalProps) {
  const [step, setStep] = useState<'select' | 'preview' | 'success' | 'ai_paste'>('select');
  const [source, setSource] = useState<'easypaisa' | 'jazzcash' | 'bank' | 'pdf' | 'ai'>('easypaisa');
  const [pastedText, setPastedText] = useState('');
  const [parsedData, setParsedData] = useState<ParsedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractTextFromPDF = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const typedarray = new Uint8Array(reader.result as ArrayBuffer);
          
          if (!(window as any).pdfjsLib) {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            await new Promise((res) => {
              script.onload = res;
              document.head.appendChild(script);
            });
          }

          const pdfjsLib = (window as any).pdfjsLib;
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

          const pdf = await pdfjsLib.getDocument(typedarray).promise;
          let fullText = '';
          
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            // Group items by their Y coordinate (vertical position)
            const lines: { [key: number]: any[] } = {};
            textContent.items.forEach((item: any) => {
              const y = Math.round(item.transform[5]); // Y coordinate
              if (!lines[y]) lines[y] = [];
              lines[y].push(item);
            });

            // Sort Y coordinates descending (top to bottom)
            const sortedY = Object.keys(lines).map(Number).sort((a, b) => b - a);
            
            const pageText = sortedY.map(y => {
              // Sort items on the same line by their X coordinate (left to right)
              return lines[y]
                .sort((a, b) => a.transform[4] - b.transform[4])
                .map(item => item.str)
                .join(' ');
            }).join('\n');

            fullText += pageText + '\n';
          }
          
          resolve(fullText);
        } catch (err) {
          console.error("PDF Extraction Error:", err);
          reject("Failed to extract text from PDF. Ensure it is not password protected.");
        }
      };
      reader.onerror = () => reject("Failed to read file.");
      reader.readAsArrayBuffer(file);
    });
  };

  const categories = useLiveQuery(() => db.categories.toArray());
  const activeContext = useLiveQuery(() => db.settings.toArray().then(s => s[0]?.activeContext || 'business'));

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSource('easypaisa');
      setPastedText('');
      setParsedData([]);
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      if (file.type === 'application/pdf') {
        const text = await extractTextFromPDF(file);
        setPastedText(text);
        setSource('ai');
        setStep('select');
        setIsLoading(false);
        return;
      }

      const text = await file.text();
      let results: ParsedTransaction[] = [];

      if (source === 'jazzcash') results = parseJazzCashCSV(text);
      else if (source === 'easypaisa') results = parseEasypaisaCSV(text);
      else results = parseGenericCSV(text);

      if (results.length === 0) {
        throw new Error("No transactions found in this file.");
      }

      setParsedData(results);
      setStep('preview');
    } catch (err: any) {
      setError(err.message || "Failed to parse file.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAIParsing = async () => {
    const settings = await db.settings.get(1);
    const rawKey = settings?.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY || '';

    if (!rawKey) {
      setError("Please add your Gemini API Key in Settings to use AI parsing.");
      return;
    }

    if (!pastedText.trim()) {
      setError("Please paste some text to parse.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const cleanKey = rawKey.replace(/[^\x20-\x7E]/g, '').trim();

    try {
      // Sanitize key - strip invisible/non-ASCII chars that break HTTP headers
      if (!cleanKey) {
        setError("API key appears to be invalid. Please re-paste it in Settings.");
        return;
      }
      const ai = new GoogleGenAI({ apiKey: cleanKey });
      
      const prompt = `
        Parse the following financial statement text and return a JSON array of transactions.
        Each transaction must have:
        - date (YYYY-MM-DD)
        - amount (positive number)
        - type ('income' or 'expense')
        - description (string)
        - referenceId (unique string if available)

        Text:
        ${pastedText}

        Return ONLY a JSON array. Return ONLY the JSON, no other text.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
      });

      if (!response.text) {
        throw new Error("AI could not find any transactions in the text.");
      }

      // Strip markdown code fences if present (e.g. ```json ... ```)
      const rawText = response.text.trim();
      const jsonText = rawText.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();

      const results: ParsedTransaction[] = JSON.parse(jsonText);

      if (!Array.isArray(results) || results.length === 0) {
        throw new Error("AI could not find any transactions in the text.");
      }

      setParsedData(results);
      setStep('preview');
    } catch (err: any) {
      const msg = err.message || '';
      const keyPreview = cleanKey ? `${cleanKey.slice(0, 6)}...${cleanKey.slice(-4)}` : 'none';
      
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
        setError(`⚠️ API Quota Exhausted (Key: ${keyPreview}): Your free tier limit has been reached. Please try a different Google account or wait for the quota to reset.`);
      } else if (msg.includes('503') || msg.includes('UNAVAILABLE')) {
        setError('⚠️ AI servers are busy right now. Please wait a few seconds and try again.');
      } else {
        setError(`${msg} (Key: ${keyPreview})`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocalParsing = () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const lines = pastedText.split('\n');
      const results: ParsedTransaction[] = [];
      
      // Robust Regex for various formats
      // Date: Supports 10-Oct-2024, 10/10/2024, Oct 10, 2024, 2024-10-10, etc.
      const dateRegex = /(\d{1,4}[-/.\s]([A-Za-z]{3}|\d{1,2})[-/.\s]\d{2,4})|(([A-Za-z]{3}|\d{1,2})[-/.\s]\d{1,2}[-/.\s]\d{2,4})/;
      
      // Amount: Supports 1,234.56, 1234, Rs. 100, PKR 500.00, etc.
      const amountRegex = /(?:Rs\.?|PKR|[\$€£])?\s*([\d,]+\.\d{2}|[\d,]+)/i;

      lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.length < 5) return;

        const dateMatch = trimmedLine.match(dateRegex);
        // Look for the last number-looking thing in the line for the amount
        const amountMatches = trimmedLine.match(/[\d,]+\.\d{2}|[\d,]{2,}/g);
        
        if (dateMatch && amountMatches && amountMatches.length > 0) {
          // Take the most likely amount (usually the one with a decimal or the last one)
          const amountStr = amountMatches.find(m => m.includes('.')) || amountMatches[amountMatches.length - 1];
          const amount = parseFloat(amountStr.replace(/,/g, ''));
          
          if (isNaN(amount) || amount === 0) return;

          const description = trimmedLine
            .replace(dateMatch[0], '')
            .replace(amountStr, '')
            .replace(/[Rr]s\.?|PKR|[\$€£]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

          // Heuristic for type
          let type: 'income' | 'expense' = 'expense';
          const lowerLine = trimmedLine.toLowerCase();
          const incomeKeywords = ['received', 'credited', 'inward', 'deposit', 'transfer-in', 'cr'];
          if (incomeKeywords.some(k => lowerLine.includes(k))) {
            type = 'income';
          }

          results.push({
            date: dateMatch[0],
            description: description || "Transaction",
            amount: amount,
            type: type,
            referenceId: `local-${Math.random().toString(36).substr(2, 9)}`
          });
        }
      });

      if (results.length === 0) {
        throw new Error("Local parser couldn't find transactions. Please check the text format.");
      }

      setParsedData(results);
      setStep('preview');
    } catch (err: any) {
      setError(`Local parsing failed: ${err.message}. Try adjusting the text or use AI Scan when quota resets.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!parsedData.length) return;
    setIsLoading(true);
    setError(null);

    try {
      // Fetch latest data to ensure we are using current state
      const settings = await db.settings.get(1);
      const currentCategories = await db.categories.toArray();
      const currentContext = settings?.activeContext || 'business';

      const defaultIncomeCat = currentCategories.find(c => c.type === 'income' && c.context === currentContext)?.id || 
                              currentCategories.find(c => c.type === 'income')?.id || 0;
      const defaultExpenseCat = currentCategories.find(c => c.type === 'expense' && c.context === currentContext)?.id || 
                               currentCategories.find(c => c.type === 'expense')?.id || 0;

      // Map 'bank' source to 'bank_import' for database consistency
      const mappedSource = source === 'bank' ? 'bank_import' : source;

      const transactionsToSave: Transaction[] = parsedData.map(pt => ({
        amount: Math.abs(pt.amount),
        type: pt.type,
        categoryId: pt.type === 'income' ? defaultIncomeCat : defaultExpenseCat,
        context: currentContext as any,
        date: pt.date,
        description: pt.description,
        source: mappedSource as any,
        importReferenceId: pt.referenceId,
        paymentMethod: 'mobile_wallet'
      }));

      // Filter out duplicates if reference IDs exist
      const existingRefs = new Set(
        (await db.transactions
          .where('importReferenceId')
          .anyOf(parsedData.map(d => d.referenceId).filter(Boolean))
          .toArray()
        ).map(t => t.importReferenceId)
      );

      const newTransactions = transactionsToSave.filter(t => 
        !t.importReferenceId || !existingRefs.has(t.importReferenceId)
      );

      if (newTransactions.length > 0) {
        await db.transactions.bulkAdd(newTransactions);
      }
      
      setStep('success');
    } catch (err: any) {
      console.error("Import failed:", err);
      setError("Failed to save transactions: " + (err.message || "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Import Statement</h2>
                <p className="text-sm text-slate-400">Backfill your data from mobile wallets or banks</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {activeContext === undefined ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Loader2 className="animate-spin text-blue-500" size={32} />
                  <p className="text-slate-400 text-sm">Initializing import system...</p>
                </div>
              ) : step === 'select' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <button
                      onClick={() => setSource('easypaisa')}
                      className={`p-4 rounded-2xl border flex flex-col items-center gap-3 transition-all ${
                        source === 'easypaisa' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      <Smartphone size={24} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-center">Easypaisa</span>
                    </button>
                    <button
                      onClick={() => setSource('jazzcash')}
                      className={`p-4 rounded-2xl border flex flex-col items-center gap-3 transition-all ${
                        source === 'jazzcash' ? 'bg-orange-500/10 border-orange-500 text-orange-400' : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      <Smartphone size={24} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-center">JazzCash</span>
                    </button>
                    <button
                      onClick={() => setSource('bank')}
                      className={`p-4 rounded-2xl border flex flex-col items-center gap-3 transition-all ${
                        source === 'bank' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      <Banknote size={24} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-center">Bank (CSV)</span>
                    </button>
                    <button
                      onClick={() => setSource('ai')}
                      className={`p-4 rounded-2xl border flex flex-col items-center gap-3 transition-all ${
                        source === 'ai' ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      <Sparkles size={24} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-center">AI Scan (PDF)</span>
                    </button>
                  </div>

                  {source === 'ai' ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl">
                        <p className="text-xs text-indigo-300 font-medium leading-relaxed">
                          Copy all text from your PDF statement or SMS and paste it below. Gemini AI will automatically extract dates, amounts, and descriptions.
                        </p>
                      </div>
                      <textarea
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        placeholder="Paste statement text here..."
                        className="w-full h-40 bg-slate-950/50 border border-white/10 rounded-2xl p-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                      <div className="flex flex-col gap-3">
                        <button
                          onClick={handleAIParsing}
                          disabled={isLoading || !pastedText.trim()}
                          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
                        >
                          {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                          Start AI Extraction
                        </button>
                        
                        {!isLoading && pastedText.trim() && (
                          <button
                            onClick={handleLocalParsing}
                            className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl flex items-center justify-center gap-2 border border-white/10 transition-all"
                          >
                            <FileText size={18} />
                            Try Local Extraction (No AI Quota)
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-white/10 rounded-3xl p-12 flex flex-col items-center gap-4 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer group"
                    >
                      <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                        {isLoading ? <Loader2 size={32} className="animate-spin" /> : <Upload size={32} />}
                      </div>
                      <div className="text-center">
                        <p className="text-white font-medium">Click to upload statement</p>
                        <p className="text-slate-500 text-sm mt-1">Supports .csv or .pdf statements</p>
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        accept=".csv,.pdf" 
                        className="hidden" 
                      />
                    </div>
                  )}

                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400">
                      <AlertCircle size={20} />
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  )}
                </div>
              )}

              {step === 'preview' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-bold">Preview Transactions</h3>
                    <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase">
                      {parsedData.length} Found
                    </span>
                  </div>

                  <div className="border border-white/5 rounded-2xl overflow-hidden bg-slate-950/50">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-white/5 text-slate-400 font-medium">
                        <tr>
                          <th className="p-3">Date</th>
                          <th className="p-3">Description</th>
                          <th className="p-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {parsedData.slice(0, 50).map((row, i) => (
                          <tr key={i} className="text-slate-300">
                            <td className="p-3 text-xs">{row.date}</td>
                            <td className="p-3 font-medium truncate max-w-[200px]">{row.description}</td>
                            <td className={`p-3 text-right font-bold ${row.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                              {row.type === 'income' ? '+' : '-'}{row.amount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setStep('select')}
                      className="flex-1 py-3 bg-white/5 text-white font-bold rounded-2xl hover:bg-white/10 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={isLoading}
                      className="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
                    >
                      {isLoading && <Loader2 size={18} className="animate-spin" />}
                      Confirm Import
                    </button>
                  </div>
                </div>
              )}

              {step === 'success' && (
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
                      Successfully imported {parsedData.length} transactions into your ledger.
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="px-12 py-3 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-500 transition-colors"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
