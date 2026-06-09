import { describe, beforeAll, it, expect } from 'vitest';
import supertest from 'supertest';
import { buildApp, mountRoutes } from './helpers';

let request: supertest.SuperTest<supertest.Test>;

beforeAll(async () => {
  const { app, httpServer } = buildApp();
  await mountRoutes(app);
  request = supertest(app) as unknown as supertest.SuperTest<supertest.Test>;
});

describe('Auth API', () => {
  it('POST /api/v1/auth/login - valid manager credentials return token', async () => {
    const res = await request.post('/api/v1/auth/login').send({
      username: 'manager', password: 'testpass',
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.role).toBe('manager');
  });

  it('POST /api/v1/auth/login - valid office credentials return token', async () => {
    const res = await request.post('/api/v1/auth/login').send({
      username: 'office', password: 'testpass',
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.role).toBe('office');
  });

  it('POST /api/v1/auth/login - wrong password returns 401', async () => {
    const res = await request.post('/api/v1/auth/login').send({
      username: 'manager', password: 'wrongpass',
    });
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/auth/login - unknown user returns 401', async () => {
    const res = await request.post('/api/v1/auth/login').send({
      username: 'ghost', password: 'testpass',
    });
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/auth/login - empty body returns 400', async () => {
    const res = await request.post('/api/v1/auth/login').send({});
    expect(res.status).toBe(400);
  });
});
