import { describe, it, expect } from 'vitest';
import { rowToTicket } from '../services/ticketHelpers';

function fakeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    ref: 'RM-ABC123',
    status: 'pending',
    developer: 'Acme',
    site: 'Site A',
    plot_number: '1',
    items: 'Tap',
    quantity: 1,
    reason: 'missing_omission',
    delivery_request: { type: 'next_delivery', date: null },
    delivery_date: null,
    po_number: null,
    accepted_at: null,
    ordered_items: null,
    images: ['img1.jpg'],
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('rowToTicket', () => {
  it('converts a database row to a Ticket object', () => {
    const ticket = rowToTicket(fakeRow());
    expect(ticket.id).toBe('00000000-0000-0000-0000-000000000001');
    expect(ticket.ref).toBe('RM-ABC123');
    expect(ticket.status).toBe('pending');
    expect(ticket.quantity).toBe(1);
    expect(ticket.line_items).toEqual([]);
    expect(ticket.images).toEqual(['img1.jpg']);
  });

  it('converts Date objects to ISO strings', () => {
    const ticket = rowToTicket(fakeRow());
    expect(ticket.created_at).toBe('2026-01-01T00:00:00.000Z');
    expect(ticket.updated_at).toBe('2026-01-01T00:00:00.000Z');
  });

  it('handles string timestamps (already formatted by postgres)', () => {
    const ticket = rowToTicket(fakeRow({
      created_at: '2026-01-01 00:00:00+00',
      updated_at: '2026-01-01 00:00:00+00',
    }));
    expect(ticket.created_at).toBe('2026-01-01 00:00:00+00');
  });

  it('parses delivery_request from JSON string', () => {
    const ticket = rowToTicket(fakeRow({
      delivery_request: '{"type":"specific_date","date":"2026-07-01"}',
    }));
    expect(ticket.delivery_request.type).toBe('specific_date');
    expect(ticket.delivery_request.date).toBe('2026-07-01');
  });

  it('handles delivery_request already as object', () => {
    const ticket = rowToTicket(fakeRow({
      delivery_request: { type: 'next_delivery', date: null },
    }));
    expect(ticket.delivery_request.type).toBe('next_delivery');
  });

  it('parses ordered_items from JSON string', () => {
    const items = [{ description: 'Tap', quantity: 2, sap_code: 'SAP001' }];
    const ticket = rowToTicket(fakeRow({ ordered_items: JSON.stringify(items) }));
    expect(ticket.ordered_items).toEqual(items);
  });

  it('handles null ordered_items', () => {
    const ticket = rowToTicket(fakeRow({ ordered_items: null }));
    expect(ticket.ordered_items).toBeNull();
  });

  it('handles accepted_at as Date', () => {
    const ticket = rowToTicket(fakeRow({ accepted_at: new Date('2026-03-15T10:00:00Z') }));
    expect(ticket.accepted_at).toBe('2026-03-15T10:00:00.000Z');
  });

  it('handles null accepted_at', () => {
    const ticket = rowToTicket(fakeRow({ accepted_at: null }));
    expect(ticket.accepted_at).toBeNull();
  });

  it('defaults items to empty string when null', () => {
    const ticket = rowToTicket(fakeRow({ items: null }));
    expect(ticket.items).toBe('');
  });

  it('defaults images to empty array when null', () => {
    const ticket = rowToTicket(fakeRow({ images: null }));
    expect(ticket.images).toEqual([]);
  });

  it('coerces quantity to number', () => {
    const ticket = rowToTicket(fakeRow({ quantity: '5' }));
    expect(ticket.quantity).toBe(5);
  });
});
