import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import type { JWTPayload } from '../types';

const BCRYPT_ROUNDS = 12;

export async function seedUsers(): Promise<void> {
  const existing = await pool.query('SELECT 1 FROM users LIMIT 1');
  if (existing.rowCount && existing.rowCount > 0) return;

  // First startup: create an admin account so someone can log in and create others
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin';
  const displayName = process.env.ADMIN_DISPLAY_NAME || 'Administrator';
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await pool.query(
    'INSERT INTO users (username, password_hash, role, display_name) VALUES ($1,$2,$3,$4)',
    [username, hash, 'admin', displayName]
  );
  console.log(`Seeded admin user: ${username}`);
}

export interface LoginResult {
  token: string;
  role: string;
  display_name: string;
  must_change_password: boolean;
}

export async function loginUser(
  username: string,
  password: string,
  remember: boolean
): Promise<LoginResult | null> {
  const result = await pool.query(
    'SELECT id, username, password_hash, role, display_name, active, must_change_password, token_version FROM users WHERE username = $1',
    [username]
  );
  if (result.rows.length === 0) return null;
  const user = result.rows[0];
  if (!user.active) return null;

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;

  const payload: JWTPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    tokenVersion: user.token_version,
  };
  const expiresIn = remember ? '7d' : '8h';
  const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn });
  return {
    token,
    role: user.role,
    display_name: user.display_name || user.username,
    must_change_password: Boolean(user.must_change_password),
  };
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
  const result = await pool.query('SELECT password_hash FROM users WHERE id=$1', [userId]);
  if (result.rows.length === 0) return false;
  const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
  if (!valid) return false;
  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await pool.query(
    'UPDATE users SET password_hash=$1, must_change_password=false WHERE id=$2',
    [hash, userId]
  );
  return true;
}
