import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * GET /api/v1/products/search?q=600+base
 * 
 * Searches products by SAP code or description.
 * Returns up to 20 matches, prioritising code matches over description matches.
 */
router.get('/products/search', requireAuth, async (req: Request, res: Response) => {
  const q = String(req.query.q || '').trim();

  if (!q || q.length < 2) {
    return res.json([]);
  }

  try {
    const words = q.split(/\s+/).filter(Boolean);
    const conditions = words.map((_, i) => `sap_code ILIKE $${i + 1}`).join(' AND ');
    const descConditions = words.map((_, i) => `description ILIKE $${i + 1}`).join(' AND ');
    const params = words.map(w => `%${w}%`);

    const result = await pool.query(
      `SELECT sap_code, description, usage_count FROM products
       WHERE (${conditions}) OR (${descConditions})
       ORDER BY
         usage_count DESC,
         CASE WHEN sap_code ILIKE $1 THEN 0 ELSE 1 END,
         LENGTH(sap_code) ASC,
         sap_code ASC
       LIMIT 20`,
      params
    );

    return res.json(result.rows);
  } catch (err) {
    console.error('[PRODUCTS] Search failed:', err);
    return res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * Auto-learn: called after an order is submitted to save any new products.
 * POST /api/v1/products/learn
 * Body: { items: [{ sap_code: "B40L", description: "400 Base HL LH" }] }
 */
router.post('/products/learn', requireAuth, async (req: Request, res: Response) => {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items array required' });
  }

  try {
    let learned = 0;
    for (const item of items) {
      const code = String(item.sap_code || '').trim().slice(0, 50);
      const desc = String(item.description || '').trim().slice(0, 500);
      if (code && desc) {
        const result = await pool.query(
          `INSERT INTO products (sap_code, description)
           VALUES ($1, $2)
           ON CONFLICT (sap_code) DO NOTHING`,
          [code, desc]
        );
        learned += result.rowCount ?? 0;
      }
    }

    return res.json({ learned });
  } catch (err) {
    console.error('[PRODUCTS] Learn failed:', err);
    return res.status(500).json({ error: 'Learn failed' });
  }
});

/**
 * POST /api/v1/products/:sapCode/pick
 * Bumps usage_count by 1 so frequently-picked items rise to the top of search.
 */
router.post('/products/:sapCode/pick', requireAuth, async (req: Request, res: Response) => {
  const sapCode = String(req.params.sapCode || '').trim();
  if (!sapCode) return res.status(400).json({ error: 'sap code required' });
  try {
    await pool.query(
      `UPDATE products SET usage_count = usage_count + 1 WHERE sap_code = $1`,
      [sapCode]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error('[PRODUCTS] Pick failed:', err);
    return res.status(500).json({ error: 'Pick failed' });
  }
});

export default router;
