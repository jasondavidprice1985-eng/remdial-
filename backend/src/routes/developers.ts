import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { sanitise } from '../utils/sanitise';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/v1/developers  — returns unique developer names for autocomplete
router.get('/developers', requireAuth, async (req: Request, res: Response) => {
  const q = sanitise(String(req.query.q || '').trim());
  try {
    const r = await pool.query(
      `SELECT DISTINCT developer FROM locations
       WHERE developer ILIKE $1
       ORDER BY developer LIMIT 20`,
      [`%${q}%`]
    );
    return res.json({ developers: r.rows.map(row => row.developer) });
  } catch (e) {
    console.error('[DEVELOPERS] error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
