import { Router, Request, Response } from 'express';
import { Server } from 'socket.io';
import { pool } from '../db';
import { getTicketById, getUnreadCount } from '../services/ticketService';
import { saveAudio, saveImage } from '../utils/media';
import { sanitise } from '../utils/sanitise';
import { requireAuth, validateIdParam, AuthenticatedRequest } from '../middleware/auth';
import { sendPushToRole } from '../services/pushService';

const router = Router();

router.get('/tickets/:id/messages', requireAuth, validateIdParam, async (req: Request, res: Response) => {
  try {
    const role = (req as AuthenticatedRequest).user!.role as 'manager' | 'office';
    const r = await pool.query(`
      SELECT id, ticket_id, sender, text, audio_path, image_path, is_query, read_at,
        created_at AT TIME ZONE 'UTC' AS created_at
      FROM messages WHERE ticket_id=$1 ORDER BY created_at ASC
    `, [req.params.id]);
    const messages = r.rows.map(m => ({
      id: m.id, ticket_id: m.ticket_id, sender: m.sender,
      text: m.text ?? null, audio_path: m.audio_path ?? null,
      image_path: m.image_path ?? null, is_query: m.is_query,
      read_at: m.read_at ? (m.read_at instanceof Date ? m.read_at.toISOString() : String(m.read_at)) : null,
      created_at: m.created_at instanceof Date ? m.created_at.toISOString() : String(m.created_at),
    }));
    // Mark unread messages as read
    const otherSender = role === 'office' ? 'manager' : 'office';
    await pool.query(
      `UPDATE messages SET read_at=NOW() WHERE ticket_id=$1 AND sender=$2 AND read_at IS NULL`,
      [req.params.id, otherSender]
    );
    return res.json({ messages });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/tickets/:id/messages', requireAuth, validateIdParam, async (req: Request, res: Response) => {
  const io: Server = req.app.get('io');
  const sender = (req as AuthenticatedRequest).user!.role as 'manager' | 'office';
  const { text, audio, audio_mime, image, is_query: rawIsQuery } = req.body;
  const is_query = rawIsQuery === true;

  console.log(`[MSG] POST /tickets/${req.params.id}/messages sender=${sender} is_query=${is_query} hasText=${!!text} hasAudio=${!!audio} hasImage=${!!image}`);

  if (!text && !audio && !image) return res.status(400).json({ error: 'text, audio, or image required' });
  if (audio && !audio_mime) return res.status(400).json({ error: 'audio_mime required with audio' });

  try {
    const ticketCheck = await pool.query('SELECT id, status FROM tickets WHERE id=$1', [req.params.id]);
    if (ticketCheck.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });

    const allowQuery = is_query
      && sender === 'manager'
      && ['pending', 'ordered'].includes(ticketCheck.rows[0].status);
    const storedIsQuery = allowQuery;

    let audioPath: string | null = null;
    let imagePath: string | null = null;
    if (audio) audioPath = saveAudio(audio, audio_mime);
    if (image) imagePath = saveImage(image);

    if (allowQuery) {
      await pool.query("UPDATE tickets SET status='query',updated_at=NOW() WHERE id=$1", [req.params.id]);
    }

    const msgR = await pool.query(`
      INSERT INTO messages (ticket_id,sender,text,audio_path,image_path,is_query)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING id,ticket_id,sender,text,audio_path,image_path,is_query,read_at,
        created_at AT TIME ZONE 'UTC' AS created_at
    `, [req.params.id, sender, text ? sanitise(text) : null, audioPath, imagePath, storedIsQuery]);

    const message = {
      id: msgR.rows[0].id, ticket_id: msgR.rows[0].ticket_id, sender: msgR.rows[0].sender,
      text: msgR.rows[0].text ?? null, audio_path: msgR.rows[0].audio_path ?? null,
      image_path: msgR.rows[0].image_path ?? null,
      is_query: msgR.rows[0].is_query, read_at: null,
      created_at: msgR.rows[0].created_at instanceof Date
        ? msgR.rows[0].created_at.toISOString() : String(msgR.rows[0].created_at),
    };

    const room = `job_${req.params.id}`;
    console.log(`[MSG] Emitting message:new to room "${room}"`);
    io.to(room).emit('message:new', { message });

    // Always fetch updated ticket so unread_count is current, then notify both roles
    const updated = await getTicketById(req.params.id);
    if (updated) {
      const forManager = { ...updated, unread_count: await getUnreadCount(req.params.id, 'manager') };
      const forOffice = { ...updated, unread_count: await getUnreadCount(req.params.id, 'office') };
      if (allowQuery) {
        io.to('office').emit('ticket:updated', { ticket: forOffice });
        io.to(room).emit('ticket:updated', { ticket: forManager });
      }
      if (sender === 'office') {
        io.to('manager').emit('ticket:updated', { ticket: forManager });
      } else {
        io.to('office').emit('ticket:updated', { ticket: forOffice });
      }

      // Push notification to the opposite role
      const target: 'manager' | 'office' = sender === 'office' ? 'manager' : 'office';
      const preview = text
        ? String(text).slice(0, 80)
        : (audio ? '🎤 Voice note' : (image ? '📷 Photo' : 'New message'));
      sendPushToRole(target, {
        title: `${updated.ref} · ${sender === 'office' ? 'Office' : 'Manager'}`,
        body:  preview,
        tag:   `ticket:${updated.id}`,
      }).catch(err => console.error('[push] message', err));
    }
    return res.status(201).json({ message });
  } catch (e) { console.error('[MSG] Error:', e); return res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
