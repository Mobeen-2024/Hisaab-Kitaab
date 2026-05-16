import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Upload, Check, AlertCircle, Sparkles, Loader2, Save, WifiOff, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
// @ts-ignore
import jsQR from 'jsqr';

// Tesseract.js — loaded dynamically to avoid hard build dependency.
// If npm package is installed: uses local. Otherwise falls back to CDN.
let TesseractRef: any = null;
async function getTesseract(): Promise<any> {
  if (TesseractRef) return TesseractRef;
  try {
    // Try local npm package first
    const mod = await import('tesseract.js' as any);
    TesseractRef = mod.default || mod;
  } catch {
    // Fallback: load from CDN via script tag
    await new Promise<void>((resolve, reject) => {
      if ((window as any).Tesseract) { TesseractRef = (window as any).Tesseract; resolve(); return; }
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/tesseract.js@5/dist/tesseract.min.js';
      script.onload = () => { TesseractRef = (window as any).Tesseract; resolve(); };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  return TesseractRef;
}

import { db } from '../db';
import { Lang, t } from '../lib/i18n';
import { parsePaymentData, ParsedPayment } from '../lib/parsePaymentData';
import { AIService } from '../services/AIService';
import { useCategories, useAppSettings } from '../hooks/useData';
import DatePicker from './DatePicker';

interface QrScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Lang;
  activeContext: 'personal' | 'business';
}

type CaptureMode = 'choose' | 'camera' | 'upload' | 'review';

export default function QrScanModal({ isOpen, onClose, lang, activeContext }: QrScanModalProps) {
  const [mode, setMode] = useState<CaptureMode>('choose');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedPayment | null>(null);
  const [rawOcrText, setRawOcrText] = useState<string>('');
  const [ocrProgress, setOcrProgress] = useState(0);

  // Review Form State
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA'));

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanAnimFrameRef = useRef<number>(0);

  const categories = useCategories(activeContext);
  const currentTypeCategories = categories.filter(c => c.type === type);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      resetState();
    }
  }, [isOpen]);

  const resetState = () => {
    setMode('choose');
    setIsProcessing(false);
    setError(null);
    setParsedData(null);
    setAmount('');
    setDescription('');
    setCategoryId('');
    setRawOcrText('');
    setOcrProgress(0);
    setProcessingLabel('');
  };

  // ─── QR Camera Logic ────────────────────────────────────────────────────────

  const startCamera = async () => {
    setMode('camera');
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
        scanAnimFrameRef.current = requestAnimationFrame(scanLoop);
      }
    } catch (err) {
      setError('Camera access denied. Please allow camera permissions or upload a screenshot instead.');
      setMode('choose');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
    cancelAnimationFrame(scanAnimFrameRef.current);
  };

  const scanLoop = () => {
    if (videoRef.current && canvasRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
        if (code) {
          stopCamera();
          handleQrText(code.data);
          return;
        }
      }
    }
    scanAnimFrameRef.current = requestAnimationFrame(scanLoop);
  };

  const handleQrText = (text: string) => {
    const parsed = parsePaymentData(text);
    populateReviewForm(parsed || { amount: 0, type: 'expense', description: text.slice(0, 80), date: new Date().toISOString().split('T')[0] });
  };

  // ─── Offline OCR (Tesseract.js) ─────────────────────────────────────────────

  const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });

  const runOfflineOcr = async (file: File): Promise<ParsedPayment | null> => {
    setProcessingLabel('Loading OCR engine...');
    setOcrProgress(0);

    const Tesseract = await getTesseract();
    const dataUrl = await fileToBase64(file);

    setProcessingLabel('Reading image with Offline OCR...');

    const worker = await Tesseract.createWorker('eng', 1, {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          setOcrProgress(Math.round(m.progress * 100));
        }
      },
    });

    const { data: { text } } = await worker.recognize(dataUrl);
    await worker.terminate();

    setRawOcrText(text);
    setProcessingLabel('Parsing transaction data...');

    const parsed = parsePaymentData(text);
    return parsed;
  };

  // ─── Gemini AI (Optional Fallback — requires API key) ───────────────────────

  const runGeminiOcr = async (file: File): Promise<ParsedPayment | null> => {
    const reader = new FileReader();
    const base64: string = await new Promise((resolve, reject) => {
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
    });

    setProcessingLabel('Asking Gemini AI...');
    const result = await AIService.extractFromImage(file, base64);
    return result as ParsedPayment;
  };

  // ─── Main Upload Handler ─────────────────────────────────────────────────────

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    e.target.value = '';

    setMode('upload');
    setIsProcessing(true);
    setError(null);

    try {
      // Step 1: Try offline OCR first (no API, no quota, works always)
      let result = await runOfflineOcr(file);

      // Step 2: If offline OCR found nothing meaningful, try Gemini as fallback
      if (!result || result.amount === 0) {
        try {
          setProcessingLabel('Offline OCR found no data. Trying AI fallback...');
          const aiResult = await runGeminiOcr(file);
          if (aiResult && aiResult.amount > 0) result = aiResult;
        } catch (geminiErr: any) {
          // Gemini failed (quota/no key) — stick with OCR result or manual entry
          console.warn('Gemini fallback failed:', geminiErr.message);
        }
      }

      if (result) {
        populateReviewForm(result);
      } else {
        // No data found — go to review with empty form and raw OCR text as description
        populateReviewForm({
          amount: 0,
          type: 'expense',
          description: rawOcrText.slice(0, 80) || 'Manual Entry',
          date: new Date().toISOString().split('T')[0],
        });
      }
    } catch (err: any) {
      console.error('Upload processing error:', err);
      setError(err.message || 'Failed to process image. Please enter details manually.');
      setMode('choose');
    } finally {
      setIsProcessing(false);
      setProcessingLabel('');
    }
  };

  // ─── Review Form ─────────────────────────────────────────────────────────────

  const populateReviewForm = (data: ParsedPayment) => {
    setParsedData(data);
    setAmount(data.amount > 0 ? data.amount.toString() : '');
    setType(data.type);
    setDescription(data.description);
    setDate(data.date);

    if (data.suggestedCategory) {
      const match = categories.find(c =>
        c.type === data.type &&
        c.name.toLowerCase().includes(data.suggestedCategory!.toLowerCase())
      );
      if (match) setCategoryId(match.id!.toString());
    }

    setMode('review');
  };

  const handleSave = async () => {
    if (!amount || !categoryId) return;
    setIsProcessing(true);
    try {
      await db.transactions.add({
        amount: parseFloat(amount),
        type,
        categoryId: parseInt(categoryId),
        context: activeContext,
        date,
        description,
        source: 'ai',
        importReferenceId: parsedData?.referenceId,
      });
      onClose();
    } catch (err) {
      setError('Failed to save. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-md" />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="w-full max-w-lg bg-[#0F172A] border border-white/10 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Camera className="text-blue-400" size={24} />
                {mode === 'review' ? 'Review Transaction' : 'Smart Capture'}
              </h2>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl">
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {error && (
                <div className="mb-4 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-start gap-3">
                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* Choose Mode */}
              {mode === 'choose' && (
                <div className="grid grid-cols-1 gap-4 py-6">
                  {/* Offline OCR badge */}
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                    <WifiOff size={14} className="text-emerald-400" />
                    <p className="text-xs text-emerald-400 font-medium">Screenshot mode works <strong>offline</strong> — no API needed</p>
                  </div>

                  <button onClick={startCamera}
                    className="group p-8 bg-white/5 border border-white/10 rounded-3xl hover:bg-blue-600/10 hover:border-blue-500/30 transition-all text-center">
                    <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Camera className="text-blue-400" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">Scan QR Code</h3>
                    <p className="text-sm text-slate-400">Live camera — payment QR auto-fill</p>
                  </button>

                  <button onClick={() => fileInputRef.current?.click()}
                    className="group p-8 bg-white/5 border border-white/10 rounded-3xl hover:bg-purple-600/10 hover:border-purple-500/30 transition-all text-center">
                    <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Upload className="text-purple-400" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">Upload Screenshot</h3>
                    <p className="text-sm text-slate-400">Easypaisa · JazzCash · Bank SMS · Receipts</p>
                    <div className="mt-3 flex items-center justify-center gap-1 text-[10px] text-emerald-400 font-bold">
                      <WifiOff size={10} /> Offline OCR · No API Key needed
                    </div>
                  </button>

                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                </div>
              )}

              {/* Camera View */}
              {mode === 'camera' && (
                <div className="relative aspect-square w-full bg-black rounded-3xl overflow-hidden border border-white/10">
                  <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="w-64 h-64 border-2 border-white/20 rounded-3xl relative overflow-hidden">
                      <div className="absolute inset-0 border-2 border-blue-500 rounded-3xl animate-pulse" />
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />
                      <div className="absolute left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
                    </div>
                    <p className="mt-8 text-white/60 font-medium text-sm">Align QR code within frame</p>
                  </div>
                </div>
              )}

              {/* Processing / OCR Progress */}
              {mode === 'upload' && isProcessing && (
                <div className="py-16 flex flex-col items-center justify-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <WifiOff className="text-purple-400" size={40} />
                    </div>
                    <div className="absolute -inset-2 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                  </div>
                  <div className="text-center w-full max-w-xs">
                    <h3 className="text-xl font-bold text-white mb-2">{processingLabel || 'Processing...'}</h3>
                    {ocrProgress > 0 && ocrProgress < 100 && (
                      <div className="w-full bg-white/10 rounded-full h-2 mt-3">
                        <div
                          className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${ocrProgress}%` }}
                        />
                      </div>
                    )}
                    <p className="text-slate-500 text-xs mt-2">Running offline on your device</p>
                  </div>
                </div>
              )}

              {/* Review Form */}
              {mode === 'review' && (
                <div className="space-y-5 pb-4">
                  {/* Success banner */}
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
                      <Check className="text-emerald-400" size={20} />
                    </div>
                    <div>
                      <p className="text-emerald-400 font-bold text-sm">Data Extracted Successfully</p>
                      <p className="text-slate-400 text-xs">Verify & edit before saving</p>
                    </div>
                  </div>

                  {/* Raw OCR text collapsible hint */}
                  {rawOcrText && (
                    <details className="group">
                      <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
                        <span>▶ View raw OCR text</span>
                      </summary>
                      <div className="mt-2 p-3 bg-white/5 border border-white/5 rounded-xl text-[10px] text-slate-500 font-mono whitespace-pre-wrap max-h-28 overflow-y-auto">
                        {rawOcrText}
                      </div>
                    </details>
                  )}

                  {/* Type toggle */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Type</label>
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                      <button onClick={() => setType('expense')}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${type === 'expense' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-slate-400 hover:text-white'}`}>
                        Expense (Out)
                      </button>
                      <button onClick={() => setType('income')}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${type === 'income' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-white'}`}>
                        Income (In)
                      </button>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Amount (PKR)</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder="0" />
                  </div>

                  {/* Category */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Category</label>
                    <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                      className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-3 text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none">
                      <option value="">Select Category...</option>
                      {currentTypeCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{t(lang, cat.name)}</option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Description</label>
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder="What was this for?" />
                  </div>

                  {/* Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Date</label>
                    <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 flex items-center">
                      <DatePicker value={date} onChange={setDate} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {mode === 'review' && (
              <div className="p-6 bg-white/5 border-t border-white/10">
                <button onClick={handleSave}
                  disabled={isProcessing || !amount || !categoryId}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:grayscale text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                  {isProcessing ? <Loader2 className="animate-spin" size={22} /> : <Save size={22} />}
                  Save Transaction
                </button>
                {!categoryId && (
                  <p className="text-center text-xs text-rose-400 mt-2">Please select a category to save</p>
                )}
              </div>
            )}

            {mode === 'camera' && (
              <div className="p-6 bg-white/5 border-t border-white/10">
                <button onClick={() => { stopCamera(); setMode('choose'); }}
                  className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold transition-all">
                  Cancel
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          0%, 100% { top: 2%; }
          50% { top: 94%; }
        }
      `}} />
    </AnimatePresence>
  );
}
