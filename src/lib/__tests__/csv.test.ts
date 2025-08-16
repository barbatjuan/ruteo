import { describe, it, expect } from 'vitest';
import { parseSimpleCSV } from '../csv';

describe('parseSimpleCSV', () => {
  it('parses CSV with header', async () => {
    const csv = 'address,label\nCalle 1,A\nCalle 2,B';
    const rows = await parseSimpleCSV(csv);
    expect(rows.length).toBe(2);
    expect(rows[0].address).toBe('Calle 1');
  });
});
