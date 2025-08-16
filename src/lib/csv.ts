import Papa from 'papaparse';

export type SimpleRow = { address: string; label?: string };

export async function parseSimpleCSV(text: string): Promise<SimpleRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<SimpleRow>(text, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => resolve(res.data),
      error: (err) => reject(err),
    });
  });
}
