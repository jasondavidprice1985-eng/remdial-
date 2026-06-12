import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from 'socket.io';
import { initDB, UPLOAD_DIR, pool } from './db';
import { seedUsers } from './services/authService';
import ticketsRouter from './routes/tickets';
import ticketActionsRouter from './routes/ticketActions';
import messagesRouter from './routes/messages';
import authRouter from './routes/auth';
import locationsRouter from './routes/locations';
import developersRouter from './routes/developers';
import pushRouter from './routes/push';
import productsRouter from './routes/products';
import usersRouter from './routes/users';
import sapRouter from './routes/sap';
import { apiLimiter } from './middleware/rateLimiter';
import { setupSocket } from './socket';
import { verifyUpload, signJsonResponse } from './utils/signedUrls';
import { logger } from './utils/logger';

const PORT        = parseInt(process.env.PORT || '3001', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const RESOLVED_ORIGIN = CORS_ORIGIN === '*' && process.env.NODE_ENV === 'production'
  ? false
  : CORS_ORIGIN;

async function main(): Promise<void> {
  // Refuse to start with default admin password in production
  if (process.env.NODE_ENV === 'production') {
    const adminPw = process.env.ADMIN_PASSWORD;
    if (!adminPw || adminPw === 'admin') {
      logger.fatal('Set ADMIN_PASSWORD to a non-default value in production.');
      process.exit(1);
    }
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      logger.fatal('JWT_SECRET must be set and at least 32 characters in production.');
      process.exit(1);
    }
  }

  await initDB();
  await seedUsers();

  const app = express();

  // Behind nginx: trust X-Forwarded-For so the rate limiter sees the real
  // client IP, not always 127.0.0.1.
  app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  }));
  app.use(cors({ origin: RESOLVED_ORIGIN }));
  app.use(express.json({ limit: '10mb' }));
  app.use('/api/', apiLimiter);

  // Health check — so monitoring can ask "are you still alive?"
  app.get('/api/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', uptime: process.uptime() });
    } catch {
      res.status(503).json({ status: 'unhealthy', error: 'database unreachable' });
    }
  });

  // Sign all upload paths returned in JSON responses
  app.use((_req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (body: unknown) {
      return originalJson(signJsonResponse(body));
    };
    next();
  });

  // Verify signed upload URLs — requires ?exp=&token= on every /uploads/ request
  app.use('/uploads', (req, res, next) => {
    const { exp, token } = req.query as { exp?: string; token?: string };
    if (!exp || !token || !verifyUpload(req.path, exp, token)) {
      return res.status(403).end();
    }
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  }, express.static(UPLOAD_DIR));
  app.use('/api/v1', authRouter);
  app.use('/api/v1', ticketsRouter);
  app.use('/api/v1', ticketActionsRouter);
  app.use('/api/v1', messagesRouter);
  app.use('/api/v1', locationsRouter);
  app.use('/api/v1', developersRouter);
  app.use('/api/v1', pushRouter);
  app.use('/api/v1', productsRouter);
  app.use('/api/v1', usersRouter);
  app.use('/api/v1', sapRouter);

  // Global error handler — the safety net that catches anything unexpected
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err }, 'Unhandled error');
    res.status(500).json({ error: 'Internal server error' });
  });

  const httpServer = http.createServer(app);
  const io = new Server(httpServer, { cors: { origin: RESOLVED_ORIGIN || false } });

  app.set('io', io);
  setupSocket(io);

  httpServer.listen(PORT, () => logger.info({ port: PORT }, 'Backend listening'));
}

main().catch(err => { console.error('Fatal startup error:', err); process.exit(1); });
