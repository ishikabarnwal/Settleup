import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests drive the real app in a browser against a real backend.
 * Start settleup-backend on http://localhost:8080 first. The tests run against
 * the production build (vite preview on port 4173), so they check what actually
 * ships and aren't disturbed by the dev server's hot reloading.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  // Every test signs people up and in, and password hashing on the backend is
  // deliberately slow. Eight browsers starting at once on a laptop starved it
  // badly enough for the first few logins to take ten seconds.
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    // An explicit IPv4 address: on Windows, "localhost" can cost two seconds per
    // request when the client tries a different IP family from the server.
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run build && npx vite preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
