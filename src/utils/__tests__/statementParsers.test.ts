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
