import { pool } from '../db';

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export async function generateTicketRef(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const suffix = Array.from({ length: 6 }, () =>
      CHARSET[Math.floor(Math.random() * CHARSET.length)]
    ).join('');
    const ref = 'RM-' + suffix;
    const result = await pool.query('SELECT 1 FROM tickets WHERE ref = $1', [ref]);
    if (result.rowCount === 0) return ref;
  }
  throw new Error('Failed to generate unique ticket ref after 10 attempts');
}
