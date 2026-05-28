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

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Document processing request timed out')), timeoutMs)
    ),
  ]);
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
1. Extract ONLY what is clearly visible. Never infer, guess, or fabricate data.
2. Any blurry, cut-off, or unreadable value MUST be set to the exact string "[Unreadable]".
3. Never set a field to 0, null, or empty string when the value exists but is unreadable — use "[Unreadable]".
4. Return ONLY a valid JSON object matching the DocumentExtractionResult TypeScript interface. No markdown blocks outside the JSON, no commentary.

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
- CSVs/Tables/Statements: headers, and rows of values, keeping tabular format exactly.
- Begin with a 1-sentence summary of the document in the "summary" field.`;

    let response;
    if (payload.type === 'text') {
      const prompt = `${systemPrompt}\n\nDocument Text/CSV Content:\n${payload.content}`;
      response = await withTimeout(
        ai.models.generateContent({
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
        ai.models.generateContent({
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

      t.headers.forEach((header, index) => {
        const lower = header.toLowerCase();
        if (lower.includes('date')) dateCol = index;
        else if (lower.includes('desc') || lower.includes('detail') || lower.includes('particular')) descCol = index;
        else if (lower.includes('amount') || lower.includes('price') || lower.includes('total') || lower.includes('value')) amountCol = index;
        else if (lower.includes('type') || lower.includes('flow')) typeCol = index;
      });

      // fallbacks if headers not matching
      if (dateCol === -1) dateCol = 0;
      if (descCol === -1) descCol = Math.min(1, t.headers.length - 1);
      if (amountCol === -1) amountCol = Math.min(2, t.headers.length - 1);

      t.rows.forEach((row, rowIndex) => {
        // Row check
        if (t.includedRows && !t.includedRows[rowIndex]) return;

        const cellDate = String(row[dateCol] || dateStr);
        const cellDesc = String(row[descCol] || 'Table Row Item');
        const rawAmount = parseFloat(String(row[amountCol]).replace(/[^0-9.-]+/g, '')) || 0;

        let finalType: 'income' | 'expense' = 'expense';
        if (typeCol !== -1) {
          const typeVal = String(row[typeCol]).toLowerCase();
          if (typeVal.includes('inc') || typeVal.includes('credit') || typeVal.includes('in') || typeVal.includes('deposit')) {
            finalType = 'income';
          }
        } else if (rawAmount > 0) {
          // If transaction has direct platform representation or sign
          finalType = 'expense'; // default is expense
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
