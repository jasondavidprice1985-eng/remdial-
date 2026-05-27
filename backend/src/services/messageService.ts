import { pool } from '../db';
import type { MessageSender } from '../types';

type ViewerRole = 'manager' | 'office';
const OTHER_SENDER: Record<ViewerRole, MessageSender> = { manager: 'office', office: 'manager' };

export async function getUnreadCount(ticketId: string, viewer: ViewerRole): Promise<number> {
  const r = await pool.query(
    'SELECT COUNT(*)::int AS c FROM messages WHERE ticket_id=$1 AND read_at IS NULL AND sender=$2',
    [ticketId, OTHER_SENDER[viewer]],
  );
  return r.rows[0].c;
}

export async function markMessagesRead(ticketId: string, viewer: ViewerRole): Promise<number> {
  const r = await pool.query(
    'UPDATE messages SET read_at=NOW() WHERE ticket_id=$1 AND read_at IS NULL AND sender=$2 RETURNING id',
    [ticketId, OTHER_SENDER[viewer]],
  );
  return r.rowCount ?? 0;
}

export async function getTicketMessages(ticketId: string) {
  const r = await pool.query(`
    SELECT id,ticket_id,sender,text,audio_path,image_path,is_query,
      read_at AT TIME ZONE 'UTC' AS read_at,
      created_at AT TIME ZONE 'UTC' AS created_at
    FROM messages WHERE ticket_id=$1 ORDER BY created_at ASC
  `, [ticketId]);
  return r.rows.map(m => ({
    id: m.id, ticket_id: m.ticket_id, sender: m.sender,
    text: m.text ?? null, audio_path: m.audio_path ?? null, image_path: m.image_path ?? null,
    is_query: m.is_query,
    read_at: m.read_at ? (m.read_at instanceof Date ? m.read_at.toISOString() : String(m.read_at)) : null,
    created_at: m.created_at instanceof Date ? m.created_at.toISOString() : String(m.created_at),
  }));
}
