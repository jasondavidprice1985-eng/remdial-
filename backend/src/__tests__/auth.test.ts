import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Response, NextFunction } from 'express';
import { requireRole, validateIdParam, AuthenticatedRequest } from '../middleware/auth';

function mockReq(overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest {
  return {
    user: undefined,
    params: {},
    ...overrides,
  } as AuthenticatedRequest;
}

function mockRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe('requireRole', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  it('allows matching role through', () => {
    const req = mockReq({ user: { username: 'alice', role: 'office' } });
    const res = mockRes();
    requireRole('office')(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows when role matches one of multiple allowed roles', () => {
    const req = mockReq({ user: { username: 'bob', role: 'manager' } });
    const res = mockRes();
    requireRole('office', 'manager')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('blocks non-matching role with 403', () => {
    const req = mockReq({ user: { username: 'bob', role: 'manager' } });
    const res = mockRes();
    requireRole('office')(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('blocks when no user is set', () => {
    const req = mockReq();
    const res = mockRes();
    requireRole('office')(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('validateIdParam', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  it('allows a valid UUID', () => {
    const req = mockReq({ params: { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' } } as Partial<AuthenticatedRequest>);
    const res = mockRes();
    validateIdParam(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects "banana"', () => {
    const req = mockReq({ params: { id: 'banana' } } as Partial<AuthenticatedRequest>);
    const res = mockRes();
    validateIdParam(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('allows empty id param (Express would not match this route anyway)', () => {
    const req = mockReq({ params: { id: '' } } as Partial<AuthenticatedRequest>);
    const res = mockRes();
    validateIdParam(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('allows request with no :id param (other routes)', () => {
    const req = mockReq({ params: {} } as Partial<AuthenticatedRequest>);
    const res = mockRes();
    validateIdParam(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('is case-insensitive for hex chars', () => {
    const req = mockReq({ params: { id: 'A1B2C3D4-E5F6-7890-ABCD-EF1234567890' } } as Partial<AuthenticatedRequest>);
    const res = mockRes();
    validateIdParam(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
