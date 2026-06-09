import { describe, it, expect } from 'vitest';

describe('rateLimiter', () => {
  it('exports a configured rate limit middleware', async () => {
    const { apiLimiter } = await import('../middleware/rateLimiter');
    expect(apiLimiter).toBeDefined();
    expect(typeof apiLimiter).toBe('function');
  });
});
