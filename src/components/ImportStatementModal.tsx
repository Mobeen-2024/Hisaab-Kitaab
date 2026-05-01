import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, FileText, Smartphone, Banknote, CheckCircle2, AlertCircle, Loader2, Sparkles, FileStack } from 'lucide-react';
import { db, Transaction, Category } from '../db';
import { GoogleGenAI } from '@google/genai';
import { useLiveQuery } from 'dexie-react-hooks';
import { parseJazzCashCSV, parseEasypaisaCSV, parseGenericCSV, ParsedTransaction, generateDeterministicId } from '../utils/statementParsers';

interface ImportStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportStatementModal({ isOpen, onClose }: ImportStatementModalProps) {
  const [step, setStep] = useState<'select' | 'preview' | 'success' | 'ai_paste'>('select');
  const [source, setSource] = useState<'easypaisa' | 'jazzcash' | 'bank' | 'pdf' | 'ai'>('easypaisa');
  const [pastedText, setPastedText] = useState('');
  const [parsedData, setParsedData] = useState<(ParsedTransaction & { categoryId?: number; isSelected: boolean })[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [duplicatesSkipped, setDuplicatesSkipped] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
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
      setDuplicatesSkipped(0);
    }
  }, [isOpen]);

  const enhanceAndSetResults = async (rawResults: ParsedTransaction[]) => {
    if (!db.isOpen()) await db.open();
    const settings = await db.settings.get(1);
    const currentCategories = await db.categories.toArray();
    const currentContext = settings?.activeContext || 'business';

    const defaultIncomeCat = currentCategories.find(c => c.type === 'income' && c.context === currentContext)?.id || 
                            currentCategories.find(c => c.type === 'income')?.id || 0;
    const defaultExpenseCat = currentCategories.find(c => c.type === 'expense' && c.context === currentContext)?.id || 
                             currentCategories.find(c => c.type === 'expense')?.id || 0;

    const enhancedResults = rawResults.map(pt => {
      const lowerDesc = pt.description.toLowerCase();
      let matchedCat = pt.type === 'income' ? defaultIncomeCat : defaultExpenseCat;
      
      const catMap: Record<string, string[]> = {
        'salary': ['salary', 'paycheck', 'payroll', 'stipend', 'bonus', 'wage'],
        'groceries': ['grocery', 'supermarket', 'mart', 'karyana', 'milk', 'bread', 'imtiyaz', 'metro', 'carrefour', 'food', 'meat', 'bakers'],
        'utility bills (bijli/sui gas)': ['bill', 'electric', 'gas', 'water', 'internet', 'ptcl', 'wapda', 'lesco', 'kelectric', 'nayatel', 'sui northern'],
        'transport': ['uber', 'careem', 'petrol', 'fuel', 'bike', 'bus', 'train', 'ticket', 'indrive', 'yango', 'bykea', 'hascol', 'pso', 'shell'],
        'dining out': ['restaurant', 'cafe', 'foodpanda', 'cheetay', 'kfc', 'mcdonalds', 'hardees', 'pizza', 'burger', 'eatery'],
        'shopping': ['daraz', 'aliexpress', 'amazon', 'clothing', 'shoes', 'boutique', 'outfitters', 'khaadi', 'sapphire', 'alkaram', 'store'],
        'medical': ['pharmacy', 'hospital', 'clinic', 'doctor', 'chughtai', 'shaukat khanum', 'agha khan', 'medicine', 'health'],
        'entertainment': ['netflix', 'spotify', 'cinema', 'movie', 'game', 'steam', 'subscription'],
        'transfer': ['transfer', 'ibft', 'raast', 'nayapay', 'sadapay', 'easypaisa', 'jazzcash', 'sent to', 'received from'],
        'cattle feed (chara)': ['feed', 'chara', 'khal', 'banola', 'fodder'],
        'daily milk sales': ['milk sale', 'doodh', 'client payment'],
      };

      for (const [catName, keywords] of Object.entries(catMap)) {
        if (keywords.some(k => lowerDesc.includes(k))) {
          const found = currentCategories.find(c => c.name.toLowerCase() === catName && c.context === currentContext);
          if (found) {
            matchedCat = found.id!;
            break;
          }
        }
      }

      return {
        ...pt,
        categoryId: matchedCat,
        isSelected: true
      };
    });

    setParsedData(enhancedResults);
    setStep('preview');
  };

  const processFile = async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      if (file.type === 'application/pdf') {
        const text = await extractTextFromPDF(file);
        setPastedText(text);
        
        if (source === 'ai') {
          setStep('select');
        } else {
          await handleLocalParsing(text);
        }
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

      await enhanceAndSetResults(results);
    } catch (err: any) {
      setError(err.message || "Failed to parse file.");
    } finally {
      setIsLoading(false);
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

  const handleAIParsing = async () => {
    if (!db.isOpen()) await db.open();
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

      const rawResults: ParsedTransaction[] = JSON.parse(jsonText);

      if (!Array.isArray(rawResults) || rawResults.length === 0) {
        throw new Error("AI could not find any transactions in the text.");
      }

      await enhanceAndSetResults(rawResults);
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

  const handleLocalParsing = async (textToParse?: string | React.MouseEvent) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const text = typeof textToParse === 'string' ? textToParse : pastedText;
      const lines = text.split('\n');
      const results: ParsedTransaction[] = [];
      
      // Robust Regex for various formats
      const dateRegex = /(\d{1,4}[-/.\s](?:[A-Za-z]{3}|\d{1,2})[-/.\s]\d{2,4})|((?:[A-Za-z]{3}|\d{1,2})[-/.\s]\d{1,2}[-/.\s]\d{2,4})/;
      
      const rawTxns: { date: string, lines: string[] }[] = [];
      let currentTxn: { date: string, lines: string[] } | null = null;

      // Group multiline transactions
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.length < 3) return;

        const dateMatch = trimmed.match(dateRegex);
        // Check if the line begins with a date (or close to it) to start a new transaction block
        if (dateMatch && trimmed.indexOf(dateMatch[0]) < 20) {
          if (currentTxn) rawTxns.push(currentTxn);
          currentTxn = { date: dateMatch[0], lines: [trimmed] };
        } else if (currentTxn) {
          currentTxn.lines.push(trimmed);
        }
      });
      if (currentTxn) rawTxns.push(currentTxn);

      rawTxns.forEach(txn => {
        const fullText = txn.lines.join(' ');
        
        // Extract all numbers to find Debit, Credit, Balance at the end
        const numRegex = /(?:^|\s)([\d,]+(?:\.\d+)?)(?=\s|$)/g;
        let match;
        const numbers: string[] = [];
        while ((match = numRegex.exec(fullText)) !== null) {
          numbers.push(match[1]);
        }

        let amount = 0;
        let type: 'income' | 'expense' = 'expense';
        let foundAmount = false;

        // Pattern: ... DEBIT CREDIT BALANCE
        if (numbers.length >= 3) {
          const balStr = numbers[numbers.length - 1];
          const cdtStr = numbers[numbers.length - 2];
          const dbtStr = numbers[numbers.length - 3];
          
          const bal = parseFloat(balStr.replace(/,/g, ''));
          const cdt = parseFloat(cdtStr.replace(/,/g, ''));
          const dbt = parseFloat(dbtStr.replace(/,/g, ''));

          if (!isNaN(bal) && !isNaN(cdt) && !isNaN(dbt)) {
            if (dbt > 0) {
              amount = dbt;
              type = 'expense';
              foundAmount = true;
            } else if (cdt > 0) {
              amount = cdt;
              type = 'income';
              foundAmount = true;
            }
          }
        }

        // Fallback amount matching if Debit/Credit pattern didn't work
        if (!foundAmount) {
          const amountMatches = fullText.match(/[\d,]+\.\d{2}|[\d,]{4,}/g);
          if (amountMatches && amountMatches.length > 0) {
            const amountStr = amountMatches.find(m => m.includes('.')) || amountMatches[amountMatches.length - 1];
            amount = parseFloat(amountStr.replace(/,/g, ''));
            foundAmount = true;
          }
        }

        if (!foundAmount || isNaN(amount) || amount === 0) return;

        let description = fullText
          .replace(txn.date, '')
          .replace(/[Rr]s\.?|PKR|[\$€£]/g, '');

        if (numbers.length >= 3 && foundAmount) {
          // Remove the extracted numbers from description
          description = description
            .replace(new RegExp(`\\b${numbers[numbers.length - 1].replace(/\./g, '\\.')}\\b`), '')
            .replace(new RegExp(`\\b${numbers[numbers.length - 2].replace(/\./g, '\\.')}\\b`), '')
            .replace(new RegExp(`\\b${numbers[numbers.length - 3].replace(/\./g, '\\.')}\\b`), '');
        }

        description = description.replace(/\s+/g, ' ').trim();

        // Heuristic for type if not determined by Debit/Credit columns
        if (type === 'expense' && numbers.length < 3) {
          const lowerLine = fullText.toLowerCase();
          if (lowerLine.includes(' cr') || lowerLine.endsWith('cr') || lowerLine.includes('deposited')) {
             type = 'income';
             description = description.replace(/cr$/i, '').trim();
          } else if (lowerLine.includes(' dr') || lowerLine.endsWith('dr') || lowerLine.includes('withdrawn')) {
             type = 'expense';
             description = description.replace(/dr$/i, '').trim();
          } else {
             const incomeKeywords = ['received', 'credited', 'inward', 'deposit', 'transfer-in', 'salary', 'profit'];
             if (incomeKeywords.some(k => lowerLine.includes(k))) {
               type = 'income';
             }
          }
        }

        let finalDesc = description || "Transaction";
        results.push({
          date: txn.date,
          description: finalDesc,
          amount: amount,
          type: type,
          referenceId: generateDeterministicId(txn.date, amount, finalDesc)
        });
      });

      if (results.length === 0) {
        throw new Error("Local parser couldn't find transactions. Please check the text format.");
      }

      await enhanceAndSetResults(results);
    } catch (err: any) {
      setError(`Local parsing failed: ${err.message}. Try adjusting the text or use AI Scan when quota resets.`);
      // If we failed during a direct file upload, push them back to select so they see the error
      if (step === 'select' && source !== 'ai') {
         setSource('ai');
         // Text is already set in state from handleFileUpload
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    const selectedData = parsedData.filter(d => d.isSelected);
    if (!selectedData.length) {
      setError("Please select at least one transaction to import.");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      if (!db.isOpen()) await db.open();
      const settings = await db.settings.get(1);
      const currentContext = settings?.activeContext || 'business';

      const mappedSource = source === 'bank' ? 'bank_import' : source;

      const transactionsToSave: Transaction[] = selectedData.map(pt => ({
        amount: Math.abs(pt.amount),
        type: pt.type,
        categoryId: pt.categoryId || 0,
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
          .anyOf(selectedData.map(d => d.referenceId).filter(Boolean))
          .toArray()
        ).map(t => t.importReferenceId)
      );

      const newTransactions = transactionsToSave.filter(t => 
        !t.importReferenceId || !existingRefs.has(t.importReferenceId)
      );

      setDuplicatesSkipped(transactionsToSave.length - newTransactions.length);

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
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
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
                      onClick={() => setSource('pdf')}
                      className={`p-4 rounded-2xl border flex flex-col items-center gap-3 transition-all ${
                        source === 'pdf' ? 'bg-purple-500/10 border-purple-500 text-purple-400' : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      <FileStack size={24} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-center">PDF (Offline)</span>
                    </button>
                    <button
                      onClick={() => setSource('ai')}
                      className={`p-4 rounded-2xl border flex flex-col items-center gap-3 transition-all ${
                        source === 'ai' ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      <Sparkles size={24} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-center">AI Scan</span>
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
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-3xl p-12 flex flex-col items-center gap-4 transition-all cursor-pointer group ${
                        isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5'
                      }`}
                    >
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-transform ${
                        isDragging ? 'bg-blue-500/20 text-blue-300 scale-110' : 'bg-blue-500/10 text-blue-400 group-hover:scale-110'
                      }`}>
                        {isLoading ? <Loader2 size={32} className="animate-spin" /> : <Upload size={32} />}
                      </div>
                      <div className="text-center">
                        <p className="text-white font-medium">Click or Drag to upload statement</p>
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
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <h3 className="text-white font-bold">Preview Transactions</h3>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-48">
                        <input
                          type="text"
                          placeholder="Search..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <span className="bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap">
                        {parsedData.filter(d => d.isSelected).length} / {parsedData.length} Selected
                      </span>
                    </div>
                  </div>

                  {parsedData.some(d => d.isSelected) && (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex flex-wrap items-center gap-3">
                      <span className="text-xs text-blue-300 font-bold uppercase tracking-wider">Bulk Actions:</span>
                      <select
                        onChange={(e) => {
                          const catId = parseInt(e.target.value);
                          if (catId === -1) return;
                          setParsedData(prev => prev.map(d => d.isSelected ? { ...d, categoryId: catId } : d));
                          e.target.value = "-1";
                        }}
                        className="bg-slate-900 border border-white/10 text-xs text-white rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="-1">Assign Category to Selected...</option>
                        {categories?.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name} ({cat.type})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="border border-white/5 rounded-2xl overflow-hidden bg-slate-950/50">
                    <div className="max-h-[40vh] overflow-y-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-white/5 text-slate-400 font-medium sticky top-0 z-10 backdrop-blur-md">
                          <tr>
                            <th className="p-3 w-10">
                              <input 
                                type="checkbox" 
                                checked={parsedData.length > 0 && parsedData.every(d => d.isSelected)}
                                onChange={(e) => setParsedData(prev => prev.map(d => ({ ...d, isSelected: e.target.checked })))}
                                className="rounded border-white/10 bg-white/5 text-blue-500 focus:ring-0"
                              />
                            </th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Description / Category</th>
                            <th className="p-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {parsedData
                            .filter(d => 
                              d.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              d.date.includes(searchQuery) ||
                              d.amount.toString().includes(searchQuery)
                            )
                            .map((row, i) => {
                              // Find index in original array to update it correctly
                              const originalIndex = parsedData.findIndex(d => d.referenceId === row.referenceId);
                              return (
                                <tr key={row.referenceId || i} className={`text-slate-300 transition-colors ${row.isSelected ? 'bg-blue-500/5' : 'opacity-40'}`}>
                                  <td className="p-3">
                                    <input 
                                      type="checkbox" 
                                      checked={row.isSelected}
                                      onChange={(e) => {
                                        const newData = [...parsedData];
                                        newData[originalIndex].isSelected = e.target.checked;
                                        setParsedData(newData);
                                      }}
                                      className="rounded border-white/10 bg-white/5 text-blue-500 focus:ring-0"
                                    />
                                  </td>
                                  <td className="p-3 text-[10px] whitespace-nowrap">{row.date}</td>
                                  <td className="p-3">
                                    <div className="space-y-1">
                                      <input
                                        type="text"
                                        value={row.description}
                                        onChange={(e) => {
                                          const newData = [...parsedData];
                                          newData[originalIndex].description = e.target.value;
                                          setParsedData(newData);
                                        }}
                                        className="bg-transparent border-b border-transparent hover:border-white/20 focus:border-blue-500 outline-none w-full font-medium truncate max-w-[150px] sm:max-w-[200px]"
                                        title={row.description}
                                      />
                                      <select
                                        value={row.categoryId}
                                        onChange={(e) => {
                                          const newData = [...parsedData];
                                          newData[originalIndex].categoryId = parseInt(e.target.value);
                                          setParsedData(newData);
                                        }}
                                        className="bg-white/5 border-none text-[10px] text-slate-400 rounded px-2 py-1 pr-6 outline-none focus:ring-1 focus:ring-blue-500/50 w-full max-w-[140px]"
                                      >
                                        <option value={0}>Uncategorized</option>
                                        {categories?.filter(c => c.type === row.type).map(cat => (
                                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </td>
                                  <td className={`p-3 text-right whitespace-nowrap`}>
                                    <div className="flex items-center justify-end gap-1">
                                      <span className={row.type === 'income' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                                        {row.type === 'income' ? '+' : '-'}
                                      </span>
                                      <input
                                        type="number"
                                        value={row.amount}
                                        onChange={(e) => {
                                          const newData = [...parsedData];
                                          newData[originalIndex].amount = parseFloat(e.target.value) || 0;
                                          setParsedData(newData);
                                        }}
                                        className={`[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-transparent border-b border-transparent hover:border-white/20 focus:border-blue-500 outline-none w-20 text-right ${row.type === 'income' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}`}
                                      />
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
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
                      Successfully imported {parsedData.length - duplicatesSkipped} new transactions into your ledger.
                    </p>
                    {duplicatesSkipped > 0 && (
                      <p className="text-amber-400/80 text-sm mt-2 bg-amber-500/10 py-1.5 px-3 rounded-full inline-block border border-amber-500/20">
                        Skipped {duplicatesSkipped} duplicate {duplicatesSkipped === 1 ? 'transaction' : 'transactions'}
                      </p>
                    )}
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
