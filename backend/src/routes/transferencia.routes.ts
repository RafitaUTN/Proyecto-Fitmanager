import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { authorize } from '../middlewares/role.middleware'
import { transferenciaController } from '../controllers/transferencia.controller'

export const transferenciaRouter = Router()

transferenciaRouter.use(authMiddleware)
transferenciaRouter.get('/', authorize('Administrador', 'Recepcionista', 'Entrenador'), transferenciaController.listar)
transferenciaRouter.get('/indicadores', authorize('Administrador', 'Recepcionista', 'Entrenador'), transferenciaController.indicadores)
transferenciaRouter.get('/:id', authorize('Administrador', 'Recepcionista', 'Entrenador'), transferenciaController.buscar)
transferenciaRouter.post('/', authorize('Administrador', 'Recepcionista'), transferenciaController.crear)
transferenciaRouter.put('/:id/aprobar', authorize('Administrador'), transferenciaController.aprobar)
transferenciaRouter.put('/:id/rechazar', authorize('Administrador'), transferenciaController.rechazar)
transferenciaRouter.put('/:id/cancelar', authorize('Administrador', 'Recepcionista'), transferenciaController.cancelar)
