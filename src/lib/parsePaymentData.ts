export interface ParsedPayment {
  amount: number;
  type: 'income' | 'expense';
  description: string;
  date: string; // ISO date string (YYYY-MM-DD)
  paymentMethod?: 'cash' | 'bank' | 'mobile_wallet';
  suggestedCategory?: string;
  referenceId?: string;
}

function tryParseDate(text: string): string {
  const today = new Date().toISOString().split('T')[0];

  // DD-MM-YYYY or DD/MM/YYYY
  const dmy = text.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // YYYY-MM-DD (ISO)
  const iso = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];

  // Month name: "01 May 2026", "May 01, 2026"
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const named = text.match(/(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})/i);
  if (named) {
    const [, d, m, y] = named;
    return `${y}-${months[m.toLowerCase()]}-${d.padStart(2, '0')}`;
  }
  const named2 = text.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i);
  if (named2) {
    const [, m, d, y] = named2;
    return `${y}-${months[m.toLowerCase()]}-${d.padStart(2, '0')}`;
  }

  return today;
}

function tryParseAmount(text: string): number | null {
  // Rs. 1,500.00 / PKR 1500 / Amount: 500 / Rs1500
  const patterns = [
    /(?:PKR|Rs\.?|Amount[:\s]*)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:debit|credit|paid|sent|received)[^\d]*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]{3,}(?:\.\d{1,2})?)\s*(?:PKR|Rs\.?)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const val = parseFloat(m[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) return val;
    }
  }
  return null;
}

function detectType(text: string): 'income' | 'expense' {
  const lower = text.toLowerCase();
  const incomeWords = ['received', 'credited', 'deposited', 'salary', 'refund', 'cashback', 'received from', 'transfer received'];
  const expenseWords = ['paid', 'debit', 'debited', 'sent', 'withdrawn', 'payment', 'transfer to', 'bill paid', 'purchase'];
  let incomeScore = 0, expenseScore = 0;
  for (const w of incomeWords) if (lower.includes(w)) incomeScore++;
  for (const w of expenseWords) if (lower.includes(w)) expenseScore++;
  return incomeScore > expenseScore ? 'income' : 'expense';
}

function detectPaymentMethod(text: string): 'cash' | 'bank' | 'mobile_wallet' {
  const lower = text.toLowerCase();
  if (lower.includes('easypaisa') || lower.includes('jazzcash') || lower.includes('nayapay') || lower.includes('sadapay')) return 'mobile_wallet';
  if (lower.includes('bank') || lower.includes('atm') || lower.includes('ibft') || lower.includes('neft') || lower.includes('rtgs')) return 'bank';
  return 'cash';
}

function detectCategory(text: string, type: 'income' | 'expense'): string {
  const lower = text.toLowerCase();
  if (type === 'income') {
    if (lower.includes('salary') || lower.includes('wages')) return 'Salary';
    if (lower.includes('rent')) return 'Rent Income';
    return 'Income';
  }
  if (lower.includes('petrol') || lower.includes('fuel') || lower.includes('cng')) return 'Transport';
  if (lower.includes('food') || lower.includes('restaurant') || lower.includes('grocery') || lower.includes('mart') || lower.includes('sabzi')) return 'Groceries';
  if (lower.includes('bijli') || lower.includes('electric') || lower.includes('wapda') || lower.includes('sui') || lower.includes('gas') || lower.includes('utility')) return 'Utility Bills (Bijli/Sui Gas)';
  if (lower.includes('doctor') || lower.includes('hospital') || lower.includes('medicine') || lower.includes('pharmacy')) return 'Health';
  if (lower.includes('school') || lower.includes('fee') || lower.includes('tuition') || lower.includes('college')) return 'Education';
  if (lower.includes('transport') || lower.includes('uber') || lower.includes('careem') || lower.includes('bus')) return 'Transport';
  return 'expense';
}

function buildDescription(text: string): string {
  // Try to extract the most meaningful short phrase
  // Look for a "to <name>" or "from <name>" pattern
  const toMatch = text.match(/(?:to|from)\s+([A-Za-z\s]{3,30})/i);
  if (toMatch) return toMatch[0].slice(0, 60).trim();

  // Use the first meaningful line
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5 && !/^[\d\s]+$/.test(l));
  if (lines.length > 0) return lines[0].slice(0, 60);

  return text.slice(0, 60) + (text.length > 60 ? '...' : '');
}

/**
 * Parses a string (from OCR, QR, or SMS) into a structured ParsedPayment.
 * Works 100% offline — no API calls.
 */
export function parsePaymentData(text: string): ParsedPayment | null {
  if (!text || text.trim().length < 3) return null;

  // 1. UPI Deep Link
  if (text.startsWith('upi://')) {
    try {
      const url = new URL(text);
      const p = url.searchParams;
      const amount = parseFloat(p.get('am') || '0');
      const note = p.get('tn') || p.get('pn') || 'UPI Payment';
      return { amount, type: 'expense', description: note, date: new Date().toISOString().split('T')[0], paymentMethod: 'bank', referenceId: text };
    } catch { /* fall through */ }
  }

  // 2. Generic text / OCR result
  const amount = tryParseAmount(text);
  if (amount !== null && amount > 0) {
    const type = detectType(text);
    const date = tryParseDate(text);
    const paymentMethod = detectPaymentMethod(text);
    const suggestedCategory = detectCategory(text, type);
    const description = buildDescription(text);

    return { amount, type, description, date, paymentMethod, suggestedCategory, referenceId: text.slice(0, 100) };
  }

  // 3. Plain number only
  const plainNum = text.trim().match(/^[\d,]+(\.\d+)?$/);
  if (plainNum) {
    const amount = parseFloat(text.replace(/,/g, ''));
    return { amount, type: 'expense', description: 'Scanned Amount', date: new Date().toISOString().split('T')[0], referenceId: text };
  }

  return null;
}
