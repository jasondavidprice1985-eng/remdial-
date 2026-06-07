import { describe, it, expect } from 'vitest';
import { validateCreatePayload } from '../services/ticketHelpers';

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    developer: 'Acme Homes',
    site: 'Riverside Park',
    plot_number: '12A',
    items: [{ description: 'Kitchen tap', quantity: 2, reason: 'damaged_on_arrival' }],
    quantity: 2,
    reason: 'damaged_on_arrival',
    delivery_request: { type: 'next_delivery', date: null },
    images: [],
    ...overrides,
  };
}

describe('validateCreatePayload', () => {
  it('accepts a valid payload with line items', () => {
    expect(validateCreatePayload(validPayload())).toBeNull();
  });

  it('accepts a valid payload with string items (legacy format)', () => {
    const p = validPayload({ items: 'Kitchen tap x2', quantity: 2, reason: 'missing_omission' });
    expect(validateCreatePayload(p)).toBeNull();
  });

  it('rejects missing developer', () => {
    expect(validateCreatePayload(validPayload({ developer: '' }))).toMatch(/developer/i);
  });

  it('rejects developer over 100 chars', () => {
    expect(validateCreatePayload(validPayload({ developer: 'A'.repeat(101) }))).toMatch(/developer/i);
  });

  it('rejects missing site', () => {
    expect(validateCreatePayload(validPayload({ site: '' }))).toMatch(/site/i);
  });

  it('rejects missing plot_number', () => {
    expect(validateCreatePayload(validPayload({ plot_number: '' }))).toMatch(/plot_number/i);
  });

  it('rejects empty items array', () => {
    expect(validateCreatePayload(validPayload({ items: [] }))).toMatch(/items/i);
  });

  it('rejects line item with missing description', () => {
    const p = validPayload({ items: [{ description: '', quantity: 1, reason: 'site_loss' }] });
    expect(validateCreatePayload(p)).toMatch(/description/i);
  });

  it('rejects line item with quantity 0', () => {
    const p = validPayload({ items: [{ description: 'Tap', quantity: 0, reason: 'site_loss' }] });
    expect(validateCreatePayload(p)).toMatch(/quantity/i);
  });

  it('rejects line item with non-integer quantity', () => {
    const p = validPayload({ items: [{ description: 'Tap', quantity: 1.5, reason: 'site_loss' }] });
    expect(validateCreatePayload(p)).toMatch(/quantity/i);
  });

  it('rejects line item with invalid reason', () => {
    const p = validPayload({ items: [{ description: 'Tap', quantity: 1, reason: 'theft' }] });
    expect(validateCreatePayload(p)).toMatch(/reason/i);
  });

  it('accepts all five valid reasons', () => {
    const reasons = ['damaged_on_arrival', 'damaged_by_fitter', 'missing_omission', 'wrong_specification', 'site_loss'];
    for (const reason of reasons) {
      const p = validPayload({ items: [{ description: 'Item', quantity: 1, reason }] });
      expect(validateCreatePayload(p)).toBeNull();
    }
  });

  it('rejects invalid delivery_request type', () => {
    const p = validPayload({ delivery_request: { type: 'asap', date: null } });
    expect(validateCreatePayload(p)).toMatch(/delivery_request/i);
  });

  it('rejects specific_date without a date', () => {
    const p = validPayload({ delivery_request: { type: 'specific_date', date: null } });
    expect(validateCreatePayload(p)).toMatch(/date/i);
  });

  it('accepts specific_date with a date', () => {
    const p = validPayload({ delivery_request: { type: 'specific_date', date: '2026-07-01' } });
    expect(validateCreatePayload(p)).toBeNull();
  });

  it('rejects images not an array', () => {
    const p = validPayload({ images: 'notarray' });
    expect(validateCreatePayload(p)).toMatch(/images/i);
  });

  it('rejects more than 5 images', () => {
    const p = validPayload({ images: ['a', 'b', 'c', 'd', 'e', 'f'] });
    expect(validateCreatePayload(p)).toMatch(/5/);
  });

  it('accepts payload with no images field', () => {
    const p = validPayload();
    delete p.images;
    expect(validateCreatePayload(p)).toBeNull();
  });

  // Legacy string items validation
  it('rejects string items over 500 chars', () => {
    const p = validPayload({ items: 'X'.repeat(501), quantity: 1, reason: 'site_loss' });
    expect(validateCreatePayload(p)).toMatch(/items/i);
  });

  it('rejects legacy format with bad reason', () => {
    const p = validPayload({ items: 'Tap', quantity: 1, reason: 'invalid' });
    expect(validateCreatePayload(p)).toMatch(/reason/i);
  });
});
