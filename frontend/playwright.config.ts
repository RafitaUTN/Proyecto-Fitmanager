import { defineConfig, devices } from '@playwright/test'

const e2eDatabase = process.env.E2E_DATABASE_URL
if (!e2eDatabase) throw new Error('E2E_DATABASE_URL es obligatoria; E2E nunca usa DATABASE_URL')
const parsedDatabase = new URL(e2eDatabase)
if (!['localhost', '127.0.0.1', '::1', 'postgres'].includes(parsedDatabase.hostname) || !parsedDatabase.pathname.toLowerCase().includes('e2e')) {
  throw new Error('E2E_DATABASE_URL debe apuntar a PostgreSQL local/aislado y a una base cuyo nombre contenga "e2e"')
}
const e2eBaseUrl = process.env.E2E_BASE_URL || 'http://localhost:5173'
if (!['localhost', '127.0.0.1', '::1'].includes(new URL(e2eBaseUrl).hostname)) {
  throw new Error('Los E2E están bloqueados contra hosts no locales')
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: e2eBaseUrl,
    trace: 'on-first-retry',
    video: 'on',
    screenshot: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
