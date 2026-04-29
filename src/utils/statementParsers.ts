import { Transaction } from '../db';

export interface ParsedTransaction {
  date: string;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  referenceId: string;
}

/**
 * Basic CSV parser if PapaParse is not available
 */
function simpleCSVParse(text: string): string[][] {
  return text.split('\n').map(line => line.split(',').map(cell => cell.trim()));
}

export const parseJazzCashCSV = (csvText: string): ParsedTransaction[] => {
  const rows = simpleCSVParse(csvText);
  return rows.slice(1)
    .filter(row => row.length >= 4 && row[0] && row[1])
    .map(row => {
      try {
        const d = new Date(row[0]);
        if (isNaN(d.getTime())) return null;
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
    .filter(row => row.length >= 5 && row[0] && row[1])
    .map(row => {
      try {
        const d = new Date(row[0]);
        if (isNaN(d.getTime())) return null;
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
  return rows.slice(1)
    .filter(row => row.length >= 3 && row[0])
    .map(row => {
      try {
        const d = new Date(row[0]);
        if (isNaN(d.getTime())) return null;
        const amount = parseFloat(row[2].replace(/[^0-9.-]+/g, "")) || 0;
        return {
          date: d.toISOString().split('T')[0],
          amount: Math.abs(amount),
          type: amount >= 0 ? 'income' : 'expense' as const,
          description: `Import: ${row[1] || 'Transaction'}`,
          referenceId: `import-${Date.now()}-${Math.random()}`
        };
      } catch (e) { return null; }
    })
    .filter((t): t is ParsedTransaction => t !== null);
};
