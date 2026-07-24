import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { authorize } from '../middlewares/role.middleware'
import { notificacionController } from '../controllers/notificacion.controller'

export const notificacionRouter = Router()

notificacionRouter.use(authMiddleware)
notificacionRouter.get('/', authorize('Administrador', 'Recepcionista', 'Entrenador'), notificacionController.listar)
notificacionRouter.get('/contar', authorize('Administrador', 'Recepcionista', 'Entrenador'), notificacionController.contarNoLeidas)
notificacionRouter.post('/generar', authorize('Administrador'), notificacionController.generarAlertas)
notificacionRouter.put('/:id/leer', authorize('Administrador', 'Recepcionista', 'Entrenador'), notificacionController.marcarLeida)
