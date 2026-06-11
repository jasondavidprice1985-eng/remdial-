import { Pool } from 'pg';

export async function createSchema(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tickets (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ref              VARCHAR(10)  NOT NULL UNIQUE,
      status           VARCHAR(20)  NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','query','ordered','archived')),
      developer        VARCHAR(100) NOT NULL,
      site             VARCHAR(100) NOT NULL,
      plot_number      VARCHAR(50)  NOT NULL,
      items            TEXT         NOT NULL DEFAULT '',
      quantity         INTEGER      NOT NULL DEFAULT 1 CHECK (quantity >= 1),
      reason           VARCHAR(50)  NOT NULL DEFAULT 'missing_omission'
                       CHECK (reason IN ('damaged_on_arrival','damaged_by_fitter',
                         'missing_omission','wrong_specification','site_loss')),
      delivery_request JSONB        NOT NULL,
      delivery_date    DATE,
      po_number        VARCHAR(100),
      images           TEXT[]       NOT NULL DEFAULT '{}',
      created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ticket_items (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id   UUID         NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      description TEXT         NOT NULL,
      quantity    INTEGER      NOT NULL CHECK (quantity >= 1),
      reason      VARCHAR(50)  NOT NULL
                  CHECK (reason IN ('damaged_on_arrival','damaged_by_fitter',
                    'missing_omission','wrong_specification','site_loss'))
    )`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id  UUID        NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      sender     VARCHAR(10) NOT NULL CHECK (sender IN ('manager','office')),
      text       TEXT,
      audio_path VARCHAR(255),
      is_query   BOOLEAN     NOT NULL DEFAULT false,
      read_at    TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT chk_has_content CHECK (text IS NOT NULL OR audio_path IS NOT NULL)
    )`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS locations (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      developer      VARCHAR(100) NOT NULL,
      site           VARCHAR(100) NOT NULL,
      plot_number    VARCHAR(50)  NOT NULL,
      account_number VARCHAR(100) NOT NULL DEFAULT '',
      created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      UNIQUE (developer, site, plot_number)
    )`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username      VARCHAR(100) NOT NULL UNIQUE,
      password_hash TEXT         NOT NULL,
      role          VARCHAR(10)  NOT NULL CHECK (role IN ('manager','office')),
      created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key   VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL
    )`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id   UUID         REFERENCES tickets(id) ON DELETE SET NULL,
      ticket_ref  VARCHAR(10),
      action      VARCHAR(50)  NOT NULL,
      changed_by  VARCHAR(100) NOT NULL,
      old_value   JSONB,
      new_value   JSONB,
      created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )`);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_audit_log_ticket ON audit_log(ticket_id)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      sap_code    VARCHAR(50)  PRIMARY KEY,
      description TEXT         NOT NULL,
      created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )`);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_products_description ON products USING gin(to_tsvector('english', description))
  `);

  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS usage_count INTEGER NOT NULL DEFAULT 0`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_products_usage ON products(usage_count DESC)`);
}
