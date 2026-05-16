import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Loader2, AlertCircle } from 'lucide-react';
import { Transaction } from '../db';
import { TransactionService } from '../services/TransactionService';
import { useCategories, useAppSettings } from '../hooks/useData';
import { useSettings } from '../contexts/SettingsContext';
import { AIService } from '../services/AIService';
import { parseJazzCashCSV, parseEasypaisaCSV, parseGenericCSV, ParsedTransaction, generateDeterministicId, extractTextFromPDF } from '../utils/statementParsers';

// Sub-components
import SourceSelector, { ImportSource } from './ImportStatement/SourceSelector';
import PreviewTable from './ImportStatement/PreviewTable';
import SuccessView from './ImportStatement/SuccessView';
import AIInput from './ImportStatement/AIInput';

interface ImportStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportStatementModal({ isOpen, onClose }: ImportStatementModalProps) {
  const [step, setStep] = useState<'select' | 'preview' | 'success'>('select');
  const [source, setSource] = useState<ImportSource>('easypaisa');
  const [pastedText, setPastedText] = useState('');
  const [parsedData, setParsedData] = useState<(ParsedTransaction & { categoryId?: number; isSelected: boolean })[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [duplicatesSkipped, setDuplicatesSkipped] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { activeContext } = useSettings();

  const categories = useCategories();
  const settingsObj = useAppSettings();

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
    const currentCategories = categories;
    const currentContext = activeContext || 'business';

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
    if (!pastedText.trim()) {
      setError("Please paste some text to parse.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const rawResults = await AIService.parseStatement(pastedText);
      await enhanceAndSetResults(rawResults);
    } catch (err: any) {
      setError(err.message || "AI parsing failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocalParsing = async (textToParse?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const text = typeof textToParse === 'string' ? textToParse : pastedText;
      const lines = text.split('\n');
      const results: ParsedTransaction[] = [];
      
      const dateRegex = /(\d{1,4}[-/.\s](?:[A-Za-z]{3}|\d{1,2})[-/.\s]\d{2,4})|((?:[A-Za-z]{3}|\d{1,2})[-/.\s]\d{1,2}[-/.\s]\d{2,4})/;
      
      const rawTxns: { date: string, lines: string[] }[] = [];
      let currentTxn: { date: string, lines: string[] } | null = null;

      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.length < 3) return;

        const dateMatch = trimmed.match(dateRegex);
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
        const numRegex = /(?:^|\s)([\d,]+(?:\.\d+)?)(?=\s|$)/g;
        let match;
        const numbers: string[] = [];
        while ((match = numRegex.exec(fullText)) !== null) {
          numbers.push(match[1]);
        }

        let amount = 0;
        let type: 'income' | 'expense' = 'expense';
        let foundAmount = false;

        if (numbers.length >= 3) {
          const bal = parseFloat(numbers[numbers.length - 1].replace(/,/g, ''));
          const cdt = parseFloat(numbers[numbers.length - 2].replace(/,/g, ''));
          const dbt = parseFloat(numbers[numbers.length - 3].replace(/,/g, ''));

          if (!isNaN(bal) && !isNaN(cdt) && !isNaN(dbt)) {
            if (dbt > 0) { amount = dbt; type = 'expense'; foundAmount = true; }
            else if (cdt > 0) { amount = cdt; type = 'income'; foundAmount = true; }
          }
        }

        if (!foundAmount) {
          const amountMatches = fullText.match(/[\d,]+\.\d{2}|[\d,]{4,}/g);
          if (amountMatches && amountMatches.length > 0) {
            const amountStr = amountMatches.find(m => m.includes('.')) || amountMatches[amountMatches.length - 1];
            amount = parseFloat(amountStr.replace(/,/g, ''));
            foundAmount = true;
          }
        }

        if (!foundAmount || isNaN(amount) || amount === 0) return;

        let description = fullText.replace(txn.date, '').replace(/[Rr]s\.?|PKR|[\$€£]/g, '');
        if (numbers.length >= 3 && foundAmount) {
          description = description
            .replace(new RegExp(`\\b${numbers[numbers.length - 1].replace(/\./g, '\\.')}\\b`), '')
            .replace(new RegExp(`\\b${numbers[numbers.length - 2].replace(/\./g, '\\.')}\\b`), '')
            .replace(new RegExp(`\\b${numbers[numbers.length - 3].replace(/\./g, '\\.')}\\b`), '');
        }
        description = description.replace(/\s+/g, ' ').trim();

        if (type === 'expense' && numbers.length < 3) {
          const lowerLine = fullText.toLowerCase();
          if (lowerLine.includes(' cr') || lowerLine.endsWith('cr') || lowerLine.includes('deposited')) type = 'income';
          else if (lowerLine.includes(' dr') || lowerLine.endsWith('dr') || lowerLine.includes('withdrawn')) type = 'expense';
          else if (['received', 'credited', 'inward', 'deposit', 'transfer-in', 'salary', 'profit'].some(k => lowerLine.includes(k))) type = 'income';
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

      if (results.length === 0) throw new Error("Local parser couldn't find transactions.");
      await enhanceAndSetResults(results);
    } catch (err: any) {
      setError(`Local parsing failed: ${err.message}.`);
      if (step === 'select' && source !== 'ai') setSource('ai');
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
      const currentContext = activeContext || 'business';
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

      const existingRefs = new Set(
        (await TransactionService.getByImportReferences(selectedData.map(d => d.referenceId).filter(Boolean)))
        .map(t => t.importReferenceId)
      );

      const newTransactions = transactionsToSave.filter(t => 
        !t.importReferenceId || !existingRefs.has(t.importReferenceId)
      );

      setDuplicatesSkipped(transactionsToSave.length - newTransactions.length);
      if (newTransactions.length > 0) await TransactionService.bulkAdd(newTransactions);
      setStep('success');
    } catch (err: any) {
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
              ) : step === 'select' ? (
                <div className="space-y-6">
                  <SourceSelector source={source} setSource={setSource} />

                  {source === 'ai' ? (
                    <AIInput 
                      pastedText={pastedText} 
                      setPastedText={setPastedText} 
                      isLoading={isLoading} 
                      handleAIParsing={handleAIParsing} 
                      handleLocalParsing={() => handleLocalParsing()} 
                    />
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
                      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv,.pdf" className="hidden" />
                    </div>
                  )}

                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400">
                      <AlertCircle size={20} />
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  )}
                </div>
              ) : step === 'preview' ? (
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

                  <PreviewTable parsedData={parsedData} setParsedData={setParsedData} categories={categories} searchQuery={searchQuery} />

                  <div className="flex gap-3 pt-4">
                    <button onClick={() => setStep('select')} className="flex-1 py-3 bg-white/5 text-white font-bold rounded-2xl hover:bg-white/10 transition-colors">Back</button>
                    <button onClick={handleImport} disabled={isLoading} className="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-500 transition-colors flex items-center justify-center gap-2">
                      {isLoading && <Loader2 size={18} className="animate-spin" />}
                      Confirm Import
                    </button>
                  </div>
                </div>
              ) : (
                <SuccessView importedCount={parsedData.length - duplicatesSkipped} />
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
