const raw = process.env.E2E_DATABASE_URL
if (!raw) throw new Error('E2E_DATABASE_URL es obligatoria')
const url = new URL(raw)
if (!['localhost', '127.0.0.1', '::1', 'postgres'].includes(url.hostname) || !url.pathname.toLowerCase().includes('e2e')) {
  throw new Error('Seed E2E bloqueado fuera de una base local/aislada con nombre e2e')
}
process.env.DATABASE_URL = raw
await import('./seed')
