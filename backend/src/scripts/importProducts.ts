/**
 * One-time import script: reads the RAFT export Excel file and seeds the products table.
 *
 * Usage:
 *   npx ts-node src/scripts/importProducts.ts /path/to/EXPORT2025_RAFT_reduced.xlsx
 *
 * The script reads column P (Material) and column Q (Material Description),
 * extracts unique products, and upserts them into the products table.
 * Existing products are left unchanged (ON CONFLICT DO NOTHING).
 */

import * as XLSX from 'xlsx';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const MATERIAL_COL = 15;      // Column P (0-indexed)
const DESCRIPTION_COL = 16;   // Column Q (0-indexed)

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: npx ts-node src/scripts/importProducts.ts <path-to-xlsx>');
    process.exit(1);
  }

  console.log(`Reading ${filePath}...`);
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Extract unique products (skip header row)
  const products = new Map<string, string>();
  for (let i = 1; i < rows.length; i++) {
    const code = String(rows[i][MATERIAL_COL] || '').trim();
    const desc = String(rows[i][DESCRIPTION_COL] || '').trim();
    if (code && desc && !products.has(code)) {
      products.set(code, desc);
    }
  }

  console.log(`Found ${products.size} unique products`);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Batch insert in chunks of 100
  const entries = Array.from(products.entries());
  let inserted = 0;

  for (let i = 0; i < entries.length; i += 100) {
    const chunk = entries.slice(i, i + 100);
    const values: string[] = [];
    const params: string[] = [];

    chunk.forEach(([code, desc], idx) => {
      const base = idx * 2;
      params.push(code, desc);
      values.push(`($${base + 1}, $${base + 2})`);
    });

    const result = await pool.query(
      `INSERT INTO products (sap_code, description) VALUES ${values.join(', ')}
       ON CONFLICT (sap_code) DO NOTHING`,
      params
    );

    inserted += result.rowCount ?? 0;
  }

  console.log(`Imported ${inserted} new products (${products.size - inserted} already existed)`);

  await pool.end();
}

main().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
