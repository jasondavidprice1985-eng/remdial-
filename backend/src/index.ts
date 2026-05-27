import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from 'socket.io';
import { initDB, UPLOAD_DIR } from './db';
import { seedUsers } from './services/authService';
import ticketsRouter from './routes/tickets';
import ticketActionsRouter from './routes/ticketActions';
import messagesRouter from './routes/messages';
import authRouter from './routes/auth';
import locationsRouter from './routes/locations';
import developersRouter from './routes/developers';
import { apiLimiter } from './middleware/rateLimiter';
import { setupSocket } from './socket';

const PORT        = parseInt(process.env.PORT || '3001', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

async function main(): Promise<void> {
  await initDB();
  await seedUsers();

  const app = express();

  app.use(helmet());
  app.use(cors({ origin: CORS_ORIGIN }));
  app.use(express.json({ limit: '50mb' }));
  app.use('/api/', apiLimiter);

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

  const httpServer = http.createServer(app);
  const io = new Server(httpServer, { cors: { origin: CORS_ORIGIN } });

  app.set('io', io);
  setupSocket(io);

  httpServer.listen(PORT, () => console.log(`Backend listening on port ${PORT}`));
}

main().catch(err => { console.error('Fatal startup error:', err); process.exit(1); });
