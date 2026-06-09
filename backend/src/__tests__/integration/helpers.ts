import { Client } from 'pg';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';

import { apiLimiter } from '../../middleware/rateLimiter';

let dbClient: Client | null = null;

export async function cleanDatabase(): Promise<void> {
  dbClient = new Client({ connectionString: process.env.DATABASE_URL });
  await dbClient.connect();
  await dbClient.query(`TRUNCATE ticket_items, messages, tickets, locations RESTART IDENTITY CASCADE`);
  await dbClient.end();
  dbClient = null;
}

export function buildApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: '*' }));
  app.use(express.json({ limit: '50mb' }));
  app.use('/api/', apiLimiter);

  const httpServer = http.createServer(app);
  const io = new Server(httpServer, { cors: { origin: '*' } });
  app.set('io', io);

  return { app, httpServer, io };
}

export async function mountRoutes(app: express.Application): Promise<void> {
  const authRouter = (await import('../../routes/auth')).default;
  const ticketsRouter = (await import('../../routes/tickets')).default;
  const ticketActionsRouter = (await import('../../routes/ticketActions')).default;
  const messagesRouter = (await import('../../routes/messages')).default;
  const locationsRouter = (await import('../../routes/locations')).default;
  const developersRouter = (await import('../../routes/developers')).default;

  app.use('/api/v1', authRouter);
  app.use('/api/v1', ticketsRouter);
  app.use('/api/v1', ticketActionsRouter);
  app.use('/api/v1', messagesRouter);
  app.use('/api/v1', locationsRouter);
  app.use('/api/v1', developersRouter);
}
