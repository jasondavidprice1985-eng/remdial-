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
import { apiLimiter } from './middleware/rateLimiter';
import { setupSocket } from './socket';

const PORT        = parseInt(process.env.PORT || '3001', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

async function main(): Promise<void> {
  // Refuse to start with default passwords in production
  if (process.env.NODE_ENV === 'production') {
    const mgr = process.env.MANAGER_PASSWORD;
    const ofc = process.env.OFFICE_PASSWORD;
    if (!mgr || mgr === 'manager' || !ofc || ofc === 'office') {
      console.error('FATAL: Set MANAGER_PASSWORD and OFFICE_PASSWORD to non-default values in production.');
      process.exit(1);
    }
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      console.error('FATAL: JWT_SECRET must be set and at least 32 characters in production.');
      process.exit(1);
    }
  }

  await initDB();
  await seedUsers();

  const app = express();

  // Behind nginx: trust X-Forwarded-For so the rate limiter sees the real
  // client IP, not always 127.0.0.1.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: CORS_ORIGIN === '*' && process.env.NODE_ENV === 'production'
    ? false : CORS_ORIGIN }));
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

  // Allow cross-origin loading of uploaded images (Helmet sets same-origin by default)
  app.use('/uploads', (_req, res, next) => {
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

  // Global error handler — the safety net that catches anything unexpected
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[UNHANDLED]', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  const httpServer = http.createServer(app);
  const io = new Server(httpServer, { cors: { origin: CORS_ORIGIN } });

  app.set('io', io);
  setupSocket(io);

  httpServer.listen(PORT, () => console.log(`Backend listening on port ${PORT}`));
}

main().catch(err => { console.error('Fatal startup error:', err); process.exit(1); });
