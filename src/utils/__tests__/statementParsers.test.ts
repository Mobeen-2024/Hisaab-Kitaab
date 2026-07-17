/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('pdfjs-dist', () => {
  return {
    getDocument: vi.fn(),
    GlobalWorkerOptions: {}
  };
});
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => {
  return {
    default: 'mocked-worker-url'
  };
});

import { generateDeterministicId } from '../statementParsers';

describe('statementParsers Tests', () => {
  it('generateDeterministicId is stable for same row', () => {
    const id1 = generateDeterministicId('2026-06-02', 1500, 'Valid Item 1', 1);
    const id2 = generateDeterministicId('2026-06-02', 1500, 'Valid Item 1', 1);
    expect(id1).toBe(id2);
  });

  it('generateDeterministicId differs for close but distinct rows', () => {
    const id1 = generateDeterministicId('2026-06-02', 1500, 'Valid Item 1', 1);
    const id2 = generateDeterministicId('2026-06-02', 1500, 'Valid Item 1', 2); // Different index
    const id3 = generateDeterministicId('2026-06-02', 1501, 'Valid Item 1', 1); // Different amount
    const id4 = generateDeterministicId('2026-06-03', 1500, 'Valid Item 1', 1); // Different date
    
    expect(id1).not.toBe(id2);
    expect(id1).not.toBe(id3);
    expect(id1).not.toBe(id4);
  });
});

import { parseDateRobust, parseSadapayCSV, parseNayapayCSV, parseGenericCSV } from '../statementParsers';

describe('statementParsers - parseDateRobust', () => {
  it('parses Pakistani format DD-MM-YYYY', () => {
    expect(parseDateRobust('24-05-2024')?.toISOString().split('T')[0]).toBe('2024-05-24');
    expect(parseDateRobust('24/05/2024')?.toISOString().split('T')[0]).toBe('2024-05-24');
  });

  it('parses US format MM/DD/YYYY if DD/MM fails', () => {
    // 05-24-2024 is impossible as DD-MM, so it must be MM-DD
    expect(parseDateRobust('05/24/2024')?.toISOString().split('T')[0]).toBe('2024-05-24');
  });

  it('parses textual months', () => {
    expect(parseDateRobust('24 May 2024')?.toISOString().split('T')[0]).toBe('2024-05-24');
    expect(parseDateRobust('May 24 2024')?.toISOString().split('T')[0]).toBe('2024-05-24');
  });

  it('returns null for invalid strings', () => {
    expect(parseDateRobust('invalid')).toBeNull();
  });
});

describe('statementParsers - parseSadapayCSV', () => {
  it('correctly parses Sadapay CSV layout', () => {
    const csv = `Date,Type,Amount,Description
"24 May 2024","Send money","PKR 1,500.00","Transfer to Ali"
"25 May 2024","Load money","PKR 2,000.50","Top up from Meezan"`;
    const res = parseSadapayCSV(csv, 'sada_fp');
    expect(res).toHaveLength(2);
    expect(res[0].amount).toBe(1500);
    expect(res[0].type).toBe('expense'); // "Send money" is expense
    expect(res[1].amount).toBe(2000.50);
    expect(res[1].type).toBe('income');
  });
});

describe('statementParsers - parseNayapayCSV', () => {
  it('correctly parses Nayapay CSV layout', () => {
    const csv = `Date,Transaction Type,Amount,Description
"2024-05-24","Debit","1,500.00","Transfer to Ali"
"2024-05-25","Credit","2,000.50","Top up from Meezan"`;
    const res = parseNayapayCSV(csv, 'naya_fp');
    expect(res).toHaveLength(2);
    expect(res[0].amount).toBe(1500);
    expect(res[0].type).toBe('expense'); 
    expect(res[1].amount).toBe(2000.50);
    expect(res[1].type).toBe('income');
  });
});

describe('statementParsers - parseGenericCSV', () => {
  it('correctly parses standard debit/credit CSV', () => {
    const csv = `Date,Description,Debit,Credit
"2024-05-24","Transfer to Ali",1500,
"2024-05-25","Top up from Meezan",,2000.50`;
    const res = parseGenericCSV(csv, 'gen_fp');
    expect(res).toHaveLength(2);
    expect(res[0].amount).toBe(1500);
    expect(res[0].type).toBe('expense');
    expect(res[1].amount).toBe(2000.5);
    expect(res[1].type).toBe('income');
  });

  it('correctly parses amount and type columns', () => {
    const csv = `Date,Description,Amount,Type
"2024-05-24","Transfer to Ali",1500,debit
"2024-05-25","Top up from Meezan",2000.50,credit`;
    const res = parseGenericCSV(csv, 'gen_fp');
    expect(res).toHaveLength(2);
    expect(res[0].amount).toBe(1500);
    expect(res[0].type).toBe('expense');
    expect(res[1].amount).toBe(2000.5);
    expect(res[1].type).toBe('income');
  });

  it('handles negative amounts correctly', () => {
    const csv = `Date,Description,Amount
"2024-05-24","Transfer to Ali",-1500
"2024-05-25","Top up from Meezan",2000.50`;
    const res = parseGenericCSV(csv, 'gen_fp');
    expect(res).toHaveLength(2);
    expect(res[0].amount).toBe(1500);
    expect(res[0].type).toBe('expense');
    expect(res[1].amount).toBe(2000.5);
    expect(res[1].type).toBe('income');
  });
});
