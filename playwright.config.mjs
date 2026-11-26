import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  use: {
    baseURL: 'http://127.0.0.1:4318',
    launchOptions: { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH },
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4318 --strictPort',
    url: 'http://127.0.0.1:4318',
  },
});
