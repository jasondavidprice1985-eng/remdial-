import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

vi.mock('../db', () => ({
  pool: {
    query: vi.fn(),
  },
}));

describe('loginUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns token and role for valid credentials', async () => {
    const { pool } = await import('../db');
    const hash = await bcrypt.hash('correct_password', 12);
    (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({
      rows: [{
        id: 'user-1',
        username: 'office',
        password_hash: hash,
        role: 'office',
        display_name: 'Office User',
        active: true,
        must_change_password: false,
      }],
      rowCount: 1,
    });

    const { loginUser } = await import('../services/authService');
    const result = await loginUser('office', 'correct_password', false);

    expect(result).not.toBeNull();
    expect(result!.role).toBe('office');
    expect(result!.token).toBeTruthy();
    expect(result!.display_name).toBe('Office User');
    expect(result!.must_change_password).toBe(false);

    const decoded = jwt.verify(result!.token, process.env.JWT_SECRET!) as any;
    expect(decoded.username).toBe('office');
  });

  it('returns null for non-existent user', async () => {
    const { pool } = await import('../db');
    (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [], rowCount: 0 });

    const { loginUser } = await import('../services/authService');
    const result = await loginUser('nobody', 'password', false);
    expect(result).toBeNull();
  });

  it('returns null for wrong password', async () => {
    const { pool } = await import('../db');
    const hash = await bcrypt.hash('real_password', 12);
    (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({
      rows: [{
        id: 'user-1',
        username: 'office',
        password_hash: hash,
        role: 'office',
        display_name: '',
        active: true,
        must_change_password: false,
      }],
      rowCount: 1,
    });

    const { loginUser } = await import('../services/authService');
    const result = await loginUser('office', 'wrong_password', false);
    expect(result).toBeNull();
  });

  it('returns null for inactive users', async () => {
    const { pool } = await import('../db');
    const hash = await bcrypt.hash('password', 12);
    (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({
      rows: [{
        id: 'user-1',
        username: 'office',
        password_hash: hash,
        role: 'office',
        display_name: '',
        active: false,
        must_change_password: false,
      }],
      rowCount: 1,
    });

    const { loginUser } = await import('../services/authService');
    const result = await loginUser('office', 'password', false);
    expect(result).toBeNull();
  });

  it('generates 30d token when remember is true', async () => {
    const { pool } = await import('../db');
    const hash = await bcrypt.hash('pass', 12);
    (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({
      rows: [{
        id: 'user-1',
        username: 'manager',
        password_hash: hash,
        role: 'manager',
        display_name: '',
        active: true,
        must_change_password: false,
      }],
      rowCount: 1,
    });

    const { loginUser } = await import('../services/authService');
    const result = await loginUser('manager', 'pass', true);

    const decoded = jwt.decode(result!.token) as any;
    const maxAge = decoded.exp - decoded.iat;
    expect(maxAge).toBeGreaterThan(24 * 60 * 60); // more than 1 day
  });

  it('returns must_change_password flag from DB', async () => {
    const { pool } = await import('../db');
    const hash = await bcrypt.hash('password', 12);
    (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({
      rows: [{
        id: 'user-1',
        username: 'new_user',
        password_hash: hash,
        role: 'manager',
        display_name: 'New User',
        active: true,
        must_change_password: true,
      }],
      rowCount: 1,
    });

    const { loginUser } = await import('../services/authService');
    const result = await loginUser('new_user', 'password', false);

    expect(result!.must_change_password).toBe(true);
  });
});

describe('seedUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates admin when no users exist', async () => {
    const { pool } = await import('../db');
    (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [], rowCount: 0 });

    const { seedUsers } = await import('../services/authService');
    await seedUsers();

    // One SELECT to check existence, one INSERT for admin
    expect(pool.query).toHaveBeenCalledTimes(2);
  });

  it('skips when users already exist', async () => {
    const { pool } = await import('../db');
    (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [{ 1: 1 }], rowCount: 1 });

    const { seedUsers } = await import('../services/authService');
    await seedUsers();

    // Only the SELECT, no INSERT
    expect(pool.query).toHaveBeenCalledTimes(1);
  });
});
