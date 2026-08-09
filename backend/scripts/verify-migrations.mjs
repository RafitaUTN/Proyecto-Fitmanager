import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import pg from 'pg'

const raw = process.env.TEST_DATABASE_URL
if (!raw) throw new Error('TEST_DATABASE_URL es obligatoria')
const url = new URL(raw)
if (!['localhost', '127.0.0.1', '::1', 'postgres'].includes(url.hostname)) {
  throw new Error(`Verificación de migraciones bloqueada fuera del entorno aislado: ${url.hostname}`)
}

const client = new pg.Client({ connectionString: raw })
await client.connect()
const result = await client.query("SELECT count(*)::int AS total FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'")
await client.end()
if (result.rows[0].total !== 0) throw new Error('La base de verificación debe estar vacía')

const env = { ...process.env, DATABASE_URL: raw }
for (const args of [
  ['prisma', 'migrate', 'deploy'],
  ['prisma', 'validate'],
  ['prisma', 'migrate', 'diff', '--from-config-datasource', '--to-schema', 'prisma/schema.prisma', '--exit-code'],
]) {
  const prismaCli = resolve(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js')
  const run = spawnSync(process.execPath, [prismaCli, ...args.slice(1)], { cwd: process.cwd(), env, stdio: 'inherit' })
  if (run.error) throw run.error
  if (run.status !== 0) process.exit(run.status ?? 1)
}
