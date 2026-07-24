import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { authorize } from '../middlewares/role.middleware'
import { membresiaController } from '../controllers/membresia.controller'

export const membresiaRouter = Router()

membresiaRouter.use(authMiddleware)
membresiaRouter.get('/', authorize('Administrador', 'Recepcionista'), membresiaController.listar)
membresiaRouter.post('/', authorize('Administrador'), membresiaController.crear)
membresiaRouter.put('/:id', authorize('Administrador'), membresiaController.actualizar)
membresiaRouter.delete('/:id', authorize('Administrador'), membresiaController.eliminar)
