import { vi } from 'vitest';

type QueryResult = {
  rows: Record<string, unknown>[];
  rowCount: number | null;
};

type MockQuery = (sql: string, params?: unknown[]) => QueryResult | Promise<QueryResult>;

export function createMockPool(mockQuery?: MockQuery) {
  const defaultQuery = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
  const queryFn = mockQuery ?? defaultQuery;

  return {
    query: vi.fn().mockImplementation(queryFn),
    connect: vi.fn(),
    end: vi.fn(),
  };
}

export function createMockQueryResult(rows: Record<string, unknown>[], rowCount?: number) {
  return { rows, rowCount: rowCount ?? rows.length };
}
