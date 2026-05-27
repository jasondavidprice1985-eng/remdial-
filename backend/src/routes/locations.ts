import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { sanitise } from '../utils/sanitise';
import { requireAuth } from '../middleware/auth';

const router = Router();

const ALLOWED_FIELDS = ['developer','site','plot_number','account_number'] as const;
type LocationField = typeof ALLOWED_FIELDS[number];

// GET /api/v1/locations/autocomplete?field=developer&query=hop
router.get('/locations/autocomplete', requireAuth, async (req: Request, res: Response) => {
  const field = req.query.field as string;
  const query = sanitise(String(req.query.query || req.query.q || '').trim());

  if (!ALLOWED_FIELDS.includes(field as LocationField)) {
    return res.status(400).json({
      error: `'field' must be one of: ${ALLOWED_FIELDS.join(', ')}`,
    });
  }

  try {
    // Safe because field is validated against the allowlist above
    const r = await pool.query(
      `SELECT DISTINCT ${field} AS value FROM locations WHERE ${field} ILIKE $1 ORDER BY ${field} LIMIT 20`,
      [`%${query}%`]
    );
    return res.json({ suggestions: r.rows.map(row => row.value) });
  } catch (e) {
    console.error('[LOCATIONS] autocomplete error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/locations?search=xxx  — full record search (existing)
router.get('/locations', requireAuth, async (req: Request, res: Response) => {
  const search = sanitise(String(req.query.search || '').trim());
  try {
    const r = await pool.query(`
      SELECT id, developer, site, plot_number, account_number,
             created_at AT TIME ZONE 'UTC' AS created_at
      FROM locations
      WHERE developer ILIKE $1 OR site ILIKE $1 OR plot_number ILIKE $1 OR account_number ILIKE $1
      ORDER BY developer, site, plot_number LIMIT 20
    `, [`%${search}%`]);
    return res.json({ locations: r.rows });
  } catch (e) {
    console.error('[LOCATIONS] search error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
