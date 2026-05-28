import type { Transaction } from '../models';
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export interface ParsedTransaction {
  date: string;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  referenceId: string;
}

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    const lines: { [key: number]: any[] } = {};
    textContent.items.forEach((item: any) => {
      const y = Math.round(item.transform[5]);
      if (!lines[y]) lines[y] = [];
      lines[y].push(item);
    });

    const sortedY = Object.keys(lines).map(Number).sort((a, b) => b - a);
    
    const pageText = sortedY.map(y => {
      return lines[y]
        .sort((a, b) => a.transform[4] - b.transform[4])
        .map(item => item.str)
        .join(' ');
    }).join('\n');

    fullText += pageText + '\n';
  }
  return fullText;
}

// Simple deterministic hash for duplicate prevention
export function generateDeterministicId(date: string, amount: number, desc: string): string {
  const str = `${date}|${amount}|${desc.trim().toLowerCase()}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `auto-${Math.abs(hash).toString(16)}`;
}


function parseCSVRow(text: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i+1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function simpleCSVParse(text: string): string[][] {
  const lines = text.split(/\r?\n/);
  return lines.map(line => parseCSVRow(line)).filter(row => row.some(cell => cell.length > 0));
}

// Flexible date parser to handle formats like DD-MM-YYYY, MM/DD/YYYY, MMM DD, etc.
function parseDateRobust(dateStr: string): Date | null {
  if (!dateStr) return null;
  const cleanStr = dateStr.trim();
  const d = new Date(cleanStr);
  if (!isNaN(d.getTime())) return d;
  
  // Try DD-MM-YYYY or DD/MM/YYYY
  const parts = cleanStr.split(/[-/.\s]+/);
  if (parts.length >= 3) {
    // Determine which is year
    const p0 = parts[0];
    const p1 = parts[1];
    const p2 = parts[2].substring(0, 4); // Handle potential time appended
    
    // Check if it might be DD-MM-YYYY (if first part > 12)
    const num0 = parseInt(p0, 10);
    const num1 = parseInt(p1, 10);
    const num2 = parseInt(p2, 10);
    
    if (num0 > 12 && num1 <= 12 && num2 > 1900) {
      // It's DD-MM-YYYY
      const d2 = new Date(num2, num1 - 1, num0);
      if (!isNaN(d2.getTime())) return d2;
    }
  }
  return null;
}

export const parseJazzCashCSV = (csvText: string): ParsedTransaction[] => {
  const rows = simpleCSVParse(csvText);
  return rows.slice(1)
    .filter(row => row.length >= 4 && row[0])
    .map(row => {
      try {
        const d = parseDateRobust(row[0]);
        if (!d) return null;
        const amount = parseFloat(row[3].replace(/[^0-9.-]+/g, "")) || 0;
        return {
          date: d.toISOString().split('T')[0],
          amount: Math.abs(amount),
          type: amount >= 0 ? 'income' : 'expense' as const,
          description: `JazzCash: ${row[2] || 'Transaction'}`,
          referenceId: row[1]
        };
      } catch (e) { return null; }
    })
    .filter((t): t is ParsedTransaction => t !== null);
};

export const parseEasypaisaCSV = (csvText: string): ParsedTransaction[] => {
  const rows = simpleCSVParse(csvText);
  return rows.slice(1)
    .filter(row => row.length >= 5 && row[0])
    .map(row => {
      try {
        const d = parseDateRobust(row[0]);
        if (!d) return null;
        const amount = parseFloat(row[4].replace(/[^0-9.-]+/g, "")) || 0;
        const typeStr = (row[2] || '').toLowerCase();
        return {
          date: d.toISOString().split('T')[0],
          amount: Math.abs(amount),
          type: (typeStr.includes('cash in') || typeStr.includes('receive') || amount > 0) ? 'income' : 'expense' as const,
          description: `Easypaisa: ${row[3] || 'Transaction'}`,
          referenceId: row[1]
        };
      } catch (e) { return null; }
    })
    .filter((t): t is ParsedTransaction => t !== null);
};

export const parseGenericCSV = (csvText: string): ParsedTransaction[] => {
  const rows = simpleCSVParse(csvText);
  if (rows.length === 0) return [];

  // Try to auto-detect columns from the first 5 rows
  let dateCol = -1;
  let descCol = -1;
  let amountCol = -1;
  let debitCol = -1;
  let creditCol = -1;

  // Scan headers
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i];
    row.forEach((cell, index) => {
      const lower = cell.toLowerCase().trim();
      if (lower.includes('date') || lower === 'txn date') dateCol = index;
      else if (lower.includes('description') || lower.includes('details') || lower.includes('particulars')) descCol = index;
      else if (lower === 'amount') amountCol = index;
      else if (lower.includes('debit') || lower === 'dr') debitCol = index;
      else if (lower.includes('credit') || lower === 'cr') creditCol = index;
    });
    if (dateCol !== -1 && descCol !== -1 && (amountCol !== -1 || (debitCol !== -1 && creditCol !== -1))) {
      break; // Found headers
    }
  }

  // Fallback if headers not found
  if (dateCol === -1) dateCol = 0;
  if (descCol === -1) descCol = 1;
  if (amountCol === -1 && debitCol === -1) amountCol = 2;

  const results: ParsedTransaction[] = [];
  
  // Start from row 1 to skip headers ideally, but we'll parse and skip invalid dates anyway
  rows.forEach((row, i) => {
    if (row.length < 3) return;
    
    const d = parseDateRobust(row[dateCol]);
    if (!d) return; // Skip rows without valid dates (e.g. headers)

    let amount = 0;
    let type: 'income' | 'expense' = 'expense';

    if (amountCol !== -1 && row[amountCol]) {
      amount = parseFloat(row[amountCol].replace(/[^0-9.-]+/g, ""));
      type = amount >= 0 ? 'income' : 'expense';
      amount = Math.abs(amount);
    } else if (debitCol !== -1 && row[debitCol] && row[debitCol].trim() !== '') {
      amount = parseFloat(row[debitCol].replace(/[^0-9.-]+/g, ""));
      type = 'expense';
      amount = Math.abs(amount);
    } else if (creditCol !== -1 && row[creditCol] && row[creditCol].trim() !== '') {
      amount = parseFloat(row[creditCol].replace(/[^0-9.-]+/g, ""));
      type = 'income';
      amount = Math.abs(amount);
    }

    if (isNaN(amount) || amount === 0) return;

    const desc = row[descCol] || 'Bank Transaction';
    const dateStr = d.toISOString().split('T')[0];

    // Some CSVs have a Reference/Check number column, but we'll generate a deterministic ID if not mapped
    const refId = generateDeterministicId(dateStr, amount, desc);

    results.push({
      date: dateStr,
      amount,
      type,
      description: desc,
      referenceId: refId
    });
  });

  return results;
};
