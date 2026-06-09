import { describe, it, expect } from 'vitest';
import { type Ticket } from '@shared/types';

// Test the pure queue stats logic without hook dependencies
function queueCounts(
  tickets: Ticket[],
  respondedQueries: Set<string>,
) {
  const inbox = tickets.filter(t => (t.unread_count ?? 0) > 0).length;
  const query = tickets.filter(t => t.status === 'query' && !respondedQueries.has(t.id)).length;
  const pending = tickets.filter(t => t.status === 'pending').length;
  const ordered = tickets.filter(t => t.status === 'ordered').length;
  return { inbox, query, pending, ordered, total: tickets.length };
}

function makeTicket(overrides: Partial<Ticket>): Ticket {
  return {
    id: '1', ref: 'RM-001', status: 'pending', developer: 'Dev',
    site: 'Site', plot_number: 'P1', items: 'items', line_items: [],
    quantity: 1, reason: 'missing_omission',
    delivery_request: { type: 'next_delivery', date: null },
    delivery_date: null, po_number: null, accepted_at: null, ordered_items: null, images: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('QueueBoard logic', () => {
  it('counts inbox tickets with unread messages', () => {
    const tickets = [
      makeTicket({ id: '1', unread_count: 1 }),
      makeTicket({ id: '2', unread_count: 0 }),
      makeTicket({ id: '3', unread_count: 2 }),
    ];
    const counts = queueCounts(tickets, new Set());
    expect(counts.inbox).toBe(2);
  });

  it('counts query tickets not yet responded to', () => {
    const tickets = [
      makeTicket({ id: '1', status: 'query' }),
      makeTicket({ id: '2', status: 'query' }),
      makeTicket({ id: '3', status: 'pending' }),
    ];
    const counts = queueCounts(tickets, new Set(['1']));
    expect(counts.query).toBe(1);
  });

  it('counts total tickets', () => {
    const tickets = [
      makeTicket({ id: '1' }),
      makeTicket({ id: '2' }),
    ];
    const counts = queueCounts(tickets, new Set());
    expect(counts.total).toBe(2);
  });

  it('handles empty ticket list', () => {
    const counts = queueCounts([], new Set());
    expect(counts).toEqual({ inbox: 0, query: 0, pending: 0, ordered: 0, total: 0 });
  });
});
