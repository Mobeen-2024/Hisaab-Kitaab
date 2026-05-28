import { getGeminiInstance, AI_MODELS, AI_TIMEOUT_MS } from '../lib/ai';
import { parseAIJson } from '../lib/parseAIJson';
import { extractTextFromPDF, ParsedTransaction, generateDeterministicId } from '../utils/statementParsers';
import { parseCSVFile } from '../utils/csvParser';

export type UnreadableOr<T> = T | '[Unreadable]';

export interface RawReceiptItem {
  name: UnreadableOr<string>;
  quantity: UnreadableOr<number>;
  unitPrice: UnreadableOr<number>;
  total: UnreadableOr<number>;
}

export interface DocumentExtractionResult {
  documentType: 'receipt' | 'electric_bill' | 'csv_table' | 'bank_statement' | 'invoice' | 'unknown';
  summary: string;       // 1-sentence human-readable description
  confidence: number;    // 0.0 – 1.0

  receipt?: {
    vendor: UnreadableOr<string>;
    date: UnreadableOr<string>;      // YYYY-MM-DD
    items: RawReceiptItem[];
    subtotal: UnreadableOr<number>;
    tax: UnreadableOr<number>;
    total: UnreadableOr<number>;
    currency: string;
  };

  table?: {
    headers: string[];
    rows: UnreadableOr<string | number>[][];
    totalRows: number;
  };
}

export interface ConfirmedReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  include: boolean;    // user toggle per row
}

export interface ConfirmedExtractionResult {
  documentType: DocumentExtractionResult['documentType'];
  receipt?: {
    vendor: string;
    date: string;
    items: ConfirmedReceiptItem[];
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
  };
  table?: {
    headers: string[];
    rows: (string | number)[][];
    includedRows?: boolean[]; // visual toggle per row if wanted, or all included by default
  };
}

