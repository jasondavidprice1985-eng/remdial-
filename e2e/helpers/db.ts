import { Client } from 'pg';

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ||
  'postgres://remedial_test:remedial_test@localhost:5433/remedial_test';

let _client: Client | null = null;

async function getClient(): Promise<Client> {
  if (!_client) {
    _client = new Client({ connectionString: TEST_DB_URL });
    await _client.connect();
  }
  return _client;
}

/**
 * Seed a fresh test ticket directly into the database.
 * Returns the ticket ID and ref so tests can reference it.
 */
export async function seedTicket(
  overrides: Partial<{
    developer: string;
    site: string;
    plot_number: string;
    status: string;
    reason: string;
    items: string;
    quantity: number;
  }> = {},
): Promise<{ id: string; ref: string }> {
  const client = await getClient();
  // ref column is varchar(10); keep generated refs within that limit
  const rand = Math.random().toString(36).slice(2, 9).toUpperCase();
  const ref = overrides.status === 'archived' ? `ARC-${rand.slice(0, 6)}` : `E2E-${rand.slice(0, 6)}`;
  const row = overrides.status === 'archived'
    ? {
        developer: 'E2E Developer',
        site: 'E2E Site',
        plot_number: 'E2E-001',
        reason: 'missing_omission',
        items: '',
        quantity: 1,
        delivery_request: JSON.stringify({ type: 'next_delivery', date: null }),
        ...overrides,
      }
    : {
        developer: 'E2E Developer',
        site: 'E2E Site',
        plot_number: 'E2E-001',
        reason: 'missing_omission',
        items: '',
        quantity: 1,
        delivery_request: JSON.stringify({ type: 'next_delivery', date: null }),
        ...overrides,
      };

  const result = await client.query(
    `INSERT INTO tickets (ref, status, developer, site, plot_number, reason, items, quantity, delivery_request, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
     RETURNING id, ref`,
    [
      ref,
      row.status || 'pending',
      row.developer,
      row.site,
      row.plot_number,
      row.reason,
      row.items,
      row.quantity,
      row.delivery_request,
    ],
  );
  return { id: result.rows[0].id, ref: result.rows[0].ref };
}

/**
 * Delete all tickets (and cascade messages/ticket_items) created during tests.
 */
export async function cleanTickets(): Promise<void> {
  const client = await getClient();
  // Delete only tickets that have 'E2E-' or 'ARC-' prefix (test-created)
  await client.query(`DELETE FROM tickets WHERE ref LIKE 'E2E-%' OR ref LIKE 'ARC-%'`);
}

/**
 * Disconnect the DB client.
 */
export async function disconnect(): Promise<void> {
  if (_client) {
    await _client.end().catch(() => {});
    _client = null;
  }
}
