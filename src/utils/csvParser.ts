import Papa from 'papaparse';

export interface CSVParseResult {
  data: string[][];
  errors: any[];
}

export function parseCSVFile(file: File): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      skipEmptyLines: 'greedy',
      complete: (results) => {
        resolve(results.data);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

export function parseCSVText(text: string): string[][] {
  const result = Papa.parse<string[]>(text, {
    skipEmptyLines: 'greedy'
  });
  return result.data;
}
