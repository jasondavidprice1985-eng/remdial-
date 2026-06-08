// Common unit-test environment — keeps JWT signing happy in tests that touch authService.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'unit-test-secret-not-for-production';
process.env.NODE_ENV = 'test';
