import type { Ticket, TicketReason } from '../types';

const VALID_REASONS = ['damaged_on_arrival','damaged_by_fitter','missing_omission','wrong_specification','site_loss'];

export function validateCreatePayload(body: Record<string, unknown>): string | null {
  if (!body.developer || String(body.developer).length > 100) return 'developer required (max 100)';
  if (!body.site      || String(body.site).length      > 100) return 'site required (max 100)';
  if (!body.plot_number || String(body.plot_number).length > 50) return 'plot_number required (max 50)';
  const items = body.items;
  if (Array.isArray(items)) {
    if (items.length === 0) return 'items array must not be empty';
    for (const item of items as Record<string, unknown>[]) {
      if (!item.description || String(item.description).trim().length === 0) return 'each item requires a description';
      if (!Number.isInteger(item.quantity) || (item.quantity as number) < 1) return 'each item quantity must be int >= 1';
      if (!item.reason || !VALID_REASONS.includes(item.reason as string)) return 'each item requires a valid reason';
    }
  } else {
    if (!items || String(items).length > 500) return 'items required (max 500)';
    if (!Number.isInteger(body.quantity) || (body.quantity as number) < 1) return 'quantity must be int >= 1';
    if (!body.reason || !VALID_REASONS.includes(body.reason as string)) return 'invalid reason';
  }
  const dr = body.delivery_request as Record<string, unknown> | undefined;
  if (!dr || (dr.type !== 'next_delivery' && dr.type !== 'specific_date')) return 'invalid delivery_request.type';
  if (dr.type === 'specific_date' && !dr.date) return 'delivery_request.date required for specific_date';
  if (body.images && !Array.isArray(body.images)) return 'images must be an array';
  if (Array.isArray(body.images) && (body.images as unknown[]).length > 5) return 'max 5 images';
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToTicket(row: any): Ticket {
  return {
    id:               row.id,
    ref:              row.ref,
    status:           row.status,
    developer:        row.developer,
    site:             row.site,
    plot_number:      row.plot_number,
    items:            row.items ?? '',
    line_items:       [],
    quantity:         Number(row.quantity),
    reason:           row.reason as TicketReason,
    delivery_request: typeof row.delivery_request === 'string'
                        ? JSON.parse(row.delivery_request) : row.delivery_request,
    delivery_date:    row.delivery_date ?? null,
    po_number:        row.po_number ?? null,
    accepted_at:      row.accepted_at instanceof Date ? row.accepted_at.toISOString() : (row.accepted_at ? String(row.accepted_at) : null),
    images:           row.images ?? [],
    created_at:       row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updated_at:       row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}
