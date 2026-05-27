import { Router, Request, Response } from 'express';
import { Server } from 'socket.io';
import { pool } from '../db';
import { getTicketById, rowToTicket } from '../services/ticketService';
import { saveAudio } from '../utils/media';
import { sanitise } from '../utils/sanitise';
import { requireAuth } from '../middleware/auth';

export const router = Router();

router.get('/settings/next-delivery', requireAuth, async (_req: Request, res: Response) => {
  try {
    const r = await pool.query(`SELECT value FROM settings WHERE key='next_delivery_date'`);
    return res.json({ next_delivery_date: r.rows[0]?.value ?? null });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Internal server error' }); }
});

router.patch('/tickets/:id/query', requireAuth, async (req: Request, res: Response) => {
  const io: Server = req.app.get('io');
  try {
    const cur = await pool.query('SELECT status FROM tickets WHERE id=$1', [req.params.id]);
    if (cur.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
    if (cur.rows[0].status !== 'pending') return res.status(409).json({ error: 'Ticket must be pending' });
    const r = await pool.query(`
      UPDATE tickets SET status='query',updated_at=NOW() WHERE id=$1
      RETURNING id,ref,status,developer,site,plot_number,items,quantity,reason,delivery_request,
        to_char(delivery_date,'YYYY-MM-DD') AS delivery_date,po_number,
        accepted_at AT TIME ZONE 'UTC' AS accepted_at,images,
        created_at AT TIME ZONE 'UTC' AS created_at, updated_at AT TIME ZONE 'UTC' AS updated_at
    `, [req.params.id]);
    const ticket = rowToTicket(r.rows[0]);
    io.to('office').emit('ticket:updated', { ticket });
    io.to('manager').emit('ticket:updated', { ticket });
    return res.json({ ticket });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Internal server error' }); }
});

router.patch('/tickets/:id/accept', requireAuth, async (req: Request, res: Response) => {
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
        accepted_at AT TIME ZONE 'UTC' AS accepted_at,images,
        created_at AT TIME ZONE 'UTC' AS created_at, updated_at AT TIME ZONE 'UTC' AS updated_at
    `, [req.params.id]);
    const ticket = rowToTicket(r.rows[0]);
    io.to('office').emit('ticket:updated', { ticket });
    io.to('manager').emit('ticket:updated', { ticket });
    return res.json({ ticket });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Internal server error' }); }
});

router.patch('/tickets/:id/order', requireAuth, async (req: Request, res: Response) => {
  const io: Server = req.app.get('io');
  let { po_number, delivery_date } = req.body;
  if (!po_number || String(po_number).length > 100) return res.status(400).json({ error: 'po_number required (max 100)' });
  // If delivery_date not supplied, fall back to the stored next_delivery_date
  if (!delivery_date) {
    const setting = await pool.query(`SELECT value FROM settings WHERE key='next_delivery_date'`);
    delivery_date = setting.rows[0]?.value ?? null;
  }
  if (!delivery_date || !/^\d{4}-\d{2}-\d{2}$/.test(delivery_date)) return res.status(400).json({ error: 'delivery_date must be YYYY-MM-DD' });
  try {
    const r = await pool.query(`
      UPDATE tickets SET status='ordered',po_number=$1,delivery_date=$2,updated_at=NOW() WHERE id=$3
      RETURNING id,ref,status,developer,site,plot_number,items,quantity,reason,delivery_request,
        to_char(delivery_date,'YYYY-MM-DD') AS delivery_date,po_number,
        accepted_at AT TIME ZONE 'UTC' AS accepted_at,images,
        created_at AT TIME ZONE 'UTC' AS created_at, updated_at AT TIME ZONE 'UTC' AS updated_at
    `, [sanitise(po_number), delivery_date, req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
    const ticket = rowToTicket(r.rows[0]);
    io.to('office').emit('ticket:updated', { ticket });
    io.to(`job_${ticket.id}`).emit('ticket:updated', { ticket });
    return res.json({ ticket });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Internal server error' }); }
});

router.patch('/tickets/:id/archive', requireAuth, async (req: Request, res: Response) => {
  const io: Server = req.app.get('io');
  try {
    const cur = await pool.query('SELECT status FROM tickets WHERE id=$1', [req.params.id]);
    if (cur.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
    if (cur.rows[0].status !== 'ordered') return res.status(409).json({ error: 'Ticket must be ordered before archiving' });
    const r = await pool.query(`
      UPDATE tickets SET status='archived',updated_at=NOW() WHERE id=$1
      RETURNING id,ref,status,developer,site,plot_number,items,quantity,reason,delivery_request,
        to_char(delivery_date,'YYYY-MM-DD') AS delivery_date,po_number,
        accepted_at AT TIME ZONE 'UTC' AS accepted_at,images,
        created_at AT TIME ZONE 'UTC' AS created_at, updated_at AT TIME ZONE 'UTC' AS updated_at
    `, [req.params.id]);
    const ticket = rowToTicket(r.rows[0]);
    io.to('office').emit('ticket:archived', { ticketId: ticket.id });
    return res.json({ ticket });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Internal server error' }); }
});

router.patch('/tickets/:id/clarified', requireAuth, async (req: Request, res: Response) => {
  const io: Server = req.app.get('io');
  try {
    const cur = await pool.query('SELECT status FROM tickets WHERE id=$1', [req.params.id]);
    if (cur.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
    if (cur.rows[0].status !== 'query') return res.status(409).json({ error: 'Ticket must be in query state' });
    const r = await pool.query(`
      UPDATE tickets SET status='pending',updated_at=NOW() WHERE id=$1
      RETURNING id,ref,status,developer,site,plot_number,items,quantity,reason,delivery_request,
        to_char(delivery_date,'YYYY-MM-DD') AS delivery_date,po_number,
        accepted_at AT TIME ZONE 'UTC' AS accepted_at,images,
        created_at AT TIME ZONE 'UTC' AS created_at, updated_at AT TIME ZONE 'UTC' AS updated_at
    `, [req.params.id]);
    const ticket = rowToTicket(r.rows[0]);
    io.to('office').emit('ticket:updated', { ticket });
    io.to(`job_${ticket.id}`).emit('ticket:updated', { ticket });
    return res.json({ ticket });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
