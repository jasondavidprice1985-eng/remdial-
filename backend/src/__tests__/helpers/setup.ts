import { beforeAll } from 'vitest';

beforeAll(() => {
  process.env.JWT_SECRET = 'test_jwt_secret';
  process.env.UPLOAD_DIR = '/tmp/remedial_test_uploads';
  process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
});
