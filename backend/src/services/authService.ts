import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import type { JWTPayload } from '../types';

export async function seedUsers(): Promise<void> {
  const entries = [
    { username: process.env.MANAGER_USERNAME || 'manager', password: process.env.MANAGER_PASSWORD || 'manager', role: 'manager' },
    { username: process.env.OFFICE_USERNAME  || 'office',  password: process.env.OFFICE_PASSWORD  || 'office',  role: 'office'  },
  ];
  for (const u of entries) {
    const exists = await pool.query('SELECT 1 FROM users WHERE username = $1', [u.username]);
    if (exists.rowCount === 0) {
      const hash = await bcrypt.hash(u.password, 12);
      await pool.query(
        'INSERT INTO users (username, password_hash, role) VALUES ($1,$2,$3)',
        [u.username, hash, u.role]
      );
      console.log(`Seeded user: ${u.username} (${u.role})`);
    }
  }
}

export async function loginUser(
  username: string,
  password: string,
  remember: boolean
): Promise<{ token: string; role: string } | null> {
  const result = await pool.query(
    'SELECT id, username, password_hash, role FROM users WHERE username = $1',
    [username]
  );
  if (result.rows.length === 0) return null;
  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;

  const payload: JWTPayload = { userId: user.id, username: user.username, role: user.role };
  const expiresIn = remember ? '30d' : '8h';
  const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn });
  return { token, role: user.role };
}
