import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import { sanitise } from '../utils/sanitise';
import { requireAuth, requireRole, validateIdParam, AuthenticatedRequest } from '../middleware/auth';
import { changePassword } from '../services/authService';

const router = Router();

const BCRYPT_ROUNDS = 12;

// GET /api/v1/users — list all active users (admin only)
router.get('/users', requireAuth, requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    const r = await pool.query(
      'SELECT id, username, display_name, role, active, must_change_password, created_at FROM users ORDER BY role, username'
    );
    return res.json({ users: r.rows });
  } catch (e) {
    console.error('[USERS] list error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/users — create a new user (admin only)
router.post('/users', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  const { username, password, display_name, role } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'username, password, and role are required' });
  }
  const roleLower = String(role).toLowerCase();
  if (!['manager', 'office', 'admin'].includes(roleLower)) {
    return res.status(400).json({ error: 'role must be manager, office, or admin' });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: 'password must be at least 8 characters' });
  }
  try {
    const hash = await bcrypt.hash(String(password), BCRYPT_ROUNDS);
    const display = display_name ? sanitise(String(display_name)) : sanitise(String(username));
    const r = await pool.query(
      `INSERT INTO users (username, password_hash, display_name, role, must_change_password)
       VALUES ($1,$2,$3,$4,true)
       RETURNING id, username, display_name, role, active, must_change_password, created_at`,
      [sanitise(String(username)), hash, display, roleLower]
    );
    return res.status(201).json({ user: r.rows[0] });
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === '23505') return res.status(409).json({ error: 'Username already taken' });
    console.error('[USERS] create error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/v1/users/:id — update user (admin only)
router.patch('/users/:id', requireAuth, requireRole('admin'), validateIdParam, async (req: Request, res: Response) => {
  const { display_name, role, active } = req.body;
  try {
    const cur = await pool.query('SELECT id FROM users WHERE id=$1', [req.params.id]);
    if (cur.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;

    if (display_name !== undefined) {
      sets.push(`display_name=$${idx++}`);
      vals.push(sanitise(String(display_name)));
    }
    if (role !== undefined) {
      const rl = String(role).toLowerCase();
      if (!['manager', 'office', 'admin'].includes(rl)) {
        return res.status(400).json({ error: 'role must be manager, office, or admin' });
      }
      sets.push(`role=$${idx++}`);
      vals.push(rl);
    }
    if (active !== undefined) {
      sets.push(`active=$${idx++}`);
      vals.push(Boolean(active));
    }
    if (sets.length === 0) return res.status(400).json({ error: 'nothing to update' });

    vals.push(req.params.id);
    const r = await pool.query(
      `UPDATE users SET ${sets.join(', ')} WHERE id=$${idx}
       RETURNING id, username, display_name, role, active, must_change_password, created_at`,
      vals
    );
    return res.json({ user: r.rows[0] });
  } catch (e) {
    console.error('[USERS] update error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/v1/users/:id — deactivate (admin only), never hard-deletes
router.delete('/users/:id', requireAuth, requireRole('admin'), validateIdParam, async (req: Request, res: Response) => {
  try {
    const r = await pool.query(
      'UPDATE users SET active=false WHERE id=$1 RETURNING id',
      [req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    return res.json({ ok: true });
  } catch (e) {
    console.error('[USERS] delete error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/v1/users/:id/reset-password — admin resets another user's password
router.patch('/users/:id/reset-password', requireAuth, requireRole('admin'), validateIdParam, async (req: Request, res: Response) => {
  const { new_password } = req.body;
  if (!new_password || String(new_password).length < 8) {
    return res.status(400).json({ error: 'new_password must be at least 8 characters' });
  }
  try {
    const hash = await bcrypt.hash(String(new_password), BCRYPT_ROUNDS);
    const r = await pool.query(
      `UPDATE users SET password_hash=$1, must_change_password=true, token_version=token_version+1 WHERE id=$2
       RETURNING id, username, display_name`,
      [hash, req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    return res.json({ ok: true, user: r.rows[0] });
  } catch (e) {
    console.error('[USERS] reset password error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/v1/users/me/password — change own password
router.patch('/users/me/password', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).user!.userId;
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'current_password and new_password are required' });
  }
  if (String(new_password).length < 8) {
    return res.status(400).json({ error: 'new password must be at least 8 characters' });
  }

  try {
    const newTokenVersion = await changePassword(userId, String(current_password), String(new_password));
    if (!newTokenVersion) return res.status(401).json({ error: 'Current password is incorrect' });

    const user = (req as AuthenticatedRequest).user!;
    const newPayload = {
      userId: user.userId,
      username: user.username,
      role: user.role,
      tokenVersion: newTokenVersion,
    };
    const newToken = jwt.sign(newPayload, process.env.JWT_SECRET!, { expiresIn: '7d' });
    return res.json({ ok: true, token: newToken, role: user.role, display_name: user.username });
  } catch (e) {
    console.error('[USERS] password change error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
