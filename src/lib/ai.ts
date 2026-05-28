import { GoogleGenAI } from '@google/genai';
import { SettingsService } from '../services/SettingsService';

let aiInstance: GoogleGenAI | null = null;
let currentKey: string | null = null;

export const AI_MODELS = {
  default: 'gemini-3.1-flash-lite',
  fast: 'gemini-3.1-flash-lite',
  vision: 'gemini-3.1-flash-lite',
} as const;

export const AI_TIMEOUT_MS = 90000;

export async function getGeminiInstance() {
  const settings = await SettingsService.get();
  const apiKey = settings?.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Please add it in App Settings.');
  }

  const cleanKey = apiKey.replace(/[^\x20-\x7E]/g, '').trim();
  
  if (!cleanKey) {
    throw new Error('API key is invalid. Please re-paste it in Settings.');
  }

  // Only recreate if key changed or instance doesn't exist
  if (!aiInstance || currentKey !== cleanKey) {
    aiInstance = new GoogleGenAI({ apiKey: cleanKey });
    currentKey = cleanKey;
  }

  return aiInstance;
}
