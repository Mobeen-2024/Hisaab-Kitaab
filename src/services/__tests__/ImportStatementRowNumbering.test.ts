import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { db } from '../../db';
import { TransactionService } from '../TransactionService';

vi.mock('pdfjs-dist', () => ({ getDocument: vi.fn(), GlobalWorkerOptions: {} }));
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: 'mocked-worker-url' }));

describe('Import Statement Row Numbering', () => {
  beforeEach(async () => {
    db.close();
    await Dexie.delete('HisaibKItaibDB');
    db.isImporting = true;
    await db.open();
    await db.transactions.clear();
    db.isImporting = false;
  });

  it('reports the correct sourceRowIndex for failed rows', async () => {
    // Construct a SelectedData array directly as would come from the UI components
    const selectedData = [
      {
        date: '2026-07-17', amount: 500, type: 'income' as const, description: 'Shop sale', referenceId: 'ref1', sourceRowIndex: 1
      },
      {
        date: '2026-07-17', amount: 0, type: 'expense' as const, description: 'Bad row', referenceId: 'ref2', sourceRowIndex: 5
      }
    ];

    const transactionsToSave = selectedData.map(pt => ({
      amount: pt.amount,
      type: pt.type,
      categoryId: 0,
      context: 'business' as const,
      date: pt.date,
      description: pt.description,
      source: 'bank_import' as const,
      importReferenceId: pt.referenceId,
      paymentMethod: 'bank' as const
    }));

    const { failed } = await TransactionService.bulkImport(transactionsToSave);
    
    // Simulate what ImportStatementModal does
    const errors = failed.map((f, i) => {
      const pt = selectedData.find(d => d.referenceId === f.transaction.importReferenceId);
      return { index: pt?.sourceRowIndex !== undefined ? pt.sourceRowIndex : i, reason: f.reason };
    });

    expect(errors.length).toBe(1);
    expect(errors[0].index).toBe(5); // SuccessView will display Row 6
  });
});
