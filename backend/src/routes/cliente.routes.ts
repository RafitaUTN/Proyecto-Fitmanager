import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { authorize } from '../middlewares/role.middleware'
import { clienteController } from '../controllers/cliente.controller'

export const clienteRouter = Router()

clienteRouter.use(authMiddleware)
clienteRouter.get('/', authorize('Administrador', 'Recepcionista', 'Entrenador'), clienteController.listar)
clienteRouter.get('/:id', authorize('Administrador', 'Recepcionista', 'Entrenador'), clienteController.buscar)
clienteRouter.post('/', authorize('Administrador', 'Recepcionista'), clienteController.crear)
clienteRouter.put('/:id', authorize('Administrador', 'Recepcionista'), clienteController.actualizar)
clienteRouter.delete('/:id', authorize('Administrador'), clienteController.eliminar)
