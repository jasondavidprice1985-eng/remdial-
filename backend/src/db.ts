import dotenv from 'dotenv';
dotenv.config();
import { Pool } from 'pg';
import fs from 'fs';
import { createSchema } from './db/schema';

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

function swallowIfAlreadyExists(e: unknown): void {
  const code = (e as { code?: string }).code;
  if (code === '42701' || code === '42P07' || code === '42710') return; // duplicate_column, duplicate_table, duplicate_object
  throw e;
}

export async function initDB(): Promise<void> {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  await createSchema(pool);

  const nextDelivery = process.env.NEXT_DELIVERY_DATE || '2026-05-30';
  await pool.query(
    `INSERT INTO settings (key, value) VALUES ('next_delivery_date', $1) ON CONFLICT (key) DO NOTHING`,
    [nextDelivery]
  );

  // Migrations: add columns added after initial deploy
  await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ`).catch(swallowIfAlreadyExists);
  await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ`).catch(swallowIfAlreadyExists);
  await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_path VARCHAR(255)`).catch(swallowIfAlreadyExists);
  // Allow image-only messages
  await pool.query(`ALTER TABLE messages DROP CONSTRAINT IF EXISTS chk_has_content`).catch(swallowIfAlreadyExists);
  await pool.query(`ALTER TABLE messages ADD CONSTRAINT chk_has_content CHECK (text IS NOT NULL OR audio_path IS NOT NULL OR image_path IS NOT NULL)`).catch(swallowIfAlreadyExists);
  // SAP-ordered items: what office actually ordered, may differ from what manager requested
  await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ordered_items JSONB`).catch(swallowIfAlreadyExists);

  // Individual user accounts: display name, active flag, password change tracking
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(100) NOT NULL DEFAULT ''`).catch(swallowIfAlreadyExists);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true`).catch(swallowIfAlreadyExists);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false`).catch(swallowIfAlreadyExists);
  // Widen role check to include admin
  await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`).catch(swallowIfAlreadyExists);
  await pool.query(`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('manager','office','admin'))`).catch(swallowIfAlreadyExists);

  // Audit trail: add ticket_ref, change FK to SET NULL so audit survives ticket deletion
  await pool.query(`ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS ticket_ref VARCHAR(10)`).catch(swallowIfAlreadyExists);
  await pool.query(`ALTER TABLE audit_log ALTER COLUMN ticket_id DROP NOT NULL`).catch(swallowIfAlreadyExists);
  await pool.query(`ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_ticket_id_fkey`).catch(swallowIfAlreadyExists);
  await pool.query(`ALTER TABLE audit_log ADD CONSTRAINT audit_log_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE SET NULL`).catch(swallowIfAlreadyExists);

  // Token versioning: bump to invalidate all existing tokens for a user
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0`).catch(swallowIfAlreadyExists);

  // SAP code decoder lookup tables (read-only catalogue, populated by importer script)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sap_ranges (
      code         VARCHAR(8)   PRIMARY KEY,
      range_name   VARCHAR(200) NOT NULL,
      generic_name VARCHAR(200) NOT NULL,
      price_group  VARCHAR(10)  NOT NULL
    )
  `).catch(swallowIfAlreadyExists);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_sap_ranges_pg ON sap_ranges(price_group)`);

  // Carcase colour suffixes (e.g. "MCS" = Cashmere). Used across ESP/MPP/TF
  // and also embedded in base/wall codes like BW60LMGO808.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sap_carcase_colours (
      suffix       VARCHAR(8)   PRIMARY KEY,
      colour_name  VARCHAR(100) NOT NULL,
      short_code   VARCHAR(8)
    )
  `).catch(swallowIfAlreadyExists);

  // Delivery Report line items. Daily import, dedupe per row.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sap_orders (
      id                SERIAL PRIMARY KEY,
      sales_doc         VARCHAR(20)  NOT NULL,
      sales_type        VARCHAR(4),
      sap_code          VARCHAR(40)  NOT NULL,
      description       VARCHAR(255),
      order_quantity    NUMERIC(10,2),
      po_number         VARCHAR(255),
      plot_extracted    VARCHAR(50),
      sold_to_name      VARCHAR(200),
      sold_to_account   VARCHAR(50),
      developer         VARCHAR(200),
      site              VARCHAR(200),
      created_on        DATE,
      required_delivery DATE,
      sap_user          VARCHAR(50),
      ingested_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (sales_doc, sap_code, po_number)
    )
  `).catch(swallowIfAlreadyExists);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_sap_orders_lookup ON sap_orders(developer, site, plot_extracted)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_sap_orders_salesdoc ON sap_orders(sales_doc)`);

  // Web Push subscriptions — one row per device/browser per user
  await pool.query(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id          SERIAL PRIMARY KEY,
      user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint    TEXT NOT NULL UNIQUE,
      p256dh      TEXT NOT NULL,
      auth        TEXT NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(swallowIfAlreadyExists);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id)`);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_tickets_status  ON tickets(status)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(created_at DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_ticket ON messages(ticket_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_items_ticket    ON ticket_items(ticket_id)`);

  // Partial index for unread counts — only covers unread rows
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(ticket_id, sender) WHERE read_at IS NULL`);

  // Composite index for audit_log ordering
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_log_ticket_created ON audit_log(ticket_id, created_at)`);

  // Auto-update updated_at via trigger
  await pool.query(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tickets_updated_at') THEN
        CREATE TRIGGER tickets_updated_at BEFORE UPDATE ON tickets
          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
      END IF;
    END $$;
  `);

  console.log('Database initialised');
}
