import { Router, Request, Response } from 'express';
import { Server } from 'socket.io';
import { pool } from '../db';
import { getTicketById, rowToTicket } from '../services/ticketService';
import { sanitise } from '../utils/sanitise';
import { requireAuth, requireRole, validateIdParam } from '../middleware/auth';
import { sendPushToRole } from '../services/pushService';

export const router = Router();

router.get('/settings/next-delivery', requireAuth, async (_req: Request, res: Response) => {
  try {
    const r = await pool.query(`SELECT value FROM settings WHERE key='next_delivery_date'`);
    return res.json({ next_delivery_date: r.rows[0]?.value ?? null });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Internal server error' }); }
});

router.patch('/tickets/:id/query', requireAuth, validateIdParam, async (req: Request, res: Response) => {
  const io: Server = req.app.get('io');
  try {
    const cur = await pool.query('SELECT status FROM tickets WHERE id=$1', [req.params.id]);
    if (cur.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
    if (cur.rows[0].status !== 'pending' && cur.rows[0].status !== 'ordered') {
      return res.status(409).json({ error: 'Only pending or ordered tickets can be queried' });
    }
    const r = await pool.query(`
      UPDATE tickets SET status='query',updated_at=NOW() WHERE id=$1
      RETURNING id,ref,status,developer,site,plot_number,items,quantity,reason,delivery_request,
        to_char(delivery_date,'YYYY-MM-DD') AS delivery_date,po_number,
        accepted_at AT TIME ZONE 'UTC' AS accepted_at,ordered_items,images,
        created_at AT TIME ZONE 'UTC' AS created_at, updated_at AT TIME ZONE 'UTC' AS updated_at
    `, [req.params.id]);
    const ticket = rowToTicket(r.rows[0]);
    io.to('office').emit('ticket:updated', { ticket });
    io.to('manager').emit('ticket:updated', { ticket });
    return res.json({ ticket });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Internal server error' }); }
});

router.patch('/tickets/:id/accept', requireAuth, requireRole('office'), validateIdParam, async (req: Request, res: Response) => {
  const io: Server = req.app.get('io');
  try {
    const cur = await pool.query('SELECT status, accepted_at FROM tickets WHERE id=$1', [req.params.id]);
    if (cur.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
    if (cur.rows[0].status !== 'pending') return res.status(409).json({ error: 'Only pending tickets can be accepted' });
    if (cur.rows[0].accepted_at) return res.status(409).json({ error: 'Ticket already accepted' });
    const r = await pool.query(`
      UPDATE tickets SET accepted_at=NOW(),updated_at=NOW() WHERE id=$1
      RETURNING id,ref,status,developer,site,plot_number,items,quantity,reason,delivery_request,
        to_char(delivery_date,'YYYY-MM-DD') AS delivery_date,po_number,
        accepted_at AT TIME ZONE 'UTC' AS accepted_at,ordered_items,images,
        created_at AT TIME ZONE 'UTC' AS created_at, updated_at AT TIME ZONE 'UTC' AS updated_at
    `, [req.params.id]);
    const ticket = rowToTicket(r.rows[0]);
    io.to('office').emit('ticket:updated', { ticket });
    io.to('manager').emit('ticket:updated', { ticket });
    sendPushToRole('manager', {
      title: `${ticket.ref} accepted`,
      body:  `Office accepted ${ticket.developer} · Plot ${ticket.plot_number}.`,
      tag:   `ticket:${ticket.id}`,
    }).catch(err => console.error('[push] accept', err));
    return res.json({ ticket });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Internal server error' }); }
});

router.patch('/tickets/:id/order', requireAuth, requireRole('office'), validateIdParam, async (req: Request, res: Response) => {
  const io: Server = req.app.get('io');
  let { po_number, delivery_date, ordered_items } = req.body;
  if (!po_number || String(po_number).length > 100) return res.status(400).json({ error: 'po_number required (max 100)' });
  // Validate ordered_items: must be a non-empty array of {description, quantity, sap_code?}
  if (ordered_items !== undefined && ordered_items !== null) {
    if (!Array.isArray(ordered_items)) return res.status(400).json({ error: 'ordered_items must be an array' });
    for (const it of ordered_items) {
      if (!it || typeof it !== 'object') return res.status(400).json({ error: 'each ordered item must be an object' });
      if (!it.description || String(it.description).trim().length === 0) return res.status(400).json({ error: 'each ordered item needs a description' });
      if (!Number.isInteger(it.quantity) || it.quantity < 1) return res.status(400).json({ error: 'each ordered item quantity must be int >= 1' });
      if (it.sap_code !== undefined && it.sap_code !== null && typeof it.sap_code !== 'string') return res.status(400).json({ error: 'sap_code must be a string' });
    }
  }
  const orderedJson = ordered_items && Array.isArray(ordered_items) && ordered_items.length > 0
    ? JSON.stringify(ordered_items.map((it: { description: string; quantity: number; sap_code?: string }) => ({
        description: sanitise(String(it.description)).trim(),
        quantity:    it.quantity,
        sap_code:    it.sap_code ? sanitise(String(it.sap_code)).trim() : undefined,
      })))
    : null;
  try {
    // If delivery_date not supplied, fall back to the stored next_delivery_date
    if (!delivery_date) {
      const setting = await pool.query(`SELECT value FROM settings WHERE key='next_delivery_date'`);
      delivery_date = setting.rows[0]?.value ?? null;
    }
    if (!delivery_date || !/^\d{4}-\d{2}-\d{2}$/.test(delivery_date)) return res.status(400).json({ error: 'delivery_date must be YYYY-MM-DD' });
    const r = await pool.query(`
      UPDATE tickets SET status='ordered',po_number=$1,delivery_date=$2,ordered_items=$3::jsonb,updated_at=NOW() WHERE id=$4
      RETURNING id,ref,status,developer,site,plot_number,items,quantity,reason,delivery_request,
        to_char(delivery_date,'YYYY-MM-DD') AS delivery_date,po_number,
        accepted_at AT TIME ZONE 'UTC' AS accepted_at,ordered_items,images,
        created_at AT TIME ZONE 'UTC' AS created_at, updated_at AT TIME ZONE 'UTC' AS updated_at
    `, [sanitise(po_number), delivery_date, orderedJson, req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
    const ticket = rowToTicket(r.rows[0]);
    io.to('office').emit('ticket:updated', { ticket });
    io.to('manager').emit('ticket:updated', { ticket });
    io.to(`job_${ticket.id}`).emit('ticket:updated', { ticket });
    sendPushToRole('manager', {
      title: `${ticket.ref} ordered`,
      body:  `PO ${ticket.po_number} placed — review and confirm the SAP items.`,
      tag:   `ticket:${ticket.id}`,
    }).catch(err => console.error('[push] order', err));
    return res.json({ ticket });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Internal server error' }); }
});

router.patch('/tickets/:id/archive', requireAuth, requireRole('manager'), validateIdParam, async (req: Request, res: Response) => {
  const io: Server = req.app.get('io');
  try {
    const cur = await pool.query('SELECT status FROM tickets WHERE id=$1', [req.params.id]);
    if (cur.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
    if (cur.rows[0].status !== 'ordered') return res.status(409).json({ error: 'Ticket must be ordered before archiving' });
    const r = await pool.query(`
      UPDATE tickets SET status='archived',updated_at=NOW() WHERE id=$1
      RETURNING id,ref,status,developer,site,plot_number,items,quantity,reason,delivery_request,
        to_char(delivery_date,'YYYY-MM-DD') AS delivery_date,po_number,
        accepted_at AT TIME ZONE 'UTC' AS accepted_at,ordered_items,images,
        created_at AT TIME ZONE 'UTC' AS created_at, updated_at AT TIME ZONE 'UTC' AS updated_at
    `, [req.params.id]);
    const ticket = rowToTicket(r.rows[0]);
    io.to('office').emit('ticket:archived', { ticketId: ticket.id });
    io.to('manager').emit('ticket:archived', { ticketId: ticket.id });
    sendPushToRole('office', {
      title: `${ticket.ref} confirmed`,
      body:  `Manager confirmed the order — ${ticket.developer} · Plot ${ticket.plot_number}.`,
      tag:   `ticket:${ticket.id}`,
    }).catch(err => console.error('[push] archive', err));
    return res.json({ ticket });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Internal server error' }); }
});

router.patch('/tickets/:id/clarified', requireAuth, requireRole('office'), validateIdParam, async (req: Request, res: Response) => {
  const io: Server = req.app.get('io');
  try {
    const cur = await pool.query('SELECT status, accepted_at, ordered_items FROM tickets WHERE id=$1', [req.params.id]);
    if (cur.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
    if (cur.rows[0].status !== 'query') return res.status(409).json({ error: 'Ticket must be in query state' });
    // If the ticket was already accepted AND had ordered items submitted before the
    // query was raised, return it to 'ordered' (manager queried something about the
    // SAP order). Otherwise return to 'pending' (pre-acceptance clarification).
    const wasOrdered = cur.rows[0].accepted_at && cur.rows[0].ordered_items;
    const nextStatus = wasOrdered ? 'ordered' : 'pending';
    const r = await pool.query(`
      UPDATE tickets SET status=$2,updated_at=NOW() WHERE id=$1
      RETURNING id,ref,status,developer,site,plot_number,items,quantity,reason,delivery_request,
        to_char(delivery_date,'YYYY-MM-DD') AS delivery_date,po_number,
        accepted_at AT TIME ZONE 'UTC' AS accepted_at,ordered_items,images,
        created_at AT TIME ZONE 'UTC' AS created_at, updated_at AT TIME ZONE 'UTC' AS updated_at
    `, [req.params.id, nextStatus]);
    const ticket = rowToTicket(r.rows[0]);
    io.to('office').emit('ticket:updated', { ticket });
    io.to('manager').emit('ticket:updated', { ticket });
    io.to(`job_${ticket.id}`).emit('ticket:updated', { ticket });
    sendPushToRole('manager', {
      title: `${ticket.ref} clarified`,
      body:  `Office marked the query clarified — back to ${nextStatus}.`,
      tag:   `ticket:${ticket.id}`,
    }).catch(err => console.error('[push] clarified', err));
    return res.json({ ticket });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
