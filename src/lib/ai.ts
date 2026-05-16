import { GoogleGenAI } from '@google/genai';
import { db } from '../db';

let aiInstance: GoogleGenAI | null = null;
let currentKey: string | null = null;

export const AI_MODELS = {
  default: 'gemini-2.0-flash',
  fast: 'gemini-2.0-flash',
  vision: 'gemini-2.0-flash',
} as const;

export const AI_TIMEOUT_MS = 15000;

export async function getGeminiInstance() {
  const settings = await db.settings.toCollection().first();
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
