import { getGeminiInstance, AI_MODELS, AI_TIMEOUT_MS } from '../lib/ai';
import { withRetry } from '../lib/withRetry';
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

export const AIService = {
  async generateInsights(activeContext: string, businessMode: string, activeModules: string[], stats: AIInsightStats): Promise<string[]> {
    const ai = await getGeminiInstance();
    const prompt = `User context: ${activeContext}. Business mode: ${businessMode}. Enabled modules: ${activeModules.join(', ')}. Recent data: ${JSON.stringify(stats)}. Provide 3 concise, actionable financial insights. Return ONLY a JSON array of strings.`;
    const response = await withRetry(
      () => ai.models.generateContent({
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
    businessMode: string,
    activeModules: string[],
    stats: AIInsightStats,
    currency: string,
    messages: { sender: 'user' | 'ai' | 'system'; content: string }[],
    userMsg: string,
    coachStats?: any
  ): Promise<string> {
    const ai = await getGeminiInstance();
    let systemContext = `You are an expert financial and operational advisor for a ${businessMode} business (mode: ${activeContext}). 
The user has the following modules active: ${activeModules.join(', ')}. 
Use this knowledge to answer questions specifically related to their operational workflows.
Data: ${JSON.stringify(stats)}. Currency: ${currency}.`;

    if (coachStats) {
      systemContext += `\nAs their Business Coach, here are their all-time operational metrics (DO NOT mention these numbers unless relevant to their question, and DO NOT output JSON, just conversational text):
- Total All-Time Sales: ${currency} ${coachStats.totalSales}
- Total Expenses: ${currency} ${coachStats.totalExpenses}
- Estimated Profit: ${currency} ${coachStats.profitEstimate}
- Total Receivables (Udhaar Given): ${currency} ${coachStats.totalReceivables}
- Total Payables (Udhaar Taken): ${currency} ${coachStats.totalPayables}
- Inventory Value: ${currency} ${coachStats.inventoryValue}
- Pending Repairs Value: ${currency} ${coachStats.pendingRepairsValue}`;
    }
    const contents = [
      { role: 'user', parts: [{ text: `System Context: ${systemContext}` }] },
      { role: 'model', parts: [{ text: "Understood." }] },
      ...messages.slice().map(m => ({ 
      role: m.sender === 'ai' ? 'model' : 'user', 
      parts: [{ text: m.content }] 
      })),
      { role: 'user', parts: [{ text: userMsg }] }
    ];
    const response = await withRetry(
      () => ai.models.generateContent({ 
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

    const response = await withRetry(
      () => ai.models.generateContent({
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

    const response = await withRetry(
      () => ai.models.generateContent({
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
    const response = await withRetry(
      () => ai.models.generateContent({
        model: AI_MODELS.fast,
        contents: prompt
      }),
      AI_TIMEOUT_MS
    );
    const textResponse = response.text || '';
    return parseAIJson(textResponse, null);
  },

  async analyzeDocument(
    payload: { type: 'text'; content: string } | { type: 'image'; base64: string; mimeType: string }
  ): Promise<{
    type: 'receipt' | 'electric_bill' | 'csv_export' | 'bank_statement' | 'unknown';
    platform: 'jazzcash' | 'easypaisa' | 'bank' | 'other';
    transactions: ParsedTransaction[];
    confidence: number;
  }> {
    const ai = await getGeminiInstance();
    const currentYear = new Date().getFullYear();
    
    const systemPrompt = `You are an expert financial transaction analyzer. 
Analyze the provided document (which could be extracted text or an image of a receipt/statement) and return a structured JSON response.
You must auto-detect the type of document (receipt, electric_bill, csv_export, bank_statement, or unknown) and determine which platform it belongs to (jazzcash, easypaisa, bank, or other).
Extract ALL transaction entries found in the document.

Each transaction must have:
- date: YYYY-MM-DD format (infer year if not explicitly stated, using current year ${currentYear} if not clear)
- amount: positive number
- type: 'income' or 'expense'
- description: clear, sanitized description of the transaction
- referenceId: unique identifier/reference number from the statement or a deterministically unique string

Return ONLY a valid JSON object matching this structure:
{
  "type": "receipt" | "electric_bill" | "csv_export" | "bank_statement" | "unknown",
  "platform": "jazzcash" | "easypaisa" | "bank" | "other",
  "transactions": [
    { "date": "YYYY-MM-DD", "amount": 1500, "type": "expense", "description": "Electric Bill Payment", "referenceId": "12345" }
  ],
  "confidence": number (between 0.0 and 1.0)
}`;

    let response;
    if (payload.type === 'text') {
      const prompt = `${systemPrompt}\n\nDocument Text Content:\n${payload.content}`;
      response = await withRetry(
        () => ai.models.generateContent({
          model: AI_MODELS.default,
          contents: prompt
        }),
        AI_TIMEOUT_MS
      );
    } else {
      const contents = [
        { role: 'user', parts: [
          { text: systemPrompt },
          { inlineData: { mimeType: payload.mimeType as any, data: payload.base64 } }
        ]}
      ];
      response = await withRetry(
        () => ai.models.generateContent({
          model: AI_MODELS.vision,
          contents: contents as any
        }),
        AI_TIMEOUT_MS
      );
    }

    const text = response.text || '';
      const defaultResult = {
      type: 'unknown' as const,
      platform: 'other' as const,
      transactions: [],
      confidence: 0
    };
    return parseAIJson(text, defaultResult);
  },

  async generateDailySummary(businessMode: string, data: any, currency: string): Promise<string> {
    const ai = await getGeminiInstance();
    const prompt = `Business Mode: ${businessMode}.
Today's Data:
Sales: ${data.todaySales} ${currency}
Expenses: ${data.todayExpenses} ${currency}
Profit Estimate: ${data.profitEstimate} ${currency}
Net Cash: ${data.cashExpected} ${currency}
Udhaar Given: ${data.udhaarGiven} ${currency}
Udhaar Received: ${data.udhaarReceived} ${currency}
Low Stock Items: ${data.lowStockCount}
Pending Repairs: ${data.pendingRepairs}
Active Warranties: ${data.activeWarranties}

Generate a concise 2-sentence summary for the shop owner highlighting the best aspects or biggest risks today. Do not invent any numbers. Do not use PII. Keep it professional.`;

    const response = await withRetry(
      () => ai.models.generateContent({
        model: AI_MODELS.fast,
        contents: prompt
      }),
      AI_TIMEOUT_MS
    );
    return response.text?.trim() || 'Summary could not be generated.';
  }
};
