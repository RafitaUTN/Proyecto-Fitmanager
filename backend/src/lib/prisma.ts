/**
 * Utilidad compartida prisma para la API de FitManager.
 *
 * @remarks Evita duplicar lógica transversal usada por controladores, servicios o middlewares.
 */
import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { attachDatabasePool } from '@vercel/functions'
import pg from 'pg'

const defaultPoolSize = process.env.VERCEL ? 2 : 10
const poolSize = Number.parseInt(process.env.DATABASE_POOL_SIZE || String(defaultPoolSize), 10)
const queryTimeoutMs = Number.parseInt(process.env.DATABASE_QUERY_TIMEOUT_MS || '15000', 10)
const idleTransactionTimeoutMs = Number.parseInt(process.env.DATABASE_IDLE_TRANSACTION_TIMEOUT_MS || '10000', 10)

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: poolSize,
  connectionTimeoutMillis: 10000,
  query_timeout: queryTimeoutMs,
  idleTimeoutMillis: 30000,
  maxUses: 500,
  allowExitOnIdle: true,
  application_name: process.env.DATABASE_APPLICATION_NAME || 'fitmanager-api',
  options: `-c statement_timeout=${queryTimeoutMs} -c idle_in_transaction_session_timeout=${idleTransactionTimeoutMs}`,
})

if (process.env.VERCEL) {
  attachDatabasePool(pool)
}

const adapter = new PrismaPg(pool)

export const prisma = new PrismaClient({ adapter })
