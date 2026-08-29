import { defineConfig } from '@playwright/test';

/**
 * Smoke suite runs against the real stack: PostgreSQL + API on :4000 +
 * Vite dev server on :5173. Backend and frontend are started (or reused)
 * as webServers so `npx playwright test` is self-contained.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npx tsx src/server.ts',
      cwd: '../backend',
      url: 'http://localhost:4000/health',
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
