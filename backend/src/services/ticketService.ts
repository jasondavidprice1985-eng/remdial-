import { pool } from '../db';
import { saveImage } from '../utils/media';
import { generateTicketRef } from '../utils/ticketRef';
import { sanitise } from '../utils/sanitise';
import { rowToTicket } from './ticketHelpers';
import type { Ticket, TicketItem, CreateTicketPayload, LineItemInput } from '../types';

export { validateCreatePayload, rowToTicket } from './ticketHelpers';

export async function createTicket(payload: CreateTicketPayload): Promise<Ticket> {
  const imageUris = ((payload.images || []) as string[]).map(saveImage);
  const ref       = await generateTicketRef();

  const lineItems = Array.isArray(payload.items) ? (payload.items as LineItemInput[]) : null;
  const itemsText = lineItems
    ? lineItems.map(i => i.description).join(', ')
    : sanitise(String(payload.items));
  const quantity = lineItems
    ? lineItems.reduce((sum, i) => sum + i.quantity, 0)
    : payload.quantity;
  const reason = lineItems
    ? lineItems[0].reason
    : payload.reason;

  const row = await pool.query(`
    INSERT INTO tickets (ref,developer,site,plot_number,items,quantity,reason,delivery_request,images)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING id,ref,status,developer,site,plot_number,items,quantity,reason,
      delivery_request, to_char(delivery_date,'YYYY-MM-DD') AS delivery_date,
      po_number, accepted_at AT TIME ZONE 'UTC' AS accepted_at, ordered_items, images,
      created_at AT TIME ZONE 'UTC' AS created_at,
      updated_at AT TIME ZONE 'UTC' AS updated_at
  `, [ref, sanitise(payload.developer), sanitise(payload.site), sanitise(payload.plot_number),
      itemsText, quantity, reason, JSON.stringify(payload.delivery_request), imageUris]);

  const ticket = rowToTicket(row.rows[0]);

  if (Array.isArray(payload.items) && payload.items.length > 0) {
    console.log(`[LINE_ITEMS] Inserting ${payload.items.length} line item(s) for ticket ${ticket.id}`);
    for (const item of payload.items as LineItemInput[]) {
      await pool.query(
        'INSERT INTO ticket_items (ticket_id,description,quantity,reason) VALUES ($1,$2,$3,$4)',
        [ticket.id, sanitise(item.description), item.quantity, item.reason]
      );
      console.log(`[LINE_ITEMS]  + "${item.description}" qty=${item.quantity} reason=${item.reason}`);
    }
  }

  await upsertLocation(payload);
  ticket.line_items = await getLineItems(ticket.id);
  return ticket;
}

async function upsertLocation(p: CreateTicketPayload): Promise<void> {
  await pool.query(`
    INSERT INTO locations (developer,site,plot_number,account_number)
    VALUES ($1,$2,$3,$4)
    ON CONFLICT (developer,site,plot_number) DO UPDATE SET account_number = EXCLUDED.account_number
  `, [sanitise(p.developer), sanitise(p.site), sanitise(p.plot_number), sanitise(p.account_number || '')]);
}

export async function getLineItems(ticketId: string): Promise<TicketItem[]> {
  const r = await pool.query(
    'SELECT id,ticket_id,description,quantity,reason FROM ticket_items WHERE ticket_id=$1',
    [ticketId]
  );
  return r.rows;
}

export async function getTicketById(id: string): Promise<Ticket | null> {
  const r = await pool.query(`
    SELECT id,ref,status,developer,site,plot_number,items,quantity,reason,
      delivery_request, to_char(delivery_date,'YYYY-MM-DD') AS delivery_date,
      po_number, accepted_at AT TIME ZONE 'UTC' AS accepted_at, ordered_items, images,
      created_at AT TIME ZONE 'UTC' AS created_at,
      updated_at AT TIME ZONE 'UTC' AS updated_at
    FROM tickets WHERE id=$1`, [id]);
  if (r.rows.length === 0) return null;
  const ticket = rowToTicket(r.rows[0]);
  ticket.line_items = await getLineItems(id);
  return ticket;
}

export { getUnreadCount, markMessagesRead, getTicketMessages } from './messageService';
