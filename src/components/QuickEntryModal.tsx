import React, { useState, useEffect, useMemo, useRef } from "react";
import { t, Lang, isRTL } from "../lib/i18n";
import { useRecentTransactions, useCategories, useCustomers } from "../hooks/useData";
import { useToast } from "../contexts/ToastContext";
import { X, Calendar, Plus, Sparkles, Loader2 } from "lucide-react";
import ManageCategoriesModal from "./ManageCategoriesModal";
import { AIService } from "../services/AIService";
import { TransactionService } from "../services/TransactionService";
import { UdhaarService } from "../services/UdhaarService";
import DatePicker from "./DatePicker";
import ConfirmDialog from "./ConfirmDialog";
import { TransactionSchema, UdhaarEntrySchema } from "../models";

// Sub-components
import VoiceInterface from "./QuickEntry/VoiceInterface";
import AmountInput from "./QuickEntry/AmountInput";
import TypeSelector from "./QuickEntry/TypeSelector";
import CategoryCustomerSelector from "./QuickEntry/CategoryCustomerSelector";
import NoteInput from "./QuickEntry/NoteInput";

type TransactionType = "expense" | "income" | "udhaar_give" | "udhaar_take";

export default function QuickEntryModal({
  isOpen,
  onClose,
  lang,
  activeContext,
}: {
  isOpen: boolean;
  onClose: () => void;
  lang: Lang;
  activeContext: "personal" | "business";
}) {
  const { showToast } = useToast();
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [transactionCurrency, setTransactionCurrency] = useState("PKR");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [categoryId, setCategoryId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [isRecording, setIsRecording] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isConfirmingSave, setIsConfirmingSave] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Smart Voice State
  const [isSmartVoiceMode, setIsSmartVoiceMode] = useState(false);
  const [smartVoiceTranscript, setSmartVoiceTranscript] = useState("");
  const [isParsingVoice, setIsParsingVoice] = useState(false);
  const [smartVoiceError, setSmartVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-fill last used category
  useEffect(() => {
    async function loadLastCategory() {
      if (type === "expense" || type === "income") {
        const lastTx = await TransactionService.getLastUsedCategory(type, activeContext);
        if (lastTx) setCategoryId(lastTx.categoryId.toString());
      } else {
        const lastEntry = await UdhaarService.getLastUsedCustomer(
          type === "udhaar_give" ? "give" : "receive"
        );
        if (lastEntry) setCustomerId(lastEntry.customerId.toString());
      }
    }
    if (isOpen && !isSmartVoiceMode) {
      loadLastCategory();
      setDate(new Date().toLocaleDateString('en-CA'));
    }
  }, [type, activeContext, isOpen, isSmartVoiceMode]);

  useEffect(() => {
    if (!isOpen) {
      setIsSmartVoiceMode(false);
      setSmartVoiceTranscript("");
      setIsParsingVoice(false);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    }
  }, [isOpen]);

  const recentTransactions = useRecentTransactions(100);
  const frequentAmounts = useMemo(() => {
    const counts: Record<number, number> = {};
    recentTransactions.forEach((t) => {
      if (t.originalAmount) counts[t.originalAmount] = (counts[t.originalAmount] || 0) + 1;
    });
    let amounts = Object.entries(counts)
      .map(([amt, count]) => ({ amount: Number(amt), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
      .map((x) => x.amount);
    return amounts.length > 0 ? amounts : [100, 500, 1000, 5000];
  }, [recentTransactions]);

  const categories = useCategories(activeContext);
  const currentTypeCategories = categories.filter(c => c.type === (type === "income" ? "income" : "expense"));
  const customers = useCustomers();
  const rtl = isRTL(lang);

  if (!isOpen) return null;

  const handleSave = async (closeAfterSave: boolean) => {
    const numericAmount = parseFloat(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      showToast(lang === 'ur' ? 'براہ کرم درست رقم درج کریں' : 'Please enter a valid amount', 'error');
      return;
    }

    const rate = transactionCurrency === "PKR" ? 1 : parseFloat(exchangeRate) || 1;
    const finalAmountInPKR = numericAmount * rate;

    setIsSubmitting(true);
    try {
      if (type === "expense" || type === "income") {
        const payload = {
          type,
          context: activeContext,
          amount: finalAmountInPKR,
          originalCurrency: transactionCurrency,
          originalAmount: numericAmount,
          exchangeRate: rate,
          categoryId: parseInt(categoryId, 10),
          date,
          description: description.trim(),
          paymentMethod: "cash",
          customerId: customerId ? parseInt(customerId, 10) : undefined,
        };

        const result = TransactionSchema.safeParse(payload);
        if (!result.success) {
          showToast(result.error.errors[0]?.message || "Invalid data", "error");
          setIsSubmitting(false);
          return;
        }

        await TransactionService.add(payload as any);
      } else {
        const payload = {
          customerId: parseInt(customerId, 10),
          type: type === "udhaar_give" ? "give" : "receive",
          amount: finalAmountInPKR,
          originalCurrency: transactionCurrency,
          originalAmount: numericAmount,
          exchangeRate: rate,
          date,
          description: description.trim(),
          isCompleted: false,
        };

        const result = UdhaarEntrySchema.safeParse(payload);
        if (!result.success) {
          showToast(result.error.errors[0]?.message || "Invalid data", "error");
          setIsSubmitting(false);
          return;
        }

        await UdhaarService.add(payload as any);
      }

      showToast(lang === 'ur' ? 'ریکارڈ محفوظ کر لیا گیا ہے' : 'Entry saved successfully', 'success');
      
      if (closeAfterSave) {
        onClose();
        setAmount("");
        setDescription("");
      } else {
        // Clear just amount and description for "Another" entry
        setAmount("");
        setDescription("");
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save entry', 'error');
    } finally {
      setIsSubmitting(false);
      setIsConfirmingSave(false);
    }
  };

  const processSmartVoiceText = async (text: string) => {
    setIsParsingVoice(true);
    setSmartVoiceError(null);
    try {
      const catsPayload = categories.map((c) => ({ id: c.id, name: c.name, type: c.type }));
      const data = await AIService.parseVoiceInput(text, catsPayload);

      if (data) {
        if (data.type) setType(data.type);
        if (data.amount) setAmount(data.amount.toString());
        if (data.categoryId) setCategoryId(data.categoryId.toString());
        if (data.description) setDescription(data.description);
        setIsSmartVoiceMode(false);
      } else {
        throw new Error("Could not parse AI response.");
      }
    } catch (err: any) {
      setSmartVoiceError(err.message || "Could not process voice input.");
    } finally {
      setIsParsingVoice(false);
    }
  };

  const startSmartVoiceRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Browser does not support voice recognition.");
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = lang === "ur" ? "ur-PK" : "en-US";
    recognition.onstart = () => { setIsRecording(true); setSmartVoiceTranscript(""); };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSmartVoiceTranscript(transcript);
      processSmartVoiceText(transcript);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    recognition.start();
  };

  return (
    <div 
      className="fixed inset-0 bg-[#0F172A]/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-entry-title"
    >
      <div className="bg-[#1E293B] border-t sm:border border-white/20 sm:rounded-3xl rounded-t-3xl w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar relative shadow-2xl animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95">
        
        {/* Header */}
        <div className={`flex justify-between items-center px-6 pt-6 pb-2 ${rtl ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-2 ${rtl ? 'flex-row-reverse' : ''}`}>
            <h2 id="quick-entry-title" className="text-xl font-black text-white tracking-tight">Quick Add</h2>
            <button
              onClick={() => setIsSmartVoiceMode(!isSmartVoiceMode)}
              disabled={isSubmitting}
              className={`ml-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 ${
                isSmartVoiceMode ? "bg-indigo-50 text-white" : "bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30"
              } disabled:opacity-50`}
            >
              <Sparkles size={12} /> {rtl ? 'AI وائس فوکس' : 'AI Voice Focus'}
            </button>
          </div>
          <button 
            onClick={onClose} 
            disabled={isSubmitting}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors hidden-tap disabled:opacity-50"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {isSmartVoiceMode ? (
          <VoiceInterface
            isRecording={isRecording}
            isParsingVoice={isParsingVoice}
            transcript={smartVoiceTranscript}
            error={smartVoiceError}
            onStartRecording={startSmartVoiceRecording}
            onStopRecording={() => recognitionRef.current?.stop()}
            lang={lang}
          />
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); setIsConfirmingSave(true); }} className="px-6 pb-6 space-y-5">
            <AmountInput
              amount={amount}
              setAmount={setAmount}
              frequentAmounts={frequentAmounts}
              currency={transactionCurrency}
              setCurrency={setTransactionCurrency}
              exchangeRate={exchangeRate}
              setExchangeRate={setExchangeRate}
              lang={lang}
              disabled={isSubmitting}
            />

            <TypeSelector type={type} setType={setType} lang={lang} disabled={isSubmitting} />

            <CategoryCustomerSelector
              type={type}
              categoryId={categoryId}
              setCategoryId={setCategoryId}
              customerId={customerId}
              setCustomerId={setCustomerId}
              categories={currentTypeCategories}
              customers={customers}
              onManageCategories={() => setIsManageCategoriesOpen(true)}
              lang={lang}
              disabled={isSubmitting}
            />

            <NoteInput value={description} onChange={setDescription} lang={lang} disabled={isSubmitting} />

            <div className={`flex gap-2 items-center text-slate-400 relative z-40 ${rtl ? 'flex-row-reverse' : ''}`}>
              <Calendar size={18} className={`shrink-0 ${rtl ? 'mr-1' : 'ml-1'}`} />
              <DatePicker value={date} onChange={setDate} />
              <div className={`text-xs ${rtl ? 'mr-auto' : 'ml-auto'} italic`}>{rtl ? 'خودکار محفوظ' : 'Auto-saved'}</div>
            </div>

            <div className={`flex gap-2 pt-2 ${rtl ? 'flex-row-reverse' : ''}`}>
              <button 
                type="submit" 
                disabled={isSubmitting || !amount}
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-lg transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 size={20} className="animate-spin" />}
                {rtl ? 'محفوظ کریں' : 'Save Details'}
              </button>
              <button 
                type="button" 
                onClick={() => handleSave(false)} 
                disabled={isSubmitting || !amount}
                className="px-4 py-4 bg-white/5 border border-white/10 text-blue-400 rounded-xl font-bold transition-colors whitespace-nowrap flex items-center justify-center disabled:opacity-50"
              >
                <Plus size={20} className="mr-1" /> Another
              </button>
            </div>
          </form>
        )}
      </div>

      <ManageCategoriesModal
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
        lang={lang}
        activeContext={activeContext}
      />

      <ConfirmDialog
        isOpen={isConfirmingSave}
        onClose={() => !isSubmitting && setIsConfirmingSave(false)}
        onConfirm={() => handleSave(true)}
        title="Confirm Transaction"
        message={`Are you sure you want to save this ${type.replace('_', ' ')} of ${amount} ${transactionCurrency}?`}
        confirmText="Save Transaction"
        isDestructive={false}
      />
    </div>
  );
}
