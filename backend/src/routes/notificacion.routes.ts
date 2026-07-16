import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { notificacionController } from '../controllers/notificacion.controller'

export const notificacionRouter = Router()

notificacionRouter.use(authMiddleware)
notificacionRouter.get('/', notificacionController.listar)
notificacionRouter.get('/contar', notificacionController.contarNoLeidas)
notificacionRouter.post('/generar', notificacionController.generarAlertas)
notificacionRouter.put('/:id/leer', notificacionController.marcarLeida)
