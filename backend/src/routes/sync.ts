import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/v1/sync?since=<ISO timestamp>
// Returns tickets and messages updated since the given timestamp.
// Pass since=0 to get everything (first sync).
router.get('/sync', requireAuth, async (req: Request, res: Response) => {
  try {
    const viewer = (req as AuthenticatedRequest).user!.role as 'manager' | 'office';
    const since = req.query.since as string | undefined;

    let whereClause = '1=1';
    const params: unknown[] = [];

    if (since && since !== '0') {
      whereClause = 'updated_at > $1::timestamptz';
      params.push(since);
    }

    // Tickets visible to this role
    const ticketResult = await pool.query(`
      SELECT t.id, t.ref, t.status, t.developer, t.site, t.plot_number,
        t.items, t.quantity, t.reason, t.delivery_request,
        to_char(t.delivery_date, 'YYYY-MM-DD') AS delivery_date,
        t.po_number, t.accepted_at AT TIME ZONE 'UTC' AS accepted_at,
        t.ordered_items, t.images, t.created_at, t.updated_at
      FROM tickets t
      WHERE ${whereClause}
      ORDER BY t.updated_at DESC
      LIMIT 200
    `, params);

    // Messages for those tickets (since timestamp)
    const ticketIds = ticketResult.rows
      .filter((row: { id: string }) => row.id)
      .map((row: { id: string }) => row.id);

    let messages: unknown[] = [];
    if (ticketIds.length > 0) {
      const msgWhere = since && since !== '0'
        ? `m.ticket_id = ANY($1::uuid[]) AND m.created_at > $2::timestamptz`
        : `m.ticket_id = ANY($1::uuid[])`;

      const msgQuery = `
        SELECT m.id, m.ticket_id, m.sender, m.text, m.image, m.audio, m.audio_mime,
          m.is_query, m.created_at AT TIME ZONE 'UTC' AS created_at,
          m.read_at AT TIME ZONE 'UTC' AS read_at
        FROM messages m
        WHERE ${msgWhere}
        ORDER BY m.created_at ASC
        LIMIT 500
      `;

      const msgParams: unknown[] = [ticketIds];
      if (since && since !== '0') msgParams.push(since);

      const msgResult = await pool.query(msgQuery, msgParams);
      messages = msgResult.rows;
    }

    res.json({
      tickets: ticketResult.rows,
      messages,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[sync] failed:', err);
    res.status(500).json({ error: 'Sync failed' });
  }
});

export default router;
