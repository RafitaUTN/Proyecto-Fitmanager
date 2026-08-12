import { randomUUID } from 'node:crypto'
import { installBigIntJsonSerializer } from './lib/json'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import type { Request, Response, NextFunction } from 'express'
import { env } from './config/env'
import { corsOrigin } from './config/cors'
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
import { dashboardRouter } from './routes/dashboard.routes'
import { asistenciaRouter } from './routes/asistencia.routes'
import { ejercicioRouter } from './routes/ejercicio.routes'
import { rutinaRouter } from './routes/rutina.routes'
import { clientePortalRouter } from './routes/cliente-portal.routes'
import { reporteRouter } from './routes/reporte.routes'
import { setupRouter } from './routes/setup.routes'
import { jobRouter } from './routes/job.routes'
import { prisma } from './lib/prisma'
import { csrfMiddleware } from './middlewares/csrf.middleware'

installBigIntJsonSerializer()

const app = express()

app.set('trust proxy', env.trustProxy)

app.use((req, res, next) => {
  const supplied = req.header('x-request-id')
  const requestId = supplied && /^[a-zA-Z0-9._:-]{1,128}$/.test(supplied) ? supplied : randomUUID()
  const startedAt = Date.now()
  const originalJson = res.json.bind(res)

  res.locals.requestId = requestId
  res.setHeader('x-request-id', requestId)
  res.json = ((body: unknown) => {
    if (res.statusCode >= 400 && body && typeof body === 'object' && !Array.isArray(body)) {
      const errorBody = body as Record<string, unknown>
      const message = errorBody.message ?? errorBody.error ?? `HTTP ${res.statusCode}`
      const code = errorBody.code ?? errorBody.codigo ?? `HTTP_${res.statusCode}`
      return originalJson({ ...errorBody, message, code, requestId })
    }
    return originalJson(body)
  }) as Response['json']

  if (env.nodeEnv !== 'test') {
    res.on('finish', () => {
      console.info(JSON.stringify({
        level: 'info',
        event: 'http_request',
        requestId,
        method: req.method,
        path: req.originalUrl.split('?')[0],
        status: res.statusCode,
        durationMs: Date.now() - startedAt,
      }))
    })
  }
  next()
})

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", ...env.frontendUrl.split(',').map((origin) => origin.trim())],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))
app.use(cors({ origin: corsOrigin, credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use(csrfMiddleware)

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

const limiterRecuperacion = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.nodeEnv === 'production' ? 5 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { error: 'Demasiadas solicitudes. Intenta nuevamente en unos minutos.', codigo: 'RATE_LIMITED' },
})

app.use(limiterGeneral)
app.use('/api/auth/login', limiterPost)
app.use('/api/auth/refresh', limiterPost)
app.use('/api/auth/forgot-password', limiterRecuperacion)
app.use('/api/auth/reset-password', limiterPost)
app.use('/api/auth/setup-password', limiterPost)
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
app.use('/api/jobs', jobRouter)
app.use('/api/usuarios', usuarioRouter)
app.use('/api/clientes', clienteRouter)
app.use('/api/membresias', membresiaRouter)
app.use('/api/clientes-membresias', clienteMembresiaRouter)
app.use('/api/notificaciones', notificacionRouter)
app.use('/api/pagos', pagoRouter)
app.use('/api/transferencias', transferenciaRouter)
app.use('/api/entrenadores', entrenadorRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/asistencias', asistenciaRouter)
app.use('/api/ejercicios', ejercicioRouter)
app.use('/api/rutinas', rutinaRouter)
app.use('/api/gimnasios', gimnasioRouter)
app.use('/api/cliente', clientePortalRouter)
app.use('/api/reportes', reporteRouter)
app.use('/api/auth', setupRouter)

app.use((_req, res) => {
  res.status(404).json({ error: 'Recurso no encontrado', codigo: 'NOT_FOUND' })
})

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err.name === 'ZodError') {
    const issues = Array.isArray(err.issues) ? err.issues : []
    res.status(400).json({
      error: issues[0]?.message || 'Revisa los datos ingresados',
      codigo: 'VALIDATION_ERROR',
      detalles: issues.map((issue: any) => ({ campo: issue.path?.join('.') || 'datos', mensaje: issue.message })),
    })
    return
  }
  if (err.codigo) {
    const body: Record<string, unknown> = { error: err.message, codigo: err.codigo }
    if (err.data) body.data = err.data
    res.status(err.statusCode).json(body)
    return
  }
  if (err.statusCode) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }
  if (err.code === 'P2002') {
    res.status(409).json({ error: 'El valor ya está registrado' })
    return
  }
  if (err.code === 'P2003') {
    res.status(409).json({ error: 'El registro está siendo utilizado y no puede ser eliminado' })
    return
  }
  if (err.code === 'P2025') {
    res.status(404).json({ error: 'El registro no fue encontrado' })
    return
  }
  console.error(JSON.stringify({
    level: 'error',
    event: 'unhandled_error',
    requestId: res.locals.requestId,
    name: err?.name,
    message: env.nodeEnv === 'production' ? 'Error interno del servidor' : err?.message,
  }))
  res.status(500).json({ error: env.nodeEnv === 'production' ? 'Error interno del servidor' : err.message })
})

export default app
