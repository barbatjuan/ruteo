import Papa from 'papaparse';

export type SimpleRow = { address: string; label?: string };

export async function parseSimpleCSV(text: string): Promise<SimpleRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<SimpleRow>(text, {
      header: true,
      skipEmptyLines: true,
      complete: (res: Papa.ParseResult<SimpleRow>) => resolve(res.data),
      error: (err: unknown) => reject(err),
    });
  });
}
