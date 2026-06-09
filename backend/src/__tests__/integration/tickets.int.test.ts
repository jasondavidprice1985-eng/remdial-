import { describe, beforeAll, it, expect } from 'vitest';
import supertest from 'supertest';
import { buildApp, mountRoutes, cleanDatabase } from './helpers';

let request: supertest.SuperTest<supertest.Test>;
let managerToken: string;
let officeToken: string;

beforeAll(async () => {
  await cleanDatabase();

  const { app, httpServer } = buildApp();
  await mountRoutes(app);
  request = supertest(app) as unknown as supertest.SuperTest<supertest.Test>;

  const m = await request.post('/api/v1/auth/login').send({ username: 'manager', password: 'testpass' });
  managerToken = m.body.token;
  const o = await request.post('/api/v1/auth/login').send({ username: 'office', password: 'testpass' });
  officeToken = o.body.token;
});

describe('Tickets API', () => {
  const validTicket = {
    developer: 'Acme Homes',
    site: 'Green Valley',
    plot_number: 'P1',
    items: 'Fix plumbing',
    quantity: 2,
    reason: 'missing_omission',
    delivery_request: { type: 'next_delivery', date: null },
  };

  it('POST /api/v1/tickets - manager can create a ticket', async () => {
    const res = await request.post('/api/v1/tickets')
      .set('Authorization', `Bearer ${managerToken}`)
      .send(validTicket);
    expect(res.status).toBe(201);
    expect(res.body.ticket).toHaveProperty('id');
    expect(res.body.ticket.ref).toMatch(/^RM-/);
    expect(res.body.ticket.developer).toBe('Acme Homes');
  });

  it('POST /api/v1/tickets - unauthorised returns 401', async () => {
    const res = await request.post('/api/v1/tickets').send(validTicket);
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/tickets - invalid payload returns 400', async () => {
    const res = await request.post('/api/v1/tickets')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('GET /api/v1/tickets - returns tickets array', async () => {
    const res = await request.get('/api/v1/tickets')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.tickets)).toBe(true);
    expect(res.body.tickets.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/v1/tickets?status=pending - filters by status', async () => {
    const res = await request.get('/api/v1/tickets?status=pending')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.tickets.every((t: any) => t.status === 'pending')).toBe(true);
  });

  it('GET /api/v1/tickets/:id - returns single ticket with messages', async () => {
    const list = await request.get('/api/v1/tickets')
      .set('Authorization', `Bearer ${managerToken}`);
    const ticketId = list.body.tickets[0].id;

    const res = await request.get(`/api/v1/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.ticket.id).toBe(ticketId);
    expect(Array.isArray(res.body.messages)).toBe(true);
  });

  it('GET /api/v1/tickets/:id - 404 for unknown id', async () => {
    const res = await request.get('/api/v1/tickets/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(404);
  });
});
