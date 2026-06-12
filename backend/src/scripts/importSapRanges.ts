/**
 * One-off importer: reads the "Range" sheet from `Codes & Configurations.xlsx`
 * and upserts rows into the sap_ranges lookup table.
 *
 * Usage:
 *   npx tsx backend/src/scripts/importSapRanges.ts <path-to-xlsx>
 *
 * Idempotent: re-running just upserts. Safe to run on top of an existing table.
 */
import dotenv from 'dotenv';
dotenv.config();
import { Pool } from 'pg';
import * as XLSX from 'xlsx';

interface RangeRow {
  'PRICE GROUP'?: string;
  'RANGE'?: string;
  'SAP CODE'?: string;
  'GENERIC NAME'?: string;
}

async function main(): Promise<void> {
  const xlsxPath = process.argv[2];
  if (!xlsxPath) {
    console.error('Usage: npx tsx backend/src/scripts/importSapRanges.ts <path-to-xlsx>');
    process.exit(1);
  }
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const wb = XLSX.readFile(xlsxPath);
  const sheet = wb.Sheets['Range'];
  if (!sheet) {
    console.error('Sheet "Range" not found. Available sheets:', wb.SheetNames);
    process.exit(1);
  }

  const rows = XLSX.utils.sheet_to_json<RangeRow>(sheet, { defval: '' });
  console.log(`Read ${rows.length} rows from sheet "Range"`);

  const pool = new Pool({ connectionString: dbUrl });
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  try {
    for (const r of rows) {
      const code = String(r['SAP CODE'] || '').trim();
      const rangeName = String(r['RANGE'] || '').trim();
      const genericName = String(r['GENERIC NAME'] || '').trim();
      const priceGroup = String(r['PRICE GROUP'] || '').trim();

      if (!code || !rangeName) { skipped++; continue; }
      if (code.length > 8) { skipped++; continue; }

      const result = await pool.query(
        `INSERT INTO sap_ranges (code, range_name, generic_name, price_group)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (code) DO UPDATE SET
           range_name = EXCLUDED.range_name,
           generic_name = EXCLUDED.generic_name,
           price_group = EXCLUDED.price_group
         RETURNING (xmax = 0) AS inserted`,
        [code, rangeName, genericName, priceGroup]
      );
      if (result.rows[0].inserted) inserted++; else updated++;
    }

    console.log(`Import complete: ${inserted} inserted, ${updated} updated, ${skipped} skipped`);
    const total = await pool.query('SELECT COUNT(*) FROM sap_ranges');
    console.log(`sap_ranges now contains ${total.rows[0].count} rows`);
  } catch (e) {
    console.error('Import failed:', e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
