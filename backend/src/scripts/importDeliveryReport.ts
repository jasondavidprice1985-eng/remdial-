/**
 * Daily importer: reads a Delivery Report .xlsx and incrementally appends
 * its line items to sap_orders. Idempotent — re-running with the same file
 * is a no-op because the unique key (sales_doc, sap_code, po_number) is
 * deduplicated via ON CONFLICT DO NOTHING.
 *
 * Usage:
 *   npx tsx backend/src/scripts/importDeliveryReport.ts <path-to-xlsx>
 *
 * Each row of the report becomes one sap_orders row. We parse "Name 1" into
 * developer + site, extract the first whitespace token of "Purchase order no."
 * as plot_extracted (for ZCD/ZCA/ZCR only — ZCC POs are inconsistent), and
 * convert Excel serial dates to JS dates.
 */
import dotenv from 'dotenv';
dotenv.config();
import { Pool } from 'pg';
import * as XLSX from 'xlsx';

interface DeliveryRow {
  SaTy?: string;
  'Sales doc.'?: string | number;
  'Created on'?: number | string;
  'Sold-to pt'?: string | number;
  'Purchase order no.'?: string;
  'Req.dlv.dt'?: number | string;
  'Name 1'?: string;
  Material?: string;
  Description?: string;
  'Order Quantity'?: number | string;
  User?: string;
}

function excelSerialToDate(serial: unknown): Date | null {
  if (typeof serial !== 'number' || serial < 1) return null;
  const ms = (serial - 25569) * 86400000;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseDeveloperSite(name1: string): { developer: string | null; site: string | null } {
  if (!name1) return { developer: null, site: null };
  // "Pye Homes - Woodstock - Phases 4 &"  →  developer="Pye Homes", site="Woodstock"
  const parts = name1.split(/\s+-\s+/).map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return { developer: null, site: null };
  if (parts.length === 1) return { developer: parts[0], site: null };
  return { developer: parts[0], site: parts[1] };
}

function extractPlot(po: string, salesType: string): string | null {
  if (!po) return null;
  if (salesType === 'ZCC') return null; // POs in this category are inconsistent
  const first = po.trim().split(/\s+/)[0];
  if (!first) return null;
  return first.toUpperCase().slice(0, 50);
}

async function main(): Promise<void> {
  const xlsxPath = process.argv[2];
  if (!xlsxPath) {
    console.error('Usage: npx tsx backend/src/scripts/importDeliveryReport.ts <path-to-xlsx>');
    process.exit(1);
  }
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const wb = XLSX.readFile(xlsxPath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) {
    console.error('Workbook is empty');
    process.exit(1);
  }
  const rows = XLSX.utils.sheet_to_json<DeliveryRow>(sheet, { defval: '' });
  console.log(`Read ${rows.length} rows from ${wb.SheetNames[0]}`);

  const pool = new Pool({ connectionString: dbUrl });
  let inserted = 0;
  let skipped = 0;
  let conflicted = 0;
  const typeCounts: Record<string, number> = {};

  try {
    for (const r of rows) {
      const salesDoc = String(r['Sales doc.'] || '').trim();
      const sapCode = String(r.Material || '').trim();
      const poNumber = String(r['Purchase order no.'] || '').trim();
      const salesType = String(r.SaTy || '').trim().toUpperCase();

      if (!salesDoc || !sapCode) { skipped++; continue; }

      const { developer, site } = parseDeveloperSite(String(r['Name 1'] || ''));
      const plot = extractPlot(poNumber, salesType);
      const createdOn = excelSerialToDate(r['Created on']);
      const reqDelivery = excelSerialToDate(r['Req.dlv.dt']);

      const result = await pool.query(
        `INSERT INTO sap_orders (
           sales_doc, sales_type, sap_code, description, order_quantity,
           po_number, plot_extracted, sold_to_name, sold_to_account,
           developer, site, created_on, required_delivery, sap_user
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (sales_doc, sap_code, po_number) DO NOTHING
         RETURNING id`,
        [
          salesDoc,
          salesType || null,
          sapCode,
          String(r.Description || '').trim().slice(0, 255),
          Number(r['Order Quantity'] || 0) || null,
          poNumber || null,
          plot,
          String(r['Name 1'] || '').trim().slice(0, 200) || null,
          String(r['Sold-to pt'] || '').trim().slice(0, 50) || null,
          developer,
          site,
          createdOn,
          reqDelivery,
          String(r.User || '').trim().slice(0, 50) || null,
        ]
      );

      if (result.rowCount && result.rowCount > 0) inserted++;
      else conflicted++;
      typeCounts[salesType || 'unknown'] = (typeCounts[salesType || 'unknown'] || 0) + 1;
    }

    console.log(`\nImport complete:`);
    console.log(`  ${inserted} inserted`);
    console.log(`  ${conflicted} already present (deduped)`);
    console.log(`  ${skipped} skipped (missing key fields)`);
    console.log('\nRow counts by sales type:');
    for (const [k, v] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${k.padEnd(8)} ${v}`);
    }

    const total = await pool.query('SELECT COUNT(*) FROM sap_orders');
    console.log(`\nsap_orders now contains ${total.rows[0].count} rows total`);

    // Quick QA: how many rows have a parsed plot?
    const withPlot = await pool.query("SELECT COUNT(*) FROM sap_orders WHERE plot_extracted IS NOT NULL");
    console.log(`  ${withPlot.rows[0].count} have a parsed plot`);

    const distinctDevs = await pool.query("SELECT COUNT(DISTINCT developer) FROM sap_orders WHERE developer IS NOT NULL");
    console.log(`  ${distinctDevs.rows[0].count} distinct developers detected`);
  } catch (e) {
    console.error('Import failed:', e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
