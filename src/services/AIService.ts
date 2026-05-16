import { getGeminiInstance, AI_MODELS, AI_TIMEOUT_MS } from '../lib/ai';
import { parseAIJson } from '../lib/parseAIJson';
import { ParsedTransaction } from '../utils/statementParsers';

export interface AIInsightStats {
  totalIncome: number;
  totalExpense: number;
  savingRate: number;
  lowStock: string[];
  topExpenses: { name: string; total: number }[];
  transactionsCount: number;
}

export interface AIImageResult {
  amount: number;
  type: 'income' | 'expense';
  description: string;
  date: string;
  suggestedCategory?: string;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('AI request timed out')), timeoutMs)
    ),
  ]);
}

export const AIService = {
  async generateInsights(activeContext: string, stats: AIInsightStats): Promise<string[]> {
    const ai = await getGeminiInstance();
    const prompt = `User context: ${activeContext}. Recent data: ${JSON.stringify(stats)}. Provide 3 concise, actionable financial insights. Return ONLY a JSON array of strings.`;
    const response = await withTimeout(
      ai.models.generateContent({
        model: AI_MODELS.fast,
        contents: prompt
      }),
      AI_TIMEOUT_MS
    );
    const fullText = response.text || '';
    return parseAIJson(fullText, []);
  },

  async getChatResponse(
    activeContext: string,
    stats: AIInsightStats,
    currency: string,
    messages: { sender: 'user' | 'ai' | 'system'; content: string }[],
    userMsg: string
  ): Promise<string> {
    const ai = await getGeminiInstance();
    const systemContext = `Financial advisor for ${activeContext} mode. Data: ${JSON.stringify(stats)}. Currency: ${currency}.`;
    const contents = [
      { role: 'user', parts: [{ text: `System Context: ${systemContext}` }] },
      { role: 'model', parts: [{ text: "Understood." }] },
      ...messages.slice().map(m => ({ 
        role: m.sender === 'ai' ? 'model' : 'user', 
        parts: [{ text: m.content }] 
      })),
      { role: 'user', parts: [{ text: userMsg }] }
    ];
    const response = await withTimeout(
      ai.models.generateContent({ 
        model: AI_MODELS.default, 
        contents: contents as any 
      }),
      AI_TIMEOUT_MS
    );
    return response.text?.trim() || 'No response from AI';
  },

  async parseStatement(pastedText: string): Promise<ParsedTransaction[]> {
    const ai = await getGeminiInstance();
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

    const response = await withTimeout(
      ai.models.generateContent({
        model: AI_MODELS.fast,
        contents: prompt
      }),
      AI_TIMEOUT_MS
    );

    const text = response.text || '';
    const results = parseAIJson(text, []);
    if (results.length === 0) {
      throw new Error("AI could not find any transactions in the text.");
    }
    return results;
  },

  async extractFromImage(file: File, base64: string): Promise<AIImageResult | null> {
    const ai = await getGeminiInstance();
    const contents = [{
      role: 'user',
      parts: [
        {
          text: `Extract financial transaction details from this image.
Return ONLY a valid JSON object:
{"amount": <number>, "type": "<income|expense>", "description": "<5-word summary>", "date": "<YYYY-MM-DD>", "suggestedCategory": "<food|fuel|salary|utilities|transport>"}
If no data found, return: {"amount": 0, "type": "expense", "description": "Unknown", "date": "${new Date().toISOString().split('T')[0]}", "suggestedCategory": ""}`
        },
        { inlineData: { mimeType: file.type as any || 'image/jpeg', data: base64 } }
      ]
    }];

    const response = await withTimeout(
      ai.models.generateContent({
        model: AI_MODELS.vision,
        contents: contents as any
      }),
      AI_TIMEOUT_MS
    );

    const text = response.text || '';
    return parseAIJson(text, null);
  },

  async parseVoiceInput(text: string, categories: any[]): Promise<any> {
    const ai = await getGeminiInstance();
    const prompt = `Extract transaction details from: "${text}". Return ONLY JSON: { "type": "expense"|"income", "amount": number, "categoryId": number|null, "description": string }. Categories: ${JSON.stringify(categories)}`;
    const response = await withTimeout(
      ai.models.generateContent({
        model: AI_MODELS.fast,
        contents: prompt
      }),
      AI_TIMEOUT_MS
    );
    const textResponse = response.text || '';
    return parseAIJson(textResponse, null);
  }
};
