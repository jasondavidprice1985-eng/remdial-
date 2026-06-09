import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BACKEND_PORT = 3099;
const OFFICE_PORT = 5199;
const MANAGER_PORT = 5198;

// Vite serves HTTPS when ../certs/dev-{cert,key}.pem exist; tests have to match.
const OFFICE_URL = `https://localhost:${OFFICE_PORT}`;
const MANAGER_URL = `https://localhost:${MANAGER_PORT}`;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'office-chromium',
      testMatch: ['**/auth.spec.ts', '**/office-*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { executablePath: '/usr/bin/google-chrome' },
        baseURL: OFFICE_URL,
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'manager-chromium',
      testMatch: ['**/auth.spec.ts', '**/manager-*.spec.ts'],
      use: {
        ...devices['Pixel 5'],
        launchOptions: { executablePath: '/usr/bin/google-chrome' },
        baseURL: MANAGER_URL,
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'cross-context',
      testMatch: ['**/chat.spec.ts', '**/ticket-lifecycle.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { executablePath: '/usr/bin/google-chrome' },
        baseURL: OFFICE_URL,  // default; test creates its own pages
      },
    },
  ],

  webServer: [
    // 1. PostgreSQL is expected to be running — start with: npm run env:up
    // 2. Backend — runs in backend/ directory with test env vars
    {
      command: `npx ts-node-dev --respawn --transpile-only src/index.ts`,
      port: BACKEND_PORT,
      timeout: 45_000,
      reuseExistingServer: !process.env.CI,
      cwd: path.resolve(__dirname, '../backend/'),
      env: {
        DATABASE_URL: `postgres://remedial_test:remedial_test@localhost:5433/remedial_test`,
        JWT_SECRET: 'e2e-test-secret-key-do-not-use-in-prod',
        PORT: String(BACKEND_PORT),
        UPLOAD_DIR: '/tmp/remedial-e2e-uploads',
        NODE_ENV: 'development',
        MANAGER_USERNAME: 'manager',
        MANAGER_PASSWORD: 'manager',
        OFFICE_USERNAME: 'office',
        OFFICE_PASSWORD: 'office',
      },
    },
    // 3. Office frontend
    {
      command: `npx vite --port ${OFFICE_PORT} --strictPort`,
      port: OFFICE_PORT,
      timeout: 30_000,
      reuseExistingServer: !process.env.CI,
      cwd: path.resolve(__dirname, '../frontend-office/'),
      env: {
        VITE_API_URL: `${BACKEND_URL}/api/v1`,
        VITE_SOCKET_URL: BACKEND_URL,
      },
    },
    // 4. Manager frontend
    {
      command: `npx vite --port ${MANAGER_PORT} --strictPort`,
      port: MANAGER_PORT,
      timeout: 30_000,
      reuseExistingServer: !process.env.CI,
      cwd: path.resolve(__dirname, '../frontend-manager/'),
      env: {
        VITE_API_URL: `${BACKEND_URL}/api/v1`,
        VITE_SOCKET_URL: BACKEND_URL,
      },
    },
  ],
});