async function withTimeout<T>(promiseFn: () => Promise<T>, timeoutMs: number, retries = 2, defaultDelayMs = 15000): Promise<T> {
  let attempt = 0;
  while (true) {
    let timeoutId: any;
    try {
      return await Promise.race([
        promiseFn(),
        new Promise<T>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Document processing request timed out')), timeoutMs);
        })
      ]);
    } catch (error: any) {
      if (attempt < retries && (error?.status === 429 || error?.message?.includes('429') || error?.status === 503 || error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE') || error?.message?.includes('timed out'))) {
        let waitTimeMs = defaultDelayMs;
        const retryMatch = error?.message?.match(/retry in ([\d\.]+)s/);
        if (retryMatch && retryMatch[1]) {
          waitTimeMs = (parseFloat(retryMatch[1]) + 1) * 1000;
        }
        console.warn(`API Error (${error?.status || 503}). Retrying in ${Math.round(waitTimeMs / 1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTimeMs));
        attempt++;
        continue;
      }
      throw error;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }
}

// Utility to convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result as string;
      // strip data:image/...;base64,
      const cleanBase64 = base64String.substring(base64String.indexOf(',') + 1);
      resolve(cleanBase64);
    };
    reader.onerror = (error) => reject(error);
  });
}

export const DocumentProcessingAgent = {
  async fromFile(file: File): Promise<DocumentExtractionResult> {
    const fileType = file.type;
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (fileType === 'application/pdf' || extension === 'pdf') {
      const text = await extractTextFromPDF(file);
      return this.extract({ type: 'text', content: text });
    } else if (fileType === 'text/csv' || extension === 'csv') {
      const csvData = await parseCSVFile(file);
      // Serialize as plain text table format or simple comma/pipe string for the model
      const textContent = csvData.map(row => row.join(',')).join('\n');
      return this.extract({ type: 'text', content: textContent });
    } else if (fileType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp'].includes(extension || '')) {
      const base64 = await fileToBase64(file);
      return this.extract({ type: 'image', base64, mimeType: fileType || 'image/jpeg' });
    } else {
      throw new Error('Unsupported file format. Please upload PDF, CSV, or an Image (JPG, PNG).');
    }
  },

  async extract(
    payload: { type: 'text'; content: string } | { type: 'image'; base64: string; mimeType: string }
  ): Promise<DocumentExtractionResult> {
    const ai = await getGeminiInstance();

    const systemPrompt = `You are a precision document extraction engine. Your output will be directly edited by a human.

NON-NEGOTIABLE RULES:
1. Extract ONLY what is clearly visible. Never infer, guess, fabricate, or hallucinate data (especially Dates and Amounts).
2. For dates, extract the EXACT string as it appears in the document. Do NOT reformat it into a different month or date. If it says "29-Apr-2025 to 27-Apr-2026", output EXACTLY that.
3. Any blurry, cut-off, or unreadable value MUST be set to the exact string "[Unreadable]".
4. Never set a field to 0, null, or empty string when the value exists but is unreadable — use "[Unreadable]".
5. Return ONLY a valid JSON object matching the DocumentExtractionResult TypeScript interface. No markdown blocks outside the JSON, no commentary.

TypeScript Interface Reference:
interface DocumentExtractionResult {
  documentType: 'receipt' | 'electric_bill' | 'csv_table' | 'bank_statement' | 'invoice' | 'unknown';
  summary: string;       // 1-sentence human-readable description
  confidence: number;    // 0.0 – 1.0

  receipt?: {
    vendor: string | '[Unreadable]';
    date: string | '[Unreadable]';      // YYYY-MM-DD
    items: {
      name: string | '[Unreadable]';
      quantity: number | '[Unreadable]';
      unitPrice: number | '[Unreadable]';
      total: number | '[Unreadable]';
    }[];
    subtotal: number | '[Unreadable]';
    tax: number | '[Unreadable]';
    total: number | '[Unreadable]';
    currency: string; // e.g. "PKR", "USD", "Rs." or symbol
  };

  table?: {
    headers: string[];
    rows: (string | number | '[Unreadable]')[][];
    totalRows: number;
  };
}

EXTRACTION RULES:
- Receipts: vendor name, date (YYYY-MM-DD), each line item (name, qty, unitPrice, total), subtotal, tax, grand total, currency symbol/code.
- CSVs/Tables/Statements: headers, and rows of values. CRITICAL: You MUST ensure EVERY row has EXACTLY the same number of cells as the headers. If a column (like INST. NO.) is empty for a row, you MUST output an empty string "" or "-" for that cell so columns do not shift left. Also, merge broken multiline descriptions into a single cell. Do NOT skip any rows.
- Begin with a 1-sentence summary of the document in the "summary" field.`;

    let response;
    if (payload.type === 'text') {
      const prompt = `${systemPrompt}\n\nDocument Text/CSV Content:\n${payload.content}`;
      response = await withTimeout(
        () => ai.models.generateContent({
          model: AI_MODELS.default,
          contents: prompt
        }),
        AI_TIMEOUT_MS
      );
    } else {
      const contents = [
        {
          role: 'user',
          parts: [
            { text: systemPrompt },
            { inlineData: { mimeType: payload.mimeType as any, data: payload.base64 } }
          ]
        }
      ];
      response = await withTimeout(
        () => ai.models.generateContent({
          model: AI_MODELS.vision,
          contents: contents as any
        }),
        AI_TIMEOUT_MS
      );
    }

    const text = response.text || '';
    const defaultResult: DocumentExtractionResult = {
      documentType: 'unknown',
      summary: 'No description generated.',
      confidence: 0
    };

    return parseAIJson(text, defaultResult);
  },

  toTransactions(confirmed: ConfirmedExtractionResult, platform: string = 'other'): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];
    const dateStr = new Date().toISOString().split('T')[0];

    if (confirmed.documentType === 'receipt' && confirmed.receipt) {
      const r = confirmed.receipt;
      const vendorName = r.vendor || 'Receipt Merchant';
      const rDate = r.date || dateStr;

      r.items.forEach(item => {
        if (!item.include) return;
        const desc = `${vendorName}: ${item.name} (${item.quantity}x @ ${r.currency}${item.unitPrice})`;
        transactions.push({
          date: rDate,
          amount: item.total,
          type: 'expense',
          description: desc,
          referenceId: generateDeterministicId(rDate, item.total, desc)
        });
      });
    } else if (confirmed.table) {
      const t = confirmed.table;
      // Try to map a generic tabular structure to ParsedTransactions
      let dateCol = -1;
      let descCol = -1;
      let amountCol = -1;
      let typeCol = -1; // income or expense
      let debitCol = -1;
      let creditCol = -1;

      t.headers.forEach((header, index) => {
        const lower = header.toLowerCase();
        if (lower.includes('date')) dateCol = index;
        else if (lower.includes('desc') || lower.includes('detail') || lower.includes('particular')) descCol = index;
        else if (lower.includes('amount') || lower.includes('price') || lower.includes('total') || lower.includes('value')) amountCol = index;
        else if (lower.includes('debit') || lower.includes('withdrawal') || lower.match(/\bout\b/)) debitCol = index;
        else if (lower.includes('credit') || lower.includes('deposit') || lower.match(/\bin\b/)) creditCol = index;
        else if (lower.includes('type') || lower.includes('flow')) typeCol = index;
      });

      // fallbacks if headers not matching
      if (dateCol === -1) dateCol = 0;
      if (descCol === -1) descCol = Math.min(1, t.headers.length - 1);
      if (amountCol === -1) amountCol = Math.min(2, t.headers.length - 1);

      t.rows.forEach((row, rowIndex) => {
        // Row check
        if (t.includedRows && !t.includedRows[rowIndex]) return;

        let rawCellDate = String(row[dateCol] || dateStr);
        let cellDate = dateStr;
        try {
          const parsedD = new Date(rawCellDate);
          if (!isNaN(parsedD.getTime())) {
            cellDate = parsedD.toLocaleDateString('en-CA'); // Safely converts "03-May-2025" to "2025-05-03"
          } else {
            cellDate = rawCellDate;
          }
        } catch(e) {
          cellDate = rawCellDate;
        }

        const cellDesc = String(row[descCol] || 'Table Row Item');
        
        let rawAmount = 0;
        let finalType: 'income' | 'expense' = 'expense';

        if (debitCol !== -1 || creditCol !== -1) {
          const debitVal = debitCol !== -1 ? parseFloat(String(row[debitCol]).replace(/[^0-9.-]+/g, '')) || 0 : 0;
          const creditVal = creditCol !== -1 ? parseFloat(String(row[creditCol]).replace(/[^0-9.-]+/g, '')) || 0 : 0;
          if (creditVal > 0 && debitVal === 0) {
            rawAmount = creditVal;
            finalType = 'income';
          } else {
            rawAmount = debitVal;
            finalType = 'expense';
          }
        } else {
          rawAmount = parseFloat(String(row[amountCol]).replace(/[^0-9.-]+/g, '')) || 0;
          if (typeCol !== -1) {
            const typeVal = String(row[typeCol]).toLowerCase();
            if (typeVal.includes('inc') || typeVal.includes('credit') || typeVal.includes('in') || typeVal.includes('deposit')) {
              finalType = 'income';
            }
          }
        }

        const absAmount = Math.abs(rawAmount);
        if (absAmount > 0) {
          const formattedPlatform = platform.charAt(0).toUpperCase() + platform.slice(1);
          const fullDesc = `${formattedPlatform}: ${cellDesc}`;
          transactions.push({
            date: cellDate,
            amount: absAmount,
            type: finalType,
            description: fullDesc,
            referenceId: generateDeterministicId(cellDate, absAmount, fullDesc)
          });
        }
      });
    }

    return transactions;
  },

  toMarkdownTable(result: DocumentExtractionResult): string {
    if (result.documentType === 'receipt' && result.receipt) {
      const r = result.receipt;
      let md = `### Receipt: ${r.vendor}\n`;
      md += `* **Date**: ${r.date}\n`;
      md += `* **Currency**: ${r.currency}\n\n`;
      md += `| Item | Qty | Unit Price | Total |\n`;
      md += `| :--- | :---: | :---: | :---: |\n`;
      r.items.forEach(item => {
        md += `| ${item.name} | ${item.quantity} | ${item.unitPrice} | ${item.total} |\n`;
      });
      md += `\n* **Subtotal**: ${r.subtotal}\n`;
      md += `* **Tax**: ${r.tax}\n`;
      md += `* **Total**: ${r.total}\n`;
      return md;
    } else if (result.table) {
      const t = result.table;
      let md = `### Table Extraction (${t.totalRows} rows)\n\n`;
      md += `| ${t.headers.join(' | ')} |\n`;
      md += `| ${t.headers.map(() => '---').join(' | ')} |\n`;
      t.rows.forEach(row => {
        md += `| ${row.join(' | ')} |\n`;
      });
      return md;
    }
    return `### Extraction Result\n\nNo structured table/receipt data found.\nSummary: ${result.summary}`;
  }
};
