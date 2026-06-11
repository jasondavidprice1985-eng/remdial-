import { Router, Request, Response } from 'express';
import { Server } from 'socket.io';
import { pool } from '../db';
import { validateCreatePayload, createTicket, rowToTicket, getLineItems, getTicketById, getTicketMessages, getUnreadCount, markMessagesRead } from '../services/ticketService';
import { requireAuth, requireRole, validateIdParam, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/v1/tickets
router.get('/tickets', requireAuth, async (req: Request, res: Response) => {
  try {
    const viewer = (req as AuthenticatedRequest).user!.role as 'manager' | 'office';
    const statusParam = req.query.status as string | undefined;
    const statuses = statusParam ? statusParam.split(',').map(s => s.trim()) : ['pending','query','ordered'];
    const otherSender = viewer === 'manager' ? 'office' : 'manager';

    const r = await pool.query(`
      SELECT t.id,t.ref,t.status,t.developer,t.site,t.plot_number,t.items,t.quantity,t.reason,
        t.delivery_request, to_char(t.delivery_date,'YYYY-MM-DD') AS delivery_date,
        t.po_number, t.accepted_at AT TIME ZONE 'UTC' AS accepted_at, t.ordered_items, t.images,
        t.created_at AT TIME ZONE 'UTC' AS created_at,
        t.updated_at AT TIME ZONE 'UTC' AS updated_at,
        COUNT(m.id) FILTER (WHERE m.read_at IS NULL AND m.sender = $2) AS unread_count
      FROM tickets t
      LEFT JOIN messages m ON m.ticket_id = t.id
      WHERE t.status = ANY($1::text[])
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `, [statuses, otherSender]);

    const ticketIds = r.rows.map(row => row.id);
    const lineItemMap: Record<string, unknown[]> = {};
    if (ticketIds.length > 0) {
      const li = await pool.query(
        'SELECT id,ticket_id,description,quantity,reason FROM ticket_items WHERE ticket_id=ANY($1::uuid[])',
        [ticketIds]
      );
      for (const item of li.rows) {
        if (!lineItemMap[item.ticket_id]) lineItemMap[item.ticket_id] = [];
        lineItemMap[item.ticket_id].push(item);
      }
    }

    const tickets = r.rows.map(row => {
      const t = rowToTicket(row);
      t.line_items   = (lineItemMap[t.id] || []) as typeof t.line_items;
      t.unread_count = Number(row.unread_count);
      return t;
    });
    return res.json({ tickets });
  } catch (e) { console.error('[TICKETS] list error:', e); return res.status(500).json({ error: 'Internal server error' }); }
});

// GET /api/v1/tickets/:id
router.get('/tickets/:id', requireAuth, validateIdParam, async (req: Request, res: Response) => {
  const io: Server = req.app.get('io');
  try {
    const viewer = (req as AuthenticatedRequest).user!.role as 'manager' | 'office';
    const ticket = await getTicketById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    const marked = await markMessagesRead(req.params.id, viewer);
    const messages = await getTicketMessages(req.params.id);
    ticket.unread_count = await getUnreadCount(req.params.id, viewer);
    if (marked > 0) {
      const other = viewer === 'manager' ? 'office' : 'manager';
      io.to(other).emit('messages:read', { ticketId: req.params.id });
      io.to(viewer).emit('ticket:updated', { ticket: { ...ticket, unread_count: 0 } });
    }
    return res.json({ ticket, messages });
  } catch (e) { console.error('[TICKETS] get error:', e); return res.status(500).json({ error: 'Internal server error' }); }
});

// POST /api/v1/tickets
router.post('/tickets', requireAuth, requireRole('manager'), async (req: Request, res: Response) => {
  const io: Server = req.app.get('io');
  const err = validateCreatePayload(req.body);
  if (err) return res.status(400).json({ error: err });
  try {
    const ticket = await createTicket(req.body);
    console.log(`[TICKETS] created ${ticket.ref} with ${ticket.line_items.length} line item(s)`);
    io.to('office').emit('ticket:created', { ticket });
    return res.status(201).json({ ticket });
  } catch (e) { console.error('[TICKETS] create error:', e); return res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
