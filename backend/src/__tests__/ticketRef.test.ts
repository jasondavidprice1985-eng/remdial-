import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db', () => ({
  pool: {
    query: vi.fn(),
  },
}));

describe('generateTicketRef', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates ref with RM- prefix followed by 6 alphanumeric chars', async () => {
    const { pool } = await import('../db');
    (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [], rowCount: 0 });

    const { generateTicketRef } = await import('../utils/ticketRef');
    const ref = await generateTicketRef();

    expect(ref).toMatch(/^RM-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    expect(pool.query).toHaveBeenCalledWith(
      'SELECT 1 FROM tickets WHERE ref = $1',
      [ref],
    );
  });

  it('retries if ref collision occurs', async () => {
    const { pool } = await import('../db');
    const mockQuery = vi.fn()
      .mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 }) // first ref collides
      .mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 }) // second ref collides
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // third ref succeeds

    (pool.query as ReturnType<typeof vi.fn>).mockImplementation(mockQuery);

    const { generateTicketRef } = await import('../utils/ticketRef');
    const ref = await generateTicketRef();

    expect(ref).toMatch(/^RM-/);
    expect(pool.query).toHaveBeenCalledTimes(3); // 2 collisions + 1 success
  });

  it('throws after 10 collision attempts', async () => {
    const { pool } = await import('../db');
    (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [{ 1: 1 }], rowCount: 1 });

    const { generateTicketRef } = await import('../utils/ticketRef');
    await expect(generateTicketRef()).rejects.toThrow('Failed to generate unique ticket ref');
    expect(pool.query).toHaveBeenCalledTimes(10);
  });
});
