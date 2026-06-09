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
      }],
      rowCount: 1,
    });

    const { loginUser } = await import('../services/authService');
    const result = await loginUser('office', 'correct_password', false);

    expect(result).not.toBeNull();
    expect(result!.role).toBe('office');
    expect(result!.token).toBeTruthy();

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
      }],
      rowCount: 1,
    });

    const { loginUser } = await import('../services/authService');
    const result = await loginUser('office', 'wrong_password', false);
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
      }],
      rowCount: 1,
    });

    const { loginUser } = await import('../services/authService');
    const result = await loginUser('manager', 'pass', true);

    const decoded = jwt.decode(result!.token) as any;
    const maxAge = decoded.exp - decoded.iat;
    expect(maxAge).toBeGreaterThan(24 * 60 * 60); // more than 1 day
  });
});

describe('seedUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MANAGER_USERNAME = 'test_manager';
    process.env.MANAGER_PASSWORD = 'test_man_pass';
    process.env.OFFICE_USERNAME = 'test_office';
    process.env.OFFICE_PASSWORD = 'test_off_pass';
  });

  it('inserts users that do not exist', async () => {
    const { pool } = await import('../db');
    (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [], rowCount: 0 });

    const { seedUsers } = await import('../services/authService');
    await seedUsers();

    // Should have checked existence for 2 users and inserted 2 users
    expect(pool.query).toHaveBeenCalledTimes(4);
  });

  it('skips users that already exist', async () => {
    const { pool } = await import('../db');
    (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [{ 1: 1 }], rowCount: 1 });

    const { seedUsers } = await import('../services/authService');
    await seedUsers();

    // Should only check existence, no inserts
    expect(pool.query).toHaveBeenCalledTimes(2);
  });
});
