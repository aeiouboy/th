import { defineConfig, devices } from '@playwright/test';
import { authFile } from './e2e/helpers';

const defaultAuthFile = authFile('user');

const FRONTEND_PORT = process.env.E2E_FRONTEND_PORT || '3002';
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  timeout: 360000,
  reporter: [
    ['json', { outputFile: '../docs/test-results/e2e/e2e-results.json' }],
    ['list'],
  ],
  use: {
    baseURL: FRONTEND_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `pnpm dev --port ${FRONTEND_PORT}`,
    url: FRONTEND_URL,
    reuseExistingServer: true,
    timeout: 120000,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        storageState: defaultAuthFile,
      },
      dependencies: ['setup'],
    },
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 375, height: 667 },
        storageState: defaultAuthFile,
      },
      dependencies: ['setup'],
    },
  ],
});
