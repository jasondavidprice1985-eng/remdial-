import { describe, beforeAll, it, expect } from 'vitest';
import supertest from 'supertest';
import { buildApp, mountRoutes, cleanDatabase } from './helpers';

let request: supertest.SuperTest<supertest.Test>;
let managerToken: string;
let officeToken: string;
let ticketId: string;

beforeAll(async () => {
  await cleanDatabase();

  const { app, httpServer } = buildApp();
  await mountRoutes(app);
  request = supertest(app) as unknown as supertest.SuperTest<supertest.Test>;

  const m = await request.post('/api/v1/auth/login').send({ username: 'manager', password: 'testpass' });
  managerToken = m.body.token;
  const o = await request.post('/api/v1/auth/login').send({ username: 'office', password: 'testpass' });
  officeToken = o.body.token;

  const create = await request.post('/api/v1/tickets')
    .set('Authorization', `Bearer ${managerToken}`)
    .send({
      ref: 'RM-ACT' + String(Math.floor(Math.random() * 90000) + 10000),
      developer: 'Action Dev', site: 'Action Site',
      plot_number: 'P2', items: 'Items', quantity: 1,
      reason: 'damaged_on_arrival',
      delivery_request: { type: 'next_delivery', date: null },
    });
  ticketId = create.body.ticket.id;
});

describe('Ticket Actions API', () => {
  it('PATCH /api/v1/tickets/:id/query - sets status to query', async () => {
    const res = await request.patch(`/api/v1/tickets/${ticketId}/query`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.ticket.status).toBe('query');
  });

  it('PATCH /api/v1/tickets/:id/query - 409 if already queried', async () => {
    const res = await request.patch(`/api/v1/tickets/${ticketId}/query`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(409);
  });

  it('PATCH /api/v1/tickets/:id/clarified - returns to pending', async () => {
    const res = await request.patch(`/api/v1/tickets/${ticketId}/clarified`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.ticket.status).toBe('pending');
  });

  it('PATCH /api/v1/tickets/:id/accept - accepts a ticket', async () => {
    const res = await request.patch(`/api/v1/tickets/${ticketId}/accept`)
      .set('Authorization', `Bearer ${officeToken}`);
    expect(res.status).toBe(200);
    expect(res.body.ticket.accepted_at).toBeTruthy();
  });

  it('PATCH /api/v1/tickets/:id/accept - 409 if already accepted', async () => {
    const res = await request.patch(`/api/v1/tickets/${ticketId}/accept`)
      .set('Authorization', `Bearer ${officeToken}`);
    expect(res.status).toBe(409);
  });

  it('PATCH /api/v1/tickets/:id/order - orders with PO and delivery date', async () => {
    const res = await request.patch(`/api/v1/tickets/${ticketId}/order`)
      .set('Authorization', `Bearer ${officeToken}`)
      .send({ po_number: 'PO-12345', delivery_date: '2026-07-01' });
    expect(res.status).toBe(200);
    expect(res.body.ticket.status).toBe('ordered');
    expect(res.body.ticket.po_number).toBe('PO-12345');
    expect(res.body.ticket.delivery_date).toMatch(/2026-07-01/);
  });

  it('PATCH /api/v1/tickets/:id/order - missing po returns 400', async () => {
    const res = await request.patch(`/api/v1/tickets/${ticketId}/order`)
      .set('Authorization', `Bearer ${officeToken}`)
      .send({ po_number: '', delivery_date: '2026-07-01' });
    expect(res.status).toBe(400);
  });

  it('PATCH /api/v1/tickets/:id/archive - archives an ordered ticket', async () => {
    const res = await request.patch(`/api/v1/tickets/${ticketId}/archive`)
      .set('Authorization', `Bearer ${officeToken}`);
    expect(res.status).toBe(200);
    expect(res.body.ticket.status).toBe('archived');
  });

  it('PATCH /api/v1/tickets/:id/archive - 409 if already archived', async () => {
    const res = await request.patch(`/api/v1/tickets/${ticketId}/archive`)
      .set('Authorization', `Bearer ${officeToken}`);
    expect(res.status).toBe(409);
  });

  it('GET /api/v1/settings/next-delivery - returns next delivery date', async () => {
    const res = await request.get('/api/v1/settings/next-delivery')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('next_delivery_date');
  });

  it('PATCH /api/v1/tickets/:id/query - 404 for unknown id', async () => {
    const res = await request.patch('/api/v1/tickets/00000000-0000-0000-0000-000000000000/query')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(404);
  });
});
