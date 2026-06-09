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

  const ref = 'RM-MSG' + String(Math.floor(Math.random() * 90000) + 10000);
  const create = await request.post('/api/v1/tickets')
    .set('Authorization', `Bearer ${managerToken}`)
    .send({
      ref, developer: 'Msg Dev', site: 'Msg Site',
      plot_number: 'P3', items: 'Msg items', quantity: 1,
      reason: 'missing_omission',
      delivery_request: { type: 'next_delivery', date: null },
    });
  ticketId = create.body.ticket.id;
});

describe('Messages API', () => {
  it('POST /api/v1/tickets/:id/messages - manager sends text message', async () => {
    const res = await request.post(`/api/v1/tickets/${ticketId}/messages`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ text: 'Hello from manager', sender: 'manager', is_query: false });
    expect(res.status).toBe(201);
    expect(res.body.message.text).toBe('Hello from manager');
    expect(res.body.message.sender).toBe('manager');
  });

  it('POST /api/v1/tickets/:id/messages - office sends text message', async () => {
    const res = await request.post(`/api/v1/tickets/${ticketId}/messages`)
      .set('Authorization', `Bearer ${officeToken}`)
      .send({ text: 'Hello from office', sender: 'office', is_query: false });
    expect(res.status).toBe(201);
    expect(res.body.message.text).toBe('Hello from office');
  });

  it('POST /api/v1/tickets/:id/messages - missing text returns 400', async () => {
    const res = await request.post(`/api/v1/tickets/${ticketId}/messages`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ sender: 'manager', is_query: false });
    expect(res.status).toBe(400);
  });

  it('POST /api/v1/tickets/:id/messages - missing is_query returns 400', async () => {
    const res = await request.post(`/api/v1/tickets/${ticketId}/messages`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ text: 'hi', sender: 'manager' });
    expect(res.status).toBe(400);
  });

  it('POST /api/v1/tickets/:id/messages - unauthorized returns 401', async () => {
    const res = await request.post(`/api/v1/tickets/${ticketId}/messages`)
      .send({ text: 'hack', sender: 'manager', is_query: false });
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/tickets/:id/messages - invalid sender returns 400', async () => {
    const res = await request.post(`/api/v1/tickets/${ticketId}/messages`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ text: 'hi', sender: 'hacker', is_query: false });
    expect(res.status).toBe(400);
  });

  it('GET /api/v1/tickets/:id/messages - returns messages for ticket', async () => {
    const res = await request.get(`/api/v1/tickets/${ticketId}/messages`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.messages)).toBe(true);
    expect(res.body.messages.length).toBeGreaterThanOrEqual(2);
  });

  it('GET /api/v1/tickets/:id/messages - empty for ticket with no messages', async () => {
    const ref = 'RM-NOMSG' + String(Math.floor(Math.random() * 90000) + 10000);
    const create = await request.post('/api/v1/tickets')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        ref, developer: 'NoMsg', site: 'NoMsg Site',
        plot_number: 'P99', items: 'x', quantity: 1,
        reason: 'missing_omission',
        delivery_request: { type: 'next_delivery', date: null },
      });

    const res = await request.get(`/api/v1/tickets/${create.body.ticket.id}/messages`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.messages).toEqual([]);
  });

  it('POST /api/v1/tickets/:id/messages - is_query=true triggers query status', async () => {
    const res = await request.post(`/api/v1/tickets/${ticketId}/messages`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ text: 'This is a query', sender: 'manager', is_query: true });
    expect(res.status).toBe(201);

    const ticket = await request.get(`/api/v1/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(ticket.body.ticket.status).toBe('query');
  });

  it('POST /api/v1/tickets/:id/messages - 404 for unknown ticket', async () => {
    const res = await request.post('/api/v1/tickets/00000000-0000-0000-0000-000000000000/messages')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ text: 'hi', sender: 'manager', is_query: false });
    expect(res.status).toBe(404);
  });
});
