import dotenv from 'dotenv';
dotenv.config();
import { Pool } from 'pg';
import fs from 'fs';
import { createSchema } from './db/schema';

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const UPLOAD_DIR = process.env.UPLOAD_DIR || '/home/jason-price/remedial/backend/uploads';

export async function initDB(): Promise<void> {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  await createSchema(pool);

  const nextDelivery = process.env.NEXT_DELIVERY_DATE || '2026-05-30';
  await pool.query(
    `INSERT INTO settings (key, value) VALUES ('next_delivery_date', $1) ON CONFLICT (key) DO NOTHING`,
    [nextDelivery]
  );

  // Migrations: add columns added after initial deploy
  await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ`).catch(() => null);
  await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ`).catch(() => null);
  await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_path VARCHAR(255)`).catch(() => null);
  // Allow image-only messages
  await pool.query(`ALTER TABLE messages DROP CONSTRAINT IF EXISTS chk_has_content`).catch(() => null);
  await pool.query(`ALTER TABLE messages ADD CONSTRAINT chk_has_content CHECK (text IS NOT NULL OR audio_path IS NOT NULL OR image_path IS NOT NULL)`).catch(() => null);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_tickets_status  ON tickets(status)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(created_at DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_ticket ON messages(ticket_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_items_ticket    ON ticket_items(ticket_id)`);

  console.log('Database initialised');
}
