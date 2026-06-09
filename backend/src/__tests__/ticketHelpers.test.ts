import { describe, it, expect } from 'vitest';
import { validateCreatePayload, rowToTicket } from '../services/ticketHelpers';

describe('validateCreatePayload', () => {
  const validPayload = {
    developer: 'ABC Builders',
    site: 'Site 42',
    plot_number: 'P123',
    items: 'Kitchen cabinets damaged',
    quantity: 3,
    reason: 'damaged_on_arrival',
    delivery_request: { type: 'next_delivery', date: null },
  };

  it('returns null for a valid payload', () => {
    expect(validateCreatePayload(validPayload)).toBeNull();
  });

  it('returns error when developer is missing', () => {
    const result = validateCreatePayload({ ...validPayload, developer: '' });
    expect(result).toContain('developer');
  });

  it('returns error when developer exceeds 100 chars', () => {
    const result = validateCreatePayload({ ...validPayload, developer: 'A'.repeat(101) });
    expect(result).toContain('developer');
  });

  it('returns error when site is missing', () => {
    const result = validateCreatePayload({ ...validPayload, site: '' });
    expect(result).toContain('site');
  });

  it('returns error when site exceeds 100 chars', () => {
    const result = validateCreatePayload({ ...validPayload, site: 'A'.repeat(101) });
    expect(result).toContain('site');
  });

  it('returns error when plot_number is missing', () => {
    const result = validateCreatePayload({ ...validPayload, plot_number: '' });
    expect(result).toContain('plot_number');
  });

  it('returns error when plot_number exceeds 50 chars', () => {
    const result = validateCreatePayload({ ...validPayload, plot_number: 'A'.repeat(51) });
    expect(result).toContain('plot_number');
  });

  it('returns error when items is missing', () => {
    const result = validateCreatePayload({ ...validPayload, items: '' });
    expect(result).toContain('items');
  });

  it('returns error when items exceeds 500 chars', () => {
    const result = validateCreatePayload({ ...validPayload, items: 'A'.repeat(501) });
    expect(result).toContain('items');
  });

  it('returns error when quantity is not an integer', () => {
    const result = validateCreatePayload({ ...validPayload, quantity: 1.5 });
    expect(result).toContain('quantity');
  });

  it('returns error when quantity is less than 1', () => {
    const result = validateCreatePayload({ ...validPayload, quantity: 0 });
    expect(result).toContain('quantity');
  });

  it('returns error when reason is invalid', () => {
    const result = validateCreatePayload({ ...validPayload, reason: 'invalid_reason' });
    expect(result).toContain('reason');
  });

  it('returns error when delivery_request is missing', () => {
    const { delivery_request, ...noDelivery } = validPayload;
    const result = validateCreatePayload(noDelivery);
    expect(result).toContain('delivery_request');
  });

  it('returns error when delivery_request.type is invalid', () => {
    const result = validateCreatePayload({
      ...validPayload,
      delivery_request: { type: 'invalid', date: null },
    });
    expect(result).toContain('delivery_request');
  });

  it('returns error when specific_date has no date', () => {
    const result = validateCreatePayload({
      ...validPayload,
      delivery_request: { type: 'specific_date', date: '' },
    });
    expect(result).toContain('delivery_request');
  });

  it('returns error when images exceed 5', () => {
    const result = validateCreatePayload({
      ...validPayload,
      images: ['a', 'b', 'c', 'd', 'e', 'f'],
    });
    expect(result).toContain('images');
  });

  it('accepts valid line items array', () => {
    const payload = {
      ...validPayload,
      items: [
        { description: 'Cabinet door', quantity: 2, reason: 'damaged_on_arrival' },
        { description: 'Worktop', quantity: 1, reason: 'damaged_by_fitter' },
      ],
    };
    expect(validateCreatePayload(payload)).toBeNull();
  });

  it('rejects empty items array', () => {
    const payload = { ...validPayload, items: [] };
    const result = validateCreatePayload(payload);
    expect(result).toContain('items');
  });

  it('rejects line item without description', () => {
    const payload = {
      ...validPayload,
      items: [{ description: '  ', quantity: 1, reason: 'damaged_on_arrival' }],
    };
    const result = validateCreatePayload(payload);
    expect(result).toContain('description');
  });

  it('rejects line item with invalid quantity', () => {
    const payload = {
      ...validPayload,
      items: [{ description: 'Door', quantity: 0, reason: 'damaged_on_arrival' }],
    };
    const result = validateCreatePayload(payload);
    expect(result).toContain('quantity');
  });

  it('rejects line item with invalid reason', () => {
    const payload = {
      ...validPayload,
      items: [{ description: 'Door', quantity: 1, reason: 'bogus' }],
    };
    const result = validateCreatePayload(payload);
    expect(result).toContain('reason');
  });

  it('body with no fields returns first error (developer)', () => {
    const result = validateCreatePayload({});
    expect(result).toContain('developer');
  });
});

describe('rowToTicket', () => {
  it('converts a database row to a Ticket object', () => {
    const row = {
      id: 'abc-123',
      ref: 'RM-ABC123',
      status: 'pending',
      developer: 'Test Dev',
      site: 'Test Site',
      plot_number: 'P1',
      items: 'Some items',
      quantity: 2,
      reason: 'damaged_on_arrival',
      delivery_request: JSON.stringify({ type: 'next_delivery', date: null }),
      delivery_date: null,
      po_number: null,
      accepted_at: null,
      images: ['/uploads/img_abc.jpg'],
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
    };

    const ticket = rowToTicket(row);
    expect(ticket.id).toBe('abc-123');
    expect(ticket.ref).toBe('RM-ABC123');
    expect(ticket.status).toBe('pending');
    expect(ticket.developer).toBe('Test Dev');
    expect(ticket.images).toEqual(['/uploads/img_abc.jpg']);
    expect(ticket.line_items).toEqual([]);
    expect(ticket.delivery_request).toEqual({ type: 'next_delivery', date: null });
  });

  it('parses delivery_request when it is already an object', () => {
    const row = {
      id: 'abc-123',
      ref: 'RM-ABC123',
      status: 'pending',
      developer: 'D',
      site: 'S',
      plot_number: 'P',
      items: 'items',
      quantity: 1,
      reason: 'site_loss',
      delivery_request: { type: 'specific_date', date: '2026-06-01' },
      delivery_date: null,
      po_number: null,
      accepted_at: null,
      images: [],
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
    };

    const ticket = rowToTicket(row);
    expect(ticket.delivery_request).toEqual({ type: 'specific_date', date: '2026-06-01' });
  });

  it('handles string dates properly', () => {
    const row = {
      id: 'abc',
      ref: 'RM-ABC',
      status: 'pending',
      developer: 'D',
      site: 'S',
      plot_number: 'P',
      items: 'items',
      quantity: 1,
      reason: 'missing_omission',
      delivery_request: '{}',
      delivery_date: null,
      po_number: null,
      accepted_at: null,
      images: [],
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    };

    const ticket = rowToTicket(row);
    expect(ticket.created_at).toBe('2026-01-01T00:00:00.000Z');
  });
});
