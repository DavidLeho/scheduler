import { defineConfig, devices } from '@playwright/test';

const port = 18081;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } },
  ],
  webServer: {
    command: 'node scripts/start-server.mjs',
    env: { SCHEDULER_E2E_PORT: String(port) },
    url: `${baseURL}/manage?year=2026&month=11`,
    reuseExistingServer: false,
    timeout: 180_000,
    stderr: 'pipe',
  },
});
