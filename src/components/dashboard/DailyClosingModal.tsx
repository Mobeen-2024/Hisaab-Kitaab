import React, { useState } from 'react';
import { X, CheckCircle, Calculator, TrendingUp, AlertTriangle, MessageSquare, Share2, Loader2, Wrench, Shield, Box, Wallet, Coins } from 'lucide-react';
import { t } from '../../lib/i18n';
import { formatCurrency } from '../../lib/currency';
import { useSettings } from '../../contexts/SettingsContext';
import { useDailyClosingData } from '../../hooks/useDailyClosingData';
import { AIService } from '../../services/AIService';

interface DailyClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Kept for backward compatibility, though not used anymore
  todayIncome?: number;
  todayExpense?: number;
}

export default function DailyClosingModal({ isOpen, onClose }: DailyClosingModalProps) {
  const { currency, lang, businessMode, activeContext, geminiApiKey } = useSettings();
  const data = useDailyClosingData(activeContext);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onClose();
  };

  const handleGenerateSummary = async () => {
    if (!data) return;
    setIsGenerating(true);
    try {
      const summary = await AIService.generateDailySummary(businessMode, data, currency);
      setAiSummary(summary);
    } catch (e: any) {
      setAiSummary('Unable to generate AI summary at this time. Please ensure your Gemini API key is configured correctly in Settings.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareReport = () => {
    if (!data) return;
    const reportDate = new Date().toLocaleDateString();
    let text = `*Daily Closing Report - ${reportDate}*\n\n`;
    text += `💰 Sales: ${formatCurrency(data.todaySales, currency, lang)}\n`;
    text += `📉 Expenses: ${formatCurrency(data.todayExpenses, currency, lang)}\n`;
    text += `✨ Profit Est: ${formatCurrency(data.profitEstimate, currency, lang)}\n`;
    text += `💵 Net Cash: ${formatCurrency(data.cashExpected, currency, lang)}\n\n`;
    
    if (data.udhaarGiven > 0 || data.udhaarReceived > 0) {
      text += `*Udhaar Summary*\n`;
      text += `📤 Given: ${formatCurrency(data.udhaarGiven, currency, lang)}\n`;
      text += `📥 Received: ${formatCurrency(data.udhaarReceived, currency, lang)}\n\n`;
    }

    const tasks = [];
    if (data.lowStockCount > 0) tasks.push(`Low Stock Items: ${data.lowStockCount}`);
    if (data.pendingRepairs > 0) tasks.push(`Pending Repairs: ${data.pendingRepairs}`);
    if (data.activeWarranties > 0) tasks.push(`Active Warranties: ${data.activeWarranties}`);
    
    if (tasks.length > 0) {
      text += `*Action Items*\n${tasks.map(t => `- ${t}`).join('\n')}\n\n`;
    }

    if (aiSummary) {
      text += `*AI Summary*\n${aiSummary}\n\n`;
    }
    
    text += `_Powered by Hisaib Kitaib_`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (!data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Calculator size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Daily Closing Ritual</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Review today's performance before closing</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main Financials */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                <TrendingUp size={16} />
                <span className="font-medium text-sm">Today's Sales</span>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">
                {formatCurrency(data.todaySales, currency, lang)}
              </p>
            </div>
            
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                <AlertTriangle size={16} />
                <span className="font-medium text-sm">Today's Expenses</span>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">
                {formatCurrency(data.todayExpenses, currency, lang)}
              </p>
            </div>
            
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
                <Coins size={16} />
                <span className="font-medium text-sm">Profit Estimate</span>
              </div>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {formatCurrency(data.profitEstimate, currency, lang)}
              </p>
            </div>
            
            <div className={`p-4 rounded-2xl border shadow-sm ${data.cashExpected >= 0 ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20' : 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20'}`}>
              <div className={`flex items-center gap-2 mb-2 ${data.cashExpected >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>
                <Wallet size={16} />
                <span className="font-medium text-sm">Net Expected Cash</span>
              </div>
              <p className={`text-2xl font-bold ${data.cashExpected >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-rose-700 dark:text-rose-300'}`}>
                {formatCurrency(data.cashExpected, currency, lang)}
              </p>
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Udhaar Given</div>
              <div className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(data.udhaarGiven, currency, lang)}</div>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Udhaar Received</div>
              <div className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(data.udhaarReceived, currency, lang)}</div>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Low Stock</div>
                <div className="font-semibold text-slate-700 dark:text-slate-300">{data.lowStockCount}</div>
              </div>
              <Box size={16} className="text-slate-400" />
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Pending Repairs</div>
                <div className="font-semibold text-slate-700 dark:text-slate-300">{data.pendingRepairs}</div>
              </div>
              <Wrench size={16} className="text-slate-400" />
            </div>
          </div>

          {/* AI Summary Section */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-100 dark:border-indigo-500/20 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3 relative z-10">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold">
                <MessageSquare size={18} />
                <h3>AI Daily Summary</h3>
              </div>
              {!aiSummary && geminiApiKey && (
                <button 
                  onClick={handleGenerateSummary}
                  disabled={isGenerating}
                  className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {isGenerating ? <Loader2 size={14} className="animate-spin" /> : null}
                  {isGenerating ? 'Generating...' : 'Generate Summary'}
                </button>
              )}
            </div>
            
            <div className="relative z-10 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {!geminiApiKey ? (
                <p className="text-slate-500 dark:text-slate-400 italic">Gemini API Key is missing. Configure it in Settings to enable AI Summaries.</p>
              ) : aiSummary ? (
                <p>{aiSummary}</p>
              ) : (
                <p className="text-slate-500 dark:text-slate-400 italic">Click generate to analyze today's performance.</p>
              )}
            </div>
            
            {/* Decorative background */}
            <div className="absolute -right-4 -bottom-4 text-indigo-500/10 dark:text-indigo-500/5">
              <MessageSquare size={100} />
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 flex gap-3">
          <button 
            onClick={handleShareReport}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold rounded-2xl transition-colors"
          >
            <Share2 size={20} />
            Share Report
          </button>
          
          <button 
            onClick={handleConfirm}
            className="flex-[2] flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-colors shadow-lg shadow-blue-500/30"
          >
            <CheckCircle size={20} />
            Close Day
          </button>
        </div>
      </div>
    </div>
  );
}
