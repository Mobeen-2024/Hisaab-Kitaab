import React, { useState, useEffect, useMemo, useRef } from "react";
import { db } from "../db";
import { t, Lang, isRTL } from "../lib/i18n";
import { useLiveQuery } from "dexie-react-hooks";
import {
  X,
  Mic,
  Settings,
  Calendar,
  Plus,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import ManageCategoriesModal from "./ManageCategoriesModal";
import { GoogleGenAI } from "@google/genai";
import DatePicker from "./DatePicker";
import ConfirmDialog from "./ConfirmDialog";

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
  const [type, setType] = useState<
    "expense" | "income" | "udhaar_give" | "udhaar_take"
  >("expense");
  const [amount, setAmount] = useState("");
  const [transactionCurrency, setTransactionCurrency] = useState("PKR");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [categoryId, setCategoryId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(
    () => new Date().toLocaleDateString('en-CA')
  );
  const [isRecording, setIsRecording] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isConfirmingSave, setIsConfirmingSave] = useState(false);

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
        const lastTx = await db.transactions
          .orderBy("id")
          .reverse()
          .filter((t) => t.type === type && t.context === activeContext)
          .first();
        if (lastTx) {
          setCategoryId(lastTx.categoryId.toString());
        }
      } else {
        const lastEntry = await db.udhaarEntries
          .where("type")
          .equals(type === "udhaar_give" ? "give" : "receive")
          .reverse()
          .first();
        if (lastEntry) {
          setCustomerId(lastEntry.customerId.toString());
        }
      }
    }
    if (isOpen && !isSmartVoiceMode) {
      loadLastCategory();
      setDate(new Date().toLocaleDateString('en-CA')); // Auto-fill today's local date on open
    }
  }, [type, activeContext, isOpen, isSmartVoiceMode]);

  useEffect(() => {
    if (!isOpen) {
      setIsSmartVoiceMode(false);
      setSmartVoiceTranscript("");
      setIsParsingVoice(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    }
  }, [isOpen]);

  // Suggest frequent amounts
  const recentTransactions =
    useLiveQuery(() => db.transactions.reverse().limit(100).toArray()) || [];
  const frequentAmounts = useMemo(() => {
    const counts: Record<number, number> = {};
    recentTransactions.forEach((t) => {
      if (t.originalAmount) {
        counts[t.originalAmount] = (counts[t.originalAmount] || 0) + 1;
      }
    });
    let amounts = Object.entries(counts)
      .map(([amt, count]) => ({ amount: Number(amt), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
      .map((x) => x.amount);

    if (amounts.length === 0) {
      amounts = [100, 500, 1000, 5000];
    }
    return amounts;
  }, [recentTransactions]);

  // Income/Expense Categories
  const categories =
    useLiveQuery(
      () => db.categories.where({ context: activeContext }).toArray(),
      [activeContext],
    ) || [];

  const currentTypeCategories =
    useLiveQuery(
      () =>
        db.categories
          .where({
            type: type === "expense" ? "expense" : "income",
            context: activeContext,
          })
          .toArray(),
      [type, activeContext],
    ) || [];

  // Customers for Udhaar
  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  const rtl = isRTL(lang);

  if (!isOpen) return null;

  const handleSave = async (closeAfterSave: boolean) => {
    if (!amount) return;

    const rate =
      transactionCurrency === "PKR" ? 1 : parseFloat(exchangeRate) || 1;
    const finalAmountInPKR = parseFloat(amount) * rate;

    if (type === "expense" || type === "income") {
      if (!categoryId) return;
      await db.transactions.add({
        type: type,
        context: activeContext,
        amount: finalAmountInPKR,
        originalCurrency: transactionCurrency,
        originalAmount: parseFloat(amount),
        exchangeRate: rate,
        categoryId: parseInt(categoryId, 10),
        date: date,
        description,
        paymentMethod: "cash",
      });
    } else {
      // Udhaar logic
      if (!customerId) return;
      await db.udhaarEntries.add({
        customerId: parseInt(customerId, 10),
        type: type === "udhaar_give" ? "give" : "receive",
        amount: finalAmountInPKR,
        originalCurrency: transactionCurrency,
        originalAmount: parseFloat(amount),
        exchangeRate: rate,
        date: date,
        description,
        isCompleted: false,
      });
    }

    if (closeAfterSave) {
      onClose();
      // Reset form
      setAmount("");
      setDescription("");
    }
  };

  const confirmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConfirmingSave(true);
  };

  const executeSave = () => {
    handleSave(true);
  };

  const processSmartVoiceText = async (text: string) => {
    setIsParsingVoice(true);
    setSmartVoiceError(null);
    try {
      const settings = await db.settings.toCollection().first();
      const apiKey =
        settings?.geminiApiKey || (import.meta as any).env.VITE_GEMINI_API_KEY;
      if (!apiKey)
        throw new Error(
          "GEMINI_API_KEY is missing. Please add it in App Settings.",
        );
      const ai = new GoogleGenAI({ apiKey });

      const catsPayload = categories.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
      }));
      const prompt = `
         Extract transaction details from the following user voice log: "${text}"
         Return ONLY a valid JSON object matching this structure exactly:
         {
           "type": "expense" | "income",
           "amount": number,
           "categoryId": number | null,
           "description": "short summary or extracted string"
         }

         Available categories (match by closest meaning):
         ${JSON.stringify(catsPayload)}

         If context mentions something like "petrol 500", it's an expense. If "salary", it's income.
       `;

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      if (response.text) {
        const data = JSON.parse(response.text);
        if (data.type === "expense" || data.type === "income") {
          setType(data.type);
        }
        if (data.amount) {
          setAmount(data.amount.toString());
        }
        if (data.categoryId) {
          setCategoryId(data.categoryId.toString());
        }
        if (data.description) {
          setDescription(data.description);
        }
        setIsSmartVoiceMode(false); // Switch back to form view to confirm
      } else {
        throw new Error("Received empty response from AI.");
      }
    } catch (err: any) {
      console.error("Smart Voice Parsing Error", err);
      setSmartVoiceError(
        err.message ||
          "Could not process voice input properly. Please enter manually.",
      );
    } finally {
      setIsParsingVoice(false);
    }
  };

  const toggleSmartVoice = () => {
    if (!isSmartVoiceMode) {
      setIsSmartVoiceMode(true);
      setSmartVoiceTranscript("");
      setSmartVoiceError(null);
    } else {
      setIsSmartVoiceMode(false);
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
    }
  };

  const startSmartVoiceRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser does not support voice recognition.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = lang === "ur" ? "ur-PK" : "en-US";
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsRecording(true);
      setSmartVoiceTranscript("");
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSmartVoiceTranscript(transcript);
      processSmartVoiceText(transcript);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.onerror = (event: any) => {
      console.error(event.error);
      setIsRecording(false);
      if (event.error === "not-allowed") {
        alert("Allow microphone access.");
      }
    };

    recognition.start();
  };

  return (
    <div className="fixed inset-0 bg-[#0F172A]/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#1E293B] border-t sm:border border-white/20 sm:rounded-3xl rounded-t-3xl w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar relative shadow-2xl animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95">
        {/* Header */}
        <div className={`flex justify-between items-center px-6 pt-6 pb-2 ${rtl ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-2 ${rtl ? 'flex-row-reverse' : ''}`}>
            <h2 className="text-xl font-black text-white tracking-tight">
              Quick Add
            </h2>
            <button
              onClick={toggleSmartVoice}
              className={`ml-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 ${
                isSmartVoiceMode
                  ? "bg-indigo-500 text-white"
                  : "bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30"
              }`}
            >
              <Sparkles size={12} /> {rtl ? 'AI وائس فوکس' : 'AI Voice Focus'}
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors hidden-tap"
          >
            <X size={20} />
          </button>
        </div>

        {isSmartVoiceMode ? (
          <div className="px-6 pb-8 pt-4 flex flex-col items-center justify-center min-h-75">
            {isParsingVoice ? (
              <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-300">
                <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center relative">
                  <Sparkles
                    size={32}
                    className="text-indigo-400 animate-pulse"
                  />
                  <div className="absolute inset-0 rounded-full border-2 border-indigo-500/50 border-t-transparent animate-spin"></div>
                </div>
                <p className="text-white font-medium">Extracting data...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6 w-full text-center">
                <button
                  onClick={
                    isRecording
                      ? () => recognitionRef.current?.stop()
                      : startSmartVoiceRecording
                  }
                  className={`w-28 h-28 rounded-full flex items-center justify-center shadow-lg transition-all ${
                    isRecording
                      ? "bg-rose-500 text-white shadow-rose-500/30 animate-pulse scale-110"
                      : "bg-indigo-600 text-white shadow-indigo-600/30 hover:bg-indigo-500 hover:scale-105"
                  }`}
                >
                  <Mic size={48} />
                </button>
                <div>
                  <h3 className="text-white font-bold text-lg mb-1">
                    {isRecording ? "Listening..." : "Tap Mic to Speak"}
                  </h3>
                  <p className="text-slate-400 text-sm max-w-62.5 mx-auto leading-relaxed">
                    Say something like
                    <br />{" "}
                    <span className="italic text-slate-300">
                      "500 rupees for petrol"
                    </span>{" "}
                    or{" "}
                    <span className="italic text-slate-300">
                      "received 10,000 salary"
                    </span>
                    .
                  </p>
                </div>
                {smartVoiceTranscript && !isParsingVoice && (
                  <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-xl max-w-full">
                    <p className="text-white text-sm italic">
                      "{smartVoiceTranscript}"
                    </p>
                  </div>
                )}
                {smartVoiceError && (
                  <div className="mt-2 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm flex items-center gap-2 max-w-full text-left">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{smartVoiceError}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={confirmSubmit} className="px-6 pb-6 space-y-5">
            {/* 1. AMOUNT FIRST */}
            <div className="space-y-3">
              <div className="flex flex-col gap-2 relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  autoFocus
                  value={amount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setAmount(e.target.value)
                  }
                  className="w-full bg-transparent text-center text-5xl font-black text-white focus:outline-none placeholder:text-white/20 py-4"
                  placeholder="0"
                />

                {/* Frequent Amounts Suggestion */}
                {frequentAmounts.length > 0 && (
                  <div className="flex gap-2 justify-center pb-2">
                    {frequentAmounts.map((amt: number) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAmount(amt.toString())}
                        className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-medium text-slate-300 transition-colors"
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* MULTI-CURRENCY SELECTOR */}
              <div className={`flex bg-white/5 border border-white/10 rounded-xl p-1 gap-2 items-center ${rtl ? 'flex-row-reverse' : ''}`}>
                <select
                  value={transactionCurrency}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setTransactionCurrency(e.target.value)
                  }
                  className="bg-transparent text-white font-medium px-3 py-2 outline-none appearance-none cursor-pointer"
                >
                  <option value="PKR" className="text-slate-900">
                    PKR (₨)
                  </option>
                  <option value="USD" className="text-slate-900">
                    USD ($)
                  </option>
                  <option value="EUR" className="text-slate-900">
                    EUR (€)
                  </option>
                  <option value="GBP" className="text-slate-900">
                    GBP (£)
                  </option>
                  <option value="INR" className="text-slate-900">
                    INR (₹)
                  </option>
                  <option value="AUD" className="text-slate-900">
                    AUD ($)
                  </option>
                  <option value="CAD" className="text-slate-900">
                    CAD ($)
                  </option>
                  <option value="SGD" className="text-slate-900">
                    SGD ($)
                  </option>
                  <option value="AED" className="text-slate-900">
                    AED (د.إ)
                  </option>
                  <option value="SAR" className="text-slate-900">
                    SAR (ر.س)
                  </option>
                </select>
                <div className="h-6 w-px bg-white/20"></div>

                {transactionCurrency !== "PKR" ? (
                  <div className="flex items-center gap-2 flex-1 px-2">
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      Rate:
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0.0001"
                      required
                      value={exchangeRate}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setExchangeRate(e.target.value)
                      }
                      className="w-full bg-transparent text-white font-medium text-sm focus:outline-none placeholder:text-slate-500"
                      placeholder={`1 ${transactionCurrency} to PKR`}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-1 px-2 text-slate-500 text-xs font-medium">
                    Default Base Currency
                  </div>
                )}
              </div>
            </div>

            {/* 2. TYPE SELECTION */}
            <div className={`grid grid-cols-4 gap-2 ${rtl ? 'flex-row-reverse' : ''}`}>
              <button
                type="button"
                onClick={() => setType("expense")}
                className={`py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${type === "expense" ? "bg-rose-500 text-white shadow-lg shadow-rose-500/25" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
              >
                Out
              </button>
              <button
                type="button"
                onClick={() => setType("income")}
                className={`py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${type === "income" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
              >
                In
              </button>
              <button
                type="button"
                onClick={() => setType("udhaar_give")}
                className={`py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${type === "udhaar_give" ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
              >
                Gave
              </button>
              <button
                type="button"
                onClick={() => setType("udhaar_take")}
                className={`py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${type === "udhaar_take" ? "bg-orange-500 text-white shadow-lg shadow-orange-500/25" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
              >
                Got
              </button>
            </div>

            {/* 3. CATEGORY / PERSON SELECTION */}
            <div>
              {type === "expense" || type === "income" ? (
                <div className={`flex gap-2 ${rtl ? 'flex-row-reverse' : ''}`}>
                  <select
                    required
                    value={categoryId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setCategoryId(e.target.value)
                    }
                    className="flex-1 px-4 py-3 bg-[#0F172A] border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none appearance-none font-medium text-ellipsis overflow-hidden"
                  >
                    <option value="">Choose Category...</option>
                    {currentTypeCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {t(lang, c.name)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setIsManageCategoriesOpen(true)}
                    className="px-4 py-3 bg-[#0F172A] border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white rounded-xl transition-colors shrink-0"
                    aria-label="Manage Categories"
                  >
                    <Settings size={20} />
                  </button>
                </div>
              ) : (
                <select
                  required
                  value={customerId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setCustomerId(e.target.value)
                  }
                  className="w-full px-4 py-3 bg-[#0F172A] border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none appearance-none font-medium"
                >
                  <option value="">Choose Person...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 4. OPTIONAL NOTE */}
            <div className="relative">
              <input
                type="text"
                value={description}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDescription(e.target.value)
                }
                className={`w-full ${rtl ? 'pr-4 pl-12' : 'pl-4 pr-12'} py-3 bg-[#0F172A] border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none placeholder:text-slate-500`}
                placeholder={rtl ? "اختیاری نوٹ..." : "Optional Note..."}
              />
              <button
                type="button"
                onClick={() => {
                  const SpeechRecognition =
                    (window as any).SpeechRecognition ||
                    (window as any).webkitSpeechRecognition;
                  if (SpeechRecognition) {
                    if (isRecording) return; // Prevent multiple starts
                    const recognition = new SpeechRecognition();
                    recognitionRef.current = recognition;
                    recognition.lang = lang === "ur" ? "ur-PK" : "en-US";

                    recognition.onstart = () => {
                      setIsRecording(true);
                    };

                    recognition.onresult = (event: any) => {
                      setDescription(
                        (prev: string) =>
                          prev +
                          (prev ? " " : "") +
                          event.results[0][0].transcript,
                      );
                    };

                    recognition.onend = () => {
                      setIsRecording(false);
                    };

                    recognition.onerror = (event: any) => {
                      console.error("Speech recognition error", event.error);
                      if (event.error === "not-allowed") {
                        alert("Microphone access was denied.");
                      }
                      setIsRecording(false);
                    };

                    recognition.start();
                  } else {
                    alert("Voice input is not supported in your browser.");
                  }
                }}
                className={`absolute ${rtl ? 'left-2' : 'right-2'} top-1/2 -translate-y-1/2 p-2 transition-colors ${
                  isRecording
                    ? "text-rose-500 animate-pulse"
                    : "text-slate-400 hover:text-blue-400"
                }`}
                title={isRecording ? "Listening..." : "Voice Input"}
              >
                <Mic size={18} />
              </button>
            </div>

            {/* 5. Date & Options */}
            <div className={`flex gap-2 items-center text-slate-400 relative z-40 ${rtl ? 'flex-row-reverse' : ''}`}>
              <Calendar size={18} className={`shrink-0 ${rtl ? 'mr-1' : 'ml-1'}`} />
              <DatePicker
                value={date}
                onChange={(newDate) => setDate(newDate)}
              />
              <div className={`text-xs ${rtl ? 'mr-auto' : 'ml-auto'} italic`}>{rtl ? 'خودکار محفوظ' : 'Auto-saved'}</div>
            </div>

            {/* 6. SAVE ACTIONS */}
            <div className={`flex gap-2 pt-2 ${rtl ? 'flex-row-reverse' : ''}`}>
              <button
                type="submit"
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl font-bold text-lg transition-colors shadow-lg shadow-blue-500/20"
              >
                {rtl ? 'محفوظ کریں' : 'Save Details'}
              </button>
              <button
                type="button"
                onClick={() => handleSave(false)}
                className="px-4 py-4 bg-white/5 border border-white/10 hover:bg-white/10 active:bg-white/20 text-blue-400 rounded-xl font-bold transition-colors shadow-sm whitespace-nowrap flex items-center justify-center"
                title="Save & Add Another"
              >
                <Plus size={20} className="mr-1" /> Another
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Manage Categories Modal nested properly */}
      <ManageCategoriesModal
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
        lang={lang}
        activeContext={activeContext}
      />

      <ConfirmDialog
        isOpen={isConfirmingSave}
        onClose={() => setIsConfirmingSave(false)}
        onConfirm={executeSave}
        title="Confirm Transaction"
        message={`Are you sure you want to save this ${type === "expense" ? "expense" : type === "income" ? "income" : "udhaar"} of ${amount} ${transactionCurrency}? The details cannot be fully reversed without manual deletion.`}
        confirmText="Save Transaction"
        isDestructive={false}
      />
    </div>
  );
}
