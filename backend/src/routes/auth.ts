import { Router, Request, Response } from 'express';
import { loginUser } from '../services/authService';
import { sanitise } from '../utils/sanitise';
import { loginLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/auth/login', loginLimiter, async (req: Request, res: Response) => {
  const { username, password, remember } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  try {
    const result = await loginUser(
      sanitise(String(username)),
      String(password),
      Boolean(remember)
    );
    if (!result) return res.status(401).json({ error: 'Invalid credentials' });
    return res.json({
      token: result.token,
      role: result.role,
      display_name: result.display_name,
      must_change_password: result.must_change_password,
    });
  } catch (e) {
    console.error('Login error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
