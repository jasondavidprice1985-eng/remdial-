import { Client } from 'pg';
import bcrypt from 'bcryptjs';

const TEST_DB_URL = 'postgres://remedial_user:remedial_pass_123@localhost:5432/remedial_test';

export async function setup(): Promise<void> {
  process.env.JWT_SECRET = 'test_secret_key_for_integration_tests';
  process.env.DATABASE_URL = TEST_DB_URL;

  const client = new Client({ connectionString: TEST_DB_URL });
  await client.connect();

  await client.query(`DROP TABLE IF EXISTS ticket_items, messages, tickets, locations, users, settings CASCADE`);

  await client.query(`
    CREATE TABLE tickets (
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
      accepted_at      TIMESTAMPTZ,
      images           TEXT[]       NOT NULL DEFAULT '{}',
      created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )`);

  await client.query(`
    CREATE TABLE ticket_items (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id   UUID         NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      description TEXT         NOT NULL,
      quantity    INTEGER      NOT NULL CHECK (quantity >= 1),
      reason      VARCHAR(50)  NOT NULL
                  CHECK (reason IN ('damaged_on_arrival','damaged_by_fitter',
                    'missing_omission','wrong_specification','site_loss'))
    )`);

  await client.query(`
    CREATE TABLE messages (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id  UUID        NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      sender     VARCHAR(10) NOT NULL CHECK (sender IN ('manager','office')),
      text       TEXT,
      audio_path VARCHAR(255),
      image_path VARCHAR(255),
      is_query   BOOLEAN     NOT NULL DEFAULT false,
      read_at    TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

  await client.query(`
    CREATE TABLE locations (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      developer      VARCHAR(100) NOT NULL,
      site           VARCHAR(100) NOT NULL,
      plot_number    VARCHAR(50)  NOT NULL,
      account_number VARCHAR(100) NOT NULL DEFAULT '',
      created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      UNIQUE (developer, site, plot_number)
    )`);

  await client.query(`
    CREATE TABLE users (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username      VARCHAR(100) NOT NULL UNIQUE,
      password_hash TEXT         NOT NULL,
      role          VARCHAR(10)  NOT NULL CHECK (role IN ('manager','office')),
      created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )`);

  await client.query(`
    CREATE TABLE settings (
      key   VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL
    )`);

  await client.query(`
    INSERT INTO settings (key, value) VALUES ('next_delivery_date', '2026-06-15')
    ON CONFLICT (key) DO NOTHING`);

  const hash = await bcrypt.hash('testpass', 4);
  await client.query(
    `INSERT INTO users (username, password_hash, role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
    ['manager', hash, 'manager'],
  );
  await client.query(
    `INSERT INTO users (username, password_hash, role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
    ['office', hash, 'office'],
  );

  await client.end();
}
