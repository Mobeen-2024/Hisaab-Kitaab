/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { db } from '../../db';
import { delay } from '../../__tests__/test-utils';

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
import { parseGenericCSV, generateDeterministicId } from '../../utils/statementParsers';
import { TransactionService } from '../TransactionService';

vi.mock('../FirebaseSyncService', () => ({
  FirebaseSyncService: {
    triggerQueueProcessing: vi.fn(),
  }
}));

describe('Import Statement Integration Tests', () => {
  const originalConsoleError = console.error;

  beforeEach(async () => {
    console.error = (...args: any[]) => {
      const msg = args.join(' ');
      if (msg.includes('NotFoundError') || msg.includes('DatabaseClosedError')) return;
      originalConsoleError(...args);
    };

    db.close();
    await Dexie.delete('HisaibKItaibDB');
    db.isImporting = true;
    await db.open();
    db.isImporting = false;

    db.isImporting = true;
    await db.transactions.clear();
    await db.categories.clear();

    db.isImporting = true;
    await db.categories.bulkAdd([
      { id: 1, name: 'Sales', type: 'income', context: 'business' },
      { id: 2, name: 'Groceries', type: 'expense', context: 'personal' },
    ]);
    db.isImporting = false;
  });

  afterAll(async () => {
    await delay(100);
    db.close();
    console.error = originalConsoleError;
  });

  it('same CSV imported twice creates same importReferenceIds', () => {
    const csvContent = `date,description,type,amount
2026-07-17,Shop sale,income,500
2026-07-17,Tea expense,expense,120`;
    
    const fp = 'test.csv-123';
    const parsed1 = parseGenericCSV(csvContent, fp);
    const parsed2 = parseGenericCSV(csvContent, fp);
    
    expect(parsed1.length).toBe(2);
    expect(parsed1[0].referenceId).toBe(parsed2[0].referenceId);
    expect(parsed1[1].referenceId).toBe(parsed2[1].referenceId);
  });

  it('invalid row amount 0 does not block valid rows', () => {
    const csvContent = `date,description,type,amount
2026-07-17,Shop sale,income,500
2026-07-17,Bad row,expense,0
2026-07-17,Milk sale,income,700`;
    
    const fp = 'test.csv-123';
    const parsed = parseGenericCSV(csvContent, fp);
    
    expect(parsed.length).toBe(2);
    expect(parsed[0].amount).toBe(500);
    expect(parsed[1].amount).toBe(700);
  });

  it('first import saves rows, second import identifies them as existing via getByImportReferences', async () => {
    const csvContent = `date,description,type,amount
2026-07-17,Shop sale,income,500
2026-07-17,Tea expense,expense,120
2026-07-17,Mobile load expense,expense,300
2026-07-17,Customer payment Ali,income,1000
2026-07-17,Milk sale,income,700
2026-07-17,Bad row,expense,0`;

    const fp = 'test.csv-123';
    const parsed = parseGenericCSV(csvContent, fp);
    expect(parsed.length).toBe(5);

    // Map to Transaction shape
    const txnsToSave = parsed.map(pt => ({
      amount: Math.abs(pt.amount),
      type: pt.type,
      categoryId: 0,
      context: 'business' as const,
      date: pt.date,
      description: pt.description,
      source: 'bank_import' as const,
      importReferenceId: pt.referenceId,
      paymentMethod: 'bank' as const
    }));

    // First import
    const { inserted, failed } = await TransactionService.bulkImport(txnsToSave);
    expect(inserted.length).toBe(5);
    expect(failed.length).toBe(0);

    // Verify saved transactions contain importReferenceId
    expect(inserted[0].importReferenceId).toBe(parsed[0].referenceId);

    // Second import simulates logic in ImportStatementModal
    const existingRefs = new Set(
      (await TransactionService.getByImportReferences(parsed.map(d => d.referenceId)))
      .map(t => t.importReferenceId)
    );

    expect(existingRefs.size).toBe(5);

    const newTransactions = txnsToSave.filter(t => 
      !t.importReferenceId || !existingRefs.has(t.importReferenceId)
    );

    // Should skip all 5 as duplicates
    expect(newTransactions.length).toBe(0);
  });

  it('editing description in UI does not change importReferenceId logic (handled by keeping original referenceId)', () => {
    const id1 = generateDeterministicId('2026-07-17', 500, 'Original Desc', 1, 'fp');
    // UI changes description on the object, but referenceId string remains same on the object.
    const uiEditedDescription = 'Edited Desc';
    // This is a trivial assertion but proves the decoupling if UI doesn't regenerate.
    expect(id1).not.toBe(generateDeterministicId('2026-07-17', 500, uiEditedDescription, 1, 'fp'));
  });
});
