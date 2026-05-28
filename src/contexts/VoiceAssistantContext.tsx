import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { useSettings } from './SettingsContext';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { LiveVoiceService } from '../services/LiveVoiceService';

export type VoiceState = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking' | 'error';

export interface VoiceMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  isStreaming?: boolean;
}

export interface FormCallbacks {
  onFillReceiptForm?: (data: { vendor?: string; date?: string; items?: any[]; tax?: number }) => void;
  onAddTransaction?: (transaction: { amount: number; type: 'income' | 'expense'; description: string; date?: string }) => void;
  onConfirm?: () => void;
}

interface VoiceAssistantContextType {
  state: VoiceState;
  isRecording: boolean;
  audioLevel: number;
  messages: VoiceMessage[];
  error: string | null;
  startSession: () => Promise<void>;
  stopSession: () => void;
  sendTextMessage: (text: string) => void;
  registerFormCallbacks: (callbacks: FormCallbacks) => void;
  deregisterFormCallbacks: () => void;
}

const VoiceAssistantContext = createContext<VoiceAssistantContextType | undefined>(undefined);

export const VoiceAssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<VoiceState>('idle');
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { currency, activeContext } = useSettings();
  const { startRecording, stopRecording, isRecording, audioLevel } = useAudioRecorder();
  
  const voiceServiceRef = useRef<LiveVoiceService | null>(null);
  const activeCallbacksRef = useRef<FormCallbacks>({});

  const speakText = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      // Clean text from markdown formatting or asterisks for clean narration
      const cleanText = text.replace(/[*#`_\-]/g, '').trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || voices.find(v => v.lang.startsWith('en'));
      if (voice) utterance.voice = voice;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const registerFormCallbacks = useCallback((callbacks: FormCallbacks) => {
    activeCallbacksRef.current = callbacks;
  }, []);

  const deregisterFormCallbacks = useCallback(() => {
    activeCallbacksRef.current = {};
  }, []);

  const stopSession = useCallback(() => {
    stopRecording();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (voiceServiceRef.current) {
      voiceServiceRef.current.disconnect();
      voiceServiceRef.current = null;
    }
    setState('idle');
    setMessages([]);
  }, [stopRecording]);

  const sendTextMessage = useCallback((text: string) => {
    if (voiceServiceRef.current) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setMessages((prev) => [
        ...prev,
        { id: Math.random().toString(), role: 'user', text },
        { id: 'streaming-ai', role: 'assistant', text: '', isStreaming: true }
      ]);
      voiceServiceRef.current.sendTextMessage(text);
    }
  }, []);

  const startSession = useCallback(async () => {
    stopSession();
    setState('connecting');
    setError(null);
    setMessages([]);

    const systemInstruction = `You are "Hisaab-Kitaab Assistant", a real-time voice and typing automation helper for the Hisaab-Kitaab (Bookkeeping) financial app.
Active Currency: ${currency || 'PKR'}.
Active Context: ${activeContext || 'Personal'} (all entries must default/relate to this context).

Your duties are:
1. Help users fill out a receipt extraction form by voice or chat.
2. Allow users to dictate or describe manual transaction entries.
3. Chat naturally, friendly, and concisely about their personal/business bookkeeping, goals, budgets, and bills. Keep audio conversational turns brief.

You have access to the following tools:
- fill_receipt_form(vendor, date, items, tax): Use this tool when the user provides details about a receipt, invoice, or purchase. "items" is an array of objects each having { name, price }.
- add_transaction(amount, type, description, date): Use this to record a simple bookkeeping transaction.
- update_form_field(fieldName, value): Updates a single field in the receipt form (e.g. vendor, tax, date).
- confirm_and_save(): Confirm and save the current form or transaction.

Always execute the corresponding tool as soon as you have the required parameters from the user's speech or message. When calling a tool, explain briefly to the user that you are performing that action.`;

    const tools = [
      {
        name: 'fill_receipt_form',
        description: 'Fill or update multiple fields in the receipt extraction form.',
        parameters: {
          type: 'OBJECT',
          properties: {
            vendor: { type: 'STRING', description: 'Name of the shop, vendor, or store.' },
            date: { type: 'STRING', description: 'Date of purchase in YYYY-MM-DD format.' },
            items: {
              type: 'ARRAY',
              description: 'List of items purchased.',
              items: {
                type: 'OBJECT',
                properties: {
                  name: { type: 'STRING', description: 'Item name.' },
                  price: { type: 'NUMBER', description: 'Price of the item.' },
                },
                required: ['name', 'price'],
              },
            },
            tax: { type: 'NUMBER', description: 'Sales tax or extra fees.' },
          },
        },
      },
      {
        name: 'add_transaction',
        description: 'Create a direct, manual income or expense entry in the ledger.',
        parameters: {
          type: 'OBJECT',
          properties: {
            amount: { type: 'NUMBER', description: 'Transaction amount.' },
            type: { type: 'STRING', enum: ['income', 'expense'], description: 'Type of transaction.' },
            description: { type: 'STRING', description: 'Short description/reason for the transaction.' },
            date: { type: 'STRING', description: 'Date of transaction (YYYY-MM-DD).' },
          },
          required: ['amount', 'type', 'description'],
        },
      },
      {
        name: 'update_form_field',
        description: 'Update a single specific field in the receipt form.',
        parameters: {
          type: 'OBJECT',
          properties: {
            fieldName: { type: 'STRING', enum: ['vendor', 'date', 'tax'], description: 'Field to update.' },
            value: { type: 'STRING', description: 'New value for the field.' },
          },
          required: ['fieldName', 'value'],
        },
      },
      {
        name: 'confirm_and_save',
        description: 'Save/Submit the current transaction or form.'
      },
    ];

    try {
      const service = new LiveVoiceService();
      voiceServiceRef.current = service;

      await service.connect(systemInstruction, tools, {
        onConnect: () => {
          setState('listening');
          // Start actual mic recording
          startRecording((text) => {
            if (text && text.trim().length > 0) {
              if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
              }
              // Add user message & empty placeholder for AI
              setMessages((prev) => [
                ...prev,
                { id: Math.random().toString(), role: 'user', text },
                { id: 'streaming-ai', role: 'assistant', text: '', isStreaming: true }
              ]);
              service.sendTextMessage(text);
            }
          }).catch((err) => {
            setError('Failed to start microphone.');
            stopSession();
          });
        },
        onDisconnect: () => {
          setState('idle');
        },
        onTextReceived: (text) => {
          setState('speaking');
          setMessages((prev) =>
            prev.map((m) => (m.id === 'streaming-ai' ? { ...m, text: m.text + text } : m))
          );
        },
        onTurnComplete: (fullText) => {
          setState('listening');
          setMessages((prev) =>
            prev.map((m) =>
              m.id === 'streaming-ai' ? { ...m, id: Math.random().toString(), isStreaming: false } : m
            )
          );
          speakText(fullText);
        },
        onAudioReceived: (base64Audio) => {
          // Play pre-recorded base64 chunks if applicable
        },
        onToolCall: async (name, args, callId) => {
          setState('processing');
          let output = { success: false, message: 'No registered form active' };

          if (name === 'fill_receipt_form') {
            if (activeCallbacksRef.current.onFillReceiptForm) {
              activeCallbacksRef.current.onFillReceiptForm(args);
              output = { success: true, message: 'Receipt form updated.' };
            }
          } else if (name === 'add_transaction') {
            if (activeCallbacksRef.current.onAddTransaction) {
              activeCallbacksRef.current.onAddTransaction(args);
              output = { success: true, message: 'Transaction added to manual entries.' };
            }
          } else if (name === 'update_form_field') {
            if (activeCallbacksRef.current.onFillReceiptForm) {
              activeCallbacksRef.current.onFillReceiptForm({ [args.fieldName]: args.value });
              output = { success: true, message: `Field ${args.fieldName} updated to ${args.value}.` };
            }
          } else if (name === 'confirm_and_save') {
            if (activeCallbacksRef.current.onConfirm) {
              activeCallbacksRef.current.onConfirm();
              output = { success: true, message: 'Submitted and saved.' };
            }
          }

          return output;
        },
        onError: (err) => {
          console.error(err);
          setError(err.message || 'An error occurred during the session.');
          setState('error');
        },
      });
    } catch (err: any) {
      setError(err.message || 'Could not connect to Gemini Live.');
      setState('error');
    }
  }, [currency, activeContext, startRecording, stopSession, speakText]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSession();
    };
  }, [stopSession]);

  return (
    <VoiceAssistantContext.Provider
      value={{
        state,
        isRecording,
        audioLevel,
        messages,
        error,
        startSession,
        stopSession,
        sendTextMessage,
        registerFormCallbacks,
        deregisterFormCallbacks,
      }}
    >
      {children}
    </VoiceAssistantContext.Provider>
  );
};

export const useVoiceAssistant = () => {
  const context = useContext(VoiceAssistantContext);
  if (context === undefined) {
    throw new Error('useVoiceAssistant must be used within a VoiceAssistantProvider');
  }
  return context;
};

