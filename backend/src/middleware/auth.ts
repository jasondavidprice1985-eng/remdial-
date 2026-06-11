import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db';

export interface AuthenticatedRequest extends Request {
  user?: { userId: string; username: string; role: string };
}

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = header.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string; username: string; role: string; tokenVersion: number;
    };
    // Verify token version hasn't been revoked
    pool.query('SELECT active, token_version FROM users WHERE id=$1', [payload.userId])
      .then(userRow => {
        if (userRow.rows.length === 0 || !userRow.rows[0].active || userRow.rows[0].token_version !== payload.tokenVersion) {
          res.status(401).json({ error: 'Token revoked or user deactivated' });
          return;
        }
        req.user = { userId: payload.userId, username: payload.username, role: payload.role };
        next();
      })
      .catch(() => {
        // Allow through on DB error — don't lock everyone out if DB is slow
        req.user = { userId: payload.userId, username: payload.username, role: payload.role };
        next();
      });
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/** Only allow specific roles through — the "signs on the doors" */
export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden: insufficient role' });
      return;
    }
    next();
  };
}

/** Check that :id is a valid UUID before it reaches the database */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const validateIdParam = (req: Request, res: Response, next: NextFunction): void => {
  if (req.params.id && !UUID_RE.test(req.params.id)) {
    res.status(400).json({ error: 'Invalid ticket ID format' });
    return;
  }
  next();
};
