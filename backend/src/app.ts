BigInt.prototype.toJSON = function () { return Number(this) }

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import type { Request, Response, NextFunction } from 'express'
import { env } from './config/env'
import { gimnasioRouter } from './routes/gimnasio.routes'
import { authRouter } from './routes/auth.routes'
import { usuarioRouter } from './routes/usuario.routes'
import { clienteRouter } from './routes/cliente.routes'
import { membresiaRouter } from './routes/membresia.routes'
import { clienteMembresiaRouter } from './routes/cliente-membresia.routes'
import { notificacionRouter } from './routes/notificacion.routes'
import { pagoRouter } from './routes/pago.routes'
import { transferenciaRouter } from './routes/transferencia.routes'
import { entrenadorRouter } from './routes/entrenador.routes'
import { prisma } from './lib/prisma'

const app = express()

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))
app.use(cors({ origin: env.frontendUrl, credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

if (env.nodeEnv !== 'test') {
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'))
}

const limiterGeneral = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.nodeEnv === 'production' ? 200 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
})

const limiterPost = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.nodeEnv === 'production' ? 50 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
})

app.use(limiterGeneral)
app.use('/api/auth/login', limiterPost)
app.use('/api/gimnasios', limiterPost)

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', db: 'connected', uptime: process.uptime() })
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' })
  }
})

app.use('/api/auth', authRouter)
app.use('/api/usuarios', usuarioRouter)
app.use('/api/clientes', clienteRouter)
app.use('/api/membresias', membresiaRouter)
app.use('/api/clientes-membresias', clienteMembresiaRouter)
app.use('/api/notificaciones', notificacionRouter)
app.use('/api/pagos', pagoRouter)
app.use('/api/transferencias', transferenciaRouter)
app.use('/api/entrenadores', entrenadorRouter)
app.use('/api/gimnasios', gimnasioRouter)

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err.name === 'ZodError') {
    res.status(400).json({ error: 'Datos inválidos', detalles: err.errors })
    return
  }
  if (err.statusCode) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }
  console.error('Error no manejado:', err)
  res.status(500).json({ error: env.nodeEnv === 'production' ? 'Error interno del servidor' : err.message })
})

export default app
