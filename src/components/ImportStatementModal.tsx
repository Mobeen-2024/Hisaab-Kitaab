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
import SmartIngestion from './ImportStatement/SmartIngestion';
import PreviewTable from './ImportStatement/PreviewTable';
import SuccessView from './ImportStatement/SuccessView';
import { Button } from './ui/Button';

interface ImportStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportStatementModal({ isOpen, onClose }: ImportStatementModalProps) {
  const [step, setStep] = useState<'select' | 'preview' | 'success'>('select');
  const [detectedPlatform, setDetectedPlatform] = useState<string>('other');
  const [parsedData, setParsedData] = useState<(ParsedTransaction & { categoryId?: number; isSelected: boolean })[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [duplicatesSkipped, setDuplicatesSkipped] = useState(0);
  const { activeContext } = useSettings();

  const categories = useCategories();
  const settingsObj = useAppSettings();

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setStep('select');
      setDetectedPlatform('other');
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



  const handleSmartResult = async (rawResults: ParsedTransaction[], platform: string) => {
    setDetectedPlatform(platform);
    await enhanceAndSetResults(rawResults);
  };

  const handleManualEntry = async (transaction: ParsedTransaction) => {
    setDetectedPlatform('manual');
    await enhanceAndSetResults([transaction]);
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
      const mappedSource = 
        detectedPlatform === 'easypaisa' ? 'easypaisa' :
        detectedPlatform === 'jazzcash' ? 'jazzcash' :
        detectedPlatform === 'bank' ? 'bank_import' : 'ai';

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
                <SmartIngestion
                  onResult={handleSmartResult}
                  onManualEntry={handleManualEntry}
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                />
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
                    <Button onClick={() => setStep('select')} variant="secondary" className="flex-1">Back</Button>
                    <Button onClick={handleImport} loading={isLoading} variant="blue" className="flex-[2]">
                      Confirm Import
                    </Button>
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
