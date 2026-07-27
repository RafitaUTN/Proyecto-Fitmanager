import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const poolSize = parseInt(process.env.DATABASE_POOL_SIZE || '10', 10)
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: poolSize,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  allowExitOnIdle: true,
})
const adapter = new PrismaPg(pool)

export const prisma = new PrismaClient({ adapter })
