import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import { gimnasioRouter } from './routes/gimnasio.routes'
import { authRouter } from './routes/auth.routes'
import { usuarioRouter } from './routes/usuario.routes'
import { clienteRouter } from './routes/cliente.routes'
import { membresiaRouter } from './routes/membresia.routes'
import { clienteMembresiaRouter } from './routes/cliente-membresia.routes'
import { notificacionRouter } from './routes/notificacion.routes'
import { pagoRouter } from './routes/pago.routes'

const app = express()

app.use(helmet())
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.use(cookieParser())
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRouter)
app.use('/api/usuarios', usuarioRouter)
app.use('/api/clientes', clienteRouter)
app.use('/api/membresias', membresiaRouter)
app.use('/api/clientes-membresias', clienteMembresiaRouter)
app.use('/api/notificaciones', notificacionRouter)
app.use('/api/pagos', pagoRouter)
app.use('/api/gimnasios', gimnasioRouter)

export default app
