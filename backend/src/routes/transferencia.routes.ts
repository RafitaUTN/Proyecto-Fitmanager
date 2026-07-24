import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { authorize } from '../middlewares/role.middleware'
import { transferenciaController } from '../controllers/transferencia.controller'

export const transferenciaRouter = Router()

transferenciaRouter.use(authMiddleware)
transferenciaRouter.get('/', authorize('Administrador', 'Recepcionista'), transferenciaController.listar)
transferenciaRouter.get('/indicadores', authorize('Administrador', 'Recepcionista'), transferenciaController.indicadores)
transferenciaRouter.get('/:id', authorize('Administrador', 'Recepcionista'), transferenciaController.buscar)
transferenciaRouter.post('/', authorize('Administrador', 'Recepcionista'), transferenciaController.crear)
transferenciaRouter.put('/:id/aprobar', authorize('Administrador'), transferenciaController.aprobar)
transferenciaRouter.put('/:id/rechazar', authorize('Administrador'), transferenciaController.rechazar)
transferenciaRouter.put('/:id/cancelar', authorize('Administrador', 'Recepcionista'), transferenciaController.cancelar)
