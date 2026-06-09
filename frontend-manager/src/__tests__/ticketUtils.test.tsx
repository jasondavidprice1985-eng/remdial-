import { describe, it, expect } from 'vitest';
import { sortTickets } from '../utils/sortTickets';
import { ticketNeedsAttention, countNeedingAttention } from '../utils/ticketAttention';
import type { Ticket } from '@shared/types';

function makeTicket(overrides: Partial<Ticket>): Ticket {
  return {
    id: '1',
    ref: 'RM-001',
    status: 'pending',
    developer: 'Dev',
    site: 'Site',
    plot_number: 'P1',
    items: 'items',
    line_items: [],
    quantity: 1,
    reason: 'missing_omission',
    delivery_request: { type: 'next_delivery', date: null },
    delivery_date: null,
    po_number: null,
    accepted_at: null, ordered_items: null,
    images: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('sortTickets', () => {
  it('puts attention-needing tickets first', () => {
    const normal = makeTicket({ id: '1', status: 'ordered', updated_at: '2026-01-02T00:00:00.000Z' });
    const urgent = makeTicket({ id: '2', unread_count: 1, status: 'pending', updated_at: '2026-01-01T00:00:00.000Z' });
    const sorted = sortTickets([normal, urgent]);
    expect(sorted[0].id).toBe('2');
  });

  it('sorts by updated_at within same priority', () => {
    const older = makeTicket({ id: '1', status: 'ordered', updated_at: '2026-01-01T00:00:00.000Z' });
    const newer = makeTicket({ id: '2', status: 'ordered', updated_at: '2026-01-03T00:00:00.000Z' });
    const sorted = sortTickets([older, newer]);
    expect(sorted[0].id).toBe('2');
  });

  it('handles empty array', () => {
    expect(sortTickets([])).toEqual([]);
  });
});

describe('ticketNeedsAttention', () => {
  it('returns true when unread_count > 0', () => {
    const t = makeTicket({ unread_count: 1 });
    expect(ticketNeedsAttention(t, new Set())).toBe(true);
  });

  it('returns true when query not responded to', () => {
    const t = makeTicket({ status: 'query' });
    expect(ticketNeedsAttention(t, new Set())).toBe(true);
  });

  it('returns false when query is responded to', () => {
    const t = makeTicket({ id: '1', status: 'query' });
    expect(ticketNeedsAttention(t, new Set(['1']))).toBe(false);
  });

  it('returns false for ordered with no unread', () => {
    const t = makeTicket({ status: 'ordered', unread_count: 0 });
    expect(ticketNeedsAttention(t, new Set())).toBe(false);
  });
});

describe('countNeedingAttention', () => {
  it('counts tickets needing attention', () => {
    const tickets = [
      makeTicket({ id: '1', unread_count: 1 }),
      makeTicket({ id: '2', status: 'query' }),
      makeTicket({ id: '3', status: 'ordered' }),
    ];
    expect(countNeedingAttention(tickets, new Set())).toBe(2);
  });
});
