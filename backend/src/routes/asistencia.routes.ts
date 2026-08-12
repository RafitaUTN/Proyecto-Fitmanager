import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { authorize } from '../middlewares/role.middleware'
import { asistenciaController } from '../controllers/asistencia.controller'

export const asistenciaRouter = Router()

asistenciaRouter.use(authMiddleware)
asistenciaRouter.get('/', authorize('Administrador', 'Recepcionista', 'Entrenador'), asistenciaController.listar)
asistenciaRouter.get('/hoy', authorize('Administrador', 'Recepcionista'), asistenciaController.listarHoy)
asistenciaRouter.get('/activos', authorize('Administrador', 'Recepcionista'), asistenciaController.listarActivas)
asistenciaRouter.get('/clientes-elegibles', authorize('Administrador', 'Recepcionista'), asistenciaController.listarElegibles)
asistenciaRouter.post('/entrada', authorize('Administrador', 'Recepcionista'), asistenciaController.registrarEntrada)
asistenciaRouter.post('/salida', authorize('Administrador', 'Recepcionista'), asistenciaController.registrarSalida)
asistenciaRouter.patch('/:id/salida', authorize('Administrador', 'Recepcionista'), asistenciaController.registrarSalida)
