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
  sourceRowIndex?: number;
  originalDescription?: string;
  originalDate?: string;
  originalAmount?: number;
  originalType?: 'income' | 'expense';
  fileFingerprint?: string;
  confidence?: 'High' | 'Medium' | 'Low';
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

// Deterministic ID for duplicate prevention
// Replaces 32-bit hash with a collision-resistant composite string
export function generateDeterministicId(date: string, amount: number, desc: string, index?: number | string, fileFingerprint?: string, platform?: string): string {
  const cleanDesc = desc.trim().toLowerCase();
  const shortDesc = cleanDesc.replace(/[^a-z0-9\s]/g, '').substring(0, 40).trim().replace(/\s+/g, '-');
  const indexPart = index !== undefined ? `:${index}` : '';
  const fpPart = fileFingerprint ? `:${fileFingerprint}` : '';
  const platPart = platform ? `:${platform}` : '';
  return `import-v3${platPart}${fpPart}:${date}:${amount}:${shortDesc}${indexPart}`;
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
export function parseDateRobust(dateStr: string): Date | null {
  if (!dateStr) return null;
  const cleanStr = dateStr.trim();
  
  // Explicitly prefer DD-MM-YYYY (Pakistani format) before generic Date parsing
  const parts = cleanStr.split(/[-/.\s]+/);
  if (parts.length >= 3) {
    const num0 = parseInt(parts[0], 10);
    const num1 = parseInt(parts[1], 10);
    const num2 = parseInt(parts[2].substring(0, 4), 10); // Handle potential time appended
    
    if (num2 > 1900 && num0 >= 1 && num0 <= 31 && num1 >= 1 && num1 <= 12) {
      // Assume DD-MM-YYYY, use UTC to avoid timezone shift on toISOString()
      const d2 = new Date(Date.UTC(num2, num1 - 1, num0));
      if (!isNaN(d2.getTime())) return d2;
    }
  }

  const d = new Date(cleanStr);
  if (!isNaN(d.getTime())) {
     // If created from generic string, ensure we adjust to UTC if it created a local midnight
     const utcDate = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
     return utcDate;
  }
  
  return null;
}

export const parseJazzCashCSV = (csvText: string, fileFingerprint?: string): ParsedTransaction[] => {
  const rows = simpleCSVParse(csvText);
  return rows.slice(1)
    .filter(row => row.length >= 4 && row[0])
    .map((row, i) => {
      try {
        const d = parseDateRobust(row[0]);
        if (!d) return null;
        const amount = parseFloat(row[3].replace(/[^0-9.-]+/g, "")) || 0;
        const typeStr = amount >= 0 ? 'income' : 'expense';
        const absAmount = Math.abs(amount);
        const desc = row[2] || 'Transaction';
        const dateStr = d.toISOString().split('T')[0];
        return {
          date: dateStr,
          amount: absAmount,
          type: typeStr as 'income' | 'expense',
          description: `JazzCash: ${desc}`,
          referenceId: row[1] || generateDeterministicId(dateStr, absAmount, desc, i, fileFingerprint, 'jazzcash'),
          sourceRowIndex: i,
          originalDate: row[0],
          originalAmount: amount,
          originalType: typeStr as 'income' | 'expense',
          originalDescription: desc,
          fileFingerprint,
          confidence: 'High'
        } as ParsedTransaction;
      } catch (e) { return null; }
    })
    .filter((t): t is ParsedTransaction => t !== null);
};

export const parseEasypaisaCSV = (csvText: string, fileFingerprint?: string): ParsedTransaction[] => {
  const rows = simpleCSVParse(csvText);
  return rows.slice(1)
    .filter(row => row.length >= 5 && row[0])
    .map((row, i) => {
      try {
        const d = parseDateRobust(row[0]);
        if (!d) return null;
        const amount = parseFloat(row[4].replace(/[^0-9.-]+/g, "")) || 0;
        const typeStr = (row[2] || '').toLowerCase();
        const finalType = (typeStr.includes('cash in') || typeStr.includes('receive') || amount > 0) ? 'income' : 'expense';
        const absAmount = Math.abs(amount);
        const desc = row[3] || 'Transaction';
        const dateStr = d.toISOString().split('T')[0];
        return {
          date: dateStr,
          amount: absAmount,
          type: finalType as 'income' | 'expense',
          description: `Easypaisa: ${desc}`,
          referenceId: row[1] || generateDeterministicId(dateStr, absAmount, desc, i, fileFingerprint, 'easypaisa'),
          sourceRowIndex: i,
          originalDate: row[0],
          originalAmount: amount,
          originalType: finalType as 'income' | 'expense',
          originalDescription: desc,
          fileFingerprint,
          confidence: 'High'
        } as ParsedTransaction;
      } catch (e) { return null; }
    })
    .filter((t): t is ParsedTransaction => t !== null);
};

export const parseSadapayCSV = (csvText: string, fileFingerprint?: string): ParsedTransaction[] => {
  const rows = simpleCSVParse(csvText);
  return rows.slice(1)
    .filter(row => row.length >= 3 && row[0])
    .map((row, i) => {
      try {
        const d = parseDateRobust(row[0]);
        if (!d) return null;
        
        const desc = row[1] || 'Sadapay Transaction';
        const rawAmount = parseFloat(row[2].replace(/[^0-9.-]+/g, "")) || 0;
        
        let typeStr: 'income' | 'expense' = rawAmount >= 0 ? 'income' : 'expense';
        const rawTypeStr = (row[1] || '').toLowerCase();
        if (rawTypeStr.includes('send') || rawTypeStr.includes('spend') || rawTypeStr.includes('paid')) typeStr = 'expense';
        else if (rawTypeStr.includes('load') || rawTypeStr.includes('receive') || rawTypeStr.includes('add')) typeStr = 'income';
        
        if (row.length > 3 && row[3] && row[3].toLowerCase().includes('in')) typeStr = 'income';
        const absAmount = Math.abs(rawAmount);
        
        const dateStr = d.toISOString().split('T')[0];
        return {
          date: dateStr,
          amount: absAmount,
          type: typeStr,
          description: `Sadapay: ${desc}`,
          referenceId: generateDeterministicId(dateStr, absAmount, desc, i, fileFingerprint, 'sadapay'),
          sourceRowIndex: i,
          originalDate: row[0],
          originalAmount: rawAmount,
          originalType: typeStr,
          originalDescription: desc,
          fileFingerprint,
          confidence: 'High'
        } as ParsedTransaction;
      } catch (e) { return null; }
    })
    .filter((t): t is ParsedTransaction => t !== null);
};

export const parseNayapayCSV = (csvText: string, fileFingerprint?: string): ParsedTransaction[] => {
  const rows = simpleCSVParse(csvText);
  return rows.slice(1)
    .filter(row => row.length >= 3 && row[0])
    .map((row, i) => {
      try {
        const d = parseDateRobust(row[0]);
        if (!d) return null;
        
        const desc = row[1] || 'Nayapay Transaction';
        const rawAmount = parseFloat(row[2].replace(/[^0-9.-]+/g, "")) || 0;
        
        let typeStr: 'income' | 'expense' = rawAmount >= 0 ? 'income' : 'expense';
        const rawTypeStr = (row[1] || '').toLowerCase();
        if (rawTypeStr.includes('debit') || rawTypeStr.includes('dr')) typeStr = 'expense';
        else if (rawTypeStr.includes('credit') || rawTypeStr.includes('cr')) typeStr = 'income';
        const absAmount = Math.abs(rawAmount);
        
        const dateStr = d.toISOString().split('T')[0];
        return {
          date: dateStr,
          amount: absAmount,
          type: typeStr,
          description: `Nayapay: ${desc}`,
          referenceId: generateDeterministicId(dateStr, absAmount, desc, i, fileFingerprint, 'nayapay'),
          sourceRowIndex: i,
          originalDate: row[0],
          originalAmount: rawAmount,
          originalType: typeStr,
          originalDescription: desc,
          fileFingerprint,
          confidence: 'High'
        } as ParsedTransaction;
      } catch (e) { return null; }
    })
    .filter((t): t is ParsedTransaction => t !== null);
};

export const parseGenericCSV = (csvText: string, fileFingerprint?: string): ParsedTransaction[] => {
  const rows = simpleCSVParse(csvText);
  if (rows.length === 0) return [];

  // Try to auto-detect columns from the first 5 rows
  let dateCol = -1;
  let descCol = -1;
  let amountCol = -1;
  let debitCol = -1;
  let creditCol = -1;
  let typeCol = -1;
  let headerRowIndex = -1;

  // Scan headers
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i];
    row.forEach((cell, index) => {
      const lower = cell.toLowerCase().trim();
      if (lower === 'date' || lower === 'transaction date' || lower === 'txn date') dateCol = index;
      else if (lower === 'description' || lower === 'details' || lower === 'narration' || lower === 'merchant' || lower === 'particulars') descCol = index;
      else if (lower === 'amount') amountCol = index;
      else if (lower === 'debit' || lower === 'withdraw' || lower === 'withdrawal' || lower === 'paid out' || lower === 'dr') debitCol = index;
      else if (lower === 'credit' || lower === 'deposit' || lower === 'received' || lower === 'paid in' || lower === 'cr') creditCol = index;
      else if (lower === 'type') typeCol = index;
    });
    if (dateCol !== -1 && descCol !== -1 && (amountCol !== -1 || (debitCol !== -1 && creditCol !== -1))) {
      headerRowIndex = i;
      break; // Found headers
    }
  }

  const hasGoodHeaders = headerRowIndex !== -1;
  const confidence = hasGoodHeaders ? 'Medium' : 'Low';

  // Fallback if headers not found
  if (dateCol === -1) dateCol = 0;
  if (descCol === -1) descCol = 1;
  if (amountCol === -1 && debitCol === -1) amountCol = 2;

  const results: ParsedTransaction[] = [];
  
  // Start from row 1 to skip headers ideally, but we'll parse and skip invalid dates anyway
  rows.forEach((row, i) => {
    if (row.length < 3) return;
    if (i === headerRowIndex) return; // skip header row if we identified it
    
    const d = parseDateRobust(row[dateCol]);
    if (!d) return; // Skip rows without valid dates (e.g. headers)

    let amount = 0;
    let type: 'income' | 'expense' = 'expense';

    if (amountCol !== -1 && row[amountCol]) {
      amount = parseFloat(row[amountCol].replace(/[^0-9.-]+/g, ""));
      type = amount >= 0 ? 'income' : 'expense';
      amount = Math.abs(amount);
      if (typeCol !== -1 && row[typeCol]) {
         const typeStr = row[typeCol].toLowerCase();
         if (typeStr.includes('inc') || typeStr.includes('cr') || typeStr.includes('deposit') || typeStr.includes('credit')) {
             type = 'income';
         } else if (typeStr.includes('exp') || typeStr.includes('dr') || typeStr.includes('withdraw') || typeStr.includes('debit')) {
             type = 'expense';
         }
      }
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
    const refId = generateDeterministicId(dateStr, amount, desc, i, fileFingerprint, 'generic_csv');

    results.push({
      date: dateStr,
      amount,
      type,
      description: desc,
      referenceId: refId,
      sourceRowIndex: i,
      originalDate: row[dateCol],
      originalAmount: amount,
      originalType: type,
      originalDescription: desc,
      fileFingerprint,
      confidence
    });
  });

  return results;
};
