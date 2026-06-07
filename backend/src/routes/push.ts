import { Router, Response } from 'express';
import { pool } from '../db';
import { getVapidPublicKey, isPushConfigured } from '../services/pushService';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Public — clients need this to subscribe
router.get('/push/vapid-key', (_req, res: Response) => {
  if (!isPushConfigured()) return res.status(503).json({ error: 'Push not configured on server' });
  res.json({ key: getVapidPublicKey() });
});

// Authenticated — store this device's subscription
router.post('/push/subscribe', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!isPushConfigured()) return res.status(503).json({ error: 'Push not configured on server' });
  const { endpoint, keys } = req.body ?? {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'endpoint and keys.{p256dh,auth} required' });
  }
  const userRow = await pool.query<{ id: string }>(
    'SELECT id FROM users WHERE username=$1',
    [req.user?.username]
  );
  if (userRow.rows.length === 0) return res.status(401).json({ error: 'Unknown user' });
  const userId = userRow.rows[0].id;

  await pool.query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint) DO UPDATE SET user_id=EXCLUDED.user_id, p256dh=EXCLUDED.p256dh, auth=EXCLUDED.auth`,
    [userId, endpoint, keys.p256dh, keys.auth]
  );
  res.status(201).json({ ok: true });
});

router.post('/push/unsubscribe', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { endpoint } = req.body ?? {};
  if (!endpoint) return res.status(400).json({ error: 'endpoint required' });
  await pool.query('DELETE FROM push_subscriptions WHERE endpoint=$1', [endpoint]);
  res.json({ ok: true });
});

export default router;
