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
  const pool = new Pool({ connectionString: dbUrl });

  try {
    // 1. Range sheet → sap_ranges (door range / colour codes)
    const rangeSheet = wb.Sheets['Range'];
    if (!rangeSheet) {
      console.error('Sheet "Range" not found. Available sheets:', wb.SheetNames);
      process.exit(1);
    }
    const rows = XLSX.utils.sheet_to_json<RangeRow>(rangeSheet, { defval: '' });
    console.log(`Read ${rows.length} rows from "Range"`);

    let inserted = 0, updated = 0, skipped = 0;
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
         ON CONFLICT (code) DO UPDATE SET range_name=EXCLUDED.range_name, generic_name=EXCLUDED.generic_name, price_group=EXCLUDED.price_group
         RETURNING (xmax = 0) AS inserted`,
        [code, rangeName, genericName, priceGroup]
      );
      if (result.rows[0].inserted) inserted++; else updated++;
    }
    console.log(`sap_ranges: ${inserted} inserted, ${updated} updated, ${skipped} skipped`);

    // 2. Lists sheet → sap_carcase_colours (3-char suffixes like MCS = Cashmere)
    const listsSheet = wb.Sheets['Lists'];
    if (listsSheet) {
      const listsRows = XLSX.utils.sheet_to_json<unknown[]>(listsSheet, { defval: '', header: 1 });
      const seen = new Set<string>();
      let cInserted = 0, cUpdated = 0;
      for (const row of listsRows) {
        const r = row as unknown[];
        const carcase = String(r[7] || '').trim();
        const shortCode = String(r[8] || '').trim();
        const esp = String(r[9] || '').trim();
        if (carcase && esp.startsWith('ESP') && esp.length > 3) {
          const suffix = esp.slice(3);
          if (!seen.has(suffix)) {
            seen.add(suffix);
            const result = await pool.query(
              `INSERT INTO sap_carcase_colours (suffix, colour_name, short_code)
               VALUES ($1, $2, $3)
               ON CONFLICT (suffix) DO UPDATE SET colour_name=EXCLUDED.colour_name, short_code=EXCLUDED.short_code
               RETURNING (xmax = 0) AS inserted`,
              [suffix, carcase, shortCode || null]
            );
            if (result.rows[0].inserted) cInserted++; else cUpdated++;
          }
        }
      }
      console.log(`sap_carcase_colours: ${cInserted} inserted, ${cUpdated} updated`);
    }

    const total1 = await pool.query('SELECT COUNT(*) FROM sap_ranges');
    const total2 = await pool.query('SELECT COUNT(*) FROM sap_carcase_colours');
    console.log(`\nTotals: sap_ranges=${total1.rows[0].count}, sap_carcase_colours=${total2.rows[0].count}`);
  } catch (e) {
    console.error('Import failed:', e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
