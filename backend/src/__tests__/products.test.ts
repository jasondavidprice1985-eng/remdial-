import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database
const mockQuery = vi.fn();
vi.mock('../db', () => ({ pool: { query: (...args: unknown[]) => mockQuery(...args) } }));

import request from 'supertest';
import express from 'express';
import productsRouter from '../routes/products';

// Mock auth middleware to always pass
vi.mock('../middleware/auth', () => ({
  requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireRole: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateIdParam: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

const app = express();
app.use(express.json());
app.use('/api/v1', productsRouter);

describe('GET /api/v1/products/search', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('returns empty array for short queries', async () => {
    const res = await request(app).get('/api/v1/products/search?q=a');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('returns empty array for missing query', async () => {
    const res = await request(app).get('/api/v1/products/search');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('searches products with valid query', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        { sap_code: 'B40L', description: '400 Base HL LH' },
        { sap_code: 'B40R', description: '400 Base HL RH' },
      ],
    });

    const res = await request(app).get('/api/v1/products/search?q=400+base');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].sap_code).toBe('B40L');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('ILIKE'),
      ['%400 base%']
    );
  });

  it('returns 500 on database error', async () => {
    mockQuery.mockRejectedValue(new Error('db down'));
    const res = await request(app).get('/api/v1/products/search?q=worktop');
    expect(res.status).toBe(500);
  });
});

describe('POST /api/v1/products/learn', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('learns new products', async () => {
    mockQuery.mockResolvedValue({ rowCount: 1 });

    const res = await request(app)
      .post('/api/v1/products/learn')
      .send({ items: [{ sap_code: 'B40L', description: '400 Base HL LH' }] });

    expect(res.status).toBe(200);
    expect(res.body.learned).toBe(1);
  });

  it('rejects empty items', async () => {
    const res = await request(app)
      .post('/api/v1/products/learn')
      .send({ items: [] });

    expect(res.status).toBe(400);
  });

  it('rejects missing items', async () => {
    const res = await request(app)
      .post('/api/v1/products/learn')
      .send({});

    expect(res.status).toBe(400);
  });

  it('skips items with empty code or description', async () => {
    mockQuery.mockResolvedValue({ rowCount: 0 });

    const res = await request(app)
      .post('/api/v1/products/learn')
      .send({ items: [{ sap_code: '', description: 'test' }, { sap_code: 'X', description: '' }] });

    expect(res.status).toBe(200);
    expect(res.body.learned).toBe(0);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
