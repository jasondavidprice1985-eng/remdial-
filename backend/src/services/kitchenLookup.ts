import { pool } from '../db';

export interface KitchenLineItem {
  salesDoc: string;
  salesType: string | null;
  sapCode: string;
  description: string | null;
  quantity: number | null;
  poNumber: string | null;
  developer: string | null;
  site: string | null;
  plot: string | null;
  createdOn: string | null;
  requiredDelivery: string | null;
}

interface FindKitchenResult {
  items: KitchenLineItem[];
  matchedDeveloper: string | null;
  matchedSite: string | null;
  matchedPlot: string | null;
  salesDocs: string[];
}

/**
 * Look up the kitchen line items for a given developer/site/plot.
 *
 * Matching strategy:
 *  - developer:  case-insensitive substring (manager may type a shorthand)
 *  - site:       case-insensitive substring
 *  - plot:       case-insensitive exact match against plot_extracted
 *
 * Filters out ZCR (previous remedials) by default; the original ZCD kitchen
 * plus ZCA/ZCC additions are what was supposed to be there.
 */
export async function findKitchen(developer: string, site: string, plot: string): Promise<FindKitchenResult> {
  const dev = developer.trim();
  const sit = site.trim();
  const plt = plot.trim().toUpperCase();
  if (!dev || !sit || !plt) {
    return { items: [], matchedDeveloper: null, matchedSite: null, matchedPlot: null, salesDocs: [] };
  }

  const r = await pool.query(
    `SELECT sales_doc, sales_type, sap_code, description, order_quantity,
            po_number, developer, site, plot_extracted,
            to_char(created_on, 'YYYY-MM-DD') AS created_on,
            to_char(required_delivery, 'YYYY-MM-DD') AS required_delivery
       FROM sap_orders
      WHERE developer ILIKE $1
        AND site      ILIKE $2
        AND UPPER(plot_extracted) = $3
        AND COALESCE(sales_type, '') <> 'ZCR'
      ORDER BY sales_type, sales_doc, sap_code`,
    [`%${dev}%`, `%${sit}%`, plt]
  );

  const items: KitchenLineItem[] = r.rows.map(row => ({
    salesDoc:         row.sales_doc,
    salesType:        row.sales_type,
    sapCode:          row.sap_code,
    description:      row.description,
    quantity:         row.order_quantity !== null ? Number(row.order_quantity) : null,
    poNumber:         row.po_number,
    developer:        row.developer,
    site:             row.site,
    plot:             row.plot_extracted,
    createdOn:        row.created_on,
    requiredDelivery: row.required_delivery,
  }));

  const salesDocs = Array.from(new Set(items.map(i => i.salesDoc)));
  const matchedDeveloper = items[0]?.developer ?? null;
  const matchedSite      = items[0]?.site      ?? null;
  const matchedPlot      = items[0]?.plot      ?? null;

  return { items, matchedDeveloper, matchedSite, matchedPlot, salesDocs };
}

/** Suggest developer names that ILIKE the search term, ordered by match count. */
export async function suggestDevelopers(query: string, limit = 10): Promise<Array<{ name: string; count: number }>> {
  const q = query.trim();
  if (!q) return [];
  const r = await pool.query(
    `SELECT developer AS name, COUNT(*)::int AS count
       FROM sap_orders
      WHERE developer ILIKE $1
      GROUP BY developer
      ORDER BY count DESC
      LIMIT $2`,
    [`%${q}%`, limit]
  );
  return r.rows;
}

/** Sites under a developer, optionally filtered by a search query. */
export async function suggestSites(developer: string, query: string, limit = 15): Promise<Array<{ name: string; count: number }>> {
  const dev = developer.trim();
  if (!dev) return [];
  const q = query.trim();
  const r = await pool.query(
    `SELECT site AS name, COUNT(*)::int AS count
       FROM sap_orders
      WHERE developer ILIKE $1 AND site IS NOT NULL ${q ? 'AND site ILIKE $3' : ''}
      GROUP BY site
      ORDER BY count DESC
      LIMIT $2`,
    q ? [`%${dev}%`, limit, `%${q}%`] : [`%${dev}%`, limit]
  );
  return r.rows;
}

/** Plots under a developer + site, optionally filtered by query. */
export async function suggestPlots(developer: string, site: string, query: string, limit = 30): Promise<Array<{ name: string; count: number }>> {
  const dev = developer.trim();
  const sit = site.trim();
  if (!dev || !sit) return [];
  const q = query.trim();
  const r = await pool.query(
    `SELECT plot_extracted AS name, COUNT(*)::int AS count
       FROM sap_orders
      WHERE developer ILIKE $1 AND site ILIKE $2 AND plot_extracted IS NOT NULL
        ${q ? 'AND plot_extracted ILIKE $4' : ''}
      GROUP BY plot_extracted
      ORDER BY count DESC
      LIMIT $3`,
    q ? [`%${dev}%`, `%${sit}%`, limit, `%${q}%`] : [`%${dev}%`, `%${sit}%`, limit]
  );
  return r.rows;
}
